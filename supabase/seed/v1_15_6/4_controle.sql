SELECT 'version du socle' AS controle, (SELECT value ->> 'version' FROM public.site_settings WHERE key = 'socle') AS valeur
UNION ALL SELECT 'texte lit les references', (SELECT (position('references_contenu' in prosrc) > 0)::text FROM pg_proc WHERE oid = 'public.texte_contenu_public(public.contenus_publics)'::regprocedure)
UNION ALL SELECT 'garde lit le drapeau', (SELECT (position('cds.refs_modifiees' in prosrc) > 0)::text FROM pg_proc WHERE oid = 'public.garde_termes_contenus()'::regprocedure)
UNION ALL SELECT 'version 1.15.6 publiee', (SELECT count(*) FROM public.socle_versions WHERE version = '1.15.6' AND niveau = 'correctif')::text;
