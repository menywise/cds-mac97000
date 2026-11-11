SELECT 'version du socle' AS controle, (SELECT value ->> 'version' FROM public.site_settings WHERE key = 'socle') AS valeur
UNION ALL SELECT 'table registre', (to_regclass('public.registre') IS NOT NULL)::text
UNION ALL SELECT 'lignes du socle au registre', (SELECT count(*) FROM public.registre WHERE decision IS NOT NULL)::text
UNION ALL SELECT 'elements hors registre', (SELECT count(*) FROM public.registre_attendus() a WHERE NOT EXISTS (SELECT 1 FROM public.registre r WHERE r.type = a.type AND r.identifiant = a.identifiant))::text
UNION ALL SELECT 'version 1.16.0 publiee', (SELECT count(*) FROM public.socle_versions WHERE version = '1.16.0' AND niveau = 'brique')::text;
