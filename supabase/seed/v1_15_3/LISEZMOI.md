# Socle 1.15.3 — blocs pour l'éditeur SQL de Lovable

Blocs 1 et 2 : même contenu que la migration
`supabase/migrations/20261106120000_v1_15_3_appels_colles.sql`, sans commentaires. Bloc 3 : propre à
une installation, à ne pas passer dans le socle. Chaque bloc se passe seul, dans l'ordre, après ceux
de la 1.15.2. Tous sont rejouables.

**Ordre avec le code : indifférent.** Aucun changement de code : seul le manque « references » de
`manques_contenu` change. Dans « [1][2] », il voit désormais les deux appels, comme l'écran.

| Bloc                  | Effet                                                                  | Socle | Installation |
| --------------------- | ---------------------------------------------------------------------- | ----- | ------------ |
| `1_appels_colles.sql` | `manques_contenu` : liens retirés avant de compter les appels « [n] ». | oui   | oui          |
| `2_version.sql`       | Version 1.15.3 publiée (correctif), réglage « socle » à 1.15.3.        | oui   | oui          |
| `3_inscription.sql`   | Inscrit la mise à niveau 1.15.3 dans `socle_installation`.             | non   | oui          |
| `4_controle.sql`      | Contrôle : 3 lignes.                                                   | oui   | oui          |

## Résultat attendu du bloc 4

| Contrôle               | Valeur |
| ---------------------- | ------ |
| version du socle       | 1.15.3 |
| appels lus dans [1][2] | 2      |
| version 1.15.3 publiee | 1      |
