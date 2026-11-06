# Socle 1.15.4 — blocs pour l'éditeur SQL de Lovable

Blocs 1 et 2 : même contenu que la migration
`supabase/migrations/20261107120000_v1_15_4_etiquette_slug.sql`, sans commentaires. Bloc 3 : propre
à une installation, à ne pas passer dans le socle. Chaque bloc se passe seul, dans l'ordre, après
ceux de la 1.15.3. Tous sont rejouables.

**Ordre avec le code : indifférent.** Aucun changement de code. Après le bloc 1, la plateforme
régénère `src/integrations/supabase/types.ts` avec `slug` facultatif pour `etiquettes` : la
compilation de `src/lib/editorial.ts` (`enregistrerEtiquette`) passe.

| Bloc                     | Effet                                                                 | Socle | Installation |
| ------------------------ | --------------------------------------------------------------------- | ----- | ------------ |
| `1_etiquette_grille.sql` | `etiquettes.slug` par défaut vide ; point DES-1 sur la police système. | oui   | oui          |
| `2_version.sql`          | Version 1.15.4 publiée (correctif), réglage « socle » à 1.15.4.       | oui   | oui          |
| `3_inscription.sql`      | Inscrit la mise à niveau 1.15.4 dans `socle_installation`.            | non   | oui          |
| `4_controle.sql`         | Contrôle : 4 lignes.                                                  | oui   | oui          |

## Résultat attendu du bloc 4

| Contrôle               | Valeur                       |
| ---------------------- | ---------------------------- |
| version du socle       | 1.15.4                       |
| slug par defaut        | ''::text                     |
| grille DES-1           | Police du système uniquement |
| version 1.15.4 publiee | 1                            |
