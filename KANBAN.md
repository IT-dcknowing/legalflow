# legal-flow-tasks

Mini-Notion de travail du projet **Legal Flow**, en HTML+JS pur, versionné sous Git.

## Pourquoi

Le MCP Notion est instable. On a besoin d'un endroit pour organiser les tâches, lisible par n'importe quelle IA. Ce repo est ce remplaçant : une page HTML qu'on ouvre dans le navigateur, sans serveur, sans build.

## Utilisation

**Ouvrir le Kanban** : double-clic sur `index.html` (ou clic droit → "Ouvrir avec le navigateur").

**Fonctionnalités** :
- 4 colonnes : 💡 Backlog · 📋 À faire · 🔥 En cours · ✅ Terminé
- Cliquer une carte pour voir le détail (objectif, étapes, SQL, critères, historique…)
- Drag & drop pour changer l'état d'une tâche
- Formulaire « + Ajouter » en haut de chaque colonne
- Export / Import JSON (sauvegarde manuelle)
- Persistance automatique dans le `localStorage` du navigateur

**Persistance des données** : elles sont stockées dans le `localStorage` du navigateur (`legal-flow-tasks-v1`). Pour les rendre durables, versionner ce repo Git. Pour partager entre machines, utiliser **Export JSON** puis copier le fichier dans un autre profil / une autre machine, et **Importer**.

## Cycle de vie d'une tâche

1. Idée → 💡 Backlog
2. À attaquer → 📋 À faire (pending)
3. En cours de travail → 🔥 En cours (active) — c'est ici qu'on code
4. Terminé → ✅ Terminé (done) — avec un résumé ajouté dans l'historique

Pour migrer d'une colonne à l'autre, deux options :
- **Drag & drop** dans l'UI (modifie le `localStorage`)
- **Edit direct** du fichier `localStorage` (DevTools > Application > Local Storage)

## État actuel

**10 tâches** au 5 sept. 2026 ~03h00 :
- 1 en cours (ACT-001) : brancher le frontend sur l'API Laravel
- 9 en attente (PEN-001 à PEN-009) : chantier Connexion & Utilisateurs réels Supabase

## Convention de nommage des IDs

- `BL-XXX` : Backlog (idées à clarifier)
- `PEN-XXX` : Pending (à faire)
- `ACT-XXX` : Active (en cours)
- `DONE-XXX` : Done (terminé)

## Sauvegarde et partage

- **Pour une IA** : ouvrir `index.html` et lire la modale d'une tâche — tout est en clair dans le DOM.
- **Pour sauvegarder** : `git add . && git commit -m "..."` (les changements de `localStorage` ne sont pas versionnés — c'est volontaire, ce sont des données runtime).
- **Pour migrer** : bouton « Exporter JSON » → donne un fichier `.json` qu'on peut re-importer ailleurs.

## Lien avec le projet

- Code de l'app : `../legal-flow/`
- Mémoire partagée : `~/.claude/projects/C--Users-alexm/memory/`
