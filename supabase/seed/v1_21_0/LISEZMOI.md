# Socle 1.21.0 — blocs pour l'éditeur SQL de Lovable

Blocs 1 et 2 : même contenu que la migration `supabase/migrations/20261123120000_v1_21_0_cles_usage.sql`,
sans commentaires. Bloc 3 : propre à une installation, à ne pas passer dans le socle. Chaque bloc se
passe seul, dans l'ordre, après ceux de la 1.20.0. Tous sont rejouables.

**Ordre avec le code : la base d'abord.** Le serveur 1.21.0 identifie une clé par
`agent_identifier()` ; sans la base 1.21.0, `/api/agent` refuse toutes les clés, le reste du site
n'est pas touché. L'inverse est sûr : un serveur 1.20.0 sur une base 1.21.0 garde ses clés de
l'échelle et refuse les clés d'usage (`agent_authentifier()` les écarte).

Une installation qui avait une clé hors échelle (un niveau à elle, ajouté à la contrainte de
`agent_cles`) la passe en clé d'usage dans le même bloc que sa propre contrainte : niveau `usage`,
nom de l'usage dans `usage_code`. La clé en clair ne change pas.

| Bloc                | Effet                                                                                                | Socle | Installation |
| ------------------- | ---------------------------------------------------------------------------------------------------- | ----- | ------------ |
| `1_cles_usage.sql`  | Niveau `usage`, colonne `usage_code`, `agent_identifier()`, ancienne entrée fermée aux clés d'usage. | oui   | oui          |
| `2_version.sql`     | Version 1.21.0 publiée (brique), réglage « socle » à 1.21.0.                                         | oui   | oui          |
| `3_inscription.sql` | Inscrit la mise à niveau 1.21.0 dans `socle_installation`.                                           | non   | oui          |
| `4_controle.sql`    | Contrôle : 5 lignes.                                                                                 | oui   | oui          |

## Résultat attendu du bloc 4

| Contrôle                  | Valeur                                      |
| ------------------------- | ------------------------------------------- |
| version du socle          | 1.21.0                                      |
| fonction agent_identifier | true                                        |
| colonne usage_code        | 1                                           |
| cles d'usage              | le nombre de clés d'usage (0 dans le socle) |
| version 1.21.0 publiee    | 1                                           |
