SELECT 'version du socle' AS controle, (SELECT value ->> 'version' FROM public.site_settings WHERE key = 'socle') AS valeur
UNION ALL SELECT 'extension pg_trgm', (SELECT count(*) FROM pg_extension WHERE extname = 'pg_trgm')::text
UNION ALL SELECT 'tables de la recherche', (SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('synonymes', 'recherches_sans_resultat'))::text
UNION ALL SELECT 'fonctions de la recherche', (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname IN ('requete_mot', 'requete_articles', 'recherche_articles', 'recherche_articles_facettes', 'suggestion_recherche', 'noter_recherche_sans_resultat'))::text
UNION ALL SELECT 'visiteur lit le journal', (NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.recherches_sans_resultat'::regclass) OR EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'recherches_sans_resultat' AND roles && ARRAY['anon', 'public']::name[]))::text
UNION ALL SELECT 'point de la grille', (SELECT count(*) FROM public.template_checks WHERE code = 'V1-RECHERCHE-ARTICLES')::text
UNION ALL SELECT 'version 1.13.0 publiee', (SELECT count(*) FROM public.socle_versions WHERE version = '1.13.0' AND niveau = 'brique')::text;
