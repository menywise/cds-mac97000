# Charte de style CDS

**Version** : 2.0 — 27/10/2026. Les valeurs vivent dans `src/styles.css` et `CDS_TOKENS.md` ; ce
document dit comment s'en servir. Elle vaut pour le socle et pour chaque clone.

## D'où vient la version 2.0

Elle reprend les constats d'une installation en production, mesurés sur l'historique git de
sa branche principale du 12/08 au 27/10/2026 :

- La charte d'origine vivait dans le premier message envoyé à l'agent Lovable. Elle n'était ni
  versionnée, ni dans la Knowledge du projet : aucun agent ne la relisait.
- Elle nommait les couleurs d'état en toutes lettres (« fond rouge », « vert pour succès »). Faute
  de jeton, les agents ont écrit la palette Tailwind en dur : 383 couleurs en dur et 163 variantes
  `dark:` ajoutées en dix semaines, l'agent Lovable en premier, les sessions Claude ensuite.
- Le socle avait déjà des jetons d'état : aucun agent n'y a écrit de couleur en dur. Un jeton
  disponible protège mieux qu'une règle écrite.
- Le texte grisé a grossi des deux côtés, faute d'outil pour le mesurer.
- Les couleurs de texte du socle passaient sous l'AA sur un fond plus soutenu (4,34:1).

## Règles qui ne se discutent pas

- Thème clair seul. Aucune variante `dark:`, aucune classe `.dark`.
- Aucune couleur de la palette Tailwind écrite en dur. Une couleur se nomme par son rôle :
  `success`, `warning`, `danger`, `info`, `violet`, `neutral`.
- Aucun texte sous le contraste AA : 4,5:1 pour le texte, 3:1 pour un trait ou une barre.
- Police du système (`system-ui`) : aucune police téléchargée.
- Icônes `lucide-react` seulement.

## Couleurs d'état : quatre usages par couleur

| Usage        | Classe type            | Quand                                        |
| ------------ | ---------------------- | -------------------------------------------- |
| Fond plein   | `bg-danger`            | Bouton ou pastille forte, texte blanc dessus |
| Fond pâle    | `bg-danger-soft`       | Encart, pastille discrète, notification      |
| Texte, icône | `text-danger-text`     | Sur fond pâle, sur carte ou sur fond de page |
| Bordure      | `border-danger-border` | Contour d'un encart ou d'une pastille pâle   |

Valeurs et contrastes : `CDS_TOKENS.md`. `destructive` reste un alias de `danger`.

## Surfaces et texte

- Fond de page `#eaeff5`, cartes blanches : une carte se détache toujours du fond.
- Champs de saisie blancs, contour `--input`.
- Une liste de fiches se range dans des cartes, jamais à nu sur le fond de page.
- Le texte secondaire (`text-muted-foreground`) sert aux métadonnées. Un titre, un intitulé ou une
  consigne s'écrit en texte principal.

## Composants attendus

- **Carte** : fond blanc, bordure, coins de 12 px, relief léger ; au survol, ombre renforcée et
  1 px de montée.
- **Bannière de page** : titre h1 avec icône, sous-titre court.
- **Fenêtre (modale)** : centrée, plein écran sur téléphone.
- **Notifications** : `-soft`, `-border` et `-text` de leur couleur d'état.

## Trois états pour toute donnée chargée

1. Chargement : squelette animé, pas de roue.
2. Vide : grande icône et texte court centré.
3. Erreur : icône d'alerte, message, bouton « Réessayer ».

## Suppression et archivage

Jamais de `confirm()` du navigateur. Une fenêtre dédiée : titre, message, « Annuler », puis un
bouton `warning` pour archiver ou `danger` pour supprimer.

## Couleur propre à un clone

Un clone règle sa couleur principale dans Administration → Paramètres → Apparence. Une couleur par
module, s'il en faut une, se déclare dans le clone en quatre variantes (`--module-color`,
`-strong`, `-text`, `-soft`), et ses paires entrent dans `scripts/verifier-contrastes.mjs`.

## Où la charte est contrôlée

| Où                           | Quoi                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------ |
| Chaque commit (poste, cloud) | `.githooks/pre-commit` : jetons, couleurs, `dark:`, contrastes, cliquet, lint, types |
| Session Claude Code          | `.claude/settings.json` active les hooks au démarrage                                |
| Chaque `git pull`            | `scripts/charte-apres-pull.sh` signale ce qu'un agent a poussé                       |
| Chaque demande de fusion     | `tests/unit/charte.test.ts`, dans l'étape « Tests unitaires »                        |
| À la main                    | `npm run verifier`                                                                   |
| Site publié                  | robot de recette : axe-core (WCAG AA), une capture par page                          |
| Agent Lovable                | Knowledge du projet : résumé de cette charte                                         |

## Source unique des couleurs (verrou A)

Les valeurs vivent dans `tokens/cds.tokens.json`, au format W3C Design Tokens. `npm run jetons`
fabrique le bloc `:root` et les couleurs Tailwind de `src/styles.css`. Un `styles.css` retouché à
la main est refusé. Un projet garde ses couleurs propres dans `tokens/<projet>.tokens.json` : même
nom, la valeur remplace celle du socle ; nom nouveau, le jeton s'ajoute.

## Règles du lint et cliquet (verrou B)

- `charte/couleurs-nommees` (ESLint) : aucune couleur Tailwind en dur, aucun `dark:`.
- `charte/intitule-lisible` (ESLint) : pas de gris sur `h1`-`h6`, `label`, `legend`, `dt`, `th`.
- Cliquet `scripts/cliquet-charte.mjs`, plafonds dans `charte-plafonds.json` : par fichier, le
  texte gris, l'opacité sans variante et les listes sans carte ne font que baisser. Une baisse
  abaisse le plafond au commit. Un nouveau fichier a un budget : 5 gris, 0 opacité, 2 listes.
  Relever un plafond (`--relever <fichier>`) se justifie dans la demande de fusion.

Activation des hooks sur un poste, une fois : `git config core.hooksPath .githooks`.
