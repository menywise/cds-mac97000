# Socle 1.10.0 — blocs pour l'éditeur SQL de Lovable

Blocs 1 à 9 : même contenu que la migration `supabase/migrations/20261103140000_v1_10_0_circuit_editorial.sql`,
sans commentaires. Bloc 10 : propre à une installation, à ne pas passer dans le socle. Chaque bloc se passe
seul, dans l'ordre, après ceux de la 1.9.0. Tous sont rejouables. Le bloc 1 se passe **seul** : la valeur
« editor » ajoutée au type des rôles ne sert qu'une fois enregistrée.

**Ordre avec le code : la base d'abord, le code aussitôt après.** Le code 1.10.0 appelle
`changer_statut_contenu`, que seule la base 1.10.0 connaît. Entre les deux, l'ancien bouton « Publier »
de l'administration est refusé (circuit complet : un article passe par « à relire » et « prêt ») ; la
lecture du blog n'est pas touchée. Prérequis : le code 1.9.0 fusionné, car le bloc 8 retire la vue
`blog_posts`.

| Bloc                     | Effet                                                                                                                                         | Socle | Installation |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------ |
| `1_role.sql`             | Valeur `editor` (rédacteur) du type `app_role`.                                                                                              | oui   | oui          |
| `2_reglages.sql`         | Réglage `editorial` (circuit, délai de relecture, exigences, auteur, avertissement) ; `can_write_content` ; `admin_set_editor`.                | oui   | oui          |
| `3_champs.sql`           | Statut et champs du circuit (relecture, auteur, pilier, public et requête visés, date prévue) ; reprise : publié → publie, le reste → redaction. | oui   | oui          |
| `4_acces.sql`            | Programmés invisibles avant l'heure ; rédacteur et admin lisent tout ; le rédacteur écrit, l'admin seul supprime.                              | oui   | oui          |
| `5_manques_termes.sql`   | Statut lu, manques avant publication, termes interdits (table, recherche, accroche `greffe_termes_nominatifs`), contenus à revoir.           | oui   | oui          |
| `6_journal_versions.sql` | Journal des statuts et versions du texte, lisibles des rédacteurs et des admins.                                                              | oui   | oui          |
| `7_passages.sql`         | Passages imposés par la base, garde des termes interdits, journal et versions écrits par la base, `changer_statut_contenu`.                    | oui   | oui          |
| `8_retrait_vue.sql`      | Retire la vue de compatibilité `blog_posts`.                                                                                                  | oui   | oui          |
| `9_version.sql`          | Point V1-CIRCUIT-EDITORIAL de la grille ; version 1.10.0 publiée, réglage « socle » à 1.10.0.                                                  | oui   | oui          |
| `10_inscription.sql`     | Inscrit la mise à niveau 1.10.0 dans `socle_installation`.                                                                                    | non   | oui          |
| `11_controle.sql`        | Contrôle : 9 lignes.                                                                                                                          | oui   | oui          |

## Résultat attendu du bloc 11

| Contrôle                      | Valeur  |
| ----------------------------- | ------- |
| version du socle              | 1.10.0  |
| role redacteur                | 1       |
| reglage editorial             | complet |
| contenus sans statut coherent | 0       |
| declencheurs du circuit       | 3       |
| contenus sans version         | 0       |
| vue blog_posts                | absente |
| point de la grille            | 1       |
| version 1.10.0 publiee        | 1       |

## À savoir après le passage

- **Les articles déjà en ligne apparaissent « à actualiser » dans le poste Éditorial** : aucune date de
  relecture n'existait avant la 1.10.0, et la base n'en invente pas. Ils restent en ligne. Les relire un à
  un, ou régler « Relecture exigée » sur non (Éditorial → Réglages) pour un site sans relecture.
- **Circuit simple** (Éditorial → Réglages) : un administrateur publie directement un article en rédaction ;
  la publication vaut relecture. Les autres exigences restent actives.
- **Termes interdits** : liste dans Éditorial → Réglages, saisie en base, jamais dans le dépôt. Une
  installation qui veut bloquer aussi des noms de personnes tirés de ses propres tables écrit une fonction
  `public.greffe_termes_nominatifs(text) returns text[]` dans `supabase/greffe/` : le socle l'appelle s'il
  la trouve.

## À vérifier après le passage

Un compte rédacteur (Administration → Utilisateurs) écrit un article et l'envoie en relecture ; un
administrateur valide la relecture puis publie. Un article programmé n'apparaît sur `/blog` qu'à l'heure
dite.
