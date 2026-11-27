SELECT 'version du socle' AS controle, (SELECT value ->> 'version' FROM public.site_settings WHERE key = 'socle') AS valeur
UNION ALL SELECT 'colonne hors_index', (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pages' AND column_name = 'hors_index')::text
UNION ALL SELECT 'accueil jamais hors index', (SELECT count(*) FROM pg_constraint WHERE conname = 'pages_accueil_indexee_check')::text
UNION ALL SELECT 'pages hors index', (SELECT count(*) FROM public.pages WHERE hors_index)::text
UNION ALL SELECT 'version 1.22.0 publiee', (SELECT count(*) FROM public.socle_versions WHERE version = '1.22.0' AND niveau = 'brique')::text;
