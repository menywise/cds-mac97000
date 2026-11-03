SELECT 'version du socle' AS controle, (SELECT value ->> 'version' FROM public.site_settings WHERE key = 'socle') AS valeur
UNION ALL SELECT 'tables de la taxonomie', (SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('rubriques', 'etiquettes', 'series', 'redirections'))::text
UNION ALL SELECT 'etiquettes sans reference', (SELECT count(*) FROM public.contenus_publics c, unnest(c.etiquettes) e WHERE NOT EXISTS (SELECT 1 FROM public.etiquettes x WHERE x.slug = public.slug_depuis(e)))::text
UNION ALL SELECT 'declencheurs du maillage', (SELECT count(*) FROM pg_trigger WHERE tgrelid = 'public.contenus_publics'::regclass AND tgname IN ('contenus_publics_c_etiquettes', 'contenus_publics_redirection'))::text
UNION ALL SELECT 'liens internes casses en ligne', (SELECT count(*) FROM public.contenus_publics c CROSS JOIN LATERAL public.liens_du_texte(c.corps) l WHERE c.publie AND (l.cible_id IS NULL OR NOT l.cible_publiee))::text
UNION ALL SELECT 'point de la grille', (SELECT count(*) FROM public.template_checks WHERE code = 'V1-MAILLAGE')::text
UNION ALL SELECT 'version 1.11.0 publiee', (SELECT count(*) FROM public.socle_versions WHERE version = '1.11.0' AND niveau = 'brique')::text;
