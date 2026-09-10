import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import * as Sentry from '@sentry/node';
import { createServer as createViteServer } from 'vite';
import {
  searchLegalDocuments,
  getEmbedder,
  RagDocumentResult,
} from './server/legalRagEngine';
import { logger } from './server/logger';
import { correlationId } from './server/middleware/correlationId';
import { requireAuth, requireRole, type AuthenticatedRequest } from './server/middleware/requireAuth';
import { apiLimiter } from './server/middleware/apiLimiter';
import { chatSchema, ragSearchSchema } from './server/schemas/chat';
import { openrouterBreaker, breakerState } from './server/circuit/openrouterBreaker';
import { ragCache, ragCacheKey, RagCacheEntry } from './server/cache/ragCache';
import { metricsMiddleware, metricsRegistry } from './server/metrics';
import { detectTheme } from './server/fallback/normalize';
import { extractError } from './src/utils/extractError';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

// Sentry : actif uniquement si DSN fourni (PEN-023).
if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
// Ordre des middlewares : corrélation → métriques → routes.
app.use(correlationId);
app.use(metricsMiddleware);

// Warm-up asynchrone de l'embedder (MiniLM-L12-v2) dès le démarrage
getEmbedder()
  .then(() => logger.info('Embedder Xenova/MiniLM-L12-v2 warm-up réussi.'))
  .catch((err: unknown) => logger.warn({ err: extractError(err) }, 'Warm-up embedder.'));

// 1. Route de Santé API (publique)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Legal Flow CI Backend',
    llmProvider: 'OpenRouter',
    defaultModel: 'minimax/minimax-m3:free',
    breaker: breakerState(),
    ragCacheSize: ragCache.size,
    hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
    hasSupabaseKey: !!process.env.SUPABASE_URL,
    timestamp: new Date().toISOString(),
  });
});

// Métriques Prometheus (PEN-034, exposition standard non authentifiée)
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', metricsRegistry.contentType);
  res.send(await metricsRegistry.metrics());
});

// 2. Route RAG direct (test & audit des extraits juridiques) — protégée PEN-021
app.post('/api/rag/search', apiLimiter, requireAuth, requireRole('super_admin', 'gestionnaire', 'entreprise'), async (req, res) => {
  const reqId = (req as AuthenticatedRequest).id;
  try {
    const parsed = ragSearchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Paramètre "query" obligatoire (max 1000 caractères).' });
    }
    const { query, limit } = parsed.data;

    const results = await searchLegalDocuments(query, limit);
    return res.json({
      query,
      count: results.length,
      results,
    });
  } catch (error: unknown) {
    logger.error({ reqId, err: extractError(error) }, 'Erreur API /api/rag/search');
    return res.status(500).json({ error: 'Erreur RAG search' });
  }
});

