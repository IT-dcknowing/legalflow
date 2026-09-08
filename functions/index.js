/**
 * Webhook WhatsApp Business — Legal Flow (vraie IA RAG).
 *
 * GET  /webhook : vérification Meta (hub.mode / hub.verify_token / hub.challenge).
 * POST /webhook : valide X-Hub-Signature-256, parse les messages, répond via
 *                 le moteur Legal Flow (RAG Supabase + OpenRouter, repli
 *                 déterministe local) + API WhatsApp.
 *                 Répond TOUJOURS 200 OK à Meta (sinon retries).
 *
 * Secrets JAMAIS en dur : tout passe par l'environnement (.env local gitignoré,
 * variables déployées via `firebase deploy`, voir .env.example).
 */
const functions = require('firebase-functions');
const express = require('express');
const crypto = require('crypto');
// Note : firebase-admin sera initialisé quand on persistera l'historique
// (Firestore). Pas d'admin.initializeApp() ici : sans credentials,
// il bloque le cold start en appelant le serveur de métadonnées Google.

const app = express();
// Conserve le corps brut pour la vérification HMAC (le JSON parsé ne suffit pas).
app.use(
  express.json({
    limit: '1mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'KeySoc26';
const WHATSAPP_APP_SECRET = process.env.WHATSAPP_APP_SECRET || '';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || '';
const META_API_VERSION = process.env.META_API_VERSION || 'v26.0';
// Moteur IA : RAG Supabase (recherche plein-texte) + OpenRouter.
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'dots-studio/dots-3-note-preview:free';
const OPENROUTER_TIMEOUT_MS = parseInt(process.env.OPENROUTER_TIMEOUT_MS || '25000', 10);
const OPENROUTER_MAX_TOKENS = parseInt(process.env.OPENROUTER_MAX_TOKENS || '900', 10);

if (!process.env.VERIFY_TOKEN) {
  console.warn('[webhook] VERIFY_TOKEN non défini : repli local KeySoc26 (dev uniquement).');
}
if (!WHATSAPP_APP_SECRET) {
  console.warn('[webhook] WHATSAPP_APP_SECRET non défini : signature NON vérifiée (dev uniquement).');
}
if (!OPENROUTER_API_KEY) {
  console.warn('[webhook] OPENROUTER_API_KEY non défini : réponses déterministes locales uniquement.');
}

/**
 * Vérifie l'en-tête X-Hub-Signature-256 (HMAC-SHA256 du corps brut).
 * Sans secret configuré (dev local) : accepte en loggant un avertissement.
 */
function signatureValide(req) {
  if (!WHATSAPP_APP_SECRET) {
    console.warn('[webhook] signature ignorée : aucun App Secret configuré.');
    return true;
  }
  const sig = req.headers['x-hub-signature-256'] || '';
  const expected =
    'sha256=' +
    crypto.createHmac('sha256', WHATSAPP_APP_SECRET).update(req.rawBody || Buffer.alloc(0)).digest('hex');
  if (!sig || sig.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

// --- Vérification du webhook (GET) ---
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook vérifié avec succès !');
    res.status(200).send(challenge);
  } else {
    console.warn('[webhook] vérification refusée (mode/token invalide).');
    res.sendStatus(403);
  }
});

// ---------------------------------------------------------------------------
// Moteur Legal Flow (portage allégé de server/legalRagEngine.ts,
// server/fallback/normalize.ts et de la route /api/chat de server.ts).
// Pas d'embeddings locaux ici (poids trop lourds pour 256 Mo) : recherche
// plein-texte Supabase puis corpus local certifié (zéro-échec).
// ---------------------------------------------------------------------------

const LOCAL_LEGAL_CORPUS = [
  {
    id: 'cgi-art-340',
    source_fichier: 'CGI 2026 TEXT.txt',
    reference_article: 'Article 340 & suivants',
    contenu:
      "Taxe sur la Valeur Ajoutée (TVA) : Les personnes physiques et morales assujetties au Régime Simplifié d'Imposition (RSI) ou au Réel Normal réalisant un chiffre d'affaires supérieur au seuil légal sont tenues de souscrire une déclaration mensuelle au plus tard le 20 de chaque mois sur le portail e-impots.gouv.ci. Taux standard : 18%. Le défaut de déclaration dans les délais entraîne une majoration automatique de 10% des droits dus (Article 160 du Livre de Procédures Fiscales), augmentée d'un intérêt de retard de 1% par mois ou fraction de mois de retard.",
    keywords: ['tva', 'declaration', '20', 'mensuelle', 'e-impots', 'penalite', 'retard', '10%', '1%'],
  },
  {
    id: 'cgi-art-115-its',
    source_fichier: 'CGI 2026 TEXT.txt',
    reference_article: 'Article 115 & Annexe Fiscale 2026',
    contenu:
      "Impôt sur les Traitements et Salaires (ITS) & Retenues à la source : Tout employeur établi en Côte d'Ivoire est tenu d'opérer la retenue de l'impôt sur les salaires payés à son personnel et de la reverser au receveur des impôts compétent au plus tard le 15 du mois suivant sur formulaire fiscal dématérialisé. Les sanctions applicables en cas de non-déclaration ou de retard comprennent une majoration de 25% en cas de récidive ou de retard supérieur à 30 jours.",
    keywords: ['its', 'salaire', 'traitements', 'retenue', 'employeur', '15', 'mensuel'],
  },
  {
    id: 'cnps-art-24-cotisations',
    source_fichier: 'CNPS_Code_Prevoyance_Sociale.txt',
    reference_article: 'Articles 24 à 28 du Code de Prévoyance Sociale',
    contenu:
      "Cotisations de sécurité sociale CNPS : Les cotisations dues au titre des branches Retraite (part patronale 7.7%, part salariale 6.3%), Prestations Familiales (part patronale 5.75%) et Accidents du Travail / Maladies Professionnelles (taux secteur BTP fixé à 4.00% par arrêté interministériel) doivent être déclarées et acquittées au plus tard le 15 du mois suivant via la plateforme e.cnps.ci. Tout mois de retard génère une pénalité d'astreinte de 10% dès le premier jour de retard, plus 1% par mois écoulé.",
    keywords: ['cnps', 'cotisation', 'retraite', 'prestation', 'accident', 'at', 'btp', '15', 'e.cnps.ci', '7.7%', '6.3%'],
  },
  {
    id: 'cmu-decret-2025',
    source_fichier: 'Decret_CMU_Obligatoire_2025.txt',
    reference_article: 'Décret portant généralisation de la Couverture Maladie Universelle (CMU)',
    contenu:
      "Obligation d'assujettissement CMU : Tout employeur du secteur privé a l'obligation légale de veiller à l'enrôlement et au paiement de la cotisation CMU pour l'intégralité de ses salariés déclarés (1 000 FCFA par personne et par mois, dont 500 FCFA part patronale et 500 FCFA part salariale prélevée à la source). La délivrance de l'attestation de régularité CNPS et la soumission aux marchés publics sont désormais conditionnées à l'attestation de non-redevance CMU émise par la CNAM.",
    keywords: ['cmu', 'couverture', 'maladie', '1000', 'cnam', 'quitus', 'enrolement', 'salarie'],
  },
  {
    id: 'cgi-art-110-cga',
    source_fichier: 'CGI 2026 TEXT.txt',
    reference_article: 'Article 110 & Dispositions Incitatives CGA',
    contenu:
      "Avantage fiscal Centre de Gestion Agréé (CGA) : Les entreprises adhérentes à un CGA agréé par la DGI bénéficient d'un abattement de 20% à 25% sur leur assiette de bénéfice imposable (BIC ou impôt forfaitaire RSI). En contrepartie, l'adhérent s'engage à déposer ses états financiers certifiés dans les délais légaux et à respecter une régularité déclarative sans incident. La perte de l'attestation de conformité annuelle du CGA entraîne la révocation rétroactive de l'abattement.",
    keywords: ['cga', 'centre de gestion agree', 'abattement', '20%', '25%', 'bic', 'reduction', 'fiscale', 'benefice'],
  },
  {
    id: 'fdfp-loi-formation',
    source_fichier: 'FDFP_Reglementation_Formation_Continue.txt',
    reference_article: 'Articles 12 à 18 Loi relative au financement de la formation professionnelle continue',
    contenu:
      "Taxe d'apprentissage et contribution à la formation continue FDFP : Les employeurs redevables cotisent mensuellement à hauteur de 0.4% pour la taxe d'apprentissage et 1.2% pour la formation professionnelle continue assise sur la masse salariale brute. Les entreprises à jour de leurs cotisations disposent du droit de soumettre un plan de formation annuel agréé permettant le remboursement direct jusqu'à 0.6% de leur masse salariale sous forme de stages certifiés pour leurs collaborateurs.",
    keywords: ['fdfp', 'formation', 'continue', 'apprentissage', '0.4%', '1.2%', 'remboursement', 'plan de formation'],
  },
  {
    id: 'cgi-regimes-seuils',
    source_fichier: 'CGI 2026 TEXT.txt',
    reference_article: 'Article 45 & Régimes d’imposition',
    contenu:
      "Plafonds des régimes fiscaux en Côte d'Ivoire : Régime de l'Entreprenant : CA inférieur ou égal à 50 000 000 FCFA. Régime des Microentreprises (RME) : CA compris entre 50 000 001 et 150 000 000 FCFA (ou RSI pour prestations et commerces). Régime du Réel Normal : CA supérieur à 150 000 000 FCFA. Tout dépassement du seuil de 150 000 000 FCFA sur deux exercices consécutifs ou dès dépassement de 10% entraîne le basculement automatique sous le régime du Réel Normal avec assujettissement obligatoire à la TVA complète et production d'états financiers selon le Système Normal SYSCOHADA.",
    keywords: ['seuil', 'rsi', 'rme', 'reel normal', '150', '150 000 000', 'bascule', 'chiffre d affaires', 'ca'],
  },
  {
    id: 'code-travail-contrat',
    source_fichier: 'Code_du_Travail_CI.txt',
    reference_article: 'Articles 14.1 à 15.3 du Code du Travail de Côte d’Ivoire',
    contenu:
      "Embauche et formalisation du contrat : Tout contrat de travail à durée déterminée (CDD) excédant trois mois doit obligatoirement être constaté par écrit et mentionner la qualification, le salaire catégoriel selon la Convention Collective Interprofessionnelle et le lieu de travail. La déclaration préalable d'embauche et l'immatriculation du salarié auprès de la CNPS doivent être effectuées dans un délai maximal de huit (8) jours suivant la prise effective de fonction.",
    keywords: ['embauche', 'contrat', 'cdd', 'cdi', 'code du travail', 'declaration', '8 jours', 'convention collective'],
  },
  {
    id: 'douanes-bsc-sydonia',
    source_fichier: 'Code_des_Douanes_UEMOA_CI.txt',
    reference_article: 'Réglementation Portuaire & Guichet Unique du Commerce Extérieur (GUCE)',
    contenu:
      "Importation de matériels et matériaux : Toute marchandise acheminée par voie maritime à destination d'Abidjan ou San Pedro requiert l'obtention préalable d'un Bordereau de Suivi des Cargaisons (BSC) validé par l'OIC avant embarquement. Le dédouanement s'effectue obligatoirement via le système Sydonia World sur déclaration en détail D6/D3 avec application du Tarif Extérieur Commun (TEC) de l'UEMOA, du Prélèvement Communautaire de Solidarité (PCS 0.8%) et de la TVA douanière de 18%.",
    keywords: ['douane', 'bsc', 'sydonia', 'importation', 'guce', 'tec', 'uemoa', 'materiel', 'btp'],
  },
  {
    id: 'syscohada-comptabilite',
    source_fichier: 'SYSCOHADA_Acte_Uniforme_Comptabilite.txt',
    reference_article: 'Articles 17 à 24 de l’Acte Uniforme SYSCOHADA',
    contenu:
      "Obligations comptables et tenue des livres légaux : Toute entité commerciale en Côte d'Ivoire doit tenir un Livre-Journal, un Grand-Livre et un Livre d'Inventaire cotés et paraphés. Pour les entreprises sous le Système Normal (CA > 150M FCFA), les états financiers annuels obligatoires comprennent le Bilan, le Compte de Résultat, le Tableau des Flux de Trésorerie et les Notes Annexes certifiées, à déposer au greffe et aux impôts au plus tard le 30 avril.",
    keywords: ['syscohada', 'comptabilite', 'livre', 'journal', 'grand-livre', 'inventaire', 'bilan', 'etats financiers', '30 avril'],
  },
  {
    id: 'lpf-controles-sanctions',
    source_fichier: 'Livre_de_Procedures_Fiscales_CI.txt',
    reference_article: 'Articles 160 à 175 du Livre de Procédures Fiscales (LPF)',
    contenu:
      "Sanctions et pénalités de contrôle fiscal : Tout retard dans le dépôt d'une déclaration mensuelle entraîne une majoration automatique de 10% des droits dus. En cas de taxation d'office ou de mauvaise foi constatée lors d'un contrôle sur pièces ou vérification générale, la majoration est portée à 25% voire 50%, majorée d'un intérêt de retard de 1% par mois. L'Attestation de Régularité Fiscale (ARF) est immédiatement révoquée jusqu'à apurement complet.",
    keywords: ['lpf', 'procedure', 'controle', 'sanction', 'penalite', '10%', '25%', '50%', 'arf', 'interet', 'retard'],
  },
  {
    id: 'cgi-imf-forfaitaire',
    source_fichier: 'CGI 2026 TEXT.txt',
    reference_article: 'Dispositions relatives à l’impôt minimum forfaitaire (CGI)',
    contenu:
      "Impôt Minimum Forfaitaire (IMF) : impôt plancher dû par les entreprises relevant des régimes concernés en Côte d'Ivoire. Il est STRICTEMENT distinct des retenues sur salaires (ITS, Article 115 du CGI) : quand un dirigeant écrit « IMF » dans un contexte d'entreprise ivoirienne, il s'agit de l'Impôt Minimum Forfaitaire. L'échéance exacte, l'assiette et les modalités de déclaration et de paiement de l'IMF sont fixées par le CGI 2026 : ne citer un article, un taux ou une date que s'ils figurent dans un extrait retrouvé, sinon l'indiquer explicitement au lieu d'inventer.",
    keywords: ['imf', 'impot minimum forfaitaire', 'minimum forfaitaire', 'forfaitaire', 'plancher'],
  },
];

function stemFr(word) {
  let w = word;
  const suffixes = ['ations', 'ation', 'ements', 'ement', 'isses', 'issant', 'euses', 'euse', 'eurs', 'eur', 'aux', 'eaux'];
  for (const s of suffixes) {
    if (w.length > s.length + 3 && w.endsWith(s)) {
      w = w.slice(0, -s.length);
      break;
    }
  }
  if (w.length > 4 && (w.endsWith('s') || w.endsWith('x'))) w = w.slice(0, -1);
  if (w.length > 5 && w.endsWith('e')) w = w.slice(0, -1);
  return w;
}

function normalizeQuery(raw) {
  return String(raw || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map(stemFr)
    .filter(Boolean)
    .join(' ');
}

const THEMES = [
  { id: 'tva', keywords: ['tva', 'impot', 'taxe sur la valeur ajoutée', 'valeur ajoutée', 'déclaration mensuelle', 'crédit tva', 'déductible'] },
  { id: 'cnps', keywords: ['cnps', 'retraite', 'prestations familiales', 'cotisations sociales', 'cotisation', 'accident du travail', 'maladie professionnelle', 'disa', 'branche'] },
  { id: 'cmu', keywords: ['cmu', 'couverture maladie', 'couverture', 'cnam', 'assurance maladie', 'enrôlement', 'quitus'] },
  { id: 'cga', keywords: ['cga', 'centre de gestion agréé', 'abattement', 'réduction', 'crédit', 'crédit d’impôt', 'optimisation', 'optimisation fiscale'] },
  { id: 'seuil', keywords: ['seuil', '150', '150 000 000', 'rsi', 'réel normal', 'régime', 'bascule', 'microentreprise'] },
  { id: 'fdfp', keywords: ['fdfp', 'formation continue', 'formation professionnelle', 'formation', 'apprentissage', 'taxe d’apprentissage', 'plan de formation', 'remboursement'] },
  { id: 'embauche', keywords: ['embauche', 'embaucher', 'contrat', 'cdd', 'cdi', 'smig', 'salaire', 'recrutement', 'immatriculation', 'registre employeur'] },
  { id: 'douane', keywords: ['douane', 'douanes', 'bsc', 'sydonia', 'guce', 'transit', 'importation', 'import', 'exportation', 'dédouanement', 'fret', 'connaissement'] },
  { id: 'arf', keywords: ['arf', 'attestation de régularité', 'attestation fiscale', 'attestation', 'quitus fiscal', 'régularité'] },
  { id: 'imf', keywords: ['imf', 'impot minimum forfaitaire', 'minimum forfaitaire'] },
];

const STEM_CACHE = new Map();
function themeStems(t) {
  let cached = STEM_CACHE.get(t.id);
  if (!cached) {
    cached = [...new Set(t.keywords.map((k) => normalizeQuery(k)).filter(Boolean))];
    STEM_CACHE.set(t.id, cached);
  }
  return cached;
}

function detectTheme(rawQuery) {
  const norm = ' ' + normalizeQuery(rawQuery) + ' ';
  let best = { theme: null, score: 0 };
  for (const theme of THEMES) {
    let score = 0;
    for (const stemKw of themeStems(theme)) {
      if (norm.includes(' ' + stemKw + ' ')) score += stemKw.split(' ').length;
    }
    if (score > best.score) best = { theme: theme.id, score };
  }
  return best;
}

function searchLocalCorpus(query, limit = 6) {
  const queryLower = String(query || '').toLowerCase();
  const scored = LOCAL_LEGAL_CORPUS.map((doc) => {
    let score = 0.55;
    for (const kw of doc.keywords) {
      if (queryLower.includes(kw)) score += 0.08;
    }
    if (queryLower.includes(doc.source_fichier.toLowerCase().replace('.txt', ''))) score += 0.12;
    if (queryLower.includes(doc.reference_article.toLowerCase())) score += 0.15;
    score = Math.min(0.96, Math.max(0.65, score));
    return {
      id: doc.id,
      source_fichier: doc.source_fichier,
      reference_article: doc.reference_article,
      contenu: doc.contenu,
      similarity: parseFloat(score.toFixed(2)),
    };
  });
  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, limit);
}

// Recherche plein-texte Supabase (repli SQL de searchLegalDocuments) via REST.
async function searchSupabaseRest(query, limit = 6) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const keywords = String(query || '')
    .toLowerCase()
    .replace(/[^a-zA-Z0-9àâéèêëîïôùûüç]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3)
    .slice(0, 4);
  if (keywords.length === 0) return null;
  const orFilter = keywords.map((k) => 'contenu.ilike.*' + k + '*').join(',');
  const url =
    SUPABASE_URL +
    '/rest/v1/documents_juridiques?select=id,source_fichier,reference_article,contenu&or=(' +
    encodeURIComponent(orFilter) +
    ')&limit=' +
    limit;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const r = await fetch(url, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY },
      signal: controller.signal,
    });
    if (!r.ok) {
      console.warn('[webhook] Supabase REST HTTP ' + r.status + ', repli local.');
      return null;
    }
    const data = await r.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    return data.map((item, idx) => ({
      id: item.id != null ? String(item.id) : undefined,
      source_fichier: item.source_fichier || 'Code Général des Impôts CI',
      reference_article: item.reference_article || 'Article de Loi',
      contenu: item.contenu || '',
      similarity: 0.88 - idx * 0.04,
    }));
  } catch (e) {
    console.warn('[webhook] Supabase REST indisponible, repli local : ' + (e && e.message ? e.message : e));
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function searchLegalDocuments(query, limit = 6) {
  try {
    const remote = await searchSupabaseRest(query, limit);
    if (remote && remote.length > 0) return remote;
  } catch (e) {
    console.warn('[webhook] recherche Supabase échouée, repli local.');
  }
  return searchLocalCorpus(query, limit);
}

// ---------------------------------------------------------------------------
// LEGAL FLOW CONTEXT ENGINE — mémoire conversationnelle explicite.
// Pipeline : message → compréhension (intent + entités + corrections) →
// mémoire de session → recherche juridique → raisonnement LLM → réponse.
// La mémoire n'est JAMAIS laissée au seul modèle : un état structuré par
// expéditeur est maintenu (Firestore, repli mémoire volatile) et injecté
// dans chaque appel LLM.
// ---------------------------------------------------------------------------

const SESSION_TTL_MS = 24 * 3600 * 1000;
const HISTORY_MAX = 12;
const HISTORY_FOR_LLM = 6;

// Acronymes fiscaux ivoiriens : la désambiguïsation est EXPLICITE.
// On ne devine jamais silencieusement (ex : IMF ≠ ITS).
const ACRONYMS = {
  IMF: { full: 'Impôt minimum forfaitaire', aliases: ['imf', 'impot minimum forfaitaire', 'minimum forfaitaire'], notToConfuse: 'les retenues sur salaires (ITS)' },
  ITS: { full: 'Impôt sur les traitements et salaires', aliases: ['its', 'retenue sur salaire', 'retenues sur salaires'] },
  TVA: { full: 'Taxe sur la valeur ajoutée', aliases: ['tva', 'taxe sur la valeur ajoutee'] },
  CNPS: { full: 'Caisse nationale de prévoyance sociale', aliases: ['cnps'] },
  CMU: { full: 'Couverture maladie universelle', aliases: ['cmu', 'couverture maladie'] },
  CGA: { full: 'Centre de gestion agréé', aliases: ['cga', 'centre de gestion agree'] },
  FDFP: { full: 'Fonds de développement de la formation professionnelle', aliases: ['fdfp', 'formation professionnelle'] },
  ARF: { full: 'Attestation de régularité fiscale', aliases: ['arf', 'attestation de regularite'] },
  DISA: { full: 'Déclaration individuelle des salaires annuels', aliases: ['disa'] },
  BIC: { full: 'Bénéfice industriel et commercial', aliases: ['bic'] },
  RSI: { full: 'Régime simplifié d’imposition', aliases: ['rsi', 'regime simplifie'] },
  RME: { full: 'Régime des microentreprises', aliases: ['rme', 'microentreprise'] },
  CGI: { full: 'Code général des impôts', aliases: ['cgi', 'code general des impots'] },
  LPF: { full: 'Livre de procédures fiscales', aliases: ['lpf'] },
  BSC: { full: 'Bordereau de suivi des cargaisons', aliases: ['bsc'] },
};

// Taxonomie des intentions (mots normalisés sans accents).
const INTENTS = [
  { id: 'PAYMENT_DEADLINE', hints: 'échéance paiement déclaration date versement', keywords: ['quand', 'moment', 'date', 'echeance', 'delai', 'limite', 'paie', 'paiement', 'payer', 'verse', 'acquitte', 'avant quand'] },
  { id: 'RATE', hints: 'taux montant pourcentage', keywords: ['taux', 'pourcent', 'pourcentage', 'quel montant'] },
  { id: 'CALCULATION', hints: 'calcul assiette base montant', keywords: ['calcul', 'calcule', 'combien', 'assiette', 'base de calcul', 'coute'] },
  { id: 'ELIGIBILITY', hints: 'conditions éligibilité droit', keywords: ['eligible', 'eligibilite', 'droit', 'puis', 'conditions', 'qui peut', 'concerne'] },
  { id: 'EXEMPTION', hints: 'exonération dispense', keywords: ['exempte', 'exoneration', 'dispense', 'exonere'] },
  { id: 'PENALTY', hints: 'pénalités sanctions retard majoration', keywords: ['penalite', 'sanction', 'majoration', 'amende', 'retard', 'risque', 'oubli', 'pas paye'] },
  { id: 'DECLARATION', hints: 'déclaration formulaire télédéclaration', keywords: ['declarer', 'declaration', 'formulaire', 'teledeclarer', 'depot', 'depose'] },
  { id: 'PROCEDURE', hints: 'démarche procédure étapes', keywords: ['demarche', 'procedure', 'etape', 'comment faire', 'pas a pas', 'comment proceder'] },
  { id: 'LEGAL_BASIS', hints: 'article texte loi référence', keywords: ['article', 'texte', 'loi', 'base legale', 'reference', 'quelle loi', 'stipule'] },
  { id: 'DOCUMENTS_REQUIRED', hints: 'documents pièces justificatifs', keywords: ['document', 'piece', 'quittance', 'fournir', 'attestation', 'justificatif', 'papier'] },
  { id: 'GREETING', hints: '', keywords: ['bonjour', 'salut', 'hello', 'bonsoir', 'coucou', 'bjr'] },
  { id: 'EXPLAIN', hints: '', keywords: [] },
];

const CORRECTION_PATTERNS = [
  /je parle (de|d')/i, /je parlais (de|d')/i, /je voulais dire/i,
  /\bnon\b[,.]?\s+\S/i, /ce n'est pas/i, /c'est pas/i, /pas .* mais /i,
  /plut[oô]t/i, /tu te trompes/i, /vous vous trompez/i, /erreur/i,
  /je me suis (mal exprim|tromp)/i, /mauvais(e)? (sujet|reponse|interpr)/i,
];

function detectIntent(normalizedText) {
  const padded = ' ' + normalizedText + ' ';
  const words = normalizedText.split(/\s+/).filter(Boolean);
  const wordHit = (kw) => {
    for (const w of words) {
      if (w === kw) return true;
      // Racines asymétriques (calcul/calculer, paie/paiement) : préfixe croisé.
      if (kw.length >= 4 && w.startsWith(kw)) return true;
      if (w.length >= 4 && kw.startsWith(w)) return true;
    }
    return false;
  };
  let best = { id: 'EXPLAIN', score: 0 };
  for (const intent of INTENTS) {
    if (intent.id === 'EXPLAIN') continue;
    let score = 0;
    for (const kw of intentKeywordStems(intent)) {
      if (kw.includes(' ')) {
        if (padded.includes(kw)) score += 2;
      } else if (wordHit(kw)) {
        score += 1;
      }
    }
    if (score > best.score) best = { id: intent.id, score };
  }
  return best;
}

// Mots-clés racinisés des deux côtés (même pattern que themeStems).
const INTENT_STEM_CACHE = new Map();
function intentKeywordStems(intent) {
  let cached = INTENT_STEM_CACHE.get(intent.id);
  if (!cached) {
    cached = [...new Set(intent.keywords.map((k) => normalizeQuery(k)).filter(Boolean))];
    INTENT_STEM_CACHE.set(intent.id, cached);
  }
  return cached;
}

const ACRONYM_STEM_CACHE = new Map();
function acronymStems(code) {
  let cached = ACRONYM_STEM_CACHE.get(code);
  if (!cached) {
    cached = [...new Set(ACRONYMS[code].aliases.map((a) => normalizeQuery(a)).filter(Boolean))];
    ACRONYM_STEM_CACHE.set(code, cached);
  }
  return cached;
}

function detectAcronyms(rawText, normalizedText) {
  const upper = ' ' + String(rawText || '').toUpperCase() + ' ';
  const padded = ' ' + normalizedText + ' ';
  const found = [];
  for (const code of Object.keys(ACRONYMS)) {
    const entry = ACRONYMS[code];
    if (upper.includes(' ' + code + ' ')) {
      found.push({ code, ...entry });
      continue;
    }
    for (const alias of acronymStems(code)) {
      if (padded.includes(' ' + alias + ' ') || (alias.includes(' ') && padded.includes(alias))) {
        found.push({ code, ...entry });
        break;
      }
    }
  }
  return found;
}

function isCorrectionMessage(rawText) {
  return CORRECTION_PATTERNS.some((re) => re.test(String(rawText || '')));
}

function isQuestionLike(rawText) {
  const t = String(rawText || '');
  return t.includes('?') || /^(quand|comment|quel|quelle|combien|pourquoi|ou|qui|quoi|est-ce|quel est)/i.test(t.trim());
}

/** Extrait le concept corrigé (« je parle de X » → X), null sinon. */
function extractCorrectionTopic(rawText) {
  const t = String(rawText || '');
  const m = t.match(/je parl(?:e|ais) (?:de|d')(.+)$/i) || t.match(/je voulais dire[\s:]+(.+)$/i);
  if (!m) return null;
  return m[1].replace(/[.?!\s]+$/g, '').trim().slice(0, 120) || null;
}

function canonicalizeConcept(raw) {
  const norm = normalizeQuery(raw || '');
  const padded = ' ' + norm + ' ';
  for (const code of Object.keys(ACRONYMS)) {
    const entry = ACRONYMS[code];
    if (padded.includes(' ' + code.toLowerCase() + ' ')) return { full: entry.full, aliases: entry.aliases };
    for (const alias of acronymStems(code)) {
      if (padded.includes(' ' + alias + ' ')) return { full: entry.full, aliases: entry.aliases };
    }
  }
  const clean = String(raw || '').trim().slice(0, 80);
  return { full: clean || 'sujet précisé par l’utilisateur', aliases: [] };
}

function blankConversationState() {
  return {
    jurisdiction: "Côte d'Ivoire",
    legal_domain: 'Fiscalité',
    topic: null,
    topic_aliases: [],
    tax_regime: 'RSI',
    tax_year: 2026,
    user_intent: null,
    conversation_stage: 'new',
    previous_question: null,
    user_correction: null,
    active_document: 'CGI 2026',
    requires_source_verification: true,
    entities: [],
    corrections: [],
    history: [],
    updatedAt: Date.now(),
  };
}

// --- Stockage des sessions : Firestore, repli mémoire volatile ---------------
const memorySessions = new Map();
let firestoreDb = null;
let firestoreTried = false;

function getFirestore() {
  if (firestoreDb || firestoreTried) return firestoreDb;
  firestoreTried = true;
  try {
    const admin = require('firebase-admin');
    if (admin.apps.length === 0) admin.initializeApp();
    firestoreDb = admin.firestore();
  } catch (e) {
    console.warn('[context] Firestore indisponible, mémoire volatile : ' + (e && e.message ? e.message : e));
    firestoreDb = null;
  }
  return firestoreDb;
}

async function getSession(phone) {
  const key = phone || 'unknown';
  const now = Date.now();
  const mem = memorySessions.get(key);
  if (mem && now - mem.updatedAt < SESSION_TTL_MS) return mem;
  const db = getFirestore();
  if (db) {
    try {
      const snap = await db.collection('whatsapp_sessions').doc(key).get();
      if (snap.exists) {
        const data = snap.data() || {};
        if (data && now - (data.updatedAt || 0) < SESSION_TTL_MS) {
          memorySessions.set(key, data);
          return data;
        }
      }
    } catch (e) {
      console.warn('[context] lecture session impossible : ' + (e && e.message ? e.message : e));
    }
  }
  const fresh = blankConversationState();
  memorySessions.set(key, fresh);
  return fresh;
}

async function saveSession(phone, state) {
  const key = phone || 'unknown';
  state.updatedAt = Date.now();
  memorySessions.set(key, state);
  const db = getFirestore();
  if (db) {
    try {
      await db.collection('whatsapp_sessions').doc(key).set(state);
    } catch (e) {
      console.warn('[context] sauvegarde session impossible : ' + (e && e.message ? e.message : e));
    }
  }
}

/** Met à jour l'état (jamais remplacé) à partir du nouveau message. */
function updateConversationState(state, text) {
  const norm = normalizeQuery(text);
  const intent = detectIntent(norm);
  const acronyms = detectAcronyms(text, norm);
  const correction = isCorrectionMessage(text);

  state.history.push({ role: 'user', text: String(text).slice(0, 500), at: Date.now() });
  if (state.history.length > HISTORY_MAX) state.history = state.history.slice(-HISTORY_MAX);

  if (correction) {
    const extracted = extractCorrectionTopic(text);
    const prevTopic = state.topic;
    if (extracted) {
      const canon = canonicalizeConcept(extracted);
      state.topic = canon.full;
      state.topic_aliases = canon.aliases;
    }
    state.user_correction = String(text).slice(0, 300);
    state.conversation_stage = 'clarified';
    if (intent.id !== 'EXPLAIN') state.user_intent = intent.id;
    state.corrections.push({
      error: prevTopic ? '« ' + prevTopic + ' » mal interprété' : 'interprétation initiale contestée',
      fix: state.topic || extracted || 'précision utilisateur',
      at: Date.now(),
      priority: 'tres_elevee',
    });
    if (state.corrections.length > 5) state.corrections = state.corrections.slice(-5);
    return { intent, acronyms, isCorrection: true };
  }

  if (acronyms.length > 0) {
    if (!state.topic) {
      state.topic = acronyms[0].full;
      state.topic_aliases = acronyms[0].aliases;
    }
    for (const a of acronyms) {
      if (!state.entities.includes(a.code)) state.entities.push(a.code);
    }
  }
  // Continuité : sans intention détectée, on conserve l'intention en cours.
  if (intent.id !== 'EXPLAIN') state.user_intent = intent.id;
  if (isQuestionLike(text)) state.previous_question = String(text).slice(0, 300);
  if (state.conversation_stage === 'new') state.conversation_stage = 'ongoing';
  return { intent, acronyms, isCorrection: false };
}

/** Acronyme nu sans intention : on demande au lieu d'inventer. */
function needsClarification(upd, text) {
  if (upd.isCorrection) return false;
  if (upd.intent.score > 0) return false;
  if (upd.acronyms.length === 0) return false;
  const words = normalizeQuery(text).split(/\s+/).filter(Boolean);
  return words.length <= 6;
}

function buildClarificationReply(upd) {
  const options = upd.acronyms.map((a) => '« ' + a.code + ' » = ' + a.full).join(' ; ');
  return (
    'Pour être sûr de bien vous répondre : par ' + options + ' ?\n' +
    'Précisez aussi ce que vous voulez savoir : l’échéance, le calcul, les conditions ou les pénalités.'
  );
}

/** Requête de recherche enrichie : question + sujet conservé + intention. */
function expandQueryForRetrieval(question, state, upd) {
  const parts = [question];
  if (state.topic) parts.push(state.topic);
  for (const a of upd.acronyms) parts.push(a.full);
  const intentDef = INTENTS.find((i) => i.id === (upd.intent.id !== 'EXPLAIN' ? upd.intent.id : state.user_intent));
  if (intentDef && intentDef.hints) parts.push(intentDef.hints);
  return parts.join(' ').slice(0, 1000);
}

function intentLabel(id) {
  const labels = {
    PAYMENT_DEADLINE: 'échéance de paiement', RATE: 'taux applicable', CALCULATION: 'calcul',
    ELIGIBILITY: 'éligibilité', EXEMPTION: 'exonération', PENALTY: 'pénalités',
    DECLARATION: 'déclaration', PROCEDURE: 'démarche pas-à-pas', LEGAL_BASIS: 'base légale',
    DOCUMENTS_REQUIRED: 'documents requis', GREETING: 'salutation', EXPLAIN: 'explication',
  };
  return labels[id] || 'explication';
}

/** Bloc injecté dans chaque appel LLM : l'état fait foi, pas la devinette. */
function buildConversationContext(state) {
  const lines = [
    '### CONTEXTE CONVERSATIONNEL ACTIF (mémoire de session — prioritaire sur toute supposition) :',
    '- Sujet : ' + (state.topic || 'non encore établi') +
      (state.topic_aliases && state.topic_aliases.length ? ' (alias : ' + state.topic_aliases.slice(0, 3).join(', ') + ')' : ''),
    '- Juridiction : ' + state.jurisdiction + ' | Année fiscale : ' + (state.tax_year || 2026) + ' | Régime : ' + (state.tax_regime || 'RSI'),
    '- Intention : ' + intentLabel(state.user_intent || 'EXPLAIN'),
  ];
  if (state.previous_question) lines.push('- Question initiale conservée : « ' + state.previous_question + ' »');
  const lastCorrection = state.corrections.length ? state.corrections[state.corrections.length - 1] : null;
  if (lastCorrection) {
    lines.push('- DERNIÈRE CORRECTION (priorité TRÈS ÉLEVÉE) : ' + lastCorrection.error + ' → retenir : ' + lastCorrection.fix + '.');
    lines.push('- INTERDIT de revenir au sujet corrigé. Accuser la correction en UNE phrase, puis répondre à la question conservée.');
  }
  const pastUser = state.history.filter((h) => h.role === 'user').slice(-3, -1).map((h) => h.text);
  if (pastUser.length) lines.push('- Échanges précédents : ' + pastUser.map((t) => '« ' + t.slice(0, 120) + ' »').join(' / '));
  const factual = state.user_intent === 'PAYMENT_DEADLINE' || state.user_intent === 'RATE';
  lines.push(
    factual
      ? '- Question FACTUELLE : répondre D’ABORD par la règle en une phrase (échéance/taux + article), puis application RSI en 3-4 lignes, puis proposer le détail. Ne pas régurgiter la fiche complète.'
      : '- Réponse WhatsApp concise (~1500 caractères max), en français clair, avec sources citées.'
  );
  return lines.join('\n');
}

function buildSystemPrompt(dossierContext, legalContextText) {
  return (
    "Tu es LEGAL FLOW AI, l'intelligence artificielle experte en conformité fiscale et droit des affaires pour la République de Côte d'Ivoire.\n" +
    "Tu réponds aux dirigeants d'entreprises, directeurs administratifs et financiers (DAF) et experts-comptables en droit ivoirien (CGI, CNPS, CMU, FDFP, Code du Travail, Actes Uniformes OHADA/SYSCOHADA).\n" +
    '\n### DIRECTIVES IMPÉRATIVES DÉONTOLOGIQUES :\n' +
    "1. INTERDICTION FORMELLE D'INVENTER : Défense absolue de fabriquer des articles, des taux d'imposition ou des pénalités inexistants. Fonde-toi strictement sur les textes officiels ivoiriens et les extraits ci-dessous.\n" +
    '2. OBLIGATION DE CITER : Mention obligatoire de la source exacte (nom du texte officiel et numéro d\'article officiel).\n' +
    "3. AVEU DE LIMITE : Si la base ne contient pas la règle applicable, écris exactement : « Je ne trouve pas d'information dans les textes et extraits fournis. »\n" +
    '4. STRUCTURE OBLIGATOIRE : règle essentielle en une phrase, détail des obligations / calculs (FCFA), démarche pas-à-pas (e-impots, e-CNPS), délais et pénalités, conseil d\'optimisation légale.\n' +
    '5. Réponse concise adaptée à WhatsApp (maximum ~1500 caractères), en français clair.\n' +
    '\n### CONTEXTE DU DOSSIER CLIENT ACTIF :\n' +
    (dossierContext || "Entreprise ivoirienne assujettie au régime RSI dans le secteur BTP.") +
    '\n\n### EXTRAITS DE TEXTES JURIDIQUES ISSUS DU RAG (BASE OFFICIELLE) :\n' +
    (legalContextText || 'Aucun extrait textuel spécifique identifié.')
  );
}

async function postChatCompletions(model, systemPrompt, userText, timeoutMs, history) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const messages = [{ role: 'system', content: systemPrompt }];
    for (const h of history || []) {
      if (h && (h.role === 'user' || h.role === 'assistant') && h.content) {
        messages.push({ role: h.role, content: String(h.content).slice(0, 1000) });
      }
    }
    messages.push({ role: 'user', content: userText });
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + OPENROUTER_API_KEY,
        'HTTP-Referer': 'https://legalflow.ci',
        'X-Title': 'Legal Flow CI - Assistant Fiscal & Juridique',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_tokens: OPENROUTER_MAX_TOKENS,
        messages,
      }),
      signal: controller.signal,
    });
    if (!r.ok) return { status: r.status, reply: null };
    const data = await r.json();
    const reply = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    return { status: r.status, reply: typeof reply === 'string' && reply ? reply : null };
  } finally {
    clearTimeout(timer);
  }
}

