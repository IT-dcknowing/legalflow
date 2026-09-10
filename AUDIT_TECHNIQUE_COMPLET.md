# ⚖️ RAPPORT D'AUDIT TECHNIQUE COMPLET — LEGAL FLOW

**Date de l'audit :** Septembre 2026  
**Périmètre :** Dépôt Legal Flow (Frontend React 19 / Backend Express 4 / Migrations Supabase PostgreSQL / Bridge Firebase Auth / Moteurs RAG & IA)  
**Méthodologie :** Analyse statique, vérification des règles RLS, audit des flux d'authentification, analyse des dépendances (`npm audit`), exécution des suites de tests Vitest/Bun et du vérificateur de types TypeScript.

---

## 📊 Synthèse Globale des Constats

| Niveau de Sévérité | Nombre d'Anomalies | Domaines Principaux Concernés |
| :--- | :---: | :--- |
| 🔴 **CRITIQUE** | **5** | Contournement d'authentification en dev/prod, failles RLS & fausses clés `auth.uid()`, failles de sécurité de dépendances (`protobufjs` RCE), élévation de privilèges RLS. |
| 🟠 **MAJEUR** | **7** | Incohérence des types de rôles (`utilisateur` vs `entreprise`), absence d'isolation par rôle sur les endpoints Express (`/api/chat`, `/api/rag`), approximation des calculs de cotisations globales, rupture potentielle du pont OIDC Firebase/Supabase. |
| 🟡 **MINEUR** | **6** | Dépendances obsolètes (`qs`, `re2`, `sharp`), duplication de fichiers de rapport, code mort (`laravel/`), usage répété du type `as any`, doublon dans `package.json`. |

---

## 1. Cohérence de la migration d'authentification (Firebase Auth ↔ Supabase Auth)

### 🔴 CRITIQUE — Pont OIDC cassant le `auth.uid()` et les stratégies RLS
- **Fichiers concernés :** 
  - `src/services/firebaseBridge.ts` (lignes 42-56)
  - `supabase/migrations/0001_auth_connexion.sql` (lignes 43-45)
  - `src/services/inscriptionService.ts` (lignes 35-48)
- **Constat :**  
  Dans `firebaseBridge.ts`, la fonction `bridgeToSupabase` tente d'échanger l'ID Token Firebase contre une session Supabase via `supabase.auth.signInWithIdToken({ provider: 'firebase', token: idToken })`.  
  Or, la fonction SQL Supabase `get_my_role()` et toutes les stratégies RLS (`profiles_select`, `entreprises_select`, `journal_select`) reposent exclusivement sur la fonction native `auth.uid()`.  
  Si le fournisseur OIDC `'firebase'` n'est pas parfaitement configuré dans le Dashboard Supabase (avec le projet Firebase et ses paires de clés), le JWT généré ne contient pas le claim `sub` attendu par PostgREST. Dans ce cas, `auth.uid()` retourne `NULL`, ce qui bloque **l'intégralité des requêtes BDD authentifiées** ou provoque des refus d'accès RLS (HTTP 401/403).

### 🔴 CRITIQUE — Désactivation totale de l'authentification en environnement de démo
- **Fichiers concernés :** 
  - `src/App.tsx` (lignes 143-149, 381-398)
- **Constat :**  
  La constante `AUTH_BYPASSED = true` est activée dans `App.tsx`. Toutes les gardes de routage (`routeGuard.ts`) et les contrôles de session sont neutralisés. Le composant `ProfileSwitcher` permet d'usurper n'importe quel rôle (`super_admin`, `gestionnaire`, `utilisateur`) d'un simple clic local. Si ce flag venait à être déployé par inadvertance sans garde-fou de build (`import.meta.env.DEV`), l'ensemble des données serait exposé sans authentification.

### 🟠 MAJEUR — Wrapper Foreign Data Wrapper Firebase bloqué en BDD
- **Fichiers concernés :** 
  - `supabase/migrations/0007_firebase_wrapper.sql` (lignes 8-28)
- **Constat :**  
  La table distante `firebase.users` créée via la FDW `firebase_wrapper` nécessite la clé de service Firebase (`sa_key_id`) enregistrée dans le coffre Vault de Supabase. Sans cette configuration, toute requête SQL tentant de joindre `firebase.users` échoue avec une erreur fatale PostgreSQL (`relative URL without a base`).

