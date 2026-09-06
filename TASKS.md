# Tâches — LEGAL-FLOW

> Référence actuelle : **`kanban.html`** (tableau : Backlog / À faire / En cours / Terminé).
> Ce fichier garde l'historique résumé ; le kanban fait foi pour l'état courant.

Suivi local en markdown. Remplace la base Notion « Tâches » (espace « IT dc knowing »),
abandonnée car Notion ne fonctionne pas côté poste (MCP `notion` désactivé dans `opencode.json`).

Migration effectuée le 2026-09-05 depuis Notion : 12 tâches reprises à l'identique
(1 En cours, 11 Done), puis complétées avec le travail récent de la session.

Workflow : `Pas commencé` → `En cours` → `Done`.
Pour avancer une tâche : cocher la case et déplacer la ligne dans la bonne section.

## En cours

- [ ] **LF-01** — Brancher le frontend sur l'API Laravel.
  Seule tâche ouverte : le front tourne sur données locales (+ Supabase pour le RAG uniquement).
- [ ] **LF-16** — Corriger BUG-V1-07 (P0) : `<main>` vide quand `activePage === 'landing'` et
  utilisateur connecté. Voir `QA-REPORT-V1-2026-09-06.md` §7.1. Fichier `src/App.tsx`.
  Fix A (minimal) : ajouter `{activePage === 'landing' && <AccueilPage onNavigate={handleNavigate} />}`
  dans le bloc `<main>` post-connexion. Vérifier : naviguer depuis login → page d'accueil
  affiche bien le hero "Bienvenue sur Legal Flow" + 11 pages sidebar.
  Effort : Faible.

## Pas commencé

- [ ] **LF-17** — Corriger BUG-V1-08 (P2 UX) : `pageTitles.landing` et `pageTitles.accueil`
  affichent tous deux "Accueil" dans la Topbar (`src/App.tsx:516,521`). Distinguer les deux
  (ex: landing → "Bienvenue", accueil → "Tableau de bord" — ou aligner sur
  `routeAfterLogin(role, statut)`). Effort : Trivial.

- [ ] **LF-18** — Migrer l'index pgvector IVFFlat → HNSW dans `src/data/supabaseSchema.sql:251`.
  Constat QA : IVFFlat toujours actif alors que AUDIT_REPORT2 (P0) demandait HNSW pour
  éviter les centroïdes erronés sur petite table. Rebuild index après seed.
  Effort : Modéré. Bloque la précision RAG si volumétrie seed faible.

- [ ] **LF-19** — Ajouter l'index `idx_documents_entreprise ON public.documents(entreprise_id)`
  dans `src/data/supabaseSchema.sql` (BDD-001 AUDIT_REPORT). Améliore perfs RLS jointures.
  Effort : Minimal.

- [ ] **LF-20** — Code-split le bundle principal `dist/assets/index-*.js` (1042 kB minifié,
  290 kB gzip) via `React.lazy()` sur les pages lourdes (LandingPage, AssistantPanel,
  SimulatorModal). Cf. AUDIT_REPORT2 P1.3. Effort : Modéré.

- [ ] **LF-21** — Étendre Vitest au serveur Express (`server.ts`, middlewares,
  `legalRagEngine.ts`) avec supertest + mock Supabase. Cible : couverture lignes > 80 %
  sur tout `server/`. Effort : Modéré.

- [ ] **LF-22** — Résoudre le double-import `supabaseClient.ts` (dynamique dans
  `AssistantPanel.tsx` + statique dans 5 autres fichiers, cf. Vite warning W1).
  Fix : aligner tous les imports sur le statique, ou garder uniquement le dynamique.
  Effort : Faible.

- [ ] **LF-23** — Vague QA V2 : Playwright E2E sur les 3 critères ⚠️ restants dans
  ACCEPTANCE.md (Critère 3 énumération bloquée visuelle, Critère 4 parcours cabinet
  en_attente, Critère 10 Topbar 3 rôles) + reverification des 7 anomalies AUDIT_REPORT
  non couvertes (LOG-002/003/004, COD-002/003/005, UI-002/003).
  Effort : Modéré (1/2 journée QA).

## Done

- [x] **LF-02** — Connecter le projet local au repo GitHub + gitignore full-stack.
- [x] **LF-03** — Connecter Notion MCP au niveau projet (jeton via env, sans secret).
  Config committée puis désactivée : Notion KO → suivi repris ici.
- [x] **LF-04** — Assistant IA + Legal RAG Engine (Gemini + Transformers.js).
- [x] **LF-05** — Implémenter le moteur d'obligations (ObligationEngine) avec calcul d'échéances.
- [x] **LF-06** — Mettre en place le système multi-entreprises et multi-rôles
  (gestionnaire, entreprise, super_admin).
- [x] **LF-07** — Construire l'UI complète des 11 pages de l'application.
- [x] **LF-08** — Seeder de conformité fiscale ivoirienne (DGI / CNPS / CMU).
- [x] **LF-09** — Implémenter le moteur ComplianceScoreEngine + tests unitaires.
- [x] **LF-10** — Implémenter le moteur PayrollTaxEngine + tests unitaires.
- [x] **LF-11** — Mettre en place l'API Laravel 12
  (modèles, migrations, seeders, routes, contrôleurs).
- [x] **LF-12** — Initialiser la structure frontend (React 19 + Vite + TS + Tailwind).
- [x] **LF-13** — Amendement #2 : horloge unique (`dateReference`), échéancier roulant
  (En retard / Mois en cours / Mois prochain + Historique), dashboard vitrine top-3,
  zéro calcul de pénalités. Vérifié (lint + build + script) et poussé.
- [x] **LF-14** — Système de tâches markdown local (ce fichier) + MCP `notion` désactivé.
- [x] **LF-15** — Connexion & utilisateurs réels (Supabase) : login email/mot de passe,
  3 comptes (super_admin / gestionnaire / entreprise), routage par rôle, données
  scopées RLS, chat persisté, journal des événements, preuves vers bucket `preuves`.
