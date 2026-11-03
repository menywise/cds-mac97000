# Socle 1.15.0 — blocs pour l'éditeur SQL de Lovable

Blocs 1 à 4 : même contenu que la migration `supabase/migrations/20261103230000_v1_15_0_pilotage.sql`,
sans commentaires. Bloc 5 : propre à une installation, à ne pas passer dans le socle. Chaque bloc se passe
seul, dans l'ordre, après ceux de la 1.14.0. Tous sont rejouables.

**Ordre avec le code : la base d'abord.** Le code 1.15.0 lit `appels_action` et les colonnes du brief.
L'ancien code reste compatible avec la base 1.15.0.

| Bloc                     | Effet                                                                                       | Socle | Installation |
| ------------------------ | ------------------------------------------------------------------------------------------- | ----- | ------------ |
| `1_appels_action.sql`    | Table `appels_action` : encarts de fin d'article, gérés par les admins, actifs lisibles de tous. | oui   | oui          |
| `2_brief.sql`            | Colonnes `intention` (comprendre, comparer, agir) et `appel_action_id` des contenus.       | oui   | oui          |
| `3_reglage.sql`          | Réglage `appel_action_defaut`.                                                              | oui   | oui          |
| `4_version.sql`          | Point V1-PILOTAGE-CONTENU de la grille ; version 1.15.0 publiée, réglage « socle » à 1.15.0. | oui   | oui          |
| `5_inscription.sql`      | Inscrit la mise à niveau 1.15.0 dans `socle_installation`.                                 | non   | oui          |
| `6_controle.sql`         | Contrôle : 5 lignes.                                                                        | oui   | oui          |

## Résultat attendu du bloc 6

| Contrôle                    | Valeur |
| --------------------------- | ------ |
| version du socle            | 1.15.0 |
| table des appels a l action | 1      |
| champs du brief             | 2      |
| point de la grille          | 1      |
| version 1.15.0 publiee      | 1      |