// Le roster gratuit OpenRouter tourne : si le modèle principal disparaît
// (404), bascule automatique sur le routeur gratuit avant le repli local.
// Le gratuit est limité (429) : un seul retry après 2 s avant le repli.
async function callOpenRouter(systemPrompt, userText, history) {
  if (!OPENROUTER_API_KEY) return null;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  try {
    let res = await postChatCompletions(OPENROUTER_MODEL, systemPrompt, userText, OPENROUTER_TIMEOUT_MS, history);
    if (res.status === 404 && OPENROUTER_MODEL !== 'openrouter/free') {
      console.warn('[webhook] modèle ' + OPENROUTER_MODEL + ' introuvable (404), bascule openrouter/free.');
      res = await postChatCompletions('openrouter/free', systemPrompt, userText, OPENROUTER_TIMEOUT_MS, history);
    } else if ((res.status === 429 || (res.status >= 500 && res.status < 600)) && !res.reply) {
      console.warn('[webhook] OpenRouter HTTP ' + res.status + ', nouvel essai dans 2 s.');
      await sleep(2000);
      res = await postChatCompletions(OPENROUTER_MODEL, systemPrompt, userText, OPENROUTER_TIMEOUT_MS, history);
    }
    if (!res.reply) {
      console.warn('[webhook] OpenRouter HTTP ' + res.status + ', repli local.');
      return null;
    }
    console.log('[webhook] réponse LLM OK (modèle demandé : ' + OPENROUTER_MODEL + ').');
    return res.reply;
  } catch (e) {
    console.warn('[webhook] OpenRouter indisponible, repli local : ' + (e && e.message ? e.message : e));
    return null;
  }
}

