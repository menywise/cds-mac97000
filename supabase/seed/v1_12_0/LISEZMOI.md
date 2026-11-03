# Socle 1.12.0 — blocs pour l'éditeur SQL de Lovable

Blocs 1 à 4 : même contenu que la migration `supabase/migrations/20261103180000_v1_12_0_seo_technique.sql`,
sans commentaires. Bloc 5 : propre à une installation, à ne pas passer dans le socle. Chaque bloc se passe
seul, dans l'ordre, après ceux de la 1.11.0. Tous sont rejouables.

**Ordre avec le code : la base d'abord.** Le code 1.12.0 appelle `sources_a_verifier` et
`enregistrer_liens_sources`, que seule la base 1.12.0 connaît. L'ancien code reste compatible avec la base
1.12.0. L'essentiel du lot est dans le code (texte des articles, données structurées, balises, plan du
site, flux RSS) : il ne change rien à la base.

| Bloc                       | Effet                                                                                                   | Socle | Installation |
| -------------------------- | ------------------------------------------------------------------------------------------------------- | ----- | ------------ |
| `1_liens_sources.sql`      | Table `liens_sources_etat`, lisible des rédacteurs ; `enregistrer_liens_sources` (droit revérifié).     | oui   | oui          |
| `2_sources_a_verifier.sql` | `sources_a_verifier` : adresses citées par les contenus, contenus qui les citent, date de vérification. | oui   | oui          |
| `3_reglage.sql`            | Réglage `type_page` : `WebPage` par défaut, `MedicalWebPage` pour un site santé.                         | oui   | oui          |
| `4_version.sql`            | Point V1-SEO-ARTICLES de la grille ; version 1.12.0 publiée, réglage « socle » à 1.12.0.                 | oui   | oui          |
| `5_inscription.sql`        | Inscrit la mise à niveau 1.12.0 dans `socle_installation`.                                              | non   | oui          |
| `6_controle.sql`           | Contrôle : 6 lignes.                                                                                    | oui   | oui          |

## Résultat attendu du bloc 6

| Contrôle                          | Valeur  |
| --------------------------------- | ------- |
| version du socle                  | 1.12.0  |
| table des liens de sources        | 1       |
| visiteur lit les liens de sources | false   |
| type de page                      | WebPage |
| point de la grille                | 1       |
| version 1.12.0 publiee            | 1       |

## À vérifier après le passage

Dans le poste Éditorial, onglet Réglages : « Vérifier les liens de sources » donne l'état de chaque adresse.
Un article avec des intertitres `##` montre un sommaire à partir de trois intertitres.
