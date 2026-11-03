SELECT 'version du socle' AS controle, (SELECT value ->> 'version' FROM public.site_settings WHERE key = 'socle') AS valeur
UNION ALL SELECT 'champs savants', (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contenus_publics' AND column_name IN ('genre', 'evenement', 'evenement_le', 'liens_interets', 'niveau_preuve', 'relecteurs'))::text
UNION ALL SELECT 'table des references', (SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND tablename = 'references_contenu')::text
UNION ALL SELECT 'format de citation', public.editorial_reglages() ->> 'format_citation'
UNION ALL SELECT 'point de la grille', (SELECT count(*) FROM public.template_checks WHERE code = 'V1-SOCIETE-SAVANTE')::text
UNION ALL SELECT 'version 1.14.0 publiee', (SELECT count(*) FROM public.socle_versions WHERE version = '1.14.0' AND niveau = 'brique')::text;
