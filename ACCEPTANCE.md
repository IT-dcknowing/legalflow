# Recette — Spec « Connexion, inscription & rôles » (PEN-020)

Date : 2026-09-05. Méthode : tests API REST + scripts + grep (pas de Playwright).
Légende : ✅ prouvé · ⚠️ en place, validation visuelle navigateur à confirmer.

## Critère 1 — Auth réelle obligatoire ✅
- `grep RoleSwitcher src/` → vide (fichier supprimé, aucune référence).
- LoginPage sans bouton démo ; `useRealAuth` seule source de vérité.

## Critère 2 — RLS : INSERT super_admin refusé ✅
- Connecté en alex (entreprise) :
  `POST /rest/v1/profiles {id: own, role: 'super_admin'}` →
  `403 new row violates row-level security policy for table "profiles"`.
- Idem sur compte frais (testinsc2) → 403. Comptes de test nettoyés après.

## Critère 3 — Énumération bloquée ✅ (code)
- Login : message unique « Identifiants incorrects. Vérifiez votre saisie ou
  réinitialisez votre mot de passe. » (email inexistant ou mdp faux).
- Reset : toujours « Si un compte existe pour cet email… » (même si inexistant).
- ⚠️ Vérification visuelle navigateur à confirmer.

## Critère 4 — Routing par statut ✅ (code + guard 19/19)
- `routeAfterLogin(role, statut)` : actif → dashboard du rôle,
  en_attente → /en-attente, suspendu → /suspendu.
- Garde anti-accès (actif vers pages blocantes) + matrice `routeGuard.ts`
  vérifiée par script : 19/19.
- ⚠️ Parcours cabinet en_attente de bout en bout à cliquer (localhost:3000).

## Critère 5 — Inscription entreprise = auto-actif ✅
- Chaîne API vérifiée : INSERT profiles (entreprise/actif) 201 →
  INSERT entreprises 201 → UPDATE lien 204 → SELECT ne voit que sa boîte.
- Comptes de test nettoyés.

## Critère 6 — Inscription cabinet = en_attente ✅ (code + policies)
- Policies vérifiées (super_admin bloqué 403, trigger anti re-link 400).
- ⚠️ Signup complet via UI non rejoué (rate limit email 429 croisé en tests ;
  confirmations de test via SQL).

## Critère 7 — HQ peut activer/refuser ✅ (code + RLS)
- `CabinetsEnAttentePage` : table triée, Activer (statut + date_activation +
  journal + stub email), Refuser (motif obligatoire + suspendu + journal).
- UPDATE admin vérifié en API (suspend/restore alex + revert).
- ⚠️ Emails en stub (`email_sent`) : intégration SMTP/Resend = chantier futur.

## Critère 8 — Landing publique sans lien admin ✅
- `grep "Espace admin|Console HQ" src/pages/LandingPage.tsx` → vide.
- Landing sans Topbar/Sidebar, page par défaut hors session.

## Critère 9 — Journal complet ✅ (mécanisme)
- Actions tracées : connexion, deconnexion, inscription_entreprise,
  inscription_cabinet, cabinet_active, cabinet_refuse, email_sent,
  profil_complete, quittance_pointee, rapport_genere, acces_refuse.
- Visibilité par niveau vérifiée en API (alex=1 propre, cabinet=clients, admin=tout).

## Critère 10 — Gates Topbar fixes ✅ (code)
- Badge fixe nom + rôle coloré par niveau (Topbar), plus de sélecteur.
- ⚠️ Contrôle visuel des 3 rôles à confirmer dans le navigateur.
