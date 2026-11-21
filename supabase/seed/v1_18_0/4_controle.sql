SELECT 'version du socle' AS controle, (SELECT value ->> 'version' FROM public.site_settings WHERE key = 'socle') AS valeur
UNION ALL SELECT 'fonction tables_catalogue', (to_regprocedure('public.tables_catalogue()') IS NOT NULL)::text
UNION ALL SELECT 'tables du schema public', (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p'))::text
UNION ALL SELECT 'version 1.18.0 publiee', (SELECT count(*) FROM public.socle_versions WHERE version = '1.18.0' AND niveau = 'brique')::text;