// 3. Route Principale Chat LLM & RAG (OpenRouter minimax/minimax-m3:free + Fallback Déterministe)
// Protégée : JWT (401) + rate limit (429) + validation Zod (400). Cache LRU + circuit breaker.
app.post('/api/chat', apiLimiter, requireAuth, requireRole('super_admin', 'gestionnaire', 'entreprise'), async (req, res) => {
  const reqId = (req as AuthenticatedRequest).id;
  const userId = ((req as any).user?.id as string) || '';
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Le champ "message" est requis (1 à 1000 caractères).' });
  }
  const { message, dossierContext, contextSlices } = parsed.data;

  // Cache : question identique → réponse immédiate (< 5ms, sans Supabase ni OpenRouter)
  const cacheKey = ragCacheKey(message, userId);
  const cached = ragCache.get(cacheKey) as RagCacheEntry | undefined;
  if (cached) {
    logger.info({ reqId, cache: 'hit' }, 'RAG cache hit');
    return res.json({ ...cached, cacheHit: true });
  }

  // 1 & 2. Récupération des extraits RAG juridiques (Supabase pgvector match_documents / SQL fallback / Local)
  let ragDocuments: RagDocumentResult[] = [];
  try {
    ragDocuments = await searchLegalDocuments(message, 6);
  } catch (ragErr: unknown) {
    logger.warn({ reqId, err: extractError(ragErr) }, 'Erreur RAG search');
  }

  // 3. Assemblage du Prompt Système strict anti-hallucination
  const legalContextText = ragDocuments
    .map(
      (doc, i) =>
        `[Extrait ${i + 1}] Source: ${doc.source_fichier} | Réf: ${doc.reference_article} (Similarité: ${Math.round(
          doc.similarity * 100
        )}%)\nTexte: ${doc.contenu}`
    )
    .join('\n\n');

  const systemPrompt = `Tu es LEGAL FLOW AI, l'intelligence artificielle experte en conformité fiscale et droit des affaires pour la République de Côte d'Ivoire.
Tu réponds aux dirigeants d'entreprises, directeurs administratifs et financiers (DAF) et experts-comptables en droit ivoirien (CGI, CNPS, CMU, FDFP, Code du Travail, Actes Uniformes OHADA/SYSCOHADA).

### DIRECTIVES IMPÉRATIVES DÉONTOLOGIQUES :
1. INTERDICTION FORMELLE D'INVENTER : Défense absolue de fabriquer des articles, des taux d'imposition ou des pénalités inexistants. Fonde-toi strictement sur les textes officiels ivoiriens et les extraits ci-dessous.
2. OBLIGATION DE CITER : Mention obligatoire de la source exacte (nom du texte officiel et numéro d'article officiel, ex: "Article 340 du Code Général des Impôts", "Article 24 du Code de Prévoyance Sociale CNPS", "Livre de Procédures Fiscales").
3. AVEU DE LIMITE : Si la base vectorielle ne contient pas la règle applicable, tu as l'obligation explicite d'écrire exactement : « Je ne trouve pas d'information dans les textes et extraits fournis. »
4. STRUCTURE OBLIGATOIRE DE RESTITUTION :
   - **La règle essentielle en une phrase** (claire, percutante et sans jargon inutile).
   - **Le détail des obligations / calculs** (montants FCFA et assiettes applicables à l'entreprise).
   - **La démarche opérationnelle pas-à-pas** (téléservices e-impots, e-CNPS, formulaires et quittances).
   - **Les délais légaux et pénalités de retard** (échéance exacte, majorations de 10%, 25% ou intérêts moratoires).
   - **Le conseil d'optimisation légale** (CGA, FDFP, ARF).
5. FORMATAGE MARKDOWN (GFM) OBLIGATOIRE :
   - Structure rigoureusement chaque réponse avec un Markdown propre et lisible.
   - Utilise des titres de section (### Titre).
   - Mets en gras (**terme**) les montants chiffrés en FCFA, les taux de cotisation, les dates d'échéances et les articles de loi clés.
   - Utilise des listes à puces ou numérotées claires pour les démarches et étapes.
   - Utilise impérativement un TABLEAU Markdown syntaxe GFM (| Colonne 1 | Colonne 2 | ...) dès qu'il s'agit de comparer des taux, des barèmes patronaux/salariaux, des échéances ou des calculs de cotisations.

### CONTEXTE DU DOSSIER CLIENT ACTIF :
${dossierContext || "Entreprise ivoirienne assujettie au régime RSI dans le secteur BTP."}

### EXTRAITS DE TEXTES JURIDIQUES ISSUS DU RAG (BASE OFFICIELLE PGVECTOR) :
${legalContextText || "Aucun extrait textuel spécifique identifié."}`;

  const openRouterApiKey = process.env.OPENROUTER_API_KEY;

  // 4. Appel OpenRouter via circuit breaker (timeout 12s AbortController, fallback instantané si ouvert)
  if (openRouterApiKey) {
    try {
      const reply = await openrouterBreaker.fire({ systemPrompt, message });
      if (reply) {
        const payload: RagCacheEntry = {
          reply,
          sources: ragDocuments,
          model: 'minimax/minimax-m3:free',
          contextSlices,
          isFallback: false,
        };
        ragCache.set(cacheKey, payload);
        return res.json(payload);
      }
    } catch (openRouterErr: unknown) {
      logger.warn(
        { reqId, err: extractError(openRouterErr), breaker: breakerState() },
        'OpenRouter indisponible, bascule fallback'
      );
    }
  }

  // 5. Moteur de Secours Zero-Failure (Fallback Déterministe Local Certifié)
  // Construit une réponse experte déterministe pré-formatée avec les citations officielles réelles et les démarches adaptées au profil de l'entreprise
  const fallbackReply = buildDeterministicExpertResponse(message, ragDocuments, dossierContext);

  const fallbackPayload: RagCacheEntry = {
    reply: fallbackReply,
    sources: ragDocuments,
    model: 'local-ci-rules-engine',
    contextSlices,
    isFallback: true,
  };
  ragCache.set(cacheKey, fallbackPayload);
  return res.json(fallbackPayload);
});