---

## 2. Séparation des permissions entre les 3 rôles (Super Admin / Cabinet / Entreprise)

### 🔴 CRITIQUE — Absence de contrôle de rôle et de périmètre sur l'API Express
- **Fichiers concernés :** 
  - `server/middleware/requireAuth.ts` (lignes 22-35)
  - `server.ts` (lignes 50-52, 69-72, 138-140, 168-170)
- **Constat :**  
  Le middleware Express `requireAuth` se contente de vérifier que le jeton Bearer Supabase est valide (`client.auth.getUser(token)`). Il injecte `req.user.id`, mais **ne vérifie ni le rôle de l'utilisateur (`super_admin`, `gestionnaire`, `entreprise`) ni son appartenance à l'entreprise demandée**.  
  Ainsi, sur les routes `/api/chat` et `/api/rag/search`, n'importe quel utilisateur authentifié (p.ex. une PME cliente) peut fournir n'importe quel `dossierContext` ou interroger les extraits RAG d'un cabinet ou d'une entreprise concurrente.

### 🔴 CRITIQUE — Faillibilité de la stratégie RLS sur `journal_evenements`
- **Fichiers concernés :** 
  - `supabase/migrations/0001_auth_connexion.sql` (lignes 118-120)
- **Constat :**  
  La politique `journal_insert` est définie par `WITH CHECK (user_id = auth.uid())`. Elle ne valide pas si l'identifiant `entite_id` (entreprise) correspond réellement à la société rattachée à l'utilisateur. Un utilisateur malveillant peut insérer des entrées de journal associées à d'autres entreprises.

### 🟠 MAJEUR — Permissivité de l'insertion d'entreprises lors de l'inscription
- **Fichiers concernés :** 
  - `supabase/migrations/0004_pen016_inscription.sql` (lignes 11-12)
- **Constat :**  
  La politique `entreprises_insert_inscription` autorise tout utilisateur authentifié (`WITH CHECK (auth.role() = 'authenticated')`) à créer de nouvelles lignes dans la table `entreprises`, sans vérifier si son rôle autorise la création d'entreprise (réservé en principe aux cabinets et super admins).

### 🟠 MAJEUR — Dérivation du trigger d'anti-élévation de rôle lorsque `auth.uid()` est NUL
- **Fichiers concernés :** 
  - `supabase/migrations/0003_pen013_securite.sql` (lignes 48-52)
  - `supabase/migrations/0004_pen016_inscription.sql` (lignes 21-25)
- **Constat :**  
  Le trigger `forbid_role_statut_escalation()` commence par : `IF auth.uid() IS NULL THEN RETURN NEW; END IF;`.  
  Si une requête de mise à jour passe par une clé anonyme ou si la session JWT est mal propagée, le trigger contourne totalement le contrôle d'élévation de rôle et de statut.

---

## 3. Qualité du moteur de règles et du mapping de conformité

### 🟠 MAJEUR — Moteur de règles entièrement figé dans le code source (absence de versionnage en BDD)
- **Fichiers concernés :** 
  - `src/services/obligationEngine.ts` (lignes 242-536)
- **Constat :**  
  Le catalogue `LEGAL_RULES` contient 18 règles réglementaires codées en dur dans un tableau TypeScript statique. Toute modification du Code Général des Impôts (CGI) ou des taux CNPS exige un nouveau build et un redéploiement complet du frontend, plutôt qu'une mise à jour dynamique versionnée en base PostgreSQL.

### 🟠 MAJEUR — Approximation du calcul des cotisations sociales globales d'entreprise
- **Fichiers concernés :** 
  - `src/services/payrollTaxEngine.ts` (lignes 112-152)
- **Constat :**  
  La méthode `PayrollTaxEngine.calculateCompany` calcule le salaire moyen (`masseSalarialeMensuelle / effectif`), évalue les cotisations pour cet unique salaire moyen, puis multiplie le résultat par l'effectif total.  
  Cette approche par moyenne fausse les montants réels en raison des plafonds de cotisations (plafond retraite CNPS à 2,7M FCFA, plafond prestations familiales à 70 000 FCFA) et de la progressivité du barème ITS/IGR.

