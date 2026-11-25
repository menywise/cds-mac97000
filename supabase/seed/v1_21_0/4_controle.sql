SELECT 'version du socle' AS controle, (SELECT value ->> 'version' FROM public.site_settings WHERE key = 'socle') AS valeur
UNION ALL SELECT 'fonction agent_identifier', (to_regprocedure('public.agent_identifier(text)') IS NOT NULL)::text
UNION ALL SELECT 'colonne usage_code', (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agent_cles' AND column_name = 'usage_code')::text
UNION ALL SELECT 'cles d''usage', (SELECT count(*) FROM public.agent_cles WHERE niveau = 'usage')::text
UNION ALL SELECT 'version 1.21.0 publiee', (SELECT count(*) FROM public.socle_versions WHERE version = '1.21.0' AND niveau = 'brique')::text;
