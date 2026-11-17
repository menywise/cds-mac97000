# Socle 1.16.4 — blocs pour l'éditeur SQL de Lovable

Correctif, suite de la 1.16.3. Blocs 1 et 2 : même contenu que la migration
`supabase/migrations/20261118120000_v1_16_4_defaut_visiteur.sql`, sans commentaires. Bloc 3 : propre
à une installation, à ne pas passer dans le socle. Chaque bloc se passe seul, dans l'ordre, après ceux
de la 1.16.3. Tous sont rejouables.

**Ordre avec le code : indifférent pour le socle.** Le socle accorde déjà chaque droit visiteur table
par table : ses tables ne changent pas.

**Installation avec des greffes : vérifier avant le bloc 1.** Une table de greffe ouverte aux
visiteurs et créée sans `GRANT … TO anon` comptait sur les droits par défaut. Créée avant le bloc 1,
elle garde ses droits. Créée après, elle n'en reçoit plus : le visiteur reçoit un refus. Toute greffe
nouvelle accorde ses droits elle-même (`docs/CLONER.md`, « Tables »).

Règle reprise du premier clone, qui l'applique en production. Seuls les droits par défaut des tables
changent ; ceux des séquences et des fonctions restent tels.

| Bloc                | Effet                                                                  | Socle | Installation |
| ------------------- | ---------------------------------------------------------------------- | ----- | ------------ |
| `1_defaut.sql`      | Droits par défaut des tables du schéma public : plus rien pour `anon`. | oui   | oui          |
| `2_version.sql`     | Version 1.16.4 publiée (correctif), réglage « socle » à 1.16.4.        | oui   | oui          |
| `3_inscription.sql` | Inscrit la mise à niveau 1.16.4 dans `socle_installation`.             | non   | oui          |
| `4_controle.sql`    | Contrôle : 5 lignes.                                                   | oui   | oui          |

## Résultat attendu du bloc 4

Mesuré sur la base du socle le 17/11/2026, avant la 1.16.4 : 4 droits par défaut du visiteur sur les
tables (lire, ajouter, modifier, supprimer).

| Contrôle                                     | Valeur |
| -------------------------------------------- | ------ |
| version du socle                             | 1.16.4 |
| droits par defaut du visiteur sur les tables | 0      |
| lecture visiteur des contenus                | true   |
| formulaire de contact ouvert                 | true   |
| version 1.16.4 publiee                       | 1      |