### 🟡 MINEUR — Normalisation ad-hoc des domaines de conformité
- **Fichiers concernés :** 
  - `src/services/complianceScoreEngine.ts` (lignes 54-58)
- **Constat :**  
  La méthode `compute` effectue un remapping manuel des domaines (`if (ob.domaine === 'administratif') domKey = 'juridique'; else if (ob.domaine === 'douanes') domKey = 'commerce'`). Cette logique ad-hoc est fragile et risque de biaiser le calcul du score de conformité si de nouveaux domaines sont ajoutés.

### 🟡 MINEUR — Couverture de tests incomplète sur les cas d'évaluation IA et de transitions de seuils
- **Fichiers concernés :** 
  - `src/services/__tests__/`
- **Constat :**  
  Bien que les 90 tests Vitest s'exécutent avec succès, il n'existe **aucun test automatisé** couvrant la précision des réponses RAG (non-hallucination), la résistance du fallback déterministe ou la transition de régime fiscal lors du franchissement du seuil de 150M FCFA.

---

## 4. Dépendances obsolètes et vulnérabilités (`npm audit`)

### 🔴 CRITIQUE — Vulnérabilité d'exécution de code arbitraire (RCE) via `protobufjs`
- **Fichier concerné :** `package.json` / `node_modules/protobufjs`
- **Gravité :** Critique (CVE / Advisories GHSA-xq3m-2v4x-88gg, GHSA-66ff-xgx4-vchm, GHSA-75px-5xx7-5xc7)
- **Impact :** `protobufjs` (dépendance transitive de `@xenova/transformers` -> `onnx-proto`) contient de multiples vulnérabilités de pollution de prototype et d'injection de code.

### 🟠 MAJEUR — Vulnérabilités de déni de service (DoS) et de lecture hors limites
- **Fichiers concernés :** `package.json` / `node_modules`
- **Vulnérabilités :**
  - `sharp` <= 0.35.4-rc.0 (Haute - vulnérabilités libvips/libheif).
  - `qs` 2.2.5 - 6.15.3 (Modérée - bypass de limite d'arguments et DoS sur l'analyseur de requêtes Express).
  - `re2` <= 1.26.0 (Modérée - lecture hors limites en mémoire heap et boucle infinie).
  - `@opentelemetry/core` < 2.8.0 (Modérée - allocation mémoire non bornée).

### 🟡 MINEUR — Incohérence des verrous de dépendances et doublon dans `package.json`
- **Fichiers concernés :** `package.json` (lignes 43 et 56), `bun.lock`, `functions/package-lock.json`
- **Constat :**
  1. `package.json` contient la dépendance `"vite": "^6.2.3"` en double (dans `dependencies` et dans `devDependencies`).
  2. Présence simultanée de `bun.lock` à la racine et de `package-lock.json` dans `functions/`, créant des risques de divergence de sous-dépendances lors des déploiements CI/CD.

---

## 5. Gestion des erreurs et cas limites non couverts

### 🟠 MAJEUR — Limite du matching de mots-clés du fallback IA en cas de questions complexes
- **Fichiers concernés :** 
  - `server.ts` (lignes 160-165)
  - `server/fallback/normalize.ts` (lignes 12-45)
- **Constat :**  
  Lorsque OpenRouter est indisponible, le serveur utilise `detectTheme(query)` pour sélectionner une réponse pré-rédigée. En cas de question combinant plusieurs axes (p.ex. "Quelle est la TVA et la cotisation CNPS pour un chantier BTP ?"), seule la première correspondance est retenue, ignorant la seconde partie de la question.

### 🟠 MAJEUR — Opération de suppression RGPD incomplète par manque de clé service
- **Fichiers concernés :** 
  - `server.ts` (lignes 168-185)
- **Constat :**  
  L'endpoint `DELETE /api/user/account` anonymise le profil dans la table `profiles`, mais ne peut pas purger la ligne dans `auth.users` car Express utilise le client utilisateur anonyme sans la `SUPABASE_SERVICE_ROLE_KEY`. Le serveur renvoie un statut partiel (`pending: ['auth.users : purge via service_role']`).

