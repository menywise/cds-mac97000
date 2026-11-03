# Socle 1.15.2 — blocs pour l'éditeur SQL de Lovable

Blocs 1 et 2 : même contenu que la migration
`supabase/migrations/20261105120000_v1_15_2_search_path.sql`, sans commentaires. Bloc 3 : propre à
une installation, à ne pas passer dans le socle. Chaque bloc se passe seul, dans l'ordre, après ceux
de la 1.15.1. Tous sont rejouables.

**Ordre avec le code : indifférent.** Aucun changement de code, aucun changement de comportement :
trois fonctions fixent leur `search_path`, ce que toutes les autres faisaient déjà.

| Bloc                | Effet                                                                                   | Socle | Installation |
| ------------------- | --------------------------------------------------------------------------------------- | ----- | ------------ |
| `1_search_path.sql` | `search_tags`, `search_excerpt`, `geo_distance_km` : `search_path = public`.             | oui   | oui          |
| `2_version.sql`     | Version 1.15.2 publiée (correctif), réglage « socle » à 1.15.2.                          | oui   | oui          |
| `3_inscription.sql` | Inscrit la mise à niveau 1.15.2 dans `socle_installation`.                               | non   | oui          |
| `4_controle.sql`    | Contrôle : 3 lignes.                                                                    | oui   | oui          |

## Résultat attendu du bloc 4

| Contrôle                   | Valeur |
| -------------------------- | ------ |
| version du socle           | 1.15.2 |
| fonctions sans search_path | 0      |
| version 1.15.2 publiee     | 1      |
