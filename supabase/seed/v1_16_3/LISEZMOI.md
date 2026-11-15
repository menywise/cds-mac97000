# Socle 1.16.3 — blocs pour l'éditeur SQL de Lovable

Correctif, suite de la 1.16.2. Blocs 1 et 2 : même contenu que la migration
`supabase/migrations/20261117120000_v1_16_3_ecritures_visiteur.sql`, sans commentaires. Bloc 3 :
propre à une installation, à ne pas passer dans le socle. Chaque bloc se passe seul, dans l'ordre,
après ceux de la 1.16.2. Tous sont rejouables.

**Ordre avec le code : indifférent.** Le code n'écrit en visiteur que dans `ad_events` (affichage
d'une annonce) et `contact_messages` (formulaire de contact) : les deux gardent leur droit.

Supabase donne par défaut au rôle `anon` (visiteur) les droits d'ajouter, modifier et supprimer sur
chaque table créée. La sécurité par ligne les bloque tant qu'elle reste active ; elle a déjà été
trouvée désactivée en production (`geo_places`, 1.4.1). Le bloc 1 retire chaque droit d'écriture du
visiteur qu'aucune politique de la même écriture (ou `FOR ALL`) n'ouvre à `anon` ou `public`. Une
table de greffe qui ouvre une écriture aux visiteurs par une politique garde son droit.

Les droits par défaut ne changent pas : une table créée ensuite reçoit encore ces droits. La fonction
`ecritures_visiteur_sans_politique()` (administrateurs, éditeur SQL) les liste ; le bloc 1 rejoué
les retire.

| Bloc                | Effet                                                                              | Socle | Installation |
| ------------------- | ---------------------------------------------------------------------------------- | ----- | ------------ |
| `1_ecritures.sql`   | Fonction `ecritures_visiteur_sans_politique()`, droits retirés, ligne au registre. | oui   | oui          |
| `2_version.sql`     | Version 1.16.3 publiée (correctif), réglage « socle » à 1.16.3.                    | oui   | oui          |
| `3_inscription.sql` | Inscrit la mise à niveau 1.16.3 dans `socle_installation`.                         | non   | oui          |
| `4_controle.sql`    | Contrôle : 6 lignes.                                                               | oui   | oui          |

## Résultat attendu du bloc 4

Mesuré sur la base du socle le 15/11/2026, avant la 1.16.3 : 137 droits d'écriture du visiteur sans
politique, sur 48 tables.

| Contrôle                          | Valeur                                               |
| --------------------------------- | ---------------------------------------------------- |
| version du socle                  | 1.16.3                                               |
| ecritures visiteur sans politique | 0 (sinon : table créée après le bloc 1, le repasser) |
| formulaire de contact ouvert      | true                                                 |
| affichage des annonces ouvert     | true                                                 |
| visiteur ecrit les roles          | false                                                |
| version 1.16.3 publiee            | 1                                                    |
