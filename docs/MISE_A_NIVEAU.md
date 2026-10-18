# Mettre une installation à niveau du socle

Une installation est un projet né d'un Remix du socle CDS. Ce document dit comment l'amener à la
version courante du socle. Les exemples sont fictifs : « le premier clone » désigne n'importe quelle
installation.

## Ce qu'il faut savoir avant

- **La référence d'une version est une migration du dépôt du socle**, jamais le journal de
  migrations de la plateforme. Version courante : **1.8.0**, migration
  `20261018120000_v1_8_0_messagerie_direct`.
- **Ordre code / base.** En général la base passe avant le code (le nouveau code lit ce que la base
  vient de recevoir). Exception 1.4.1 : le code d'abord, car la base supprime une colonne que
  l'ancien code lit. La 1.6.1 suit la règle générale, mais le code doit suivre aussitôt : entre les
  deux, l'ancien formulaire de la lettre d'information refuse les inscriptions. La 1.7.0 aussi : son
  bouton « Signaler » appelle `report_submit`, que seule la base 1.7.0 connaît ; l'ancien code reste
  compatible avec la base 1.7.0. Pour la 1.8.0, l'ordre est indifférent : sans la base 1.8.0, la
  messagerie marche mais ne s'actualise qu'au rechargement. Le `LISEZMOI.md` des blocs de chaque
  version donne l'ordre.
- **Chaque base dit ce qu'elle embarque.** `socle_versions` liste les versions publiées du socle.
  `socle_installation` trace la vie de cette base (vide dans le socle). Le réglage « socle » de
  `site_settings` donne la version en un coup d'œil.
- **Le Remix copie le code et la structure de la base, pas les données.** Il n'emporte donc ni les
  réglages (`site_settings`), ni l'historique des versions, ni la grille de conformité, ni la tâche
  pg_cron de purge des messages de contact. Il retire aussi `supabase/migrations` du dépôt du clone,
  en gardant l'historique git.
- **Fichiers propres à chaque installation** (à ne jamais écraser par ceux du socle) : `.env`,
  `supabase/config.toml`, `.lovable/mcp/manifest.json` et les quatre fichiers de
  `src/integrations/supabase/` (`auth-attacher.ts`, `auth-middleware.ts`, `client.server.ts`,
  `client.ts`), reformatés par Lovable.
- **Fichiers générés : `src/routeTree.gen.ts` et `src/integrations/supabase/types.ts`.** Le socle les
  tient à jour. Une installation qui a des greffes les modifie aussi (ses pages, ses tables). En cas
  de conflit à la fusion : prendre la version du socle, puis régénérer. L'arbre des pages se
  régénère au build (`npx vite build`) ; les types se régénèrent depuis la base de l'installation,
  ou à défaut on y rajoute à la main les tables `greffe_…`. Ne jamais résoudre ce conflit ligne à
  ligne.
- **Greffes (depuis 1.3.0).** Ce qui est propre à l'installation vit dans `src/greffe/`,
  `src/routes/(greffe)/`, `supabase/greffe/` et `tests/greffe/` : la fusion du socle n'y touche
  pas. Mode d'emploi : `docs/CLONER.md`, « Écrire une greffe ».
- **Une migration du socle qui réécrit le réglage « modules »** garde toujours les modules des
  installations : `value = nouvelles_valeurs || public.module_greffe_values(value)`.
- **Release de design system Lovable.** Si le socle est publié comme design system dans Lovable,
  une installation qui s'y relie reçoit une **copie** du code du socle dans `src/design-system/`, plus
  des consignes pour l'agent de Lovable. Une installation est déjà un clone du socle : elle ne s'y
  relie pas. Si c'est arrivé, détacher le design system puis retirer `src/design-system/` et
  `lovable.toml`. Les mises à niveau passent uniquement par la méthode ci-dessous.
- **Une ancienne migration éditée côté socle** crée un conflit « modifiée d'un côté, supprimée de
  l'autre » à la fusion. Règle du socle : une migration publiée ne se modifie plus, on en ajoute une.

## Méthode générale

1. **Mesurer.** Dans la base de l'installation : réglage « socle », lignes de `socle_installation`,
   nombre de tables, fonctions, politiques. Comparer au socle.
2. **Base d'abord.** Passer les blocs SQL de la version visée (dossier `supabase/seed/vX_Y_Z/`) dans
   l'éditeur SQL du projet, un par un, dans l'ordre, puis le bloc de contrôle. Tous sont
   rejouables : un bloc passé deux fois ne casse rien. La base passe avant le code, pour que le code
   fusionné trouve ses tables.
3. **Code ensuite.** Fusionner `main` du socle dans une branche de l'installation, ouvrir une PR,
   vérifier qu'aucun fichier propre à l'installation n'a bougé, fusionner. Jamais de rebase ni de
   force-push : le projet est relié à Lovable.
4. **Contrôler.** Rejouer le bloc de contrôle, ouvrir l'aperçu Lovable, vérifier `/admin/demarrage`.

## Exemple : le premier clone, de 0.0.0 à la version courante

Un clone né avant la 1.1.0 n'a ni `socle_versions`, ni historique des versions, ni réglage « modules » :
après la mise à niveau, seuls les outils d'administration sont allumés, jusqu'au choix fait dans
l'écran Démarrage. Pour le monter d'un coup à la version courante, on passe les blocs de chaque
version intermédiaire dans l'ordre (`v1_1_0`, `v1_2_0`, …), chacun suivi de son bloc de contrôle,
puis on fusionne `main` du socle.

### À savoir

- **Migrations retirées par le Remix.** Les remettre dans le dépôt du clone, à l'identique du socle,
  permet à la vérification automatique de reconstruire la base. Inconnue : la réaction de Lovable à
  des fichiers de migration plus anciens que son journal ; après la fusion, contrôler que la base n'a
  pas bougé.
- **Grille de conformité.** Le Remix ne la copie pas : la recopier dans le clone, toutes les lignes
  « à vérifier ».
- **Purge nocturne par pg_cron.** La politique de confidentialité promet l'effacement après 3 ans ; le
  bloc dédié de la 1.1.0 la replanifie dans chaque installation.
- **Réglage « brand » absent du clone.** Ce n'est pas un défaut : c'est le parcours normal d'un clone,
  qui règle sa marque dans Administration → Démarrage. Ne pas recopier celle du socle.
