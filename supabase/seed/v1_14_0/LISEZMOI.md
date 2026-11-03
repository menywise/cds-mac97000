# Socle 1.14.0 — blocs pour l'éditeur SQL de Lovable

Blocs 1 à 5 : même contenu que la migration `supabase/migrations/20261103220000_v1_14_0_societe_savante.sql`,
sans commentaires. Bloc 6 : propre à une installation, à ne pas passer dans le socle. Chaque bloc se passe
seul, dans l'ordre, après ceux de la 1.13.0. Tous sont rejouables.

**Ordre avec le code : la base d'abord.** Le code 1.14.0 lit les nouvelles colonnes et la table
`references_contenu`. L'ancien code reste compatible avec la base 1.14.0 : chaque exigence nouvelle est
facultative ou éteinte par défaut.

| Bloc                 | Effet                                                                                                         | Socle | Installation |
| -------------------- | ------------------------------------------------------------------------------------------------------------- | ----- | ------------ |
| `1_champs.sql`       | Genre, événement et date, liens d'intérêts, niveau de preuve, relecteurs.                                     | oui   | oui          |
| `2_references.sql`   | Table `references_contenu` (bibliographie numérotée), lisible avec son contenu, écrite par les rédacteurs.   | oui   | oui          |
| `3_reglages.sql`     | Réglages `exiger_liens_interets` (non), `niveaux_preuve`, `format_citation` (vancouver).                      | oui   | oui          |
| `4_manques.sql`      | Manques : liens d'intérêts exigés, compte rendu sans événement, niveau de preuve hors liste, appel sans référence. | oui | oui          |
| `5_version.sql`      | Point V1-SOCIETE-SAVANTE de la grille ; version 1.14.0 publiée, réglage « socle » à 1.14.0.                   | oui   | oui          |
| `6_inscription.sql`  | Inscrit la mise à niveau 1.14.0 dans `socle_installation`.                                                   | non   | oui          |
| `7_controle.sql`     | Contrôle : 6 lignes.                                                                                         | oui   | oui          |

## Résultat attendu du bloc 7

| Contrôle               | Valeur    |
| ---------------------- | --------- |
| version du socle       | 1.14.0    |
| champs savants         | 6         |
| table des references   | 1         |
| format de citation     | vancouver |
| point de la grille     | 1         |
| version 1.14.0 publiee | 1         |

## À savoir

Un article déjà en ligne qui contient un texte entre crochets d'un à trois chiffres (« [1] ») sans
référence enregistrée voit sa prochaine publication refusée tant que la référence n'est pas ajoutée dans le
poste Éditorial.
