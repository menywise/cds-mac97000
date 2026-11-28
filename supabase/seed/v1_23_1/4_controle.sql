SELECT 'version du socle' AS controle, (SELECT value ->> 'version' FROM public.site_settings WHERE key = 'socle') AS valeur
UNION ALL SELECT 'lecture directe des visiteurs', has_table_privilege('anon', 'public.redirections', 'SELECT')::text
UNION ALL SELECT 'politique des visiteurs', (SELECT count(*) FROM pg_policies WHERE tablename = 'redirections' AND policyname = 'Redirections lisibles des visiteurs')::text
UNION ALL SELECT 'fonction redirection_pour', (to_regprocedure('public.redirection_pour(text)') IS NOT NULL)::text
UNION ALL SELECT 'version 1.23.1 publiee', (SELECT count(*) FROM public.socle_versions WHERE version = '1.23.1' AND niveau = 'correctif')::text;
