SELECT 'version du socle' AS controle, (SELECT value ->> 'version' FROM public.site_settings WHERE key = 'socle') AS valeur
UNION ALL SELECT 'messages en temps reel', (SELECT count(*) FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages')::text
UNION ALL SELECT 'index des non lus', (SELECT count(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'messages_unread_idx')::text
UNION ALL SELECT 'visiteur lit les messages', (NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.messages'::regclass) OR EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'messages' AND cmd IN ('SELECT', 'ALL') AND roles && ARRAY['anon', 'public']::name[]))::text
UNION ALL SELECT 'point de la grille', (SELECT count(*) FROM public.template_checks WHERE code = 'V1-MESSAGERIE-DIRECT')::text
UNION ALL SELECT 'version 1.8.0 publiee', (SELECT count(*) FROM public.socle_versions WHERE version = '1.8.0' AND niveau = 'brique')::text;
