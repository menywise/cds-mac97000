SELECT 'version du socle' AS controle, (SELECT value ->> 'version' FROM public.site_settings WHERE key = 'socle') AS valeur
UNION ALL SELECT 'table des appels a l action', (SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND tablename = 'appels_action')::text
UNION ALL SELECT 'champs du brief', (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contenus_publics' AND column_name IN ('intention', 'appel_action_id'))::text
UNION ALL SELECT 'point de la grille', (SELECT count(*) FROM public.template_checks WHERE code = 'V1-PILOTAGE-CONTENU')::text
UNION ALL SELECT 'version 1.15.0 publiee', (SELECT count(*) FROM public.socle_versions WHERE version = '1.15.0' AND niveau = 'brique')::text;
