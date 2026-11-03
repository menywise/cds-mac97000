# Socle 1.9.0 — blocs pour l'éditeur SQL de Lovable

Blocs 1 à 6 : même contenu que la migration `supabase/migrations/20261103120000_v1_9_0_contenus_publics.sql`,
sans commentaires. Bloc 7 : propre à une installation, à ne pas passer dans le socle. Chaque bloc se passe
seul, dans l'ordre, après ceux de la 1.8.0. Tous sont rejouables.

**Ordre avec le code : la base d'abord.** Le code 1.9.0 lit `contenus_publics`, que seule la base 1.9.0
connaît. L'ancien code reste compatible avec la base 1.9.0 : la vue `blog_posts` lui rend les anciens noms
de colonnes, en lecture et en écriture, avec les mêmes règles d'accès. Fusionner le code 1.9.0 avant la
1.10.0, qui retire cette vue.

| Bloc                    | Effet                                                                                                                                          | Socle | Installation |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------ |
| `1_table.sql`           | `blog_posts` renommée `contenus_publics`, colonnes renommées (identifiants et commentaires conservés) ; colonnes du modèle commun ; description reprise du résumé. | oui   | oui          |
| `2_longueurs.sql`       | Fonction `sources_valides` ; adresse unique par type ; longueurs du modèle commun. Une règle qu'un contenu existant dépasse reste non validée. | oui   | oui          |
| `3_acces.sql`           | Règles d'accès sous leurs nouveaux noms, inchangées : visiteur et membre lisent les publiés, l'admin tout.                                    | oui   | oui          |
| `4_compatibilite.sql`   | Vue `blog_posts` pour l'ancien code, articles seulement, règles d'accès de la table. Retirée en 1.10.0.                                       | oui   | oui          |
| `5_fonctions.sql`       | Recherche, suppression de compte et démarrage lisent `contenus_publics`.                                                                     | oui   | oui          |
| `6_version.sql`         | Point V1-CONTENUS-PUBLICS de la grille ; version 1.9.0 publiée, réglage « socle » à 1.9.0.                                                     | oui   | oui          |
| `7_inscription.sql`     | Inscrit la mise à niveau 1.9.0 dans `socle_installation`.                                                                                      | non   | oui          |
| `8_controle.sql`        | Contrôle : 9 lignes.                                                                                                                           | oui   | oui          |

## Résultat attendu du bloc 8

| Contrôle               | Valeur                                                    |
| ---------------------- | --------------------------------------------------------- |
| version du socle       | 1.9.0                                                     |
| table contenus_publics | r                                                         |
| vue blog_posts         | v                                                         |
| articles               | le nombre d'articles d'avant la mise à niveau             |
| commentaires rattaches | le nombre de commentaires d'avant la mise à niveau        |
| regles non validees    | aucune                                                    |
| regles d acces         | 3                                                         |
| point de la grille     | 1                                                         |
| version 1.9.0 publiee  | 1                                                         |

Relever « articles » et « commentaires » avant de passer les blocs :

```sql
SELECT (SELECT count(*) FROM public.blog_posts) AS articles, (SELECT count(*) FROM public.blog_comments) AS commentaires;
```

**« regles non validees » n'affiche pas « aucune ».** Un article existant dépasse une longueur du modèle
commun (titre de 3 à 120 caractères, résumé de 600 au plus, adresse en minuscules, chiffres et tirets…).
L'article reste en ligne, la règle vaut pour les écritures suivantes. Corriger l'article dans
Administration → Contenus, puis repasser le bloc 2 : la règle se valide d'elle-même.

## À vérifier après le passage

`/blog` liste les mêmes articles qu'avant, dans le même ordre. Un article s'ouvre à la même adresse, avec
ses commentaires. La recherche du site trouve un article par un mot de son texte. Dans Administration →
Contenus, un article se crée, se modifie et se publie.
