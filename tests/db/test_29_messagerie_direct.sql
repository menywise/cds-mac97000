\set ON_ERROR_STOP 1
\i tests/db/_helpers.sql
BEGIN;
-- Socle 1.8.0 : messagerie en direct. La table des messages est publiée pour le temps réel ; le temps
-- réel applique les règles d'accès de la table, d'où les contrôles de lecture ci-dessous : ce qu'un
-- compte lit, c'est ce qu'il recevra en direct. Compteur des non lus, accusé de lecture.
-- a : expéditeur · b : destinataire · c : membre hors conversation
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-00000000000a', 'a@test.fr'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.fr'),
  ('00000000-0000-0000-0000-00000000000c', 'c@test.fr');

-- 1. Publication et index ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime'
                   AND schemaname = 'public' AND tablename = 'messages')
  THEN RAISE EXCEPTION 'messages absents de la publication temps réel'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'messages_unread_idx')
  THEN RAISE EXCEPTION 'index des non lus absent'; END IF;
END $$;

-- 2. A écrit deux messages à B ----------------------------------------------------------------------
SELECT pg_temp.as_user('00000000-0000-0000-0000-00000000000a', 'a@test.fr');
INSERT INTO public.conversations (id, user_a, user_b)
  VALUES ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b');
INSERT INTO public.messages (id, conversation_id, sender_id, content) VALUES
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000000a', 'Bonjour'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000000a', 'Tu es là ?');

-- 3. Compteur de l'en-tête : messages reçus et non lus, lus sous les règles d'accès -----------------
DO $$ BEGIN
  IF (SELECT count(*) FROM public.messages WHERE sender_id <> auth.uid() AND read_at IS NULL) <> 0
  THEN RAISE EXCEPTION 'A compte ses propres messages comme non lus'; END IF;
END $$;
SELECT pg_temp.as_user('00000000-0000-0000-0000-00000000000b', 'b@test.fr');
DO $$ BEGIN
  IF (SELECT count(*) FROM public.messages WHERE sender_id <> auth.uid() AND read_at IS NULL) <> 2
  THEN RAISE EXCEPTION 'B : 2 non lus attendus'; END IF;
END $$;
SELECT pg_temp.as_user('00000000-0000-0000-0000-00000000000c', 'c@test.fr');
DO $$ BEGIN
  IF (SELECT count(*) FROM public.messages) <> 0 THEN RAISE EXCEPTION 'C lit (donc recevrait) les messages de A et B'; END IF;
END $$;
SELECT pg_temp.as_anon();
SELECT pg_temp.expect_error($$SELECT count(*) FROM public.messages$$, 'visiteur lit les messages');
RESET ROLE;

-- 4. Accusé de lecture : B lit, A voit « Vu », le compteur de B retombe à zéro ---------------------
SELECT pg_temp.as_user('00000000-0000-0000-0000-00000000000b', 'b@test.fr');
UPDATE public.messages SET read_at = now()
  WHERE conversation_id = '00000000-0000-0000-0000-0000000000c1' AND sender_id <> auth.uid() AND read_at IS NULL;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.messages WHERE sender_id <> auth.uid() AND read_at IS NULL) <> 0
  THEN RAISE EXCEPTION 'B : compteur non remis à zéro'; END IF;
END $$;
SELECT pg_temp.as_user('00000000-0000-0000-0000-00000000000a', 'a@test.fr');
DO $$ BEGIN
  IF (SELECT count(*) FROM public.messages WHERE sender_id = auth.uid() AND read_at IS NOT NULL) <> 2
  THEN RAISE EXCEPTION 'A ne voit pas l''accusé de lecture'; END IF;
END $$;
-- C ne marque rien comme lu hors de ses conversations.
SELECT pg_temp.as_user('00000000-0000-0000-0000-00000000000c', 'c@test.fr');
UPDATE public.messages SET read_at = NULL WHERE conversation_id = '00000000-0000-0000-0000-0000000000c1';
RESET ROLE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.messages WHERE conversation_id = '00000000-0000-0000-0000-0000000000c1' AND read_at IS NULL)
  THEN RAISE EXCEPTION 'C modifie l''accusé de lecture'; END IF;
END $$;

-- 5. Grille, version, rejeu --------------------------------------------------------------------------
DO $$ BEGIN
  IF (SELECT modules FROM public.template_checks WHERE code = 'V1-MESSAGERIE-DIRECT') <> ARRAY['messaging']
  THEN RAISE EXCEPTION 'point de la grille'; END IF;
  IF (SELECT value ->> 'version' FROM public.site_settings WHERE key = 'socle') <> '1.8.0' THEN RAISE EXCEPTION 'version'; END IF;
END $$;
SET client_min_messages = warning;
\i supabase/migrations/20261018120000_v1_8_0_messagerie_direct.sql
RESET client_min_messages;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.template_checks WHERE code = 'V1-MESSAGERIE-DIRECT') <> 1 THEN RAISE EXCEPTION 'rejeu : point en double'; END IF;
  IF (SELECT count(*) FROM public.socle_versions WHERE version = '1.8.0') <> 1 THEN RAISE EXCEPTION 'rejeu : version en double'; END IF;
  IF (SELECT count(*) FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') <> 1
  THEN RAISE EXCEPTION 'rejeu : publication'; END IF;
END $$;
-- Base sans publication temps réel (hors Supabase) : la migration passe, sans erreur.
DROP PUBLICATION supabase_realtime;
SET client_min_messages = warning;
\i supabase/migrations/20261018120000_v1_8_0_messagerie_direct.sql
RESET client_min_messages;
ROLLBACK;
