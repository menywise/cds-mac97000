<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

## Règles CDS pour tout agent

Ce dépôt est soit le **socle** CDS, soit un **projet cloné** du socle. Le socle se reconnaît à sa
prise de greffe vide : `export const GREFFE: GreffeDeclaration = {};` dans `src/greffe/index.ts`.

Dans un projet cloné (prise remplie, ou dossier `src/routes/(greffe)/` présent) :

- Ne jamais modifier un fichier du socle ni une table du socle (colonne, contrainte, politique).
- Ajouter uniquement dans `src/greffe/`, `src/routes/(greffe)/`, `supabase/greffe/`, `tests/greffe/`,
  `docs/greffe/` (documents du projet).
- Lire d'abord `docs/greffe/CLAUDE.md` s'il existe : consignes propres au projet.
- Nommer tout objet SQL `greffe_<nom>` ; déclarer modules, menus et pages dans `src/greffe/index.ts`.
- Étendre une fiche du socle par une table liée par id (voir `docs/CLONER.md`, « Écrire une greffe »).
- Ne jamais importer depuis `src/design-system/` : c'est une copie figée, pas le code du socle.

## Charte de style (socle et clones)

Référence : `docs/CHARTE_STYLE_CDS.md` et `CDS_TOKENS.md` (version 2.0.0).
Remontées de terrain des installations : `docs/REMONTEES.md` (quand un constat devient une règle,
journal, fichiers copiés tels quels par une installation).
Audits de la charte : `docs/audits/` (méthode, mesures, suites). Garde-fous éprouvés par
`bash scripts/mutations-charte.sh` : une faute plantée à la fois, chacune doit être refusée.

- Thème clair seul : aucune variante `dark:`. Police du système : aucune police téléchargée.
- Aucune couleur de la palette Tailwind en dur (`emerald-600`, `amber-100`…). Couleurs d'état
  nommées : `success`, `warning`, `danger`, `info`, `violet`, `neutral`, en fond plein, `-soft`,
  `-text` et `-border`.
- Contraste AA partout : 4,5:1 pour le texte, 3:1 pour un trait. Une couleur ajoutée à
  `src/styles.css` entre dans les paires de `scripts/verifier-contrastes.mjs`.
- Couleurs, rayons, ombres : dans `tokens/cds.tokens.json` (surcharges d'un projet :
  `tokens/<projet>.tokens.json`), puis `npm run jetons`. Ne jamais modifier à la main le bloc
  `:root` ni les couleurs `--color-*` de `src/styles.css` : ils sont fabriqués.
- Pas de gris sur un intitulé (`h1`-`h6`, `label`, `legend`, `dt`, `th`) : règle ESLint.
- Cliquet (`charte-plafonds.json`) : texte gris, opacité (classe ou modificateur `/50`), listes sans
  carte, couleurs écrites en dur et couleurs en style en ligne ne montent dans aucun fichier. Une
  couleur de données (saisie en base) passe par `couleurLisible()` (`src/lib/couleurs.ts`).
- Contrôles : hook `pre-commit` (actif au démarrage de chaque session Claude Code par
  `.claude/settings.json`), `npm run verifier`, test `tests/unit/charte.test.ts`.

## Registre de l'application (socle 1.16.0)

Chaque élément construit a sa ligne dans la table `registre` : à quoi il sert, qui s'en sert, son
état, la date à laquelle le revoir, la décision qui le justifie. Écran : Admin → Registre, éléments à
revoir en tête.

- Un module, une tâche planifiée, un script de `scripts/`, un automatisme (hook, action GitHub), une
  adresse publique ou un compte technique ajoutés : leur ligne part dans le même commit, par
  `public.registre_inscrire(...)` dans le SQL versionné.
- Usage inconnu : état « à confirmer », date du jour. Ne rien inventer.
- Garde-fous : `registre_manquants()` (modules, tâches planifiées, éléments d'une installation par
  `greffe_registre_attendus()`), exigé vide par le test de base ; `tests/unit/registre.test.ts`
  refuse un script sans ligne.

## Co-intervenant IA (socle 1.17.0)

Une IA qui écrit dans l'application est un intervenant comme un autre : une clé (`agent_cles`) avec
sa fiche obligatoire (usage, utilisateur, dernier jour), un niveau (`lecture`, `completer`,
`corriger`), et la trace de chaque écriture (`agent_journal`). Écran : Admin → Co-intervenants IA.

- Une session d'agent qui doit écrire reçoit sa clé d'un administrateur, pour la durée du travail ;
  la clé expire le jour où le travail finit. Jamais de clé partagée, jamais de clé dans le dépôt.
