# Socle 1.13.0 — blocs pour l'éditeur SQL de Lovable

Blocs 1 à 7 : même contenu que la migration `supabase/migrations/20261103200000_v1_13_0_recherche.sql`,
sans commentaires. Bloc 8 : propre à une installation, à ne pas passer dans le socle. Chaque bloc se passe
seul, dans l'ordre, après ceux de la 1.12.0. Tous sont rejouables.

**Ordre avec le code : la base d'abord.** Le code 1.13.0 appelle `recherche_articles`,
`recherche_articles_facettes` et `suggestion_recherche`, que seule la base 1.13.0 connaît. L'ancien code
reste compatible avec la base 1.13.0.

| Bloc                   | Effet                                                                                                             | Socle | Installation |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------- | ----- | ------------ |
| `1_synonymes.sql`      | Extension `pg_trgm` ; table `synonymes` (terme et variantes), écrite par les rédacteurs.                          | oui   | oui          |
| `2_requete.sql`        | `requete_mot`, `requete_articles` : début de mot, phrase exacte, mot exclu, alternative, synonymes.              | oui   | oui          |
| `3_sans_resultat.sql`  | Table `recherches_sans_resultat` (anonyme, 1 000 termes au plus) et `noter_recherche_sans_resultat`.              | oui   | oui          |
| `4_recherche.sql`      | `recherche_articles` : filtres, pagination, extrait surligné, pondération, articles en ligne seulement.           | oui   | oui          |
| `5_facettes.sql`       | `recherche_articles_facettes` : rubrique, étiquette, série, année.                                               | oui   | oui          |
| `6_suggestion.sql`     | `suggestion_recherche` : mot proche du vocabulaire des articles en ligne.                                        | oui   | oui          |
| `7_version.sql`        | Point V1-RECHERCHE-ARTICLES de la grille ; version 1.13.0 publiée, réglage « socle » à 1.13.0.                    | oui   | oui          |
| `8_inscription.sql`    | Inscrit la mise à niveau 1.13.0 dans `socle_installation`.                                                       | non   | oui          |
| `9_controle.sql`       | Contrôle : 7 lignes.                                                                                             | oui   | oui          |

## Résultat attendu du bloc 9

| Contrôle                  | Valeur |
| ------------------------- | ------ |
| version du socle          | 1.13.0 |
| extension pg_trgm         | 1      |
| tables de la recherche    | 2      |
| fonctions de la recherche | 6      |
| visiteur lit le journal   | false  |
| point de la grille        | 1      |
| version 1.13.0 publiee    | 1      |

## À vérifier après le passage

Sur `/blog`, chercher un mot avec une faute de frappe : « Vouliez-vous dire » propose le bon mot. Chercher un
terme absent : il apparaît dans le poste Éditorial, onglet Taxonomie, « Recherches sans résultat ».
