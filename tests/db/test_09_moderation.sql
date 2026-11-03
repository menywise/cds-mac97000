\set ON_ERROR_STOP 1
\i tests/db/_helpers.sql
BEGIN;
-- a1 : admin du studio · a2 : membre
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr'),
  ('00000000-0000-0000-0000-0000000000a2', 'membre@test.fr');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
SELECT public.bootstrap_current_user('Administrateur');
RESET ROLE;
INSERT INTO public.contenus_publics (id, slug, titre, publie) VALUES ('00000000-0000-0000-0000-0000000000b1', 'article', 'Article', true);
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', 'membre@test.fr');
SELECT public.bootstrap_current_user('Membre');
RESET ROLE;

-- 1. Un membre ne s'écrit pas de note de modération ------------------------------------------
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', 'membre@test.fr');
INSERT INTO public.blog_comments (id, post_id, author_id, content, moderation_note)
  VALUES ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1',
          '00000000-0000-0000-0000-0000000000a2', 'Visitez http://spam.test idiot', 'Validé par l''équipe');
INSERT INTO public.forum_topics (id, author_id, title, content)
  VALUES ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a2', 'Sujet', 'Texte');
INSERT INTO public.forum_replies (id, topic_id, author_id, content)
  VALUES ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a2', 'Réponse');
UPDATE public.forum_replies SET moderation_note = 'Fausse note' WHERE id = '00000000-0000-0000-0000-0000000000f2';
RESET ROLE;
DO $$ BEGIN
  IF (SELECT moderation_note FROM public.blog_comments WHERE id = '00000000-0000-0000-0000-0000000000c1') IS NOT NULL
  THEN RAISE EXCEPTION 'note posée par un membre au dépôt'; END IF;
  IF (SELECT moderation_note FROM public.forum_replies WHERE id = '00000000-0000-0000-0000-0000000000f2') IS NOT NULL
  THEN RAISE EXCEPTION 'note posée par un membre en modification'; END IF;
END $$;

-- 2. L'admin corrige le texte, valide et signe la note ; la base date et signe -----------------
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
UPDATE public.blog_comments
  SET content = 'Visitez [lien retiré]', approved = true, moderation_note = 'Lien et insulte retirés.'
  WHERE id = '00000000-0000-0000-0000-0000000000c1';
UPDATE public.forum_replies SET moderation_note = 'Propos reformulés.' WHERE id = '00000000-0000-0000-0000-0000000000f2';
RESET ROLE;
DO $$ DECLARE _c public.blog_comments; BEGIN
  SELECT * INTO _c FROM public.blog_comments WHERE id = '00000000-0000-0000-0000-0000000000c1';
  IF _c.moderation_note <> 'Lien et insulte retirés.' OR _c.moderated_at IS NULL
     OR _c.moderated_by <> '00000000-0000-0000-0000-0000000000a1' OR NOT _c.approved
  THEN RAISE EXCEPTION 'modération admin non enregistrée'; END IF;
  IF (SELECT moderated_by FROM public.forum_replies WHERE id = '00000000-0000-0000-0000-0000000000f2') IS NULL
  THEN RAISE EXCEPTION 'réponse de forum non signée'; END IF;
END $$;

-- 3. Le visiteur voit la note sur un commentaire validé ----------------------------------------
SELECT pg_temp.as_anon();
DO $$ BEGIN
  IF (SELECT moderation_note FROM public.blog_comments WHERE id = '00000000-0000-0000-0000-0000000000c1') IS NULL
  THEN RAISE EXCEPTION 'note invisible au visiteur'; END IF;
END $$;

-- 4. Le membre réécrit sa réponse : la note de l'équipe ne s'applique plus, elle est retirée ----
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', 'membre@test.fr');
UPDATE public.forum_replies SET content = 'Nouvelle réponse' WHERE id = '00000000-0000-0000-0000-0000000000f2';
RESET ROLE;
DO $$ BEGIN
  IF (SELECT moderation_note IS NOT NULL OR moderated_by IS NOT NULL FROM public.forum_replies WHERE id = '00000000-0000-0000-0000-0000000000f2')
  THEN RAISE EXCEPTION 'note gardée après réécriture par l''auteur'; END IF;
END $$;

-- 5. Note vide = pas de note ; longueur limitée ; toutes les tables modérées ont les colonnes ----
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
UPDATE public.blog_comments SET moderation_note = '   ' WHERE id = '00000000-0000-0000-0000-0000000000c1';
SELECT pg_temp.expect_error($$UPDATE public.blog_comments SET moderation_note = repeat('x', 501) WHERE id = '00000000-0000-0000-0000-0000000000c1'$$, 'note trop longue');
RESET ROLE;
DO $$ DECLARE _t text; BEGIN
  IF (SELECT moderation_note IS NOT NULL OR moderated_at IS NOT NULL FROM public.blog_comments WHERE id = '00000000-0000-0000-0000-0000000000c1')
  THEN RAISE EXCEPTION 'note vide gardée'; END IF;
  FOREACH _t IN ARRAY ARRAY['blog_comments','reviews','forum_topics','forum_replies','directory_reviews','testimonials'] LOOP
    IF (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = _t
        AND column_name IN ('moderation_note','moderated_at','moderated_by')) <> 3
    THEN RAISE EXCEPTION 'colonnes de modération absentes : %', _t; END IF;
  END LOOP;
END $$;
-- 6. L'admin saisit un témoignage reçu par e-mail (sans compte), le corrige et le range ---------
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
INSERT INTO public.testimonials (id, author_name, content, position)
  VALUES ('00000000-0000-0000-0000-0000000000d1', 'Client', 'Très bien', 3);
UPDATE public.testimonials SET position = 0, content = 'Très bien !' WHERE id = '00000000-0000-0000-0000-0000000000d1';
-- Thématique du forum : couleur, description et ordre modifiables par l'admin.
INSERT INTO public.forum_categories (id, slug, name) VALUES ('00000000-0000-0000-0000-0000000000e1', 'test-lot6', 'Test lot 6');
UPDATE public.forum_categories SET color = '#198754', description = 'Questions', position = 2 WHERE id = '00000000-0000-0000-0000-0000000000e1';
-- Un membre ne touche pas aux thématiques.
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', 'membre@test.fr');
UPDATE public.forum_categories SET color = '#000000' WHERE id = '00000000-0000-0000-0000-0000000000e1';
RESET ROLE;
DO $$ BEGIN
  IF (SELECT color FROM public.forum_categories WHERE id = '00000000-0000-0000-0000-0000000000e1') <> '#198754'
  THEN RAISE EXCEPTION 'thématique modifiée par un membre'; END IF;
  IF (SELECT position FROM public.testimonials WHERE id = '00000000-0000-0000-0000-0000000000d1') <> 0
  THEN RAISE EXCEPTION 'ordre du témoignage non enregistré'; END IF;
END $$;
ROLLBACK;
