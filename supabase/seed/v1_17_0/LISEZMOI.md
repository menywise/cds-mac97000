# Socle 1.17.0 — blocs pour l'éditeur SQL de Lovable

Blocs 1 et 2 : même contenu que la migration `supabase/migrations/20261119120000_v1_17_0_agents.sql`,
sans commentaires. Bloc 3 : propre à une installation, à ne pas passer dans le socle. Chaque bloc se
passe seul, dans l'ordre, après ceux de la 1.16.4. Tous sont rejouables.

**Ordre avec le code : la base d'abord.** L'écran Admin → Co-intervenants IA lit `agent_cles` et
`agent_journal` ; l'entrée `/api/agent` appelle `agent_authentifier()` et `agent_journaliser()`.
Sans la base 1.17.0, l'écran affiche une erreur et l'entrée refuse toute clé ; le reste du site n'est
pas touché.

Une installation qui avait déjà ses tables `agent_cles` et `agent_journal` (premier clone) les
rapproche de celles du socle avant de passer le bloc 1 : mêmes colonnes, `nom` unique, niveaux
`lecture`, `completer`, `corriger`. Les actions qu'une clé peut faire se déclarent dans
`src/greffe/index.ts` (`actionsAgent`) : `docs/CLONER.md`, « Co-intervenant IA ».

| Bloc                | Effet                                                                                                                                                                    | Socle | Installation |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- | ------------ |
| `1_agents.sql`      | Tables `agent_cles` et `agent_journal`, `agent_authentifier`, `agent_journaliser`, miroir au registre, `registre_attendus` avec les clés, adresse `/api/agent` inscrite. | oui   | oui          |
| `2_version.sql`     | Version 1.17.0 publiée (brique), réglage « socle » à 1.17.0.                                                                                                             | oui   | oui          |
| `3_inscription.sql` | Inscrit la mise à niveau 1.17.0 dans `socle_installation`.                                                                                                               | non   | oui          |
| `4_controle.sql`    | Contrôle : 7 lignes.                                                                                                                                                     | oui   | oui          |

## Résultat attendu du bloc 4

| Contrôle                       | Valeur                                                 |
| ------------------------------ | ------------------------------------------------------ |
| version du socle               | 1.17.0                                                 |
| table agent_cles               | true                                                   |
| table agent_journal            | true                                                   |
| fonction agent_authentifier    | true                                                   |
| adresse /api/agent au registre | 1                                                      |
| elements hors registre         | 0 (sinon : Admin → Registre, encart « Hors registre ») |
| version 1.17.0 publiee         | 1                                                      |