- Le socle authentifie et journalise (`/api/agent`, `src/lib/agents.server.ts`) ; les actions se
  déclarent dans la prise de greffe (`actionsAgent`, `docs/CLONER.md`, « Co-intervenant IA »).
  Une action écrit par `journaliser`, jamais à côté.
- Règles pures dans `src/lib/agents.ts` (copie exacte dans les installations) ; garde-fous :
  `tests/unit/agents.test.ts`, `tests/db/test_47_agents.sql`.
- Clé d'usage (socle 1.21.0) : niveau `usage` et nom de l'usage (`usage_code`), hors de l'échelle.
  Une action déclarée par `usage` ne répond qu'aux clés de cet usage ; la clé d'usage ne fait que ses
  actions et `aide` (`cleAutorisee`). Le serveur identifie la clé par `agent_identifier()` ;
  `agent_authentifier()` refuse une clé d'usage. Garde-fou : `tests/db/test_50_cles_usage.sql`.

## Tables (socle 1.18.0)

Admin → Tables fait vivre la base sans écrire de code : chaque table du schéma public en grille,
fiche d'une ligne, import et export CSV. L'écran lit et écrit par l'interface de données, sous les
politiques de sécurité par ligne : il ne contourne rien, il ne remplace aucune migration.

- Une table de greffe apparaît d'elle-même ; ses droits viennent de ses politiques, jamais de l'écran.
- Une saisie en masse passe par l'import CSV (aperçu, erreurs ligne par ligne, mise à jour sur la
  clé) ; une donnée de départ versionnée reste un bloc SQL de `supabase/seed/`.
- Règles pures dans `src/lib/tables.ts` (copie exacte dans les installations) ; garde-fous :
  `tests/unit/tables.test.ts`, `tests/db/test_48_tables.sql`.

## Signalements : capture d'écran (socle 1.19.0)

La personne qui signale peut joindre une capture d'écran, facultative : choisie ou collée dans la
fenêtre « Signaler », réécrite par le navigateur (métadonnées retirées, 2 000 pixels et 2 Mo au plus),
déposée après l'envoi sous `<code de suivi>/capture` dans le dossier privé `signalements-captures`.

- Dépôt par l'auteur du signalement seul, dans les 15 minutes, une capture par signalement
  (`report_capture_permise`) ; lecture et effacement réservés aux administrateurs, par lien signé.
- Effacement 3 mois après le traitement, 12 mois après l'envoi, aussitôt avec le signalement : la base
  dresse la liste (`report_captures_a_effacer`), l'interface des fichiers efface (écran Admin →
  Signalements, `/api/cron/purge-contact`). Jamais de `DELETE` SQL sur `storage.objects`.
- Règles pures dans `src/lib/captures.ts` ; garde-fous : `tests/unit/captures.test.ts`,
  `tests/db/test_49_captures_signalements.sql`.
- Version du socle : `src/config/socle.ts`, affichée dans le pied de page, montée à chaque version
  (`tests/unit/socle-version.test.ts`). Pages plein écran sans en-tête : `PiedDePageReduit`.

## Page hors index (socle 1.22.0)

Une page libre peut être un satellite de campagne (inscription à un webinaire, remerciement, page
d'un séminaire envoyée par e-mail) : case « Page satellite » dans Admin → Pages, colonne `hors_index`.
Elle reste en ligne pour qui a le lien, porte la balise `noindex`, et sort du plan du site, de la page
« Plan du site » et de la recherche du site. La page d'accueil ne peut pas l'être (contrainte en base).
Garde-fou : `tests/db/test_51_pages_hors_index.sql`.

## Radar des installations (socle 1.20.0)

`scripts/radar-socle.mjs` dit où chaque installation en est par rapport au socle : code, base,
ajouts hors greffe, copies exactes, remontées ouvertes. Méthode, empreinte et passage hebdomadaire :
`docs/RADAR.md`.

- Lecture seule : le radar constate et propose une action par écart, il ne corrige ni ne porte rien.
  Un ajout d'installation est une question posée au propriétaire, jamais un portage.
- Aucune installation nommée dans le socle : le recensement se refait à chaque passage, les
  observations et le rapport vivent hors du dépôt.
- Une version du socle qui crée une table ou une fonction lui donne un témoin pour le radar ; une
  version sans objet nouveau ne se mesure que par la version enregistrée en base.
- Garde-fous : `tests/unit/radar-socle.test.ts`.
