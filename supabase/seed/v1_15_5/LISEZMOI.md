# Socle 1.15.5 — blocs pour l'éditeur SQL de Lovable

Blocs 1 et 2 : même contenu que la migration
`supabase/migrations/20261108120000_v1_15_5_relecture_references.sql`, sans commentaires. Bloc 3 :
propre à une installation, à ne pas passer dans le socle. Chaque bloc se passe seul, dans l'ordre,
après ceux de la 1.15.4. Tous sont rejouables.

**Ordre avec le code : indifférent.** Aucun changement de code : une référence ajoutée, modifiée ou
retirée renvoie l'article en relecture (prêt ou programmé → à relire ; en ligne → à actualiser).

| Bloc                         | Effet                                                             | Socle | Installation |
| ---------------------------- | ----------------------------------------------------------------- | ----- | ------------ |
| `1_relecture_references.sql` | Garde des statuts reprise, déclencheurs sur `references_contenu`. | oui   | oui          |
| `2_version.sql`              | Version 1.15.5 publiée (correctif), réglage « socle » à 1.15.5.   | oui   | oui          |
| `3_inscription.sql`          | Inscrit la mise à niveau 1.15.5 dans `socle_installation`.        | non   | oui          |
| `4_controle.sql`             | Contrôle : 4 lignes.                                              | oui   | oui          |

## Résultat attendu du bloc 4

| Contrôle                    | Valeur |
| --------------------------- | ------ |
| version du socle            | 1.15.5 |
| declencheurs des references | 2      |
| garde lit le drapeau        | true   |
| version 1.15.5 publiee      | 1      |
