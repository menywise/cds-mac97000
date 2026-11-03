SELECT 'version du socle' AS controle, (SELECT value ->> 'version' FROM public.site_settings WHERE key = 'socle') AS valeur
UNION ALL SELECT 'table contenus_publics', (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.contenus_publics'))
UNION ALL SELECT 'vue blog_posts', (SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.blog_posts'))
UNION ALL SELECT 'articles', (SELECT count(*) FROM public.contenus_publics WHERE type = 'article')::text
UNION ALL SELECT 'commentaires rattaches', (SELECT count(*) FROM public.blog_comments c JOIN public.contenus_publics p ON p.id = c.post_id)::text
UNION ALL SELECT 'regles non validees', coalesce((SELECT string_agg(conname, ', ' ORDER BY conname) FROM pg_constraint WHERE conrelid = to_regclass('public.contenus_publics') AND contype = 'c' AND NOT convalidated), 'aucune')
UNION ALL SELECT 'regles d acces', (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'contenus_publics')::text
UNION ALL SELECT 'point de la grille', (SELECT count(*) FROM public.template_checks WHERE code = 'V1-CONTENUS-PUBLICS')::text
UNION ALL SELECT 'version 1.9.0 publiee', (SELECT count(*) FROM public.socle_versions WHERE version = '1.9.0' AND niveau = 'brique')::text;
