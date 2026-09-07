<div align="center">

# ⚖️ LEGAL FLOW

**La conformité fiscale, sociale et juridique des entreprises ivoiriennes — simplifiée.**

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Firebase Hosting](https://img.shields.io/badge/Hosting-Firebase-DD2C00?logo=firebase&logoColor=white)](https://firebase.google.com/)
[![Tests](https://img.shields.io/badge/tests-86%20verts-brightgreen)](./src/services/__tests__)

### 🌐 Application en ligne : **[https://legalflowio.web.app](https://legalflowio.web.app)**

*DGI · CNPS · CMU — CGI 2026, Code de Prévoyance Sociale, Code du Travail, SYSCOHADA*

</div>

---

## C'est quoi ?

**Legal Flow** est une plateforme web qui aide les entreprises ivoiriennes (et les cabinets
comptables qui les accompagnent) à **ne rater aucune échéance fiscale et sociale** : TVA, ITS,
cotisations CNPS, CMU, FDFP, patente, états financiers…

Concrètement, l'application :
- 📅 **Calcule et affiche les échéances** applicables à chaque entreprise selon son profil
  (régime fiscal, secteur, effectif) — avec jours de retard, badges et alertes.
- 🧮 **Chiffre le coût réel** de chaque échéance (simulateur : montant + majorations + intérêts).
- 🤖 **Répond aux questions fiscales** via un assistant IA branché sur les textes officiels (RAG).
- 📊 **Score la conformité** de l'entreprise et génère des **rapports d'audit PDF**.
- 🗂️ **Archive les preuves** (quittances) et **trace tout** dans un journal d'audit.
- 👥 **Sépare 3 niveaux d'accès** : Super Admin HQ, Cabinet gestionnaire, Entreprise.

> ⚠️ **État actuel (sept. 2026) :** l'authentification est **mise en pause** — l'app s'ouvre
> directement avec un **sélecteur de 4 profils démo** en haut à droite (voir § Comptes démo).
> Les données métier affichées sont des données de démonstration.

---

## Fonctionnalités

### 📅 Échéancier intelligent (cœur du produit)
- Horloge unique (`dateReference`) : tout — retards, badges `J-x`, sections, compteurs —
  dérive d'une seule date (système réel par défaut, forçable en mode QA `?qa=1`).
- 3 blocs roulants : **En retard** (triés par gravité, ex. 97j → 4j), **Mois en cours**,
  **Mois prochain** + filtre **Historique** (quittances pointées).
- Pointer une quittance fait disparaître l'échéance des deux vues (dashboard + échéancier).
- Chaque carte : onglets Résumé / Réglementation (base légale, barème, plateforme
  officielle, sanctions) / Historique des versions / Ma simulation.

### 💰 Simulateur de coût réel
- Lignes libres (libellé + montant), suggestions (principal, majoration 10 %, intérêts 1 %/mois),
  total mis en évidence, date de paiement prévue + rappel, badge « Coût réel estimé » cliquable.

### 🤖 Assistant LEGAL FLOW AI
- Accessible en panneau latéral **et en pleine page** (entrée sidebar).
- En local : OpenRouter (`minimax-m3:free`) + RAG pgvector (8005 extraits officiels) + fallback
  déterministe sourcé ; **en ligne : moteur local** (le backend Express n'est pas encore hébergé).
- Conversations persistées par utilisateur.

### 📊 Conformité & audit
- `ComplianceScoreEngine` (score pondéré par ancienneté des retards), `PayrollTaxEngine`
  (CNPS/CMU/ITS/FDFP au barème), `ObligationEngine` (génération roulante des échéances).
- Rapports PDF miroir/certifié, journal d'audit filtrable par niveau, preuves dans le bucket privé.

### 👥 Gestion multi-niveaux
- Cabinet : portefeuille multi-entreprises, entrée dans un dossier client, complétion de profil.
- HQ : file d'activation des cabinets (Activer/Refuser + motif), audits transversaux, schéma base.
- Inscription publique entreprise/cabinet, pages `/en-attente` / `/suspendu`, garde-fous de routing.

### 🧰 Pilotage du projet
- `kanban.html` : tableau de bord des tâches (source de vérité, 40+ tâches tracées).
- `TASKS.md`, `ACCEPTANCE.md` : suivi et recette.

---

## Les 3 niveaux d'accès

| Niveau | Espace | Périmètre des données |
|---|---|---|
| **Super Admin HQ** | Console globale (`/admin…`) | Tout : entreprises, journaux, file cabinets |
| **Gestionnaire** (cabinet) | Portefeuille + dossiers clients | Ses entreprises clientes uniquement (RLS) |
| **Entreprise** (utilisateur) | Dashboard, échéancier, documents… | Sa société uniquement (RLS) |

Sécurité : policies RLS testées (isolement prouvé par tests API), trigger anti auto-promotion
de rôle, JWT vérifié sur `/api/*` + rate limiting + validation Zod côté serveur.

---

## Stack technique

| Couche | Techno |
|---|---|
| Frontend | React 19 + Vite 6 + TypeScript 5 + Tailwind CSS v4 |
| Backend (local/dev) | Express 4 + Vite middleware (`server.ts`, port 3000) |
| Base, Auth, Storage, RAG vectoriel | Supabase (Postgres + pgvector, RLS, bucket `preuves`) |
| IA | OpenRouter + `@xenova/transformers` (MiniLM-L12-v2) + fallback déterministe |
| Hébergement | Firebase Hosting ([legalflowio.web.app](https://legalflowio.web.app)) |
| Tests | Vitest (86 tests, couverture > seuils) |

```
Navigateur ──► Firebase Hosting (statique : React buildé)
   │                │  API Supabase directe (données, auth, storage, RAG)
   │                ▼
   └──────────► Supabase : Postgres + RLS + Auth + Storage + pgvector
   (local) ──► Express :3000 (/api/chat, /api/rag, /metrics)
```

---

## Démarrage rapide

**Prérequis :** Node.js 20+ (ou [Bun](https://bun.sh)), compte Supabase (déjà configuré).

```bash
# 1. Dépendances (projet initialisé avec Bun)
bun install

# 2. Configuration locale (jamais commité, voir .gitignore)
cp .env.example .env
# → renseigner VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, OPENROUTER_API_KEY…

# 3. Lancer en local
bun run dev          # → http://localhost:3000
```

**Scripts :** `dev` · `build` (front `dist/` + `dist/server.cjs`) · `start` ·
`preview` · `lint` (`tsc --noEmit`) · `test` / `test:run` / `test:coverage` (Vitest) ·
`download:embedder` (poids Xenova offline → `server/models/`, voir `EMBEDDER_LOCAL_PATH`).

**Variables d'environnement** (voir `.env.example` — aucune valeur réelle n'y figure) :
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `OPENROUTER_API_KEY`,
`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (RAG serveur uniquement), clés `VITE_FIREBASE_*`
(Hosting/analytics), `SENTRY_DSN` / `VITE_SENTRY_DSN` (optionnel), `EMBEDDER_LOCAL_PATH` (optionnel).

---

## Base de données

Migrations versionnées dans `supabase/migrations/` (0001 → 0007 : auth/connexion, RLS,
anti-récursion, statuts, inscriptions, seuil RAG 0.45, index, wrapper Firebase Auth en lecture).
Schéma : `cabinets`, `entreprises`, `cabinet_entreprises`, `profiles` (rôle + statut),
`chatbot_conversations`, `journal_evenements`, `documents_juridiques` (8005 extraits, index HNSW),
bucket privé `preuves` (`{entreprise}/{échéance}/{fichier}`).

## Déploiement

```bash
npm run build
firebase login            # compte propriétaire de legalflowio (une fois)
firebase deploy --only hosting --project legalflowio
# → https://legalflowio.web.app
```
Émulateur local : `firebase emulators:start --only hosting` (→ :5000).

---

## Comptes démo (auth en pause)

Sélecteur en haut à droite, sans mot de passe :
- **Super Admin HQ** — Me. Aminata Diallo (console globale)
- **Cabinet** — Audit & Conseils CI (5 entreprises)
- **Entreprise (complet)** — Alex Koffi, Koffi BTP SARL
- **Entreprise (incomplet)** — Atelier N'Guessan (profil à compléter)

## Feuille de route (reste ouvert)
- **ACT-001** — brancher le frontend sur l'API Laravel (squelette dans `laravel/`, non exécuté).
- **Auth réelle** — réactiver (sessions Supabase/Firebase + pont OIDC), 2FA TOTP admin (PEN-039).
- **Backend prod** — héberger Express (Cloud Run) pour l'IA complète en ligne ; SMTP réel ; purge `auth.users` via clé service.
- Voir `kanban.html` (référence) et `ACCEPTANCE.md` (recette).
