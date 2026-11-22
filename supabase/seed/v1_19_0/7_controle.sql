SELECT 'version du socle' AS controle, (SELECT value ->> 'version' FROM public.site_settings WHERE key = 'socle') AS valeur
UNION ALL SELECT 'dossier signalements-captures prive', (SELECT (NOT public)::text FROM storage.buckets WHERE id = 'signalements-captures')
UNION ALL SELECT 'regles du dossier', (SELECT count(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE 'signalements_captures_%')::text
UNION ALL SELECT 'fonction report_captures_a_effacer', (to_regprocedure('public.report_captures_a_effacer()') IS NOT NULL)::text
UNION ALL SELECT 'version 1.19.0 publiee', (SELECT count(*) FROM public.socle_versions WHERE version = '1.19.0' AND niveau = 'brique')::text;
