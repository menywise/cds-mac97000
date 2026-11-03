SELECT 'version du socle' AS controle, (SELECT value ->> 'version' FROM public.site_settings WHERE key = 'socle') AS valeur
UNION ALL SELECT 'table des liens de sources', (SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND tablename = 'liens_sources_etat')::text
UNION ALL SELECT 'visiteur lit les liens de sources', (NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.liens_sources_etat'::regclass) OR EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'liens_sources_etat' AND roles && ARRAY['anon', 'public']::name[]))::text
UNION ALL SELECT 'type de page', public.editorial_reglages() ->> 'type_page'
UNION ALL SELECT 'point de la grille', (SELECT count(*) FROM public.template_checks WHERE code = 'V1-SEO-ARTICLES')::text
UNION ALL SELECT 'version 1.12.0 publiee', (SELECT count(*) FROM public.socle_versions WHERE version = '1.12.0' AND niveau = 'brique')::text;
