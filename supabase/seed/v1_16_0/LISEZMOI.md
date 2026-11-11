# Socle 1.16.0 — blocs pour l'éditeur SQL de Lovable

Blocs 1 à 3 : même contenu que la migration
`supabase/migrations/20261111120000_v1_16_0_registre.sql`, sans commentaires. Bloc 4 : propre à une
installation, à ne pas passer dans le socle. Chaque bloc se passe seul, dans l'ordre, après ceux de
la 1.15.7. Tous sont rejouables.

**Ordre avec le code : la base d'abord.** L'écran Admin → Registre lit la table `registre` et la
fonction `registre_manquants()`. Sans la base 1.16.0, l'écran affiche une erreur ; le reste du site
n'est pas touché.

Une installation qui a ses propres éléments (modules de greffe, clés, tâches) écrit
`public.greffe_registre_attendus() returns table (type text, identifiant text)` dans
`supabase/greffe/` : `registre_manquants()` les contrôle avec ceux du socle. Ses scripts s'inscrivent
par `public.registre_inscrire(...)` dans un bloc de `supabase/greffe/`.

| Bloc                | Effet                                                                             | Socle | Installation |
| ------------------- | --------------------------------------------------------------------------------- | ----- | ------------ |
| `1_registre.sql`    | Table `registre`, `registre_inscrire`, `registre_attendus`, `registre_manquants`. | oui   | oui          |
| `2_elements.sql`    | Lignes du socle : modules, tâches planifiées, scripts, automatismes, adresses.    | oui   | oui          |
| `3_version.sql`     | Version 1.16.0 publiée (brique), réglage « socle » à 1.16.0.                      | oui   | oui          |
| `4_inscription.sql` | Inscrit la mise à niveau 1.16.0 dans `socle_installation`.                        | non   | oui          |
| `5_controle.sql`    | Contrôle : 5 lignes.                                                              | oui   | oui          |

## Résultat attendu du bloc 5

| Contrôle                    | Valeur                                                 |
| --------------------------- | ------------------------------------------------------ |
| version du socle            | 1.16.0                                                 |
| table registre              | true                                                   |
| lignes du socle au registre | 42 au moins                                            |
| elements hors registre      | 0 (sinon : Admin → Registre, encart « Hors registre ») |
| version 1.16.0 publiee      | 1                                                      |