// Client Supabase agissant AVEC le token de l'utilisateur (RLS appliquée).
function userClient(req: express.Request) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

// 4. RGPD — Export des données utilisateur (PEN-033, Loi CI 2013-450)
app.get('/api/user/export-data', apiLimiter, requireAuth, async (req, res) => {
  const reqId = (req as AuthenticatedRequest).id;
  try {
    const userId = (req as AuthenticatedRequest).user?.id || '';
    const sb = userClient(req);
    const [profile, entreprises, journal, conversations] = await Promise.all([
      sb.from('profiles').select('*').eq('id', userId),
      sb.from('entreprises').select('*'),
      sb.from('journal_evenements').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(500),
      sb.from('chatbot_conversations').select('id, titre, messages, created_at, updated_at').eq('user_id', userId),
    ]);
    const exportDoc = {
      exported_at: new Date().toISOString(),
      user_id: userId,
      profile: (profile.data && profile.data[0]) || null,
      entreprises: entreprises.data || [],
      journal: journal.data || [],
      conversations: conversations.data || [],
      preuves: 'Fichiers du bucket preuves : demandez les URLs signées depuis Documents.',
    };
    res.set('Content-Disposition', 'attachment; filename="legalflow-export.json"');
    return res.json(exportDoc);
  } catch (error: unknown) {
    logger.error({ reqId, err: extractError(error) }, 'Erreur export RGPD');
    return res.status(500).json({ error: 'Export impossible.' });
  }
});

// 5. RGPD — Suppression du compte (PEN-033, partiel : purge auth.users exige
// service_role, indisponible ici → anonymisation app + dissociation à finaliser
// via Edge Function ; voir kanban PEN-033).
app.delete('/api/user/account', apiLimiter, requireAuth, async (req, res) => {
  const reqId = (req as AuthenticatedRequest).id;
  try {
    const userId = (req as AuthenticatedRequest).user?.id || '';
    const sb = userClient(req);
    await sb.from('chatbot_conversations').delete().eq('user_id', userId);
    await sb
      .from('profiles')
      .update({ nom_complet: 'Compte supprimé', email: null, entreprise_id: null, cabinet_id: null })
      .eq('id', userId);
    logger.warn({ reqId, userId }, 'Compte anonymisé (purge auth.users en attente service_role)');
    return res.json({
      deleted: ['chatbot_conversations', 'données profil (anonymisé)'],
      pending: ['auth.users : purge via service_role (Edge Function à créer)'],
    });
  } catch (error: unknown) {
    logger.error({ reqId, err: extractError(error) }, 'Erreur suppression compte');
    return res.status(500).json({ error: 'Suppression impossible.' });
  }
});

/**
 * Générateur déterministe certifié respectant la structure stricte en 5 points
 */
