SELECT 'version du socle' AS controle, (SELECT value ->> 'version' FROM public.site_settings WHERE key = 'socle') AS valeur
UNION ALL SELECT 'messages en temps reel', (SELECT count(*) FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages')::text
UNION ALL SELECT 'index des non lus', (SELECT count(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'messages_unread_idx')::text
UNION ALL SELECT 'visiteur lit les messages', has_table_privilege('anon', 'public.messages', 'SELECT')::text
UNION ALL SELECT 'point de la grille', (SELECT count(*) FROM public.template_checks WHERE code = 'V1-MESSAGERIE-DIRECT')::text
UNION ALL SELECT 'version 1.8.0 publiee', (SELECT count(*) FROM public.socle_versions WHERE version = '1.8.0' AND niveau = 'brique')::text;
