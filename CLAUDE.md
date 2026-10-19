@AGENTS.md

## Poste du propriétaire (stable : ne pas redemander)

- Windows, PowerShell. git et l'outil GitHub `gh` installés et connectés.
- Comptes de recette du robot local : `~/.config/<nom du dossier du dépôt>/recette-comptes.env`,
  hors dépôt. Jamais dans `.env`, qui est versionné.

## Quota GitHub Actions serré

Le quota s'épuise chaque début de mois. Tout ce qui peut tourner sur le poste tourne sur le poste.

- `qualite.yml` : sur une demande de fusion en brouillon, seules les vérifications tournent
  (types, style, tests, base, build). Les recettes dans un navigateur attendent le passage en
  « prête » (Ready for review), puis tournent sur `main`.
- Recette du site public : `scripts/recette-locale.ps1` sur le poste. L'action
  `recette-publique` ne tourne plus le lundi, seulement à la main.
- Pousser moins souvent : regrouper les corrections, un push validé plutôt que trois.
- Aucune nouvelle action GitHub sans l'accord du propriétaire.
