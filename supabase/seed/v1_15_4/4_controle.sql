SELECT 'version du socle' AS controle, (SELECT value ->> 'version' FROM public.site_settings WHERE key = 'socle') AS valeur
UNION ALL SELECT 'slug par defaut', (SELECT column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'etiquettes' AND column_name = 'slug')
UNION ALL SELECT 'grille DES-1', (SELECT label FROM public.template_checks WHERE code = 'DES-1')
UNION ALL SELECT 'version 1.15.4 publiee', (SELECT count(*) FROM public.socle_versions WHERE version = '1.15.4' AND niveau = 'correctif')::text;
