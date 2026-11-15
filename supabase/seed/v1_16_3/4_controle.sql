SELECT 'version du socle' AS controle, (SELECT value ->> 'version' FROM public.site_settings WHERE key = 'socle') AS valeur
UNION ALL SELECT 'ecritures visiteur sans politique', (SELECT count(*) FROM public.ecritures_visiteur_sans_politique())::text
UNION ALL SELECT 'formulaire de contact ouvert', has_table_privilege('anon', 'public.contact_messages', 'INSERT')::text
UNION ALL SELECT 'affichage des annonces ouvert', has_table_privilege('anon', 'public.ad_events', 'INSERT')::text
UNION ALL SELECT 'visiteur ecrit les roles', (has_table_privilege('anon', 'public.user_roles', 'INSERT') OR has_table_privilege('anon', 'public.user_roles', 'UPDATE') OR has_table_privilege('anon', 'public.user_roles', 'DELETE'))::text
UNION ALL SELECT 'version 1.16.3 publiee', (SELECT count(*) FROM public.socle_versions WHERE version = '1.16.3' AND niveau = 'correctif')::text;
