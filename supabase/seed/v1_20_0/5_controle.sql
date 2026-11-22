SELECT 'version du socle' AS controle, (SELECT value ->> 'version' FROM public.site_settings WHERE key = 'socle') AS valeur
UNION ALL SELECT 'script du radar au registre', (SELECT count(*) FROM public.registre WHERE type = 'script' AND identifiant = 'scripts/radar-socle.mjs')::text
UNION ALL SELECT 'elements hors registre', (SELECT count(*) FROM public.registre_manquants())::text
UNION ALL SELECT 'version 1.20.0 publiee', (SELECT count(*) FROM public.socle_versions WHERE version = '1.20.0' AND niveau = 'brique')::text;
