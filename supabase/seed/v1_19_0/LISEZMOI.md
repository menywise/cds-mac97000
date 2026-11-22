# Socle 1.19.0 — blocs pour l'éditeur SQL de Lovable

Blocs 1 à 5 : même contenu que la migration
`supabase/migrations/20261121120000_v1_19_0_captures_signalements.sql`, sans commentaires. Bloc 6 :
propre à une installation, à ne pas passer dans le socle. Chaque bloc se passe seul, dans l'ordre,
après ceux de la 1.18.0. Tous sont rejouables.

**Ordre avec le code : la base d'abord.** Le nouveau code propose le motif « La page s'affiche mal »
et le dépôt d'une capture ; sans la base 1.19.0, ce motif est refusé et la capture ne part pas (le
signalement, lui, arrive). L'ancien code reste compatible avec la base 1.19.0.

| Bloc                | Effet                                                                     | Socle | Installation |
| ------------------- | ------------------------------------------------------------------------- | ----- | ------------ |
| `1_motif.sql`       | Motif « affichage » (la page s'affiche mal) accepté par la base.          | oui   | oui          |
| `2_dossier.sql`     | Dossier privé `signalements-captures` : 2 Mo, PNG, JPEG ou WebP.          | oui   | oui          |
| `3_depot.sql`       | Dépôt par l'auteur dans les 15 minutes ; lecture et effacement admin.     | oui   | oui          |
| `4_effacement.sql`  | `report_captures_a_effacer()` : captures expirées ou orphelines.          | oui   | oui          |
| `5_version.sql`     | Conformité, registre, version 1.19.0 publiée, réglage « socle » à 1.19.0. | oui   | oui          |
| `6_inscription.sql` | Inscrit la mise à niveau 1.19.0 dans `socle_installation`.                | non   | oui          |
| `7_controle.sql`    | Contrôle : 5 lignes.                                                      | oui   | oui          |

## Résultat attendu du bloc 7

| Contrôle                            | Valeur |
| ----------------------------------- | ------ |
| version du socle                    | 1.19.0 |
| dossier signalements-captures prive | true   |
| regles du dossier                   | 3      |
| fonction report_captures_a_effacer  | true   |
| version 1.19.0 publiee              | 1      |

## Effacement des captures

La plateforme refuse l'effacement d'un fichier par une requête SQL : il passe par l'interface des
fichiers. Deux chemins, sans réglage :

- l'écran Admin → Signalements efface les captures expirées à chaque ouverture ;
- l'adresse `/api/cron/purge-contact`, si une tâche planifiée de la plateforme l'appelle chaque nuit.
