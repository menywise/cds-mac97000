# Socle 1.23.0 — blocs pour l'éditeur SQL de Lovable

Blocs 1 et 2 : même contenu que la migration
`supabase/migrations/20261125120000_v1_23_0_redirections_toute_adresse.sql`, sans commentaires.
Bloc 3 : propre à une installation, à ne pas passer dans le socle. Chaque bloc se passe seul, dans
l'ordre, après ceux de la 1.22.0. Tous sont rejouables.

**Ordre avec le code : la base d'abord, de préférence.** Le code 1.23.0 appelle
`redirection_pour()` pour toute adresse inconnue. Sans la base 1.23.0, il retombe sur l'ancienne
lecture de la table : les articles renommés restent suivis, les autres anciennes adresses affichent
la page introuvable, comme avant. L'inverse est sûr : un code 1.22.0 sur une base 1.23.0 garde les
redirections des articles (module blog allumé).

Import en masse des anciennes adresses : Admin → Tables → `redirections`, import CSV (colonnes
`de` et `vers`). Une ancienne adresse s'écrit avec sa barre oblique finale ou sans : les deux sont
trouvées.

| Bloc                 | Effet                                                                          | Socle | Installation |
| -------------------- | ------------------------------------------------------------------------------ | ----- | ------------ |
| `1_redirections.sql` | Adresses de fichiers et destination en https acceptées ; `redirection_pour()`. | oui   | oui          |
| `2_version.sql`      | Version 1.23.0 publiée (brique), réglage « socle » à 1.23.0.                   | oui   | oui          |
| `3_inscription.sql`  | Inscrit la mise à niveau 1.23.0 dans `socle_installation`.                     | non   | oui          |
| `4_controle.sql`     | Contrôle : 5 lignes.                                                           | oui   | oui          |

## Résultat attendu du bloc 4

| Contrôle                       | Valeur                                      |
| ------------------------------ | ------------------------------------------- |
| version du socle               | 1.23.0                                      |
| fonction redirection_pour      | true                                        |
| adresses de fichiers acceptees | 1                                           |
| redirections                   | le nombre de redirections (0 dans le socle) |
| version 1.23.0 publiee         | 1                                           |
