# CDS — Consensus Design System · Source de vérité des tokens

**Version** : 2.0.0 — **Date** : 27 octobre 2026

Les valeurs vivent dans **`tokens/cds.tokens.json`**, source unique au format W3C Design Tokens (`$value`, `$type`, `$description`, alias `{nom}`). Ce fichier-ci explique leur usage et leurs contrastes.

| Fichier                  | Rôle                                                                                    |
| ------------------------ | --------------------------------------------------------------------------------------- |
| `tokens/cds.tokens.json` | Valeurs des jetons (un projet ajoute ses surcharges dans `tokens/<projet>.tokens.json`) |
| `src/styles.css`         | Bloc `:root` et couleurs Tailwind **fabriqués** par `npm run jetons` : jamais à la main |
| `src/lib/cds-tokens.ts`  | Mêmes valeurs exposées au code TypeScript (`import { cds } from "@/lib/cds-tokens"`)    |

Il n'existe **aucun** `tailwind.config.ts` ni `src/index.css` : en Tailwind v4 la configuration vit dans `src/styles.css`.

La version 2.0.0 reprend les remontées de terrain d'une installation en production (charte de
style, `docs/CHARTE_STYLE_CDS.md`) : fond de page plus soutenu, couleurs d'état en quatre usages,
police du système, champs blancs. Mise à niveau d'un clone : `docs/MISE_A_NIVEAU.md`.

## Règles non négociables

- Thème **clair uniquement**. Interdit : `.dark`, `dark:`, `prefers-color-scheme: dark`, `[data-theme="dark"]`.
- Aucune couleur de la palette Tailwind en dur (`emerald-600`, `amber-100`…) : une couleur se nomme par son rôle.
- Police **du système** (`system-ui`) : aucune police téléchargée, ni Google Fonts, ni fichier hébergé.
- Taille de base : **16 px**, interlignage 1,5.
- Contraste minimum **WCAG AA** (4,5:1 pour le texte, 3:1 pour les éléments graphiques).
- Aucun texte en anglais sur les pages publiques.
- Contrôle : `npm run verifier` (couleurs, contrastes, lint, types), hook `pre-commit`, test unitaire `tests/unit/charte.test.ts`.

## Couleur principale

Valeurs **neutres** du socle. Chaque projet règle sa couleur dans Administration → Paramètres → Apparence : le site recalcule alors `--primary`, `--primary-hover`, `--primary-text`, `--primary-foreground` et `--ring` au contraste AA sur le fond de page (`src/lib/couleurs.ts`). Aucune couleur de marque n'est écrite dans le code.

| Token                  | Valeur    | Usage                                                              |
| ---------------------- | --------- | ------------------------------------------------------------------ |
| `--primary`            | `#334155` | Fonds de boutons et surfaces primaires (blanc dessus : 10,35:1)    |
| `--primary-hover`      | `#1e293b` | Survol des surfaces primaires                                      |
| `--primary-text`       | `#334155` | **Couleur principale en texte et en liens** (8,96:1 sur `#eaeff5`) |
| `--primary-foreground` | `#ffffff` | Texte posé sur `--primary`                                         |
| `--secondary`          | `#e4eaf1` | Surface secondaire pâle (texte `#252e3d` dessus : 11,28:1)         |

## Couleurs d'état : quatre usages par couleur

| Rôle      | Fond plein | `-soft` (fond pâle) | `-text` (texte, icône) | `-border` |
| --------- | ---------- | ------------------- | ---------------------- | --------- |
| `success` | `#15803d`  | `#dcfce7`           | `#166534`              | `#86efac` |
| `warning` | `#b45309`  | `#fef3c7`           | `#92400e`              | `#fcd34d` |
| `danger`  | `#c81e1e`  | `#fee2e2`           | `#991b1b`              | `#fca5a5` |
| `info`    | `#0e7490`  | `#cffafe`           | `#155e75`              | `#67e8f9` |
| `violet`  | `#6d28d9`  | `#ede9fe`           | `#5b21b6`              | `#c4b5fd` |
| `neutral` | `#475569`  | `#e2e8f0`           | `#334155`              | `#94a3b8` |

- **Fond plein** : texte blanc dessus (`-foreground`), 5,02:1 au moins.
- **`-text`** : sur `-soft`, sur une carte blanche et sur le fond de page, 6,13:1 au moins.
- **`-border`** : contour d'une pastille ou d'un encart pâle.
- **Alias historiques**, mêmes valeurs : `destructive` = `danger` (`destructive-text`, `destructive-foreground`), `cds-purple` = `violet`.
- Notifications (`.cds-toast`) : `-soft` en fond, `-border` en contour, `-text` en texte ; `neutral` pour le type par défaut.

