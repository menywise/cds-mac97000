SELECT 'version du socle' AS controle, (SELECT value ->> 'version' FROM public.site_settings WHERE key = 'socle') AS valeur
UNION ALL SELECT 'table agent_cles', (to_regclass('public.agent_cles') IS NOT NULL)::text
UNION ALL SELECT 'table agent_journal', (to_regclass('public.agent_journal') IS NOT NULL)::text
UNION ALL SELECT 'fonction agent_authentifier', (to_regprocedure('public.agent_authentifier(text)') IS NOT NULL)::text
UNION ALL SELECT 'adresse /api/agent au registre', (SELECT count(*) FROM public.registre WHERE type = 'adresse' AND identifiant = '/api/agent')::text
UNION ALL SELECT 'elements hors registre', (SELECT count(*) FROM public.registre_attendus() a WHERE NOT EXISTS (SELECT 1 FROM public.registre r WHERE r.type = a.type AND r.identifiant = a.identifiant))::text
UNION ALL SELECT 'version 1.17.0 publiee', (SELECT count(*) FROM public.socle_versions WHERE version = '1.17.0' AND niveau = 'brique')::text;
