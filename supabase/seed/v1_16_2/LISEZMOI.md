# Socle 1.16.2 — blocs pour l'éditeur SQL de Lovable

Correctif, suite de la 1.16.1. Blocs 1 à 3 : même contenu que la migration
`supabase/migrations/20261116120000_v1_16_2_droits_tables.sql`, sans commentaires. Bloc 4 : propre à
une installation, à ne pas passer dans le socle. Chaque bloc se passe seul, dans l'ordre, après ceux
de la 1.16.1. Tous sont rejouables.

**Ordre avec le code : indifférent.** Aucun écran, aucune fonction ne vide une table ni ne crée de
déclencheur avec les rôles publics.

Supabase donne par défaut tous les droits aux rôles `anon` (visiteur) et `authenticated` (membre
connecté) sur chaque table créée. Le dépôt n'en retirait qu'une partie. Avant ce correctif, en
production, ces rôles pouvaient vider (`TRUNCATE`) 56 tables, dont `user_roles` et `profiles` ;
`TRUNCATE` passe par-dessus la sécurité par ligne.

| Bloc                      | Effet                                                                                                                                                               | Socle | Installation |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------ |
| `1_droits_tables.sql`     | Retire `TRUNCATE`, `REFERENCES`, `TRIGGER` (et `MAINTAIN` en PostgreSQL 17) aux rôles publics sur toutes les tables ; visiteur sans écriture sur `template_checks`. | oui   | oui          |
| `2_droits_par_defaut.sql` | Mêmes droits retirés des droits par défaut : les tables créées ensuite ne les reçoivent plus.                                                                       | oui   | oui          |
| `3_version.sql`           | Version 1.16.2 publiée (correctif), réglage « socle » à 1.16.2.                                                                                                     | oui   | oui          |
| `4_inscription.sql`       | Inscrit la mise à niveau 1.16.2 dans `socle_installation`.                                                                                                          | non   | oui          |
| `5_controle.sql`          | Contrôle : 7 lignes.                                                                                                                                                | oui   | oui          |

Le bloc 2 agit sur les droits par défaut du rôle qui passe le bloc (`postgres` sur Lovable Cloud, qui
possède toutes les tables du schéma public). S'il est refusé, les blocs 1 et 3 restent valables ; une
table créée plus tard recevrait à nouveau ces droits, et le bloc 5 le montrerait.

## Résultat attendu du bloc 5

Mesuré sur la base du socle le 15/11/2026, avant la 1.16.1 et la 1.16.2 : 56 tables, 2 droits par
défaut, 19 lectures sans condition, visiteur qui écrit la grille.

| Contrôle                                | Valeur                                    |
| --------------------------------------- | ----------------------------------------- |
| version du socle                        | 1.16.2                                    |
| tables videes par anon ou authenticated | 0                                         |
| droit de vider par defaut               | 0 (sinon : bloc 2 refusé, le repasser)    |
| lectures sans condition dans public     | 0 (sinon : blocs de la 1.16.1 non passés) |
| geo_communes presente                   | false                                     |
| visiteur ecrit la grille                | false                                     |
| version 1.16.2 publiee                  | 1                                         |
