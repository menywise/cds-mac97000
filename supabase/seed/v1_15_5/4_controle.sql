SELECT 'version du socle' AS controle, (SELECT value ->> 'version' FROM public.site_settings WHERE key = 'socle') AS valeur
UNION ALL SELECT 'declencheurs des references', (SELECT count(*) FROM pg_trigger WHERE tgrelid = 'public.references_contenu'::regclass AND tgname LIKE 'references_contenu_relecture%')::text
UNION ALL SELECT 'garde lit le drapeau', (SELECT (position('cds.refs_modifiees' in prosrc) > 0)::text FROM pg_proc WHERE oid = 'public.garde_statut_contenus()'::regprocedure)
UNION ALL SELECT 'version 1.15.5 publiee', (SELECT count(*) FROM public.socle_versions WHERE version = '1.15.5' AND niveau = 'correctif')::text;
