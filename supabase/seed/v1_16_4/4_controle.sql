SELECT 'version du socle' AS controle, (SELECT value ->> 'version' FROM public.site_settings WHERE key = 'socle') AS valeur
UNION ALL SELECT 'droits par defaut du visiteur sur les tables', (SELECT count(*) FROM pg_default_acl d, aclexplode(d.defaclacl) a
  WHERE d.defaclrole = current_user::regrole AND d.defaclnamespace = 'public'::regnamespace AND d.defaclobjtype = 'r'
    AND a.grantee = 'anon'::regrole)::text
UNION ALL SELECT 'lecture visiteur des contenus', has_table_privilege('anon', 'public.contenus_publics', 'SELECT')::text
UNION ALL SELECT 'formulaire de contact ouvert', has_table_privilege('anon', 'public.contact_messages', 'INSERT')::text
UNION ALL SELECT 'version 1.16.4 publiee', (SELECT count(*) FROM public.socle_versions WHERE version = '1.16.4' AND niveau = 'correctif')::text;
