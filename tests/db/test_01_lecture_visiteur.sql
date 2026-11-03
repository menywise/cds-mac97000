-- Un visiteur non connecté lit les contenus publics.
\set ON_ERROR_STOP 1
\i tests/db/_helpers.sql
BEGIN;
INSERT INTO auth.users (id, email) VALUES ('00000000-0000-0000-0000-00000000000a', 'membre@test.fr');
INSERT INTO public.member_profiles (user_id, display_name, listed) VALUES ('00000000-0000-0000-0000-00000000000a', 'Membre A', true);
INSERT INTO public.contenus_publics (id, slug, titre, publie) VALUES ('00000000-0000-0000-0000-0000000000b1', 'art', 'Article', true);
INSERT INTO public.blog_comments (post_id, author_id, content, approved) VALUES
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000a', 'Validé', true),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000a', 'En attente', false);

SELECT pg_temp.as_anon();
DO $$ BEGIN
  IF (SELECT count(*) FROM public.member_profiles) <> 1 THEN RAISE EXCEPTION 'anon ne voit pas les membres listés'; END IF;
  IF (SELECT count(*) FROM public.blog_comments) <> 1 THEN RAISE EXCEPTION 'anon doit voir 1 commentaire validé'; END IF;
END $$;
ROLLBACK;
