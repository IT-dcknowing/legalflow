# Tâches — LEGAL-FLOW

Suivi local en markdown. Remplace la base Notion « Tâches » (espace « IT dc knowing »),
abandonnée car Notion ne fonctionne pas côté poste (MCP `notion` désactivé dans `opencode.json`).

Migration effectuée le 2026-09-05 depuis Notion : 12 tâches reprises à l'identique
(1 En cours, 11 Done), puis complétées avec le travail récent de la session.

Workflow : `Pas commencé` → `En cours` → `Done`.
Pour avancer une tâche : cocher la case et déplacer la ligne dans la bonne section.

## En cours

- [ ] **LF-01** — Brancher le frontend sur l'API Laravel.
  Seule tâche ouverte : le front tourne sur données locales (+ Supabase pour le RAG uniquement).

## Pas commencé

*(rien pour l'instant)*

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
