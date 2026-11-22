# Socle 1.20.0 — blocs pour l'éditeur SQL de Lovable

Blocs 1 à 3 : même contenu que la migration
`supabase/migrations/20261122120000_v1_20_0_radar_installations.sql`, sans commentaires. Bloc 2 : socle
seul (la tâche hebdomadaire n'existe que pour le socle). Bloc 4 : propre à une installation, à ne pas
passer dans le socle. Chaque bloc se passe seul, dans l'ordre, après ceux de la 1.19.0. Tous sont
rejouables.

**Ordre avec le code : indifférent.** La 1.20.0 n'apporte qu'un script (`scripts/radar-socle.mjs`,
`docs/RADAR.md`) ; la base reçoit sa ligne au registre et la version. Aucun écran ne change.

| Bloc                | Effet                                                                  | Socle | Installation |
| ------------------- | ---------------------------------------------------------------------- | ----- | ------------ |
| `1_registre.sql`    | Inscrit `scripts/radar-socle.mjs` au registre.                         | oui   | oui          |
| `2_radar_socle.sql` | Inscrit la tâche hebdomadaire du radar, « prévu » jusqu'à sa création. | oui   | non          |
| `3_version.sql`     | Version 1.20.0 publiée (brique), réglage « socle » à 1.20.0.           | oui   | oui          |
| `4_inscription.sql` | Inscrit la mise à niveau 1.20.0 dans `socle_installation`.             | non   | oui          |
| `5_controle.sql`    | Contrôle : 4 lignes.                                                   | oui   | oui          |

## Résultat attendu du bloc 5

| Contrôle                    | Valeur                                                 |
| --------------------------- | ------------------------------------------------------ |
| version du socle            | 1.20.0                                                 |
| script du radar au registre | 1                                                      |
| elements hors registre      | 0 (sinon : Admin → Registre, encart « Hors registre ») |
| version 1.20.0 publiee      | 1                                                      |
