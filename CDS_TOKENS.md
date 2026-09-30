# CDS — Consensus Design System · Source de vérité des tokens

**Version** : 1.1.0 — **Date** : 17 septembre 2026

Ce fichier est la **référence unique**. Deux fichiers seulement l'appliquent :

| Fichier                 | Rôle                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `src/styles.css`        | Déclaration réelle des tokens (Tailwind v4, `@theme inline` + `:root`)               |
| `src/lib/cds-tokens.ts` | Mêmes valeurs exposées au code TypeScript (`import { cds } from "@/lib/cds-tokens"`) |

Il n'existe **aucun** `tailwind.config.ts` ni `src/index.css` : en Tailwind v4 la configuration vit dans `src/styles.css`.

## Règles non négociables

- Thème **clair uniquement**. Interdit : `.dark`, `dark:`, `prefers-color-scheme: dark`, `[data-theme="dark"]`.
- Police unique : **Inter** (Google Fonts), chargée par `<link>` dans `src/routes/__root.tsx`. Aucune autre famille.
- Taille de base : **16 px**, interlignage 1,5.
- Contraste minimum **WCAG AA** (4,5:1 pour le texte, 3:1 pour les éléments graphiques).
- Aucun texte en anglais sur les pages publiques.

## Couleurs de marque

| Token                  | Valeur    | Usage                                                         |
| ---------------------- | --------- | ------------------------------------------------------------- |
| `--primary`            | `#0d6efd` | Fonds de boutons et surfaces primaires (blanc dessus : 4,5:1) |
| `--primary-hover`      | `#0a58ca` | Survol des surfaces primaires                                 |
| `--primary-text`       | `#0a58ca` | **Bleu en texte et en liens** (6,15:1 sur `#f8fafc`)          |
| `--primary-foreground` | `#ffffff` | Texte posé sur `--primary`                                    |
| `--secondary`          | `#6c757d` | Surfaces secondaires (blanc dessus : 4,69:1)                  |
| `--cds-purple`         | `#7c3aed` | Accent ponctuel                                               |

## Couleurs d'état

| Token            | Valeur    | Usage                       | Contraste sur `#f8fafc`     |
| ---------------- | --------- | --------------------------- | --------------------------- |
| `--success`      | `#198754` | Fonds et bordures de succès | 4,33:1 (surface uniquement) |
| `--success-text` | `#15803d` | Texte et icônes de succès   | 4,79:1                      |
| `--warning`      | `#ffc107` | Fonds et bordures d'alerte  | 1,56:1 (surface uniquement) |
| `--warning-text` | `#b45200` | Texte, icônes et étoiles    | 4,84:1                      |
| `--destructive`  | `#dc3545` | Erreurs                     | blanc dessus : 4,53:1       |
| `--info`         | `#0dcaf0` | Fonds d'information         | surface uniquement          |
| `--info-text`    | `#0891b2` | Texte d'information         | 4,5:1                       |

> Règle : les tokens **sans** suffixe `-text` servent aux **fonds** ; les tokens `-text` servent au **texte et aux icônes**. Ne jamais poser `--warning` ou `--info` en couleur de texte sur fond clair.

## Neutres

| Token                  | Valeur    | Usage                                            | Contraste sur `#f8fafc` |
| ---------------------- | --------- | ------------------------------------------------ | ----------------------- |
| `--background`         | `#f8fafc` | Fond de page                                     | —                       |
| `--foreground`         | `#1e293b` | Texte principal                                  | 13,98:1                 |
| `--card` / `--popover` | `#ffffff` | Surfaces surélevées                              | —                       |
| `--muted` / `--accent` | `#f3f4f6` | Fonds discrets                                   | —                       |
| `--muted-foreground`   | `#5d6b80` | Texte secondaire (ancien `#64748b` : 4,32:1 sur `--accent`, non conforme) | 5,17:1 (4,92:1 sur `--accent`) |
| `--text-light`         | `#5b6472` | Texte tertiaire (ancien `#8e95a1`, non conforme) | 5,72:1                  |
| `--border` / `--input` | `#e5e7eb` | Bordures et champs                               | —                       |
| `--border-strong`      | `#cbd5e1` | Bordure renforcée au survol ou sur une sélection | —                       |
| `--surface-raised`     | `#ffffff` | Cartes détachées du fond                         | —                       |
| `--surface-sunken`     | `#f1f5f9` | Champs et zones légèrement creusées              | —                       |
| `--ring`               | `#0d6efd` | Anneau de focus                                  | —                       |

## Rayons

| Token         | Valeur            | Usage                       |
| ------------- | ----------------- | --------------------------- |
| `--radius`    | `0.375rem` (6 px) | **Boutons**, champs, badges |
| `--radius-sm` | `0.25rem`         | Petits éléments             |
| `--radius-md` | `0.5rem`          | Encarts                     |
| `--radius-lg` | `0.75rem` (12 px) | **Cartes**, notifications   |
| plein         | `50%`             | Pastilles rondes            |

## Ombres

| Nom  | Valeur                                                  |
| ---- | ------------------------------------------------------- |
| `xs` | `0 1px 2px rgba(0,0,0,.04)`                             |
| `sm` | `0 1px 3px rgba(0,0,0,.04), 0 1px 2px rgba(0,0,0,.02)`  |
| `md` | `0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04)` |
| `lg` | `0 8px 24px rgba(0,0,0,.12)`                            |
| `field-inset` | `inset 0 1px 2px rgba(15,23,42,.06)` |
| `card-tactile` | `0 1px 2px rgba(15,23,42,.05), 0 6px 18px rgba(15,23,42,.06)` |
| `card-hover` | `0 2px 4px rgba(15,23,42,.06), 0 12px 28px rgba(15,23,42,.09)` |

## Transitions

`fast` 150 ms · `default` 200 ms · `slow` 300 ms

## Mise en page

Largeur de contenu 1200 px · hauteur d'en-tête 56 px · largeur de colonne latérale 260 px

## Surfaces subtiles (statuts)

| Nom    | Fond      | Texte     |
| ------ | --------- | --------- |
| bleu   | `#dbeafe` | `#205ee6` |
| vert   | `#dcfce7` | `#008229` |
| ambre  | `#fef3c7` | `#b45200` |
| rouge  | `#fee2e2` | `#cf1919` |
| cyan   | `#cffafe` | `#007899` |
| violet | `#ede9fe` | `#7c3aed` |
| gris   | `#f3f4f6` | `#687179` |

## Modifier un token

1. Mettre à jour ce fichier.
2. Reporter la valeur dans `src/styles.css` (`:root`).
3. Reporter la valeur dans `src/lib/cds-tokens.ts`.
4. Vérifier le contraste (minimum 4,5:1 pour le texte).

Le nom du site, les coordonnées légales et l'hébergeur ne sont **pas** des tokens : ils se règlent dans l'espace d'administration (`/admin`).
