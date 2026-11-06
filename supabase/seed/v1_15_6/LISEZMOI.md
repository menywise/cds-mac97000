# Socle 1.15.6 — blocs pour l'éditeur SQL de Lovable

Blocs 1 et 2 : même contenu que la migration
`supabase/migrations/20261109120000_v1_15_6_termes_references.sql`, sans commentaires. Bloc 3 :
propre à une installation, à ne pas passer dans le socle. Chaque bloc se passe seul, dans l'ordre,
après ceux de la 1.15.5. Tous sont rejouables.

**Ordre avec le code : indifférent.** Aucun changement de code : les termes interdits (et les noms
d'une installation, `greffe_termes_nominatifs`) sont aussi cherchés dans les références.

| Bloc                      | Effet                                                                      | Socle | Installation |
| ------------------------- | -------------------------------------------------------------------------- | ----- | ------------ |
| `1_termes_references.sql` | `texte_contenu_public` lit les références ; `garde_termes_contenus` aussi. | oui   | oui          |
| `2_version.sql`           | Version 1.15.6 publiée (correctif), réglage « socle » à 1.15.6.            | oui   | oui          |
| `3_inscription.sql`       | Inscrit la mise à niveau 1.15.6 dans `socle_installation`.                 | non   | oui          |
| `4_controle.sql`          | Contrôle : 4 lignes.                                                       | oui   | oui          |

## Résultat attendu du bloc 4

| Contrôle                 | Valeur |
| ------------------------ | ------ |
| version du socle         | 1.15.6 |
| texte lit les references | true   |
| garde lit le drapeau     | true   |
| version 1.15.6 publiee   | 1      |
