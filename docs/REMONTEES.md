# Remontées de terrain vers le socle

Le socle s'améliore à partir de ce que ses installations constatent en production. Ce document dit
quand un constat devient une règle du socle, et garde la trace de chaque remontée. Les exemples
restent anonymes : « une installation » désigne n'importe quel projet construit sur le socle.

## Quand un constat devient une règle du socle

Un constat remonte s'il remplit au moins une de ces conditions :

- **il touche tout projet** : accessibilité, contraste, sécurité, données personnelles ;
- **il corrige un outil commun** : générateur des jetons, cliquet, règles du lint, robot de recette ;
- **il revient deux fois** : deux installations font le même écart, ou la même correction.

Il reste dans l'installation s'il tient à son métier ou à sa marque : couleur d'un module, termes
métier, choix d'icônes. L'installation le note alors comme écart assumé dans sa propre charte.

## Chemin d'une remontée

1. **Constat** dans l'installation : écart de recette, commit refusé, retour d'un utilisateur.
2. **Règle** dans le socle : une demande de fusion qui corrige le socle, avec sa preuve (test,
   commit témoin refusé, mesure).
3. **Retour** dans l'installation : fusion de `main` du socle (`docs/MISE_A_NIVEAU.md`), ou
   reprise des fichiers copiés tels quels (ci-dessous).
4. **Trace** : une ligne dans le journal en bas de ce document.

Une installation ne corrige jamais d'abord sa copie d'un outil commun : la correction part du socle,
sinon les deux versions divergent sans que personne le voie.

## Fichiers copiés tels quels par une installation

Une installation qui n'est pas née d'un Remix du socle peut reprendre ses outils de charte à
l'identique :

- `tokens/cds.tokens.json` ;
- `scripts/jetons.mjs` ;
- `scripts/cliquet-charte.mjs` ;
- `eslint-rules/charte.js` ;
- `scripts/verifier-couleurs.mjs` (lit les motifs de `eslint-rules/charte.js`) ;
- `src/lib/couleurs.ts` (couleurs de données lisibles).

Ces fichiers restent génériques : aucun nom de projet, aucun chemin propre à une installation. Les
couleurs d'une installation vont dans `tokens/<projet>.tokens.json`, jamais dans ces fichiers. Un
changement de l'un d'eux se signale dans la demande de fusion du socle, pour que chaque installation
le reprenne.

Le socle ne contrôle pas ces copies : c'est à l'installation de le faire, dans ses propres hooks.
Elle note le commit du socle copié et l'empreinte de chaque fichier, puis refuse au commit toute
copie modifiée chez elle. Sans ce contrôle, la règle reste une consigne écrite, sans garde-fou.

## Journal

| Date       | Constat de terrain                                                         | Dans le socle                                                           |
| ---------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 27/10/2026 | Cartes blanches peu visibles sur un fond trop pâle                         | Fond de page `#eaeff5` (charte 2.0)                                     |
| 27/10/2026 | Un même jeton d'état servait de fond pâle et de fond plein                 | Couleurs d'état en quatre usages : plein, `-soft`, `-text`, `-border`   |
| 27/10/2026 | Installation en police du système, socle en Inter : deux rendus différents | Police du système, Inter retirée                                        |
| 27/10/2026 | Charte contournée par l'agent Lovable, hors des hooks                      | Contrôle au `git pull`, hooks au démarrage de session, Knowledge        |
| 28/10/2026 | Couleurs retouchées à la main dans `styles.css`, écarts entre deux dépôts  | Verrou A : jetons au format W3C, `styles.css` fabriqué                  |
| 28/10/2026 | Titres et étiquettes en gris, listes posées à nu sur le fond               | Verrou B : règles du lint, cliquet par fichier                          |
| 28/10/2026 | Ombre W3C en objet seul écrite `[object Object]` (relecture automatique)   | Générateur des jetons corrigé                                           |
| 28/10/2026 | Copies des outils de charte modifiées d'un côté seulement                  | Liste des fichiers copiés tels quels, correction toujours dans le socle |
| 28/10/2026 | Couleurs de données (base, table de familles) posées en texte sous l'AA    | `couleurLisible()` dans `src/lib/couleurs.ts`                           |
| 28/10/2026 | Anneau de focus à 30 % sur les boutons ; ombre de carte qui l'efface       | Anneau plein décalé de 2 px                                             |
| 28/10/2026 | Test par mutation : 6 fautes sur 14 passent le hook, `border-l-amber-500`  | Lint et cliquet élargis, test `tests/unit/garde-fous.test.ts`           |
| 28/10/2026 | Contour des champs à 1,53:1 sur carte (WCAG 1.4.11)                        | `--input` `#7a8697` (3,69:1), paires du contrôle des contrastes         |
| 28/10/2026 | Focus caché sous l'en-tête collant et sous le bandeau cookies (2.4.11)     | `scroll-padding` de `html` tenu par `useHauteurReservee`                |
| 28/10/2026 | Halo de focus des champs à 20 % ; anneau de l'onglet actif sur le focus    | Anneau plein d'1 px sur les champs, onglet actif sans anneau au focus   |
| 28/10/2026 | Survol `bg-*/80` sous 4,5:1 (badge `destructive`)                          | Survol à 90 %, mesuré par l'audit du rendu de DB&M                      |