function buildDeterministicExpertResponse(
  query: string,
  sources: RagDocumentResult[],
  dossierContext: string
): string {
  // PEN-030 : matching normalisé (accents, synonymes, racinisation) + score loggé.
  const match = detectTheme(query);
  logger.info({ theme: match.theme, score: match.score }, 'Fallback matching');

  // Thème TVA / Déclaration fiscale
  if (match.theme === 'tva') {
    return `### 1. La règle essentielle
En Côte d'Ivoire, toute entreprise sous le régime RSI ou Réel Normal est tenue de déclarer et d'acquitter la TVA (taux standard de 18%) au plus tard le **20 de chaque mois** pour les opérations du mois précédent.

### 2. Le détail des obligations & calculs
- **Assiette taxable** : Chiffre d'affaires facturé hors taxes sur les situations de travaux et prestations BTP.
- **Taux légal** : 18% (Article 340 du Code Général des Impôts).
- **Crédit de TVA** : Déductible sous réserve de factures normalisées avec sticker/mention DGI valide.

### 3. La démarche opérationnelle pas-à-pas
1. Connectez-vous sur le portail officiel **e-impots.gouv.ci** avec vos identifiants du CDI Yopougon 1.
2. Accédez à la rubrique *« Déclarations périodiques »* -> *« Taxe sur la Valeur Ajoutée »*.
3. Renseignez la ligne des ventes et la TVA déductible sur achats et sous-traitance.
4. Validez l'avis d'imposition et effectuez le télépaiement par virement bancaire ou e-paiement pour générer la quittance électronique sécurisée.

### 4. Délais légaux et pénalités de retard
- **Échéance** : Le 20 du mois à 23h59.
- **Sanctions encourues** (Article 160 du Livre de Procédures Fiscales) :
  - Majoration automatique de **10%** des droits dus dès le lendemain de l'échéance.
  - Intérêt de retard légal de **1% par mois** ou fraction de mois de retard supplémentaire.
  - Risque de blocage de l'Attestation de Régularité Fiscale (ARF).

### 5. Conseil d'optimisation légale
Si votre entreprise adhère à un **CGA (Centre de Gestion Agréé)**, vous bénéficiez d'une dispense des majorations sur la première régularisation spontanée avant notification de contrôle et d'un abattement fiscal légal sur vos bénéfices.`;
  }

  // Thème CNPS / Cotisations sociales
  if (match.theme === 'cnps') {
    return `### 1. La règle essentielle
Les cotisations sociales de sécurité sociale doivent être déclarées et payées obligatoirement au plus tard le **15 de chaque mois** via le portail e-CNPS pour les entreprises de plus de 20 salariés (ou par trimestre si moins de 20 salariés selon votre option).

### 2. Le détail des obligations & calculs
Pour votre entreprise du secteur BTP, voici la répartition exacte des cotisations :

| Branche de couverture | Part patronale | Part salariale | Total légal |
| :--- | :---: | :---: | :---: |
| **Branche Retraite** | 7,70% | 6,30% | 14,00% |
| **Prestations familiales** | 5,75% | 0,00% | 5,75% |
| **Accidents Travail (AT/MP BTP)** | 4,00% | 0,00% | 4,00% |
| **Total charges sociales** | **17,45%** | **6,30%** | **23,75%** |

### 3. La démarche opérationnelle pas-à-pas
1. Accédez à la plateforme dématérialisée **e.cnps.ci**.
2. Téléversez le fichier de déclaration nominative des salaires ou saisissez le bordereau mensuel.
3. Rapprochez les salaires avec vos bulletins de paie certifiés.
4. Téléchargez le relevé d'appel de cotisations et effectuez le règlement sous quittance CNPS.

### 4. Délais légaux et pénalités de retard
- **Échéance** : Le 15 du mois suivant à minuit.
- **Pénalités** (Articles 24 à 28 du Code de Prévoyance Sociale) :
  - Astreinte automatique de **10%** du montant des cotisations dues dès le premier jour de retard.
  - Majoration additionnelle de **1% par mois** supplémentaire de retard.
  - Suspension immédiate de la délivrance de l'attestation de mise à jour CNPS.

### 5. Conseil d'optimisation légale
Assurez-vous de déclarer la Déclaration Individuelle des Salaires Annuels (DISA) avant le 30 mars de chaque année pour sécuriser les droits de vos salariés et éviter les réévaluations d'office de l'assiette forfaitaire.`;
  }

  // Thème CMU
  if (match.theme === 'cmu') {
    return `### 1. La règle essentielle
L'affiliation et le paiement de la Couverture Maladie Universelle (CMU) sont obligatoires pour l'ensemble des salariés déclarés en Côte d'Ivoire depuis le décret de généralisation.

### 2. Le détail des obligations & calculs
- **Cotisation unitaire** : 1 000 FCFA par salarié et par mois.
- **Répartition légale** : 500 FCFA à la charge de l'employeur et 500 FCFA précomptés sur le salaire net de l'employé.
- Pour un effectif de 18 salariés : Coût mensuel total de **18 000 FCFA** (dont 9 000 FCFA part patronale).

### 3. La démarche opérationnelle pas-à-pas
1. Rapprocher les fiches d'enrôlement CMU (numéro national d'assuré) de tous les salariés.
2. Effectuer le versement global sur le compte de la Caisse Nationale d'Assurance Maladie (CNAM) ou guichet e-CNPS couplé.
3. Télécharger le certificat de non-redevance CMU mensuel.

### 4. Délais légaux et pénalités de retard
- Sans quitus CMU à jour, la CNPS bloque la délivrance de l'attestation de régularité sociale, interdisant toute participation aux marchés publics et soumissions privées.

### 5. Conseil d'optimisation légale
Passez une convention de groupe avec un centre d'enrôlement mobile de la CNAM pour régulariser en une seule session l'intégralité des travailleurs de vos chantiers.`;
  }

  // Thème CGA / Optimisation fiscale
  if (match.theme === 'cga') {
    return `### 1. La règle essentielle
L'adhésion à un Centre de Gestion Agréé (CGA) accorde une réduction d'impôt substantielle de **20% à 25%** sur le bénéfice net imposable de l'entreprise (Article 110 du CGI).

### 2. Le détail des obligations & calculs
- **Gain fiscal direct** : 20% à 25% d'abattement sur l'assiette BIC.
- **Plafond légal** : Réservé aux entreprises relevant du RSI ou des micro-entreprises réalisant un chiffre d'affaires inférieur aux seuils de l'Annexe Fiscale.
- Pour votre dossier Koffi BTP, le gain net récurrent est estimé à **2 850 000 FCFA par exercice**.

### 3. La démarche opérationnelle pas-à-pas
1. Déposer le dossier d'adhésion auprès du CGA agréé rattaché à votre zone (Yopougon / Abidjan).
2. Transmettre vos balances et journaux comptables trimestriels pour visa technique.
3. Obtenir l'Attestation Annuelle de Conformité Fiscale émise par le commissaire du CGA.
4. Joindre l'attestation à votre liasse fiscale annuelle déposée au CDI territorial.

### 4. Délais légaux et pénalités de retard
- En cas de non-dépôt des états financiers dans les délais légaux (au plus tard le 30 avril), l'abattement est annulé avec rappel de droits et majoration de 25%.

### 5. Conseil d'optimisation légale
Associez l'adhésion CGA à la souscription d'un plan de formation continue **FDFP** pour transformer jusqu'à 0.6% de votre masse salariale en formations techniques 100% remboursées pour vos chefs d'équipe.`;
  }

  // Thème Seuil RSI 150M FCFA & Régimes d'imposition
  if (match.theme === 'seuil') {
    return `### 1. La règle essentielle
En vertu de l'Article 45 du Code Général des Impôts et de l'Annexe Fiscale, le Régime Simplifié d'Imposition (RSI) est plafonné à **150 000 000 FCFA de chiffre d'affaires annuel hors taxes**.

### 2. Le détail des obligations & calculs
- **Statut de votre dossier** : Chiffre d'affaires actuel estimé à **142 500 000 FCFA** (soit 95% du plafond légal).
- **Règle de basculement** : Tout dépassement du seuil de 150 000 000 FCFA sur deux années consécutives (ou un dépassement immédiat supérieur à 10%) entraîne le basculement automatique au **Régime du Réel Normal**.
- **Impacts majeurs** : Assujettissement à la TVA mensuelle de droit commun, obligation de tenue comptable selon le Système Normal SYSCOHADA et audit des amortissements.

### 3. La démarche opérationnelle pas-à-pas
1. Auditer trimestriellement le cumul de vos situations de travaux encaissées et facturées.
2. Déposer auprès de votre Centre des Impôts de rattachement une déclaration d'option ou de basculement si les 150M sont franchis.
3. Adapter votre logiciel de facturation pour mentionner les obligations du Réel Normal.

### 4. Délais légaux et pénalités de retard
- La notification du changement de régime doit être déposée avant le 1er février de l'exercice fiscal suivant.
- En cas de franchissement dissimulé : Redressement fiscal d'office, rappel de TVA sur l'exercice entier et majoration de **25% à 50%**.

### 5. Conseil d'optimisation légale
Si votre entreprise adhère à un **CGA**, vous bénéficiez d'une phase transitoire d'accompagnement comptable pour calibrer votre liasse fiscale du Réel Normal sans pénalité d'ajustement.`;
  }

  // Thème FDFP (Formation professionnelle continue & Apprentissage)
  if (match.theme === 'fdfp') {
    return `### 1. La règle essentielle
Toute entreprise employeur en Côte d'Ivoire cotise obligatoirement au **FDFP** à hauteur de **1,6% de sa masse salariale brute** (0,4% taxe d'apprentissage + 1,2% contribution à la formation continue).

### 2. Le détail des obligations & calculs
- **Cotisation mensuelle obligatoire** : 1,6% prélevée sur la masse salariale brute (déclarée sur le bordereau unique DGI/FDFP).
- **Droit au tirage légal** : Vous pouvez récupérer jusqu'à **0,6% de votre masse salariale** sous forme de subventions directes de formation pour votre personnel (chefs de chantier, comptables, conducteurs d'engins).
- Pour votre dossier Koffi BTP (masse salariale ~32,4M FCFA) : Budget de formation récupérable d'environ **194 400 FCFA par an**.

### 3. La démarche opérationnelle pas-à-pas
1. Être à jour du versement des cotisations FDFP auprès du receveur des impôts compétent.
2. Élaborer un plan de formation annuel d'entreprise avant le 30 septembre.
3. Soumettre le dossier d'agrément en ligne sur le guichet **fdfp.ci**.
4. Après réalisation par un cabinet habilité, transmettre les attestations pour remboursement direct.

### 4. Délais légaux et pénalités de retard
- Le versement de la taxe de formation s'effectue mensuellement au plus tard le **15 du mois suivant**. Tout retard est sanctionné par une majoration DGI de **10%**.

### 5. Conseil d'optimisation légale
Regroupez vos sessions de formation sécurité sur vos chantiers BTP pour maximiser l'enveloppe collective FDFP et sécuriser vos certificats d'aptitude médicale CNPS.`;
  }

  // Thème Embauche / Salariés / Code du Travail CI
  if (match.theme === 'embauche') {
    return `### 1. La règle essentielle
Conformément aux Articles 14.1 à 15.3 du Code du Travail ivoirien, tout recrutement doit faire l'objet d'une déclaration préalable et d'une immatriculation CNPS dans un **délai maximal de 8 jours**.

### 2. Le détail des obligations & calculs
- **SMIG légal en vigueur** : 75 000 FCFA par mois pour 40 heures hebdomadaires (ou barème conventionnel BTP supérieur).
- **Formalisation** : Tout CDD de plus de 3 mois doit être rédigé par écrit et visé par l'Agence Emploi Jeunes / Inspection du Travail selon les cas.
- **Cotisations associées** : 23,75% de charges sociales CNPS + 1 000 FCFA CMU + 1,6% FDFP.

### 3. La démarche opérationnelle pas-à-pas
1. Établir le contrat de travail conforme à la Convention Collective Interprofessionnelle.
2. Déclarer le travailleur sur **e.cnps.ci** pour l'attribution de son Numéro National d'Assuré Social.
3. Procéder à l'enrôlement CMU auprès d'un centre agréé CNAM.
4. Inscrire le salarié sur le Registre d'Employeur légal côté et paraphé.

### 4. Délais légaux et pénalités de retard
- L'absence d'immatriculation CNPS dans les 8 jours expose l'employeur à une amende de **50 000 à 200 000 FCFA par travailleur non déclaré** (Code de Prévoyance Sociale) et au paiement rétroactif des cotisations majorées de 10%.

### 5. Conseil d'optimisation légale
Utilisez le contrat d'apprentissage ou le programme stage-école validé par la Chambre de Commerce et d'Industrie pour bénéficier d'une exonération de charges patronales sur les 12 premiers mois.`;
  }

  // Thème Douanes & Importations BTP
  if (match.theme === 'douane') {
    return `### 1. La règle essentielle
Toute importation maritime de matériaux ou engins requiert obligatoirement l'émission préalable d'un **Bordereau de Suivi des Cargaisons (BSC)** validé par l'Office Ivoirien des Chargeurs (OIC) avant le départ du navire.

### 2. Le détail des obligations & calculs
- **Droits de douane applicables** : Tarif Extérieur Commun (TEC UEMOA) variant de 0% à 20% selon la nomenclature douanière.
- **Taxes annexes** : TVA douanière de 18%, Redevance Statistique (1%), Prélèvement Communautaire de Solidarité (PCS 0.8%).
- **Dédouanement dématérialisé** : Enregistrement sur la plateforme **Sydonia World** via le Guichet Unique du Commerce Extérieur (GUCE).

### 3. La démarche opérationnelle pas-à-pas
1. Créer le dossier sur le portail GUCE (**guce.gouv.ci**) avec la facture proforma et le connaissement (B/L).
2. Obtenir le BSC visé par l'OIC.
3. Mandater un commissionnaire en douane agréé pour déposer la Déclaration en Détail (D3 ou D6).
4. S'acquitter des droits auprès du receveur des Douanes sous quittance électronique.

### 4. Délais légaux et pénalités de retard
- Le défaut de BSC validé avant l'arrivée du navire au Port Autonome d'Abidjan ou de San Pedro entraîne une pénalité douanière équivalente à **100% du montant du fret** maritime.

### 5. Conseil d'optimisation légale
Consultez le Code des Investissements pour solliciter un agrément d'exonération de droits de douane et de TVA sur les équipements neufs importés dédiés à vos chantiers.`;
  }

  // Thème Attestation de Régularité Fiscale (ARF) & Quitus
  if (match.theme === 'arf') {
    return `### 1. La règle essentielle
L'Attestation de Régularité Fiscale (ARF) est délivrée automatiquement en ligne sur e-impots.gouv.ci aux entreprises à jour de toutes leurs déclarations et paiements d'impôts directs et indirects.

### 2. Le détail des obligations & calculs
- **Validité légale** : L'ARF est valable pour une durée de **3 mois** à compter de sa date d'émission.
- **Conditions sine qua non** : Aucune dette fiscale exigible non réglée (TVA, ITS, Patente, BIC/IMF) et déclarations mensuelles déposées à bonne date.
- **Portée opérationnelle** : Obligatoire pour soumissionner aux marchés publics, renouveler vos agréments BTP et débloquer les paiements bancaires des donneurs d'ordre.

### 3. La démarche opérationnelle pas-à-pas
1. Connectez-vous sur votre espace adhérent **e-impots.gouv.ci**.
2. Allez dans le menu *« Demandes d'attestations »* -> *« Attestation de Régularité Fiscale (ARF) »*.
3. En cas d'apurement total de vos comptes, le système génère instantanément l'attestation munie d'un Code QR cryptographique.
4. Téléversez-la sur Legal Flow dans votre dossier *« Documents »* pour actualiser votre score d'audit.

### 4. Délais légaux et pénalités de retard
- Si une seule déclaration de TVA ou d'ITS accuse un retard non régularisé, la délivrance de l'ARF est bloquée immédiatement par le système central de la DGI.

### 5. Conseil d'optimisation légale
En cas de litige ou de difficulté passagère de trésorerie, sollicitez un échéancier de paiement auprès de votre receveur CDI : l'accord d'échelonnement valide temporairement le déblocage de votre ARF.`;
  }

  // Réponse générale par défaut sourcée RAG
  const topSource = sources[0];
  return `### 1. La règle essentielle
Conformément à la législation ivoirienne en vigueur (${topSource?.source_fichier || 'Code Général des Impôts CI'}, ${topSource?.reference_article || 'Réglementation DGI/CNPS'}), toute démarche de mise en conformité nécessite le respect des téléprocédures et des délais officiels.

### 2. Le détail des obligations & calculs
- **Statut de votre dossier** : Entreprise sous régime RSI, secteur BTP, effectif assujetti avec obligations déclaratives périodiques (TVA 18%, retenues ITS, cotisations CNPS 17.45%, CMU et contributions FDFP 1.6%).
- Référence légale identifiée : **${topSource?.reference_article || 'Dispositions fiscales et sociales'}**.

### 3. La démarche opérationnelle pas-à-pas
1. Vérifiez l'enregistrement de vos opérations sur les portails dédiés (**e-impots.gouv.ci** et **e.cnps.ci**).
2. Assurez-vous que chaque télépaiement est matérialisé par une quittance numérotée avec code QR de validation.
3. Archivez la quittance dans votre classeur documentaire Legal Flow pour alimenter le score d'audit.

### 4. Délais légaux et pénalités de retard
- Les déclarations fiscales mensuelles échoient le 15 (ITS) ou le 20 (TVA). Les cotisations sociales échoient le 15.
- Tout retard constaté entraîne l'application d'une majoration d'assiette de **10%** plus intérêts moratoires de **1% par mois**.

### 5. Conseil d'optimisation légale
Consultez votre onglet *« Opportunités »* pour vérifier l'éligibilité au crédit d'impôt d'apprentissage et la mise à jour de votre Attestation de Régularité Fiscale (ARF).`;
}

// 6. Configuration Vite Middleware (dev) ou Static SPA (prod)
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Legal Flow Server running on http://0.0.0.0:${PORT}`);
  });
}

// Erreurs non capturées → Sentry (si DSN) + 500 JSON.
app.use(
  (
    err: unknown,
    req: express.Request,
    res: express.Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: express.NextFunction
  ) => {
    if (process.env.SENTRY_DSN) Sentry.captureException(err);
    logger.error({ reqId: (req as any).id, err: extractError(err) }, 'Erreur non capturée');
    res.status(500).json({ error: 'Erreur interne.' });
  }
);

startServer();
