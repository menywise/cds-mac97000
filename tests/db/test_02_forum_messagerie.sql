\set ON_ERROR_STOP 1
\i tests/db/_helpers.sql
BEGIN;
-- Le forum se lit module allumé (socle 1.16.1).
UPDATE public.site_settings SET value = value || '{"forum": true}' WHERE key = 'modules';
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-00000000000a', 'a@test.fr'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.fr'),
  ('00000000-0000-0000-0000-00000000000c', 'c@test.fr');
INSERT INTO public.member_profiles (user_id, display_name, accepts_messages) VALUES
  ('00000000-0000-0000-0000-00000000000c', 'C', false);
INSERT INTO public.forum_topics (id, author_id, title, content, last_activity_at)
  VALUES ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000000a', 'Sujet', 'Texte', now() - interval '1 day');

-- B répond au sujet de A : l'activité du sujet est mise à jour.
SELECT pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
INSERT INTO public.forum_replies (id, topic_id, author_id, content)
  VALUES ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000000b', 'Réponse');
DO $$ BEGIN
  IF (SELECT last_activity_at FROM public.forum_topics WHERE id = '00000000-0000-0000-0000-0000000000f1') < now() - interval '1 minute'
  THEN RAISE EXCEPTION 'last_activity_at non mis à jour'; END IF;
END $$;
-- B ne peut pas retenir sa propre réponse.
SELECT pg_temp.expect_error($$UPDATE public.forum_replies SET accepted = true WHERE id = '00000000-0000-0000-0000-0000000000e1'$$, 'B retient sa réponse');

-- A (auteur du sujet) retient la réponse mais ne peut pas en changer le texte.
SELECT pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
UPDATE public.forum_replies SET accepted = true WHERE id = '00000000-0000-0000-0000-0000000000e1';
SELECT pg_temp.expect_error($$UPDATE public.forum_replies SET content = 'modifié' WHERE id = '00000000-0000-0000-0000-0000000000e1'$$, 'A modifie la réponse de B');
-- A ne peut pas verrouiller ni gonfler les vues.
SELECT pg_temp.expect_error($$UPDATE public.forum_topics SET locked = true WHERE id = '00000000-0000-0000-0000-0000000000f1'$$, 'A verrouille');
SELECT pg_temp.expect_error($$UPDATE public.forum_topics SET views = 999 WHERE id = '00000000-0000-0000-0000-0000000000f1'$$, 'A modifie les vues');
UPDATE public.forum_topics SET title = 'Sujet modifié' WHERE id = '00000000-0000-0000-0000-0000000000f1';

-- Le compteur de vues fonctionne pour un visiteur et ne touche pas updated_at.
RESET ROLE;
UPDATE public.forum_topics SET updated_at = now() - interval '2 days' WHERE id = '00000000-0000-0000-0000-0000000000f1';
SELECT pg_temp.as_anon();
SELECT public.increment_topic_views('00000000-0000-0000-0000-0000000000f1');
RESET ROLE;
DO $$ BEGIN
  IF (SELECT views FROM public.forum_topics WHERE id = '00000000-0000-0000-0000-0000000000f1') <> 1 THEN RAISE EXCEPTION 'vue non comptée'; END IF;
  IF (SELECT updated_at FROM public.forum_topics WHERE id = '00000000-0000-0000-0000-0000000000f1') > now() - interval '1 day' THEN RAISE EXCEPTION 'updated_at modifié par une vue'; END IF;
END $$;

-- Messagerie : A ouvre une conversation avec B, le message met à jour la date.
SELECT pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
INSERT INTO public.conversations (id, user_a, user_b, last_message_at)
  VALUES ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', now() - interval '3 days');
INSERT INTO public.messages (conversation_id, sender_id, content)
  VALUES ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000000a', 'Bonjour');
DO $$ BEGIN
  IF (SELECT last_message_at FROM public.conversations WHERE id = '00000000-0000-0000-0000-0000000000c1') < now() - interval '1 minute'
  THEN RAISE EXCEPTION 'last_message_at non mis à jour'; END IF;
END $$;
-- C refuse les messages : A ne peut pas ouvrir de conversation.
SELECT pg_temp.expect_error($$INSERT INTO public.conversations (user_a, user_b) VALUES ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000c')$$, 'conversation avec C');
ROLLBACK;
