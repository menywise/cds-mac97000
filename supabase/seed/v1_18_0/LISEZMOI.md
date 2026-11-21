# Socle 1.18.0 — blocs pour l'éditeur SQL de Lovable

Blocs 1 et 2 : même contenu que la migration `supabase/migrations/20261120120000_v1_18_0_tables.sql`,
sans commentaires. Bloc 3 : propre à une installation, à ne pas passer dans le socle. Chaque bloc se
passe seul, dans l'ordre, après ceux de la 1.17.0. Tous sont rejouables.

**Ordre avec le code : la base d'abord.** L'écran Admin → Tables lit `tables_catalogue()` ; sans la
base 1.18.0, l'écran affiche une erreur, le reste du site n'est pas touché. Les tables d'une greffe
apparaissent d'elles-mêmes dans l'écran : rien à déclarer. Ce que l'écran peut lire ou écrire dans
une table dépend de ses politiques de sécurité par ligne, pas de l'écran.

| Bloc                | Effet                                                               | Socle | Installation |
| ------------------- | ------------------------------------------------------------------- | ----- | ------------ |
| `1_tables.sql`      | `tables_catalogue()` : colonnes, types, clés, énumérations, lignes. | oui   | oui          |
| `2_version.sql`     | Version 1.18.0 publiée (brique), réglage « socle » à 1.18.0.        | oui   | oui          |
| `3_inscription.sql` | Inscrit la mise à niveau 1.18.0 dans `socle_installation`.          | non   | oui          |
| `4_controle.sql`    | Contrôle : 4 lignes.                                                | oui   | oui          |

## Résultat attendu du bloc 4

| Contrôle                  | Valeur                         |
| ------------------------- | ------------------------------ |
| version du socle          | 1.18.0                         |
| fonction tables_catalogue | true                           |
| tables cataloguees        | le nombre de tables de la base |
| version 1.18.0 publiee    | 1                              |
