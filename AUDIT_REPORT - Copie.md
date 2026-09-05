# 🚨 RAPPORT D'AUDIT COMPLET ET EXHAUSTIF DU LOGICIEL "LEGAL FLOW CI"

**Date d'audit :** Mars 2025  
**Projet :** Legal Flow CI — Plateforme de conformité fiscale, sociale et juridique (Côte d'Ivoire)  
**Auditeur :** Auditeur Senior / Cybersecurity Expert / SRE / Code Reviewer  

---

##  EXECUTIVE SUMMARY (RÉSUMÉ EXÉCUTIF)

L'application **Legal Flow CI** présente une architecture moderne associant un frontend **React 19 / Vite**, un backend **Express (Node.js / TS)**, une base **Supabase (PostgreSQL + pgvector)** et un moteur RAG hybride alimenté par **Xenova Transformers (MiniLM-L12-v2)** et **OpenRouter**. Malgré une excellente structuration de la logique métier spécifique au droit ivoirien (CGI, CNPS, Code du Travail), l'audit a révélé **plusieurs vulnérabilités critiques de sécurité**, notamment l'absence totale d'authentification et de Rate Limiting sur les endpoints Express `/api/chat` et `/api/rag/search`, des risques d'injection de prompt et l'absence de timeouts sur les appels LLM tiers. De plus, l'absence de tests automatisés (unitaires/E2E) et de gestion explicite des arrêts réseau lors des démarrages à froid représentent une dette technique importante.

---

## 📊 SCORE GLOBAL & QUALIFICATION

### SCORE GLOBAL : **68 / 100**
### NOTE FINALE : **C+**

- 🔴 **Sécurité & Authentification :** 52 / 100
- 🟠 **Logique Métier & Algorithmes :** 82 / 100
- 🟡 **Base de Données & Vectoriel :** 74 / 100
- 🔵 **Qualité de Code & Dette Technique :** 70 / 100
- 🟣 **UI / UX / Accessibilité :** 78 / 100
- ⚫ **Résilience, SRE & Tests :** 50 / 100

---

## 📋 TABLEAU RECAPITULATIF DES ANOMALIES ET VULNÉRABILITÉS

| ID | Fichier | Ligne(s) | Catégorie | Sévérité | Description | Impact | Correction | Effort |
|---|---|---|---|---|---|---|---|---|
| **SEC-001** | `server.ts` | 38–95 | Sécurité | 🔴 CRITIQUE | Absence d'authentification / JWT verification sur `/api/chat` et `/api/rag/search`. | N'importe quel attaquant peut consommer l'API RAG et le LLM sans compte, volant des données et épuisant le quota d'API. | Ajouter un middleware Express vérifiant le token JWT Supabase (`auth.getUser()`). | Modéré |
| **SEC-002** | `server.ts` | 38–160 | Sécurité | 🔴 CRITIQUE | Absence de Rate Limiting (limiteur de débit) sur les endpoints Express. | Vulnérable au déni de service (DoS) et à l'explosion des coûts OpenRouter par attaque par force brute/spam. | Installer et configurer `express-rate-limit` (ex: 10 requêtes / min par IP). | Minimal |
| **SEC-003** | `server.ts` | 38–50 | Sécurité | 🔴 CRITIQUE | Pas de sanitization ni de limitation de taille sur le champ `message` ou `dossierContext`. | Risque de Prompt Injection pour faire halluciner l'IA ou lui faire ignorer ses consignes déontologiques. | Valider avec Zod (`z.string().max(1000)`) et assainir les caractères de contrôle/prompts malveillants. | Modéré |
| **SEC-004** | `.env.example` | 20–25 | Sécurité | 🟡 MOYENNE | Présence de valeurs par défaut factices/exemples non sécurisées (`GEMINI_API_KEY="MY_GEMINI_API_KEY"`). | Risque de confusion ou de commit de clés si l'environnement par défaut est réutilisé en production. | Supprimer les valeurs d'exemple en dur et ne laisser que la clé vide `GEMINI_API_KEY=`. | Minimal |
| **SEC-005** | `server/legalRagEngine.ts` | 15–30 | Sécurité | 🔴 CRITIQUE | Utilisation de `SUPABASE_SERVICE_ROLE_KEY` sans restriction de privilèges côté serveur. | Une brèche sur le backend Express accorderait un accès administrateur total (bypass RLS) sur Supabase. | Restreindre le rôle Supabase du serveur aux seules fonctions RPC ou utiliser `ANON_KEY` quand possible. | Modéré |
| **SEC-006** | `src/services/inscriptionService.ts` | 108–125 | Sécurité | 🟡 MOYENNE | Stockage temporaire des inscriptions en clair dans `localStorage` (`lf_pending_inscription`). | Une faille XSS permettrait d'intercepter les données personnelles des utilisateurs en cours d'inscription. | Ne pas stocker de données sensibles dans le `localStorage` ou les chiffrer. | Modéré |
| **LOG-001** | `server.ts` | 150–380 | Logique | 🟠 HAUTE | Le moteur de fallback déterministe utilise de simples `.includes()` sur les minuscules. | Les questions contenant des synonymes, fautes de frappe ou reformulations ne matchent pas et renvoient le cas générique. | Utiliser un matching par mots-clés normalisés / lemmatisation ou utiliser le score de similarité RAG. | Modéré |
| **LOG-002** | `src/services/obligationEngine.ts` | 325–360 | Logique | 🟡 MOYENNE | Tri des dates ISO sous forme de chaînes brutes (`localeCompare`). | Si des dates contiennent des formats hétérogènes (avec ou sans timezone/heure), le tri peut être faussé. | Convertir systématiquement en objets `Date` avant comparaison ou normaliser au format `YYYY-MM-DD`. | Minimal |
| **LOG-003** | `src/services/complianceScoreEngine.ts` | 60–75 | Logique | 🟡 MOYENNE | Pénalité fixe arbitraire par retard (`- retards * 16`) dans le score de conformité. | Le score peut devenir artificiellement bloqué à 20 sans refléter fidèlement le poids financier réel des retards. | Pondérer la pénalité par la sévérité et l'ancienneté du retard plutôt qu'un facteur fixe. | Modéré |
| **LOG-004** | `src/services/obligationEngine.ts` | 235–310 | Logique | 🟡 MOYENNE | Les règles événementielles (CHSCT, délégués du personnel) sont exclues des échéances datées. | Pas de suivi ou d'alerte proactive dans le tableau de bord pour les seuils d'effectifs (ex: 11 ou 50 salariés). | Générer une occurrence de vérification annuelle ou un rappel à la date anniversaire. | Modéré |
| **BDD-001** | `src/data/supabaseSchema.sql` | 14–23 | Base de Données | 🟡 MOYENNE | Absences d'index sur `documents(entreprise_id)` et `gestion_entreprise(user_id)`. | Dégradation des performances de jointure et de filtrage RLS lors de la montée en charge. | Ajouter `CREATE INDEX idx_documents_entreprise ON public.documents(entreprise_id);`. | Minimal |
| **BDD-002** | `src/data/supabaseSchema.sql` | 180–195 | Base de Données | 🔴 CRITIQUE | Index IVFFlat `idx_documents_juridiques_embedding` créé avec `lists = 100` sur une table potentiellement vide. | L'index IVFFlat créé sans données produit des centroïdes erronés, ruinant la précision de la recherche RAG. | Remplacer par un index HNSW (`USING hnsw (embedding vector_cosine_ops)`) ou reconstruire l'index IVFFlat APRÈS le seed. | Modéré |
| **BDD-003** | `src/data/supabaseSchema.sql` | 200–225 | Base de Données | 🟡 MOYENNE | La fonction RPC `match_documents` ne filtre pas par un seuil minimal de similarité cosinus. | Des extraits juridiques complètement hors-sujet peuvent être retournés si peu de documents existent. | Ajouter une clause `WHERE (1 - (d.embedding <=> query_embedding)) > 0.5`. | Minimal |
| **BDD-004** | `src/data/supabaseSchema.sql` | 65–75 | Base de Données | 🟡 MOYENNE | Clés étrangères sans `ON DELETE CASCADE` sur `notifications.entreprise_cible`. | Risque de violation de contrainte d'intégrité ou d'erreurs 500 si une entreprise est supprimée. | Ajouter `ON DELETE CASCADE` sur toutes les contraintes de clés étrangères référençant `entreprises(id)`. | Minimal |
| **COD-001** | `server.ts` | 55, 145 | Qualité Code | 🔵 MOYENNE | Utilisation du type `error: any` dans les blocs catch et logs `console.error` non structurés. | Perte du typage TypeScript et difficulté de suivi des erreurs dans un outil de monitoring (Sentry/Datadog). | Typer avec `unknown`, utiliser un helper d'extraction d'erreur et un logger structuré (Pino/Winston). | Minimal |
| **COD-002** | `src/App.tsx` | 60–90 | Qualité Code | 🔵 MOYENNE | Duplication de la logique de conversion `entityToProfile` et `dbEntrepriseToEntity`. | Risque d'incohérence si un nouveau champ est ajouté au profil d'entreprise sans être répercuté partout. | Centraliser les fonctions de conversion dans un module dédié `src/utils/transformers.ts`. | Minimal |
| **COD-003** | `src/services/obligationEngine.ts` | 110–180 | Qualité Code | 🔵 MOYENNE | Magic numbers / magic strings disséminés pour les jours du mois (15, 20) et dimensions (384). | Refactorisation difficile et risque d'erreur de frappe lors des futures mises à jour de règles. | Extraire dans des constantes nommées (ex: `DEFAULT_TAX_DUE_DAY = 15`). | Minimal |
| **COD-004** | `server.ts` | 28, 162 | Qualité Code | ⚪ INFO | `console.log` de débogage restés en production au démarrage du serveur Express. | Pollution de la sortie standard des logs de production. | Remplacer par un logger de niveau `info` ou supprimer en production. | Minimal |
| **COD-005** | `package.json` | 20–30 | Qualité Code | 🔵 MOYENNE | Dépendances utilisant le préfixe `^` (ex: `"express": "^4.21.2"`). | Risque de cassure du build lors de mises à jour mineures automatiques des sous-dépendances en CI/CD. | Figer les versions exactes sans `^` ou assurer un `package-lock.json` / `bun.lock` systématiquement commité. | Minimal |
| **UI-001** | `src/App.tsx` | 380–450 | UI / UX | 🟣 MOYENNE | Débordement potentiel de la table des simulateurs sur très petits écrans (320px–375px). | L'utilisateur mobile doit scroller horizontalement toute la page au lieu d'uniquement le tableau. | Envelopper les tableaux dans un conteneur `<div className="overflow-x-auto w-full">`. | Minimal |
| **UI-002** | `src/components/LoginPage.tsx` | 60–120 | UI / UX | 🟣 MOYENNE | Absence de validation Regex d'email temps réel avant soumission sur la page Login. | L'utilisateur envoie une requête inutile au serveur avant d'avoir un retour sur le format. | Ajouter une validation d'input HTML5 `type="email"` et un état d'erreur visuel immédiat. | Minimal |
| **UI-003** | `src/App.tsx` | 300–350 | UI / UX | 🟣 MOYENNE | Écran blanc / texte brut "Chargement de la session..." lors du boot de l'application. | Mauvaise perception de performance et d'élégance visuelle lors du chargement initial. | Remplacer par un composant Loader/Skeleton stylisé aux couleurs de la charte Legal Flow. | Minimal |
| **RES-001** | `server/legalRagEngine.ts` | 25–50 | Résilience | ⚫ HAUTE | Téléchargement du modèle Transformer Xenova depuis HuggingFace au premier démarrage. | Si l'accès réseau externe à HuggingFace échoue, le serveur RAG ne peut pas démarrer ni calculer d'embeddings. | Télécharger et pré-packager les poids du modèle localement dans le conteneur Docker/Build. | Important |
| **RES-002** | `server.ts` | 120–145 | Résilience | ⚫ HAUTE | Absence de timeout HTTP (`AbortController`) sur l'appel API vers OpenRouter. | Si l'API OpenRouter rame ou ne répond pas, la connexion HTTP Express reste suspendue indéfiniment. | Implémenter un timeout de 10-15 secondes avec `AbortController`. | Minimal |
| **RES-003** | `package.json` | 1–35 | Résilience | ⚫ HAUTE | Aucune suite de tests unitaires ou d'intégration configurée (`npm test` inexistant). | Risque élevé de régression non détectée lors des modifications du moteur de règles fiscales ou RAG. | Installer Vitest / React Testing Library et écrire des tests unitaires pour `obligationEngine.ts`. | Important |

---

## 🛠️ DÉTAIL DES PLAN D'ACTIONS ET CORRECTIONS RECOMMANDÉES

### 1. Sécurité : Sécuriser l'API RAG et le Chatbot (CRITIQUE)

#### Correction pour `server.ts` (SEC-001, SEC-002, SEC-003) :
```typescript
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';

// Rate Limiting strict sur l'API Chat & RAG
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limite à 30 requêtes par IP
  message: { error: 'Trop de requêtes, veuillez réessayer dans 15 minutes.' },
});

app.use('/api/chat', apiLimiter);
app.use('/api/rag/search', apiLimiter);

// Middleware de vérification du Token JWT Supabase
async function requireAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Accès non autorisé : Token manquant.' });
  }
  const token = authHeader.split(' ')[1];
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return res.status(401).json({ error: 'Session invalide ou expirée.' });
  }
  req.user = user;
  next();
}

app.post('/api/chat', requireAuth, async (req, res) => { ... });
```

---

### 2. Base de Données : Indexation Vectorielle HNSW & Filtre de Similarité (CRITIQUE)

#### Correction pour `src/data/supabaseSchema.sql` (BDD-002, BDD-003) :
```sql
-- Remplacer l'index IVFFlat par HNSW pour une meilleure précision hors-ligne
DROP INDEX IF EXISTS idx_documents_juridiques_embedding;
CREATE INDEX idx_documents_juridiques_embedding_hnsw
    ON public.documents_juridiques USING hnsw (embedding vector_cosine_ops);

-- Mettre à jour la fonction RPC match_documents avec un seuil de similarité minimal
CREATE OR REPLACE FUNCTION public.match_documents (
    query_embedding vector(384),
    match_count int DEFAULT 6
)
RETURNS TABLE (
    id UUID,
    source_fichier VARCHAR(255),
    reference_article VARCHAR(255),
    contenu TEXT,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.source_fichier,
        d.reference_article,
        d.contenu,
        (1 - (d.embedding <=> query_embedding))::float AS similarity
    FROM public.documents_juridiques d
    WHERE (1 - (d.embedding <=> query_embedding)) > 0.45 -- Seuil de pertinence minimale
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
```

---

### 3. Résilience & SRE : Ajout de Timeouts HTTP et Tests Unitaires (HAUTE)

#### Correction pour `server.ts` (RES-002) :
```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 12000); // 12s timeout

try {
  const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    signal: controller.signal,
    headers: { ... },
    body: JSON.stringify({ ... })
  });
} catch (err: any) {
  if (err.name === 'AbortError') {
    console.warn('Timeout OpenRouter dépassé (12s), bascule sur le fallback local.');
  }
} finally {
  clearTimeout(timeout);
}
```

---

## 🎯 CONCLUSION & PROCHAINES ÉTAPES

L'application **Legal Flow CI** possède un socle fonctionnel impressionnant et un moteur métier extrêmement poussé pour le droit fiscal et social ivoirien. Toutefois, pour un passage en production à grande échelle en toute sécurité :

1. **Priorité 1 (24h) :** Déployer la protection de route (`requireAuth`) et le Rate Limiting sur `server.ts`.
2. **Priorité 2 (48h) :** Appliquer les correctifs d'indexation HNSW sur Supabase pgvector.
3. **Priorité 3 (1 semaine) :** Télécharger les poids de l'embedder localement et mettre en place une suite de tests unitaires automatisés sous **Vitest**.

*Fin du rapport d'audit.*
