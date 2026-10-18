# Socle 1.8.0 — blocs pour l'éditeur SQL de Lovable

Blocs 1 à 3 : même contenu que la migration `supabase/migrations/20261018120000_v1_8_0_messagerie_direct.sql`,
sans commentaires. Bloc 4 : propre à une installation, à ne pas passer dans le socle. Chaque bloc se passe
seul, dans l'ordre, après ceux de la 1.7.0. Tous sont rejouables.

**Ordre avec le code : indifférent.** Le code 1.8.0 lit les mêmes colonnes que le code 1.7.0. Sans la base
1.8.0, la messagerie fonctionne mais ne s'actualise qu'au rechargement de la page ; avec la base 1.8.0 et
l'ancien code, rien ne change pour le membre.

| Bloc                | Effet                                                                                                  | Socle | Installation |
| ------------------- | ------------------------------------------------------------------------------------------------------ | ----- | ------------ |
| `1_temps_reel.sql`  | `messages` entre dans la publication `supabase_realtime` : messages et accusés de lecture en direct.   | oui   | oui          |
| `2_non_lus.sql`     | Index `messages_unread_idx` : compteur des messages non lus de l'en-tête.                               | oui   | oui          |
| `3_version.sql`     | Point V1-MESSAGERIE-DIRECT de la grille ; version 1.8.0 publiée, réglage « socle » à 1.8.0.            | oui   | oui          |
| `4_inscription.sql` | Inscrit la mise à niveau 1.8.0 dans `socle_installation`.                                              | non   | oui          |
| `5_controle.sql`    | Contrôle : 6 lignes.                                                                                   | oui   | oui          |

## Résultat attendu du bloc 5

| Contrôle                  | Valeur |
| ------------------------- | ------ |
| version du socle          | 1.8.0  |
| messages en temps reel    | 1      |
| index des non lus         | 1      |
| visiteur lit les messages | false  |
| point de la grille        | 1      |
| version 1.8.0 publiee     | 1      |

« visiteur lit les messages » contrôle les règles d'accès de la table (actives, aucune règle de lecture
pour un visiteur), pas le droit sur la table : Supabase accorde ce droit à `anon` par défaut, et ce sont
les règles d'accès qui filtrent les lignes.

## À vérifier après le passage

Deux comptes membres, chacun dans sa fenêtre, sur la même conversation. Un message envoyé par l'un
apparaît chez l'autre sans recharger la page ; l'expéditeur voit « Vu à … » dès que l'autre a la
conversation sous les yeux. Dans l'en-tête, « Messagerie » porte le nombre de messages non lus et
s'actualise seul.
