# Socle 1.11.0 — blocs pour l'éditeur SQL de Lovable

Blocs 1 à 9 : même contenu que la migration `supabase/migrations/20261103160000_v1_11_0_maillage.sql`,
sans commentaires. Bloc 10 : propre à une installation, à ne pas passer dans le socle. Chaque bloc se passe
seul, dans l'ordre, après ceux de la 1.10.0. Tous sont rejouables.

**Ordre avec le code : la base d'abord.** Le code 1.11.0 lit les rubriques, les séries, les redirections et
appelle `lire_ensuite` et `maillage_etat`, que seule la base 1.11.0 connaît. L'ancien code reste compatible
avec la base 1.11.0, à une différence près : une étiquette inconnue saisie dans le poste Éditorial est
refusée tant que le code 1.11.0 (qui propose la liste des étiquettes) n'est pas fusionné.

| Bloc                  | Effet                                                                                                                                 | Socle | Installation |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------ |
| `1_outils.sql`        | `slug_depuis`, `extraire_liens` (liens internes lus dans le texte), `slug_article_du_chemin` ; réglage `seuil_etiquette` (3).        | oui   | oui          |
| `2_rubriques.sql`     | Rubriques sur deux niveaux, gérées par les admins ; `rubrique_id` des contenus.                                                       | oui   | oui          |
| `3_etiquettes.sql`    | Étiquettes contrôlées (reprise des étiquettes existantes) ; un contenu ne porte que des étiquettes connues, sous leur libellé de référence. | oui   | oui          |
| `4_series.sql`        | Séries d'articles ; `serie_id` et `serie_ordre` des contenus.                                                                          | oui   | oui          |
| `5_redirections.sql`  | Redirections ; changement d'adresse d'un article déjà publié : redirection permanente, sans chaîne.                                   | oui   | oui          |
| `6_manques.sql`       | Manques « liens » (lien interne cassé ou vers un contenu hors ligne) et « pilier » (satellite sans lien vers son pilier).               | oui   | oui          |
| `7_maillage.sql`      | `ancre_pauvre`, `maillage_etat` : liens sortants et entrants, orphelins, liens cassés ou redirigés, satellites absents, requête en double. | oui   | oui          |
| `8_lire_ensuite.sql`  | `lire_ensuite` : pilier et satellites frères, étiquettes communes, rubrique, série ; articles en ligne seulement.                         | oui   | oui          |
| `9_version.sql`       | Point V1-MAILLAGE de la grille ; version 1.11.0 publiée, réglage « socle » à 1.11.0.                                                  | oui   | oui          |
| `10_inscription.sql`  | Inscrit la mise à niveau 1.11.0 dans `socle_installation`.                                                                            | non   | oui          |
| `11_controle.sql`     | Contrôle : 7 lignes.                                                                                                                  | oui   | oui          |

## Résultat attendu du bloc 11

| Contrôle                       | Valeur                                  |
| ------------------------------ | --------------------------------------- |
| version du socle               | 1.11.0                                  |
| tables de la taxonomie         | 4                                       |
| etiquettes sans reference      | 0                                       |
| declencheurs du maillage       | 2                                       |
| liens internes casses en ligne | 0, ou le nombre de liens à corriger     |
| point de la grille             | 1                                       |
| version 1.11.0 publiee         | 1                                       |

**« liens internes casses en ligne » n'est pas à 0.** Des articles déjà en ligne contiennent des liens vers
une adresse inconnue ou un article hors ligne. Ils restent en ligne ; le poste Éditorial les signale, et
leur prochaine publication est refusée tant que le lien n'est pas corrigé.

## À vérifier après le passage

Dans le poste Éditorial, l'onglet Taxonomie liste les étiquettes reprises des articles. Changer l'adresse
d'un article publié, puis ouvrir l'ancienne : elle mène à la nouvelle.
