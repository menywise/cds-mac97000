# Socle 1.15.1 — blocs pour l'éditeur SQL de Lovable

Blocs 1 et 2 : même contenu que la migration
`supabase/migrations/20261104120000_v1_15_1_correctifs_recette.sql`, sans commentaires. Bloc 3 : propre
à une installation, à ne pas passer dans le socle. Chaque bloc se passe seul, dans l'ordre, après ceux
de la 1.15.0. Tous sont rejouables.

**Ordre avec le code : indifférent.** La base change un seuil, le code passe les pages introuvables en
`noindex`. Aucun des deux ne dépend de l'autre.

| Bloc                | Effet                                                                                   | Socle | Installation |
| ------------------- | --------------------------------------------------------------------------------------- | ----- | ------------ |
| `1_suggestion.sql`  | `suggestion_recherche` : seuil de similarité ramené de 0,35 à 0,3.                       | oui   | oui          |
| `2_version.sql`     | Version 1.15.1 publiée (correctif), réglage « socle » à 1.15.1.                          | oui   | oui          |
| `3_inscription.sql` | Inscrit la mise à niveau 1.15.1 dans `socle_installation`.                               | non   | oui          |
| `4_controle.sql`    | Contrôle : 3 lignes.                                                                    | oui   | oui          |

## Résultat attendu du bloc 4

| Contrôle               | Valeur |
| ---------------------- | ------ |
| version du socle       | 1.15.1 |
| seuil de la suggestion | 0,3    |
| version 1.15.1 publiee | 1      |
