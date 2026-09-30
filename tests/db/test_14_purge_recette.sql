\set ON_ERROR_STOP 1
\i tests/db/_helpers.sql
BEGIN;
-- Lot 9 : les parcours cliqués écrivent des données marquées « [recette] », retirées ensuite par
-- recette_purge(). Rien d'autre ne doit disparaître.
-- a1 : admin du studio · a2 : membre de test · a3 : membre réel
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'manuel.rohaut@gmail.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'membre@test.fr'),
  ('00000000-0000-0000-0000-0000000000a3', 'autre@test.fr');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'manuel.rohaut@gmail.com');
SELECT public.bootstrap_current_user('Manu');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', 'membre@test.fr');
SELECT public.bootstrap_current_user('Membre');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a3', 'autre@test.fr');
SELECT public.bootstrap_current_user('Autre');
RESET ROLE;
UPDATE public.site_settings SET value = value || '{"lms": true}' WHERE key = 'modules';
\i supabase/seed/recette_seed.sql

-- Données des parcours (membre de test) et données réelles à garder.
SELECT pg_temp.as_anon();
INSERT INTO public.contact_messages (name, email, subject, message) VALUES
  ('Robot', 'recette-auto@example.invalid', '[recette] Contact', 'Parcours automatique'),
  ('Client', 'client@test.fr', 'Devis', 'Vrai message'),
  ('Farceur', 'client@test.fr', '[recette] faux', 'Adresse réelle : gardé');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', 'membre@test.fr');
INSERT INTO public.forum_topics (id, author_id, author_name, title, content) VALUES
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a2', 'Membre', '[recette] Sujet', 'Texte');
INSERT INTO public.forum_replies (topic_id, author_id, author_name, content) VALUES
  ('e7000000-0000-4000-8000-000000000010', '00000000-0000-0000-0000-0000000000a2', 'Membre', '[recette] Réponse');
INSERT INTO public.reports (reporter_id, content_type, content_id, reason, details, reported_url) VALUES
  ('00000000-0000-0000-0000-0000000000a2', 'sujet', 'e7000000-0000-4000-8000-000000000010', 'spam', '[recette] Signalement', '/forum/e7000000-0000-4000-8000-000000000010');
INSERT INTO public.lms_enrollments (user_id, course_id) VALUES
  ('00000000-0000-0000-0000-0000000000a2', 'e7000000-0000-4000-8000-000000000020');
INSERT INTO public.lms_progress (user_id, lesson_id, completed_at) VALUES
  ('00000000-0000-0000-0000-0000000000a2', 'e7000000-0000-4000-8000-000000000025', now());
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a3', 'autre@test.fr');
INSERT INTO public.forum_topics (id, author_id, author_name, title, content) VALUES
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000a3', 'Autre', 'Vraie question', 'Texte');
INSERT INTO public.reports (reporter_id, content_type, content_id, reason, details, reported_url) VALUES
  ('00000000-0000-0000-0000-0000000000a3', 'sujet', 'e7000000-0000-4000-8000-000000000010', 'spam', 'Vrai signalement', '/forum');
INSERT INTO public.lms_enrollments (user_id, course_id) VALUES
  ('00000000-0000-0000-0000-0000000000a3', 'e7000000-0000-4000-8000-000000000020');

-- 1. Réservée aux admins (et au serveur) ------------------------------------------------------
SELECT pg_temp.as_anon();
SELECT pg_temp.expect_error($$SELECT public.recette_purge(NULL)$$, 'visiteur purge');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', 'membre@test.fr');
SELECT pg_temp.expect_error($$SELECT public.recette_purge('00000000-0000-0000-0000-0000000000a2')$$, 'membre purge');

-- 2. L'admin purge : les données marquées partent, le reste reste ----------------------------
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'manuel.rohaut@gmail.com');
DO $$
DECLARE _r jsonb;
BEGIN
  _r := public.recette_purge('00000000-0000-0000-0000-0000000000a2');
  IF (_r->>'contact')::int <> 1 OR (_r->>'sujets')::int <> 1 OR (_r->>'reponses')::int <> 1
     OR (_r->>'signalements')::int <> 1 OR (_r->>'inscriptions')::int <> 1 OR (_r->>'progression')::int <> 1
  THEN RAISE EXCEPTION 'comptes inattendus : %', _r; END IF;
  -- Rejouable : second passage sans effet.
  _r := public.recette_purge('00000000-0000-0000-0000-0000000000a2');
  IF (_r->>'contact')::int + (_r->>'sujets')::int + (_r->>'signalements')::int <> 0 THEN
    RAISE EXCEPTION 'second passage : %', _r;
  END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.contact_messages WHERE email = 'recette-auto@example.invalid') THEN RAISE EXCEPTION 'contact de recette resté'; END IF;
  IF (SELECT count(*) FROM public.contact_messages WHERE email = 'client@test.fr') <> 2 THEN RAISE EXCEPTION 'vrai message supprimé'; END IF;
  IF EXISTS (SELECT 1 FROM public.forum_topics WHERE title LIKE '[recette]%') THEN RAISE EXCEPTION 'sujet de recette resté'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.forum_topics WHERE id = '00000000-0000-0000-0000-0000000000f2') THEN RAISE EXCEPTION 'vrai sujet supprimé'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.forum_topics WHERE id = 'e7000000-0000-4000-8000-000000000010') THEN RAISE EXCEPTION 'sujet d''exemple supprimé'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.forum_replies WHERE id = 'e7000000-0000-4000-8000-000000000011') THEN RAISE EXCEPTION 'réponse d''exemple supprimée'; END IF;
  IF (SELECT count(*) FROM public.reports) <> 1 THEN RAISE EXCEPTION 'vrai signalement supprimé'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.lms_enrollments WHERE user_id = '00000000-0000-0000-0000-0000000000a3') THEN RAISE EXCEPTION 'inscription réelle supprimée'; END IF;
  IF EXISTS (SELECT 1 FROM public.lms_enrollments WHERE user_id = '00000000-0000-0000-0000-0000000000a2') THEN RAISE EXCEPTION 'inscription de recette restée'; END IF;
END $$;

-- 3. Sans membre indiqué : seules les données marquées partent --------------------------------
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'manuel.rohaut@gmail.com');
DO $$ BEGIN
  IF (public.recette_purge(NULL)->>'inscriptions')::int <> 0 THEN RAISE EXCEPTION 'inscriptions purgées sans membre'; END IF;
END $$;
-- Un admin ne peut pas effacer la progression d'un membre sur une vraie formation.
RESET ROLE;
INSERT INTO public.lms_courses (id, title, slug, published, price_cents) VALUES
  ('00000000-0000-0000-0000-0000000000c1', 'Vraie', 'vraie', true, 0);
INSERT INTO public.lms_enrollments (user_id, course_id) VALUES
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000c1');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'manuel.rohaut@gmail.com');
SELECT public.recette_purge('00000000-0000-0000-0000-0000000000a2');
RESET ROLE;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.lms_enrollments WHERE course_id = '00000000-0000-0000-0000-0000000000c1') THEN
    RAISE EXCEPTION 'inscription à une vraie formation supprimée';
  END IF;
END $$;
ROLLBACK;