### 🟡 MINEUR — Bascule silencieuse de l'assistant IA en mode offline frontend
- **Fichiers concernés :** 
  - `src/components/AssistantPanel.tsx` (lignes 112-145)
- **Constat :**  
  Si le serveur Express local `:3000` est inaccessible (p.ex. sur Firebase Hosting statique), l'Assistant IA bascule automatiquement sur un moteur simulé côté navigateur sans informer l'utilisateur qu'il fonctionne en mode dégradé local.

---

## 6. Dette technique générale

### 🟠 MAJEUR — Discordance de typage sur les rôles entre Frontend et Base de Données
- **Fichiers concernés :** 
  - `src/types/index.ts` (ligne 1 : `export type UserRole = 'super_admin' | 'gestionnaire' | 'utilisateur';`)
  - `src/services/supabaseClient.ts` (ligne 15 : `export type DbRole = 'super_admin' | 'gestionnaire' | 'entreprise';`)
  - `supabase/migrations/0001_auth_connexion.sql` (ligne 8 : `CREATE TYPE user_role AS ENUM ('super_admin','gestionnaire','entreprise');`)
- **Constat :**  
  Le rôle PME cliente est nommé `'utilisateur'` côté Frontend TypeScript, mais `'entreprise'` dans Supabase PostgreSQL (enum `user_role`). Cette divergence nécessite des conversions ad-hoc permanentes et constitue une source d'erreurs d'accès.

### 🟡 MINEUR — Présence d'un squelette Laravel 12 inutilisé
- **Répertoire concerné :** `laravel/`
- **Constat :**  
  Le projet contient une arborescence complète Laravel 12 / PHP 8.3 qui n'est ni exécutée ni connectée au frontend React. Ce code mort alourdit le dépôt.

### 🟡 MINEUR — Doublons de fichiers de rapport à la racine
- **Fichiers concernés :** `AUDIT_REPORT - Copie.md`, `AUDIT_REPORT2 - Copie.md`, `src/data/supabaseSchema.sql`
- **Constat :**  
  Des copies de sauvegarde de rapports d'audit et de schéma SQL subsistent à la racine et dans `src/data/`, créant de la confusion sur la source de vérité.

### 🟡 MINEUR — Utilisation récurrente du type `as any`
- **Fichiers concernés :** 
  - `src/services/firebaseBridge.ts` (ligne 46)
  - `src/services/inscriptionService.ts` (lignes 57, 86)
  - `server.ts` (lignes 51, 69, 140, 170)
- **Constat :**  
  Le contournement des contrôles de type TypeScript via `as any` affaiblit la sécurité de type au niveau des requêtes API Express et des appels Supabase.

---

## 📋 Plan d'Action & Recommandations Priorisées

1. **Urgent (Sécurité & Authentification) :**
   - Renseigner la configuration OIDC Firebase dans la console Supabase Auth et vérifier la transmission du claim `auth.uid()`.
   - Remplacer le bypass global `AUTH_BYPASSED` par une variable d'environnement explicite `VITE_DEMO_MODE=true` uniquement autorisée en build de développement.
   - Ajouter un middleware d'autorisation par rôle et par entreprise sur les routes Express (`/api/chat`, `/api/rag`).
   - Mettre à jour `@xenova/transformers` / `protobufjs` pour éliminer les vulnérabilités RCE critiques (`npm audit fix`).

2. **Moyen Terme (Architecture & Moteur de règles) :**
   - Unifier le type `UserRole` et `DbRole` sur la valeur `'entreprise'`.
   - Externaliser le tableau `LEGAL_RULES` dans une table PostgreSQL `public.regles_conformite` versionnée.
   - Corriger la méthode `PayrollTaxEngine.calculateCompany` pour sommer les salaires individuels plutôt que d'appliquer une moyenne globale.

3. **Nettoyage (Dette technique) :**
   - Supprimer le répertoire mort `laravel/` ou le déplacer hors du dépôt principal s'il s'agit d'un prototype.
   - Nettoyer les fichiers Markdown dupliqués à la racine (`AUDIT_REPORT - Copie.md`).
   - Corriger le doublon `"vite"` dans `package.json`.
