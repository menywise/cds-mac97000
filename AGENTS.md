<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

## Règles CDS pour tout agent

Ce dépôt est soit le **socle** CDS, soit un **projet cloné** du socle. Le socle se reconnaît à sa
prise de greffe vide : `export const GREFFE: GreffeDeclaration = {};` dans `src/greffe/index.ts`.

Dans un projet cloné (prise remplie, ou dossier `src/routes/(greffe)/` présent) :

- Ne jamais modifier un fichier du socle ni une table du socle (colonne, contrainte, politique).
- Ajouter uniquement dans `src/greffe/`, `src/routes/(greffe)/`, `supabase/greffe/`, `tests/greffe/`.
- Nommer tout objet SQL `greffe_<nom>` ; déclarer modules, menus et pages dans `src/greffe/index.ts`.
- Étendre une fiche du socle par une table liée par id (voir `docs/CLONER.md`, « Écrire une greffe »).
- Ne jamais importer depuis `src/design-system/` : c'est une copie figée, pas le code du socle.

## Charte de style (socle et clones)

Référence : `docs/CHARTE_STYLE_CDS.md` et `CDS_TOKENS.md` (version 2.0.0).
Remontées de terrain des installations : `docs/REMONTEES.md` (quand un constat devient une règle,
journal, fichiers copiés tels quels par une installation).
Audits de la charte : `docs/audits/` (méthode, mesures, suites). Garde-fous éprouvés par
`bash scripts/mutations-charte.sh` : une faute plantée à la fois, chacune doit être refusée.

- Thème clair seul : aucune variante `dark:`. Police du système : aucune police téléchargée.
- Aucune couleur de la palette Tailwind en dur (`emerald-600`, `amber-100`…). Couleurs d'état
  nommées : `success`, `warning`, `danger`, `info`, `violet`, `neutral`, en fond plein, `-soft`,
  `-text` et `-border`.
- Contraste AA partout : 4,5:1 pour le texte, 3:1 pour un trait. Une couleur ajoutée à
  `src/styles.css` entre dans les paires de `scripts/verifier-contrastes.mjs`.
- Couleurs, rayons, ombres : dans `tokens/cds.tokens.json` (surcharges d'un projet :
  `tokens/<projet>.tokens.json`), puis `npm run jetons`. Ne jamais modifier à la main le bloc
  `:root` ni les couleurs `--color-*` de `src/styles.css` : ils sont fabriqués.
- Pas de gris sur un intitulé (`h1`-`h6`, `label`, `legend`, `dt`, `th`) : règle ESLint.
- Cliquet (`charte-plafonds.json`) : texte gris, opacité (classe ou modificateur `/50`), listes sans
  carte, couleurs écrites en dur et couleurs en style en ligne ne montent dans aucun fichier. Une
  couleur de données (saisie en base) passe par `couleurLisible()` (`src/lib/couleurs.ts`).
- Contrôles : hook `pre-commit` (actif au démarrage de chaque session Claude Code par
  `.claude/settings.json`), `npm run verifier`, test `tests/unit/charte.test.ts`.