> Changement 2.0.0 : `--warning` et `--info` deviennent des fonds pleins sous texte blanc (anciens `#ffc107` et `#0dcaf0` : texte blanc illisible). Le fond pâle passe en `-soft`.

## Neutres

| Token                  | Valeur    | Usage                                                          | Contraste sur `#eaeff5` |
| ---------------------- | --------- | -------------------------------------------------------------- | ----------------------- |
| `--background`         | `#eaeff5` | Fond de page, plus soutenu que les cartes                      | —                       |
| `--foreground`         | `#131922` | Texte principal                                                | 15,27:1                 |
| `--card` / `--popover` | `#ffffff` | Cartes, fenêtres, **champs de saisie**                         | —                       |
| `--muted` / `--accent` | `#e4eaf1` | Fonds discrets, survol                                         | —                       |
| `--muted-foreground`   | `#525b69` | Texte secondaire (métadonnées seulement)                       | 5,94:1                  |
| `--text-light`         | `#525b69` | = `--muted-foreground`                                         | 5,94:1                  |
| `--border`             | `#d4dae1` | Bordures                                                       | —                       |
| `--input`              | `#cbd2da` | Contour des champs                                             | —                       |
| `--border-strong`      | `#94a3b8` | Bordure renforcée au survol ou sur une sélection               | —                       |
| `--surface-raised`     | `#ffffff` | Cartes détachées du fond                                       | —                       |
| `--surface-sunken`     | `#f1f5f9` | Zones légèrement creusées dans une carte (onglets, squelettes) | —                       |
| `--ring`               | `#334155` | Anneau de focus                                                | —                       |

## Rayons

| Token         | Valeur            | Usage                                                                   |
| ------------- | ----------------- | ----------------------------------------------------------------------- |
| `--radius`    | `0.375rem` (6 px) | **Boutons**, champs, badges                                             |
| `--radius-sm` | `0.25rem`         | Petits éléments                                                         |
| `--radius-md` | `0.375rem` (6 px) | = `--radius` : classe `rounded-md` des contrôles                        |
| `--radius-lg` | `0.75rem` (12 px) | **Cartes**, notifications, encarts                                      |
| `--radius-xl` | `0.75rem` (12 px) | = `--radius-lg` : classe `rounded-xl` des cartes (ciblée par le relief) |
| plein         | `50%`             | Pastilles rondes                                                        |

Images et vignettes : `rounded-md` (12 px arrondirait trop une vignette de 44 px). Squelettes de chargement : forme de l'élément qu'ils remplacent (`rounded-md` par défaut, `rounded-xl` pour une carte).

## Ombres

| Nom            | Valeur                                                         |
| -------------- | -------------------------------------------------------------- |
| `xs`           | `0 1px 2px rgba(0,0,0,.04)`                                    |
| `sm`           | `0 1px 3px rgba(0,0,0,.04), 0 1px 2px rgba(0,0,0,.02)`         |
| `md`           | `0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04)`        |
| `lg`           | `0 8px 24px rgba(0,0,0,.12)`                                   |
| `field-inset`  | `inset 0 1px 2px rgba(15,23,42,.06)`                           |
| `card-tactile` | `0 1px 2px rgba(15,23,42,.05), 0 6px 18px rgba(15,23,42,.06)`  |
| `card-hover`   | `0 2px 4px rgba(15,23,42,.06), 0 12px 28px rgba(15,23,42,.09)` |

## Transitions

`fast` 150 ms · `default` 200 ms · `slow` 300 ms

## Mise en page

Largeur de contenu 1200 px · hauteur d'en-tête 56 px · largeur de colonne latérale 260 px

## Modifier un token

1. Changer la valeur dans `tokens/cds.tokens.json` (ou ajouter le jeton dans son groupe).
2. `npm run jetons` : le bloc `:root` et les couleurs Tailwind de `src/styles.css` se refont seuls.
3. Reporter la valeur dans ce fichier et dans `src/lib/cds-tokens.ts` : `tests/unit/charte.test.ts` refuse un écart.
4. Une couleur nouvelle entre dans les paires de `scripts/verifier-contrastes.mjs`, puis `npm run verifier`.

`src/styles.css` modifié à la main est refusé au commit, au `git pull` et en CI (`node scripts/jetons.mjs --verifier`).

Le nom du site, les coordonnées légales et l'hébergeur ne sont **pas** des tokens : ils se règlent dans l'espace d'administration (`/admin`).
