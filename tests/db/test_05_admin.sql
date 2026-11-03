\set ON_ERROR_STOP 1
\i tests/db/_helpers.sql
BEGIN;
-- a1 : admin du studio · a2 : membre · a3 : autre membre
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr'),
  ('00000000-0000-0000-0000-0000000000a2', 'membre@test.fr'),
  ('00000000-0000-0000-0000-0000000000a3', 'autre@test.fr');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
SELECT public.bootstrap_current_user('Administrateur');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', 'membre@test.fr');
SELECT public.bootstrap_current_user('Membre');
RESET ROLE;
INSERT INTO public.contenus_publics (id, titre, slug, publie) VALUES ('00000000-0000-0000-0000-0000000000b1', 'Article', 'article', true);

-- 1. Modération : un membre ne publie pas directement ------------------------------------
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', 'membre@test.fr');
SELECT pg_temp.expect_error($$INSERT INTO public.reviews (author_id, author_name, rating, content, approved)
  VALUES ('00000000-0000-0000-0000-0000000000a2', 'Membre', 5, 'Avis', true)$$, 'avis auto-validé');
SELECT pg_temp.expect_error($$INSERT INTO public.blog_comments (post_id, author_id, author_name, content, approved)
  VALUES ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a2', 'Membre', 'Commentaire', true)$$, 'commentaire auto-validé');
-- Le dépôt normal (en attente) reste possible.
INSERT INTO public.reviews (author_id, author_name, rating, content)
  VALUES ('00000000-0000-0000-0000-0000000000a2', 'Membre', 5, 'Avis');
INSERT INTO public.blog_comments (post_id, author_id, author_name, content)
  VALUES ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a2', 'Membre', 'Commentaire');

-- 2. Témoignages : pas au nom d'un autre --------------------------------------------------
SELECT pg_temp.expect_error($$INSERT INTO public.testimonials (author_id, author_name, content)
  VALUES ('00000000-0000-0000-0000-0000000000a3', 'Autre', 'Faux témoignage')$$, 'témoignage au nom d''un autre');
INSERT INTO public.testimonials (author_id, author_name, content)
  VALUES ('00000000-0000-0000-0000-0000000000a2', 'Membre', 'Mon témoignage');
SELECT pg_temp.expect_error($$INSERT INTO public.testimonials (author_name, content)
  VALUES ('Sans auteur', 'Témoignage sans auteur')$$, 'témoignage sans auteur');
SELECT pg_temp.as_anon();
SELECT pg_temp.expect_error($$INSERT INTO public.testimonials (author_name, content)
  VALUES ('Visiteur', 'Témoignage anonyme')$$, 'visiteur dépose un témoignage');

-- 3. Boîte de contact ------------------------------------------------------------------------
-- Un visiteur envoie un message : il arrive « nouveau », le visiteur ne choisit pas le statut.
INSERT INTO public.contact_messages (id, name, email, subject, message)
  VALUES ('00000000-0000-0000-0000-0000000000c1', 'Visiteur', 'v@test.fr', 'Question', 'Bonjour');
SELECT pg_temp.expect_error($$INSERT INTO public.contact_messages (name, email, subject, message, status)
  VALUES ('Visiteur', 'v@test.fr', 'Question', 'Bonjour', 'traite')$$, 'statut choisi par le visiteur');
RESET ROLE;
DO $$ BEGIN
  IF (SELECT status FROM public.contact_messages WHERE id = '00000000-0000-0000-0000-0000000000c1') <> 'nouveau'
  THEN RAISE EXCEPTION 'statut initial inattendu'; END IF;
END $$;

-- Un membre ne lit, ne traite ni ne supprime les messages.
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', 'membre@test.fr');
UPDATE public.contact_messages SET status = 'traite';
DELETE FROM public.contact_messages;
RESET ROLE;
DO $$ BEGIN
  IF (SELECT status FROM public.contact_messages WHERE id = '00000000-0000-0000-0000-0000000000c1') <> 'nouveau'
  THEN RAISE EXCEPTION 'un membre a traité un message'; END IF;
END $$;

-- L'admin traite, archive puis supprime ; la date de traitement est posée par la base.
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
UPDATE public.contact_messages SET status = 'traite' WHERE id = '00000000-0000-0000-0000-0000000000c1';
DO $$ BEGIN
  IF (SELECT handled_at FROM public.contact_messages WHERE id = '00000000-0000-0000-0000-0000000000c1') IS NULL
  THEN RAISE EXCEPTION 'date de traitement absente'; END IF;
END $$;
SELECT pg_temp.expect_error($$UPDATE public.contact_messages SET status = 'inconnu'$$, 'statut invalide');
UPDATE public.contact_messages SET status = 'archive' WHERE id = '00000000-0000-0000-0000-0000000000c1';
DELETE FROM public.contact_messages WHERE id = '00000000-0000-0000-0000-0000000000c1';
RESET ROLE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.contact_messages WHERE id = '00000000-0000-0000-0000-0000000000c1')
  THEN RAISE EXCEPTION 'admin n''a pas supprimé le message'; END IF;
END $$;

-- 4. Offres : l'admin crée, modifie et supprime --------------------------------------------
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
INSERT INTO public.pricing_plans (id, name, features) VALUES ('00000000-0000-0000-0000-0000000000e1', 'Essai', '["A", "B"]');
UPDATE public.pricing_plans SET period = 'an', cta_label = 'Essayer' WHERE id = '00000000-0000-0000-0000-0000000000e1';
DELETE FROM public.pricing_plans WHERE id = '00000000-0000-0000-0000-0000000000e1';
SELECT pg_temp.expect_error($$INSERT INTO public.pricing_plans (name, features) VALUES ('Mauvaise', '"texte"')$$, 'avantages non listés');
RESET ROLE;
ROLLBACK;
