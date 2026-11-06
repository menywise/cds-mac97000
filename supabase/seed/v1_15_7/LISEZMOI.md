# Socle 1.15.7 — blocs pour l'éditeur SQL de Lovable

Correctif de code seul : aucun changement de schéma. Bloc 1 : même contenu que la migration
`supabase/migrations/20261110120000_v1_15_7_clones_sans_migrations.sql`, sans commentaires. Bloc 2 :
propre à une installation, à ne pas passer dans le socle. Chaque bloc se passe seul, dans l'ordre,
après ceux de la 1.15.6. Tous sont rejouables.

**Ordre avec le code : indifférent.** Le code change deux tests (`tests/unit/modules-sql.test.ts`,
`tests/unit/socle-neutre.test.ts`) et la documentation : un clone, qui n'a pas de
`supabase/migrations`, passe les tests du socle ; ses documents vivent dans `docs/greffe/`.

| Bloc                | Effet                                                           | Socle | Installation |
| ------------------- | --------------------------------------------------------------- | ----- | ------------ |
| `1_version.sql`     | Version 1.15.7 publiée (correctif), réglage « socle » à 1.15.7. | oui   | oui          |
| `2_inscription.sql` | Inscrit la mise à niveau 1.15.7 dans `socle_installation`.      | non   | oui          |
| `3_controle.sql`    | Contrôle : 2 lignes.                                            | oui   | oui          |

## Résultat attendu du bloc 3

| Contrôle               | Valeur |
| ---------------------- | ------ |
| version du socle       | 1.15.7 |
| version 1.15.7 publiee | 1      |
