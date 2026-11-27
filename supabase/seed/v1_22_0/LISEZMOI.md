# Socle 1.22.0 — blocs pour l'éditeur SQL de Lovable

Blocs 1 et 2 : même contenu que la migration
`supabase/migrations/20261124120000_v1_22_0_pages_hors_index.sql`, sans commentaires. Bloc 3 :
propre à une installation, à ne pas passer dans le socle. Chaque bloc se passe seul, dans l'ordre,
après ceux de la 1.21.0. Tous sont rejouables.

**Ordre avec le code : la base d'abord.** Le code 1.22.0 lit la colonne `hors_index` des pages :
sans la base 1.22.0, les pages libres et le plan du site ne se chargent plus. L'inverse est sûr : un
code 1.21.0 sur une base 1.22.0 ignore la colonne, et toutes les pages restent indexées.

| Bloc                     | Effet                                                                                          | Socle | Installation |
| ------------------------ | ---------------------------------------------------------------------------------------------- | ----- | ------------ |
| `1_pages_hors_index.sql` | Colonne `hors_index` des pages, refusée sur l'accueil ; recherche du site sans les satellites. | oui   | oui          |
| `2_version.sql`          | Version 1.22.0 publiée (brique), réglage « socle » à 1.22.0.                                   | oui   | oui          |
| `3_inscription.sql`      | Inscrit la mise à niveau 1.22.0 dans `socle_installation`.                                     | non   | oui          |
| `4_controle.sql`         | Contrôle : 5 lignes.                                                                           | oui   | oui          |

## Résultat attendu du bloc 4

| Contrôle                  | Valeur                                          |
| ------------------------- | ----------------------------------------------- |
| version du socle          | 1.22.0                                          |
| colonne hors_index        | 1                                               |
| accueil jamais hors index | 1                                               |
| pages hors index          | le nombre de pages satellites (0 dans le socle) |
| version 1.22.0 publiee    | 1                                               |