function buildDeterministicExpertResponse(query, sources, dossierContext) {
  const match = detectTheme(query);
  void dossierContext;

  // IMF : désambiguïsé d'office (Impôt Minimum Forfaitaire, jamais l'ITS).
  // Sans extrait CGI vérifié sous la main : définition + question de cadrage,
  // jamais d'article ni de taux inventé.
  if (match.theme === 'imf') {
    return `Oui, bien noté : vous parlez de l'**Impôt Minimum Forfaitaire (IMF)**, et non des retenues sur salaires (ITS).

### Ce qu'est l'IMF
- Impôt **plancher** dû par les entreprises relevant des régimes concernés en Côte d'Ivoire (CGI 2026, dispositions IMF).
- Il est strictement distinct de l'ITS (Article 115 du CGI) qui concerne les salaires.

### Pour vous répondre précisément
Dites-moi ce que vous voulez savoir :
1. **L'échéance** de déclaration et de paiement ?
2. **Le calcul** (assiette, minimum applicable à votre régime) ?
3. Les **pénalités** en cas de retard ?

Précisez aussi votre régime (RSI, Réel Normal…) si différent, et je vous donne la règle avec l'article.`;
  }

  if (match.theme === 'tva') {
    return `### 1. La règle essentielle
En Côte d'Ivoire, toute entreprise sous le régime RSI ou Réel Normal est tenue de déclarer et d'acquitter la TVA (taux standard de 18%) au plus tard le **20 de chaque mois** pour les opérations du mois précédent.

### 2. Le détail des obligations & calculs
- **Assiette taxable** : Chiffre d'affaires facturé hors taxes sur les situations de travaux et prestations BTP.
- **Taux légal** : 18% (Article 340 du Code Général des Impôts).
- **Crédit de TVA** : Déductible sous réserve de factures normalisées avec sticker/mention DGI valide.

### 3. La démarche opérationnelle pas-à-pas
1. Connectez-vous sur **e-impots.gouv.ci** avec vos identifiants.
2. Rubrique « Déclarations périodiques » -> « Taxe sur la Valeur Ajoutée ».
3. Renseignez ventes et TVA déductible sur achats et sous-traitance.
4. Validez et télépayez pour générer la quittance électronique.

### 4. Délais légaux et pénalités de retard
- **Échéance** : le 20 du mois à 23h59.
- Majoration de **10%** (Article 160 du Livre de Procédures Fiscales) + **1% par mois** de retard. Risque de blocage de l'ARF.

### 5. Conseil d'optimisation légale
Avec un **CGA**, dispense des majorations sur la première régularisation spontanée avant contrôle et abattement fiscal sur vos bénéfices.`;
  }

  if (match.theme === 'cnps') {
    return `### 1. La règle essentielle
Les cotisations sociales doivent être déclarées et payées au plus tard le **15 de chaque mois** via e-CNPS.

### 2. Le détail des obligations & calculs (BTP)
| Branche | Part patronale | Part salariale |
| :--- | :---: | :---: |
| **Retraite** | 7,70% | 6,30% |
| **Prestations familiales** | 5,75% | 0% |
| **AT/MP BTP** | 4,00% | 0% |
| **Total** | **17,45%** | **6,30%** |

### 3. La démarche pas-à-pas
1. Accédez à **e.cnps.ci**.
2. Téléversez la déclaration nominative des salaires.
3. Rapprochez avec vos bulletins de paie.
4. Payez sous quittance CNPS.

### 4. Délais et pénalités (Art. 24 à 28 CPS)
- Astreinte de **10%** dès le 1er jour de retard + **1% par mois**. Suspension de l'attestation de mise à jour CNPS.

### 5. Conseil
Déposez la DISA avant le 30 mars chaque année pour sécuriser les droits de vos salariés.`;
  }

  if (match.theme === 'cmu') {
    return `### 1. La règle essentielle
L'affiliation et le paiement de la CMU sont obligatoires pour tous les salariés déclarés.

### 2. Obligations & calculs
- **1 000 FCFA** par salarié et par mois (500 FCFA employeur + 500 FCFA salarié).
- Sans quitus CMU (CNAM), la CNPS bloque l'attestation de régularité sociale.

### 3. Démarche
1. Rapprochez les numéros d'assurés de tous les salariés.
2. Versez le global à la CNAM / guichet e-CNPS couplé.
3. Téléchargez le certificat de non-redevance mensuel.

### 4. Conseil
Convention de groupe avec un centre d'enrôlement mobile CNAM pour régulariser vos chantiers en une session.`;
  }

  if (match.theme === 'cga') {
    return `### 1. La règle essentielle
L'adhésion à un **CGA** accorde un abattement de **20% à 25%** sur le bénéfice net imposable (Article 110 du CGI).

### 2. Conditions
- Réservé RSI / microentreprises sous seuils de l'Annexe Fiscale.
- États financiers déposés dans les délais, régularité déclarative.

### 3. Démarche
1. Dossier d'adhésion auprès du CGA agréé de votre zone.
2. Balances et journaux trimestriels pour visa.
3. Attestation Annuelle de Conformité jointe à la liasse fiscale.

### 4. Sanction
Non-dépôt au 30 avril : abattement annulé + rappel de droits majoré de 25%.

### 5. Conseil
Cumulez avec un plan **FDFP** : jusqu'à 0,6% de la masse salariale en formations remboursées.`;
  }

  if (match.theme === 'seuil') {
    return `### 1. La règle essentielle
Le RSI est plafonné à **150 000 000 FCFA** de CA annuel HT (Article 45 du CGI).

### 2. Seuils
- Entreprenant : CA ≤ 50 000 000 FCFA.
- RME/RSI : 50 000 001 à 150 000 000 FCFA.
- Réel Normal : CA > 150 000 000 FCFA.

### 3. Bascule
Dépassement sur 2 exercices consécutifs (ou > 10%) = bascule automatique au Réel Normal (TVA mensuelle, SYSCOHADA normal).

### 4. Délais et sanctions
Notification avant le 1er février de l'exercice suivant. Franchissement dissimulé : redressement + rappel de TVA + majoration **25% à 50%**.`;
  }

  if (match.theme === 'fdfp') {
    return `### 1. La règle essentielle
Tout employeur cotise au **FDFP** : **1,6%** de la masse salariale brute (0,4% apprentissage + 1,2% formation continue).

### 2. Vos droits
- Jusqu'à **0,6%** de la masse salariale récupérable en formations subventionnées.

### 3. Démarche
1. Être à jour des versements mensuels (échéance le **15**, majoration **10%** en cas de retard).
2. Plan de formation annuel avant le 30 septembre.
3. Dossier sur **fdfp.ci**, puis remboursement sur attestations.`;
  }

  if (match.theme === 'embauche') {
    return `### 1. La règle essentielle
Tout recrutement : déclaration préalable + immatriculation CNPS sous **8 jours** (Art. 14.1 à 15.3 du Code du Travail).

### 2. Points clés
- **SMIG** : 75 000 FCFA / mois (40h).
- CDD > 3 mois : écrit obligatoire.
- Charges associées : 23,75% CNPS + 1 000 FCFA CMU + 1,6% FDFP.

### 3. Démarche
1. Contrat conforme à la Convention Collective.
2. Déclaration sur **e.cnps.ci** (numéro d'assuré).
3. Enrôlement CMU (CNAM).
4. Inscription au Registre d'Employeur.

### 4. Sanctions
50 000 à 200 000 FCFA par travailleur non déclaré + cotisations rétroactives majorées de 10%.`;
  }

  if (match.theme === 'douane') {
    return `### 1. La règle essentielle
Importation maritime : **BSC** validé par l'OIC **avant embarquement**, obligatoire.

### 2. Droits et taxes
- TEC UEMOA 0% à 20%, TVA douanière 18%, PCS 0,8%, Redevance Statistique 1%.
- Dédouanement via **Sydonia World** (GUCE).

### 3. Démarche
1. Dossier GUCE (**guce.gouv.ci**) : proforma + connaissement.
2. BSC visé par l'OIC.
3. Commissionnaire agréé : déclaration D3/D6.
4. Paiement sous quittance électronique.

### 4. Sanction
Défaut de BSC : pénalité = **100% du fret** maritime.`;
  }

  if (match.theme === 'arf') {
    return `### 1. La règle essentielle
L'**ARF** est délivrée sur e-impots.gouv.ci aux entreprises à jour (validité **3 mois**).

### 2. Conditions
- Zéro dette exigible (TVA, ITS, Patente, BIC/IMF), déclarations à bonne date.
- Obligatoire pour marchés publics et agréments BTP.

### 3. Démarche
1. **e-impots.gouv.ci** -> « Demandes d'attestations » -> « ARF ».
2. Génération instantanée avec QR si comptes apurés.
3. Archivez-la dans Legal Flow (score d'audit).

### 4. Blocage
Une seule déclaration en retard bloque la délivrance. En difficulté : demandez un échéancier au receveur CDI.`;
  }

  const topSource = (sources && sources[0]) || null;
  return `### 1. La règle essentielle
Conformément à la législation ivoirienne (${(topSource && topSource.source_fichier) || 'Code Général des Impôts CI'}, ${(topSource && topSource.reference_article) || 'DGI/CNPS'}), respectez téléprocédures et délais officiels.

### 2. Vos obligations (RSI, BTP)
- TVA 18% (le 20), ITS (le 15), CNPS 17,45% patronal (le 15), CMU 1 000 FCFA/salarié, FDFP 1,6%.
- Référence identifiée : **${(topSource && topSource.reference_article) || 'Dispositions fiscales et sociales'}**.

### 3. Démarche
1. Vérifiez vos opérations sur **e-impots.gouv.ci** et **e.cnps.ci**.
2. Chaque télépaiement = quittance QR archivée dans Legal Flow.

### 4. Pénalités
Retard : majoration **10%** + **1% par mois**. Contrôle : jusqu'à **50%**.

### 5. Conseil
Précisez votre question (TVA, CNPS, CMU, CGA, FDFP, embauche, douane, ARF) pour une fiche experte complète.`;
}

