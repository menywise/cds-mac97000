SELECT 'version du socle' AS controle, (SELECT value ->> 'version' FROM public.site_settings WHERE key = 'socle') AS valeur
UNION ALL SELECT 'seuil de la suggestion', CASE WHEN strpos(pg_get_functiondef('public.suggestion_recherche(text)'::regprocedure), '>= 0.35') = 0 AND strpos(pg_get_functiondef('public.suggestion_recherche(text)'::regprocedure), '>= 0.3') > 0 THEN '0,3' ELSE 'ancien' END
UNION ALL SELECT 'version 1.15.1 publiee', (SELECT count(*) FROM public.socle_versions WHERE version = '1.15.1' AND niveau = 'correctif')::text;
