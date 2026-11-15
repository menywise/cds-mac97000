# Socle 1.16.1 — blocs pour l'éditeur SQL de Lovable

Correctif : durcissement des règles de lecture (RLS) de seize tables signalées par le scanner de
Lovable (règle LOV.DB.RLS_TAUTOLOGY_PERMISSIVE.V1, politiques « USING (true) »). Blocs 1 et 2 : même
contenu que la migration `supabase/migrations/20261115120000_v1_16_1_durcissement_rls.sql`, sans
commentaires. Bloc 3 : propre à une installation, à ne pas passer dans le socle. Chaque bloc se passe
seul, dans l'ordre, après ceux de la 1.16.0. Tous sont rejouables.

**Ordre avec le code : indifférent.** Aucun écran ne change ; les lectures de l'application passent
par des clés publiques nommées, par les modules allumés ou par des fonctions qui comptent avec les
droits du propriétaire.

Ce que le bloc 1 change :

| Table                                                                                 | Avant        | Après                                                                                                    |
| ------------------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------- |
| `site_settings`                                                                       | tout lisible | clés `brand`, `modules`, `annuaire`, `editorial`, `shop` lisibles de tous ; le reste aux administrateurs |
| `forum_topics`, `forum_replies`, `forum_categories`                                   | tout lisible | lisibles quand le module « forum » est allumé                                                            |
| `forum_likes`                                                                         | tout lisible | un membre lit les siens, un administrateur tous ; les compteurs comptent avec les droits du propriétaire |
| `directory_categories`, `marketplace_categories`, `geo_departements`, `geo_adjacency` | tout lisible | lisibles quand leur module est allumé (départements : annuaire ou géographie)                            |
| `rubriques`, `etiquettes`, `series`, `redirections`                                   | tout lisible | module « blog » allumé, ou rédacteur                                                                     |
| `synonymes`                                                                           | tout lisible | rédacteurs seulement (la recherche publique passe par `requete_mot` et `suggestion_recherche`)           |
| `socle_versions`, `socle_installation`                                                | tout lisible | administrateurs seulement                                                                                |

Une installation qui range une clé publique à elle dans `site_settings` écrit
`public.greffe_site_settings_publiques() returns text[]` dans `supabase/greffe/` : la politique de
lecture la lit si elle existe.

| Bloc                | Effet                                                                                       | Socle | Installation |
| ------------------- | ------------------------------------------------------------------------------------------- | ----- | ------------ |
| `1_politiques.sql`  | Fonction `site_settings_cle_publique`, politiques de lecture, compteurs du forum, registre. | oui   | oui          |
| `2_version.sql`     | Version 1.16.1 publiée (correctif), réglage « socle » à 1.16.1.                             | oui   | oui          |
| `3_inscription.sql` | Inscrit la mise à niveau 1.16.1 dans `socle_installation`.                                  | non   | oui          |
| `4_controle.sql`    | Contrôle : 5 lignes.                                                                        | oui   | oui          |

## Résultat attendu du bloc 4

| Contrôle                                                  | Valeur                                                      |
| --------------------------------------------------------- | ----------------------------------------------------------- |
| version du socle                                          | 1.16.1                                                      |
| politiques de lecture sans condition sur les seize tables | 0 (sinon : une politique « USING (true) » reste, la nommer) |
| cle publique brand                                        | true                                                        |
| cle publique socle                                        | false                                                       |
| version 1.16.1 publiee                                    | 1                                                           |