// --- Traitement du message : pipeline Context Engine -------------------------
// message → compréhension → mémoire de session → recherche juridique →
// raisonnement LLM → réponse. Chaque tour met à jour l'état, jamais remplacé.
async function processLegalFlowMessage(from, text) {
  const question = (text || '').slice(0, 1000);
  const sender = from || 'unknown';
  const dossierContext = "Question reçue via WhatsApp du " + sender + ". Entreprise ivoirienne assujettie au régime RSI dans le secteur BTP.";

  const session = await getSession(sender);
  const upd = updateConversationState(session, question);
  console.log(
    '[context] tour: intent=' + upd.intent.id + ' (score ' + upd.intent.score + ')' +
    ' | topic=' + (session.topic || '—') +
    ' | stage=' + session.conversation_stage +
    (upd.isCorrection ? ' | CORRECTION' : '') +
    ' | historique=' + session.history.length
  );

  const recordAssistant = async (replyText) => {
    session.history.push({ role: 'assistant', text: String(replyText).slice(0, 500), at: Date.now() });
    if (session.history.length > HISTORY_MAX) session.history = session.history.slice(-HISTORY_MAX);
    await saveSession(sender, session);
  };

  try {
    // Désambiguïsation : acronyme nu sans intention → on demande, on n'invente pas.
    if (needsClarification(upd, question)) {
      session.conversation_stage = 'awaiting_clarification';
      const reply = buildClarificationReply(upd);
      await recordAssistant(reply);
      console.log('[context] clarification demandée (sujet=' + (upd.acronyms[0] ? upd.acronyms[0].code : '?') + ').');
      return reply;
    }

    // Recherche juridique guidée par le sujet conservé + l'intention.
    const retrievalQuery = expandQueryForRetrieval(question, session, upd);
    const docs = await searchLegalDocuments(retrievalQuery, 6);
    const legalContextText = (docs || [])
      .map(
        (doc, i) =>
          '[Extrait ' + (i + 1) + '] Source: ' + doc.source_fichier + ' | Réf: ' + doc.reference_article + ' (Similarité: ' + Math.round(doc.similarity * 100) + '%)\nTexte: ' + doc.contenu
      )
      .join('\n\n');
    const systemPrompt =
      buildSystemPrompt(dossierContext, legalContextText) + '\n' + buildConversationContext(session);
    // Historique immédiat (sans le message courant, passé séparément).
    const history = session.history
      .slice(0, -1)
      .slice(-HISTORY_FOR_LLM)
      .map((h) => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.text }));

    const reply = await callOpenRouter(systemPrompt, question, history);
    if (reply) {
      const finalReply = String(reply).slice(0, 4000);
      await recordAssistant(finalReply);
      return finalReply;
    }
    console.warn('[webhook] OpenRouter sans réponse, repli déterministe local.');
    const fallback = buildDeterministicExpertResponse(retrievalQuery, docs, dossierContext).slice(0, 4000);
    await recordAssistant(fallback);
    return fallback;
  } catch (error) {
    console.error('Erreur IA :', error && error.message ? error.message : error);
    try {
      const fallback = buildDeterministicExpertResponse(question, searchLocalCorpus(question, 6), dossierContext).slice(0, 4000);
      await recordAssistant(fallback);
      return fallback;
    } catch {
      return "⚠️ Désolé, une erreur technique s'est produite. Veuillez réessayer.";
    }
  }
}

