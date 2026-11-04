SELECT 'version du socle' AS controle, (SELECT value ->> 'version' FROM public.site_settings WHERE key = 'socle') AS valeur
UNION ALL SELECT 'appels lus dans [1][2]', (SELECT count(*) FROM regexp_matches(regexp_replace('a [1][2] b [3](/x)', '[[][^]]*[]][(]', '(', 'g'), '[[]([0-9]{1,3})[]]', 'g'))::text
UNION ALL SELECT 'version 1.15.3 publiee', (SELECT count(*) FROM public.socle_versions WHERE version = '1.15.3' AND niveau = 'correctif')::text;
