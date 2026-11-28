# Socle 1.23.1 — blocs pour l'éditeur SQL de Lovable

Blocs 1 et 2 : même contenu que la migration
`supabase/migrations/20261126120000_v1_23_1_redirections_fermees.sql`, sans commentaires. Bloc 3 :
propre à une installation, à ne pas passer dans le socle. Chaque bloc se passe seul, dans l'ordre,
après ceux de la 1.23.0. Tous sont rejouables.

**Ordre avec le code : la 1.23.0 d'abord, base et code.** Le code 1.23.0 trouve les redirections
par `redirection_pour()`, qui ne dépend pas de la lecture directe de la table. Un code plus ancien
(1.22.0 ou avant) lisait la table : sur une base 1.23.1, il ne suit plus les articles renommés.

| Bloc                         | Effet                                                                                  | Socle | Installation |
| ---------------------------- | -------------------------------------------------------------------------------------- | ----- | ------------ |
| `1_redirections_fermees.sql` | Plus de lecture directe pour les visiteurs ; comptes connectés : rédacteurs et admins. | oui   | oui          |
| `2_version.sql`              | Version 1.23.1 publiée (correctif), réglage « socle » à 1.23.1.                        | oui   | oui          |
| `3_inscription.sql`          | Inscrit la mise à niveau 1.23.1 dans `socle_installation`.                             | non   | oui          |
| `4_controle.sql`             | Contrôle : 5 lignes.                                                                   | oui   | oui          |

## Résultat attendu du bloc 4

| Contrôle                      | Valeur |
| ----------------------------- | ------ |
| version du socle              | 1.23.1 |
| lecture directe des visiteurs | false  |
| politique des visiteurs       | 0      |
| fonction redirection_pour     | true   |
| version 1.23.1 publiee        | 1      |
