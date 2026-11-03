SELECT 'version du socle' AS controle, (SELECT value ->> 'version' FROM public.site_settings WHERE key = 'socle') AS valeur
UNION ALL SELECT 'role redacteur', (SELECT count(*) FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'editor')::text
UNION ALL SELECT 'reglage editorial', (SELECT value ->> 'circuit' FROM public.site_settings WHERE key = 'editorial')
UNION ALL SELECT 'contenus sans statut coherent', (SELECT count(*) FROM public.contenus_publics WHERE publie <> (statut IN ('publie', 'a_actualiser')))::text
UNION ALL SELECT 'declencheurs du circuit', (SELECT count(*) FROM pg_trigger WHERE tgrelid = 'public.contenus_publics'::regclass AND tgname IN ('contenus_publics_a_statut', 'contenus_publics_b_termes', 'contenus_publics_trace'))::text
UNION ALL SELECT 'contenus sans version', (SELECT count(*) FROM public.contenus_publics c WHERE NOT EXISTS (SELECT 1 FROM public.contenus_publics_versions v WHERE v.contenu_id = c.id))::text
UNION ALL SELECT 'vue blog_posts', coalesce((SELECT relkind::text FROM pg_class WHERE oid = to_regclass('public.blog_posts')), 'absente')
UNION ALL SELECT 'point de la grille', (SELECT count(*) FROM public.template_checks WHERE code = 'V1-CIRCUIT-EDITORIAL')::text
UNION ALL SELECT 'version 1.10.0 publiee', (SELECT count(*) FROM public.socle_versions WHERE version = '1.10.0' AND niveau = 'brique')::text;
