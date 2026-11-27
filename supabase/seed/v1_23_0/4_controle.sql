SELECT 'version du socle' AS controle, (SELECT value ->> 'version' FROM public.site_settings WHERE key = 'socle') AS valeur
UNION ALL SELECT 'fonction redirection_pour', (to_regprocedure('public.redirection_pour(text)') IS NOT NULL)::text
UNION ALL SELECT 'adresses de fichiers acceptees', (SELECT count(*) FROM pg_constraint WHERE conname = 'redirections_de_check' AND pg_get_constraintdef(oid) LIKE '%A-Za-z%')::text
UNION ALL SELECT 'redirections', (SELECT count(*) FROM public.redirections)::text
UNION ALL SELECT 'version 1.23.0 publiee', (SELECT count(*) FROM public.socle_versions WHERE version = '1.23.0' AND niveau = 'brique')::text;
