SELECT 'version du socle' AS controle, (SELECT value ->> 'version' FROM public.site_settings WHERE key = 'socle') AS valeur
UNION ALL SELECT 'tables videes par anon ou authenticated', (SELECT count(*) FROM pg_class c
  WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r', 'p')
    AND (has_table_privilege('anon', c.oid, 'TRUNCATE') OR has_table_privilege('authenticated', c.oid, 'TRUNCATE')))::text
UNION ALL SELECT 'droit de vider par defaut', (SELECT count(*) FROM pg_default_acl d, aclexplode(d.defaclacl) a
  WHERE d.defaclrole = current_user::regrole AND d.defaclnamespace = 'public'::regnamespace AND d.defaclobjtype = 'r'
    AND a.grantee IN ('anon'::regrole, 'authenticated'::regrole) AND a.privilege_type = 'TRUNCATE')::text
UNION ALL SELECT 'lectures sans condition dans public', (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND cmd IN ('SELECT', 'ALL') AND qual = 'true')::text
UNION ALL SELECT 'geo_communes presente', (to_regclass('public.geo_communes') IS NOT NULL)::text
UNION ALL SELECT 'visiteur ecrit la grille', (has_table_privilege('anon', 'public.template_checks', 'INSERT') OR has_table_privilege('anon', 'public.template_checks', 'UPDATE') OR has_table_privilege('anon', 'public.template_checks', 'DELETE'))::text
UNION ALL SELECT 'version 1.16.2 publiee', (SELECT count(*) FROM public.socle_versions WHERE version = '1.16.2' AND niveau = 'correctif')::text;