// --- Envoyer un message via l'API WhatsApp ---
async function sendWhatsAppMessage(to, text) {
  if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN) {
    console.warn('[webhook] envoi ignoré : WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN manquants.');
    return null;
  }
  const url = `https://graph.facebook.com/${META_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: String(text).slice(0, 4000) },
  };
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const errText = await r.text().catch(() => '');
    console.error(`Erreur envoi WhatsApp HTTP ${r.status} :`, errText);
    return null;
  }
  const data = await r.json().catch(() => ({}));
  console.log('Message envoyé :', JSON.stringify(data));
  return data;
}

// --- Opt-in WhatsApp (CDC §1) : message de bienvenue après inscription ---------
const optinAttempts = new Map();
function optinRateOk(ip) {
  const now = Date.now();
  const arr = (optinAttempts.get(ip) || []).filter((t) => now - t < 60000);
  if (arr.length >= 5) return false;
  arr.push(now);
  optinAttempts.set(ip, arr);
  return true;
}

function normalizeIvorianPhone(raw) {
  return String(raw || '').replace(/[\s.\-()]/g, '');
}
function isValidIvorianPhone(raw) {
  return /^\+2250[157]\d{8}$/.test(normalizeIvorianPhone(raw));
}

app.post('/optin', async (req, res) => {
  const phone = normalizeIvorianPhone(req.body && req.body.phone);
  if (!isValidIvorianPhone(phone)) {
    return res.status(400).json({ error: 'Numéro ivoirien invalide (+225 0X XX XX XX XX).' });
  }
  const ip = String((req.headers['x-forwarded-for'] || req.ip || 'unknown')).split(',')[0].trim();
  if (!optinRateOk(ip)) {
    return res.status(429).json({ error: 'Trop de tentatives, réessayez dans une minute.' });
  }
  const sent = await sendWhatsAppMessage(
    phone,
    'Bienvenue sur Legal Flow CI ! Vos alertes WhatsApp sont activées : échéances J-1, retards et urgences (8h-18h GMT). Modifiez votre numéro à tout moment dans Paramètres.'
  );
  if (!sent) return res.status(502).json({ error: "Envoi WhatsApp impossible pour le moment." });
  return res.json({ ok: true });
});

// --- Relais de diffusion (digests, urgences) : usage serveur/cron uniquement ---
// Protégé par jeton applicatif (même VERIFY_TOKEN). Ne jamais appeler depuis le web.
app.post('/notify', async (req, res) => {
  const token = req.headers['x-notify-token'] || '';
  if (!VERIFY_TOKEN || token !== VERIFY_TOKEN) return res.sendStatus(403);
  const phone = normalizeIvorianPhone(req.body && req.body.phone);
  const text = String((req.body && req.body.text) || '').slice(0, 4000);
  if (!isValidIvorianPhone(phone) || !text) {
    return res.status(400).json({ error: 'phone (CI) et text requis.' });
  }
  const sent = await sendWhatsAppMessage(phone, text);
  if (!sent) return res.status(502).json({ error: 'Envoi impossible.' });
  return res.json({ ok: true });
});

// --- Réception des messages (POST) ---
app.post('/webhook', async (req, res) => {
  if (!signatureValide(req)) {
    console.warn('[webhook] signature invalide, requête rejetée.');
    return res.sendStatus(401);
  }
  try {
    const body = req.body || {};
    const value = body.entry && body.entry[0] && body.entry[0].changes && body.entry[0].changes[0]
      ? body.entry[0].changes[0].value
      : null;
    const messages = (value && value.messages) || [];
    // Log des statuts (delivered/read) sans traitement.
    if (value && value.statuses) {
      console.log('Statut WhatsApp :', JSON.stringify(value.statuses));
    }
    for (const message of messages) {
      const from = message.from;
      const text = message.text && message.text.body ? message.text.body : '';
      const type = message.type || 'unknown';
      console.log(`Message reçu de ${from} (type=${type}) : ${text}`);
      if (!from) continue;
      if (message.text && text) {
        const reply = await processLegalFlowMessage(from, text);
        await sendWhatsAppMessage(from, reply);
      } else {
        console.log(`[webhook] message non-texte ignoré (type=${type}).`);
      }
    }
  } catch (error) {
    console.error('Erreur traitement webhook :', error && error.message ? error.message : error);
  }
  // Toujours 200 OK à Meta (évite les retries), même en cas d'erreur interne.
  return res.sendStatus(200);
});

// Helpers exposés pour tests locaux (node) — sans effet en production.
exports.__test__ = {
  detectTheme, buildDeterministicExpertResponse, searchLocalCorpus, normalizeQuery,
  detectIntent, detectAcronyms, isCorrectionMessage, extractCorrectionTopic,
  blankConversationState, updateConversationState, needsClarification,
  buildClarificationReply, expandQueryForRetrieval, buildConversationContext,
};

// Exposer la fonction (URL : https://[REGION]-legalflowio.cloudfunctions.net/whatsappWebhook/webhook)
exports.whatsappWebhook = functions.https.onRequest(app);
