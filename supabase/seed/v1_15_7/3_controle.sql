SELECT 'version du socle' AS controle, (SELECT value ->> 'version' FROM public.site_settings WHERE key = 'socle') AS valeur
UNION ALL SELECT 'version 1.15.7 publiee', (SELECT count(*) FROM public.socle_versions WHERE version = '1.15.7' AND niveau = 'correctif')::text;
