SELECT 'version du socle' AS controle, (SELECT value ->> 'version' FROM public.site_settings WHERE key = 'socle') AS valeur
UNION ALL SELECT 'politiques de lecture sans condition sur les seize tables', (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND cmd = 'SELECT' AND qual = 'true'
  AND tablename IN ('site_settings', 'forum_topics', 'forum_replies', 'forum_likes', 'series', 'redirections', 'rubriques', 'etiquettes', 'synonymes',
    'forum_categories', 'directory_categories', 'marketplace_categories', 'geo_departements', 'geo_adjacency', 'socle_versions', 'socle_installation'))::text
UNION ALL SELECT 'cle publique brand', public.site_settings_cle_publique('brand')::text
UNION ALL SELECT 'cle publique socle', public.site_settings_cle_publique('socle')::text
UNION ALL SELECT 'version 1.16.1 publiee', (SELECT count(*) FROM public.socle_versions WHERE version = '1.16.1' AND niveau = 'correctif')::text;
