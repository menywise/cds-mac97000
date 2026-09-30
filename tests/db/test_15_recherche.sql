\set ON_ERROR_STOP 1
\i tests/db/_helpers.sql
BEGIN;
-- Lot 10 : recherche globale. Français (pluriels, accents), début de mot, règles de visibilité du
-- site respectées (le visiteur ne trouve que ce qu'il peut lire), modules éteints exclus.
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'membre@test.fr'),
  ('00000000-0000-0000-0000-0000000000a2', 'cache@test.fr');
UPDATE public.site_settings SET value = value || '{"lms": true, "directory": true, "marketplace": true, "pages": true}'
  WHERE key = 'modules';

INSERT INTO public.blog_posts (id, slug, title, excerpt, content, published, published_at) VALUES
  ('00000000-0000-0000-0000-0000000000b1', 'electricite', 'Rénover son électricité', 'Les étapes', 'Un électricien qualifié intervient.', true, now()),
  ('00000000-0000-0000-0000-0000000000b2', 'brouillon', 'Brouillon électricien', '', 'Pas encore publié', false, NULL),
  ('00000000-0000-0000-0000-0000000000b3', 'plomberie', 'Plomberie', '', 'Un article qui cite une fois électricien en passant.', true, now());
INSERT INTO public.faq_items (question, answer, published) VALUES
  ('Comment trouver un électricien ?', 'Utilisez l''annuaire.', true),
  ('Question masquée électricien', 'Réponse', false);
INSERT INTO public.forum_topics (id, author_id, author_name, title, content) VALUES
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a1', 'Membre', 'Devis électricité', 'Combien pour un tableau ?');
INSERT INTO public.lms_courses (id, title, slug, excerpt, published) VALUES
  ('00000000-0000-0000-0000-0000000000c1', 'Devenir électricien', 'devenir-electricien', 'Formation', true),
  ('00000000-0000-0000-0000-0000000000c2', 'Cours caché électricien', 'cache', '', false);
INSERT INTO public.lms_modules (id, course_id, title) VALUES
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'Module');
INSERT INTO public.lms_lessons (module_id, title, content) VALUES
  ('00000000-0000-0000-0000-0000000000d1', 'Leçon', 'Motsecretdelecon réservé aux inscrits');
INSERT INTO public.directory_listings (name, slug, excerpt, status, email, phone) VALUES
  ('Durand Électricité', 'durand', 'Électricien à Lyon', 'published', 'contact@durand.fr', '0600000000'),
  ('Fiche en attente électricien', 'attente', '', 'draft', '', '');
INSERT INTO public.marketplace_listings (seller_id, title, slug, description, status, approved) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'Outils d''électricien', 'outils', 'Lot complet', 'active', true),
  ('00000000-0000-0000-0000-0000000000a1', 'Annonce refusée électricien', 'refusee', '', 'active', false);
INSERT INTO public.member_profiles (user_id, display_name, job_title, listed) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'Jean Volt', 'Électricien', true),
  ('00000000-0000-0000-0000-0000000000a2', 'Profil caché', 'Électricien', false)
  ON CONFLICT (user_id) DO UPDATE SET display_name = excluded.display_name,
    job_title = excluded.job_title, listed = excluded.listed;
INSERT INTO public.pages (slug, title, description, published, is_home) VALUES
  ('services', 'Nos services d''électricité', 'Tout sur l''électricité', true, false),
  ('interne', 'Page brouillon électricien', '', false, false);

-- 1. Visiteur : accents, pluriel, début de mot ; seuls les contenus visibles --------------------
SELECT pg_temp.as_anon();
DO $$
DECLARE _kinds text[]; _n int;
BEGIN
  SELECT array_agg(DISTINCT kind ORDER BY kind) INTO _kinds FROM public.search_site('electriciens');
  IF _kinds <> ARRAY['annonce','annuaire','article','faq','formation','membre'] THEN
    RAISE EXCEPTION 'types trouvés : %', _kinds;
  END IF;
  -- Rien de caché : brouillons, FAQ masquée, formation non publiée, fiche en attente,
  -- annonce refusée, profil non listé, page brouillon.
  SELECT count(*) INTO _n FROM public.search_site('electricien', 100)
  WHERE title ILIKE '%brouillon%' OR title ILIKE '%caché%' OR title ILIKE '%masquée%'
     OR title ILIKE '%attente%' OR title ILIKE '%refusée%';
  IF _n > 0 THEN RAISE EXCEPTION 'contenu caché trouvé (%)', _n; END IF;
  -- Début de mot (saisie en cours) et pertinence : le titre compte plus que le texte.
  IF NOT EXISTS (SELECT 1 FROM public.search_site('electri') WHERE url = '/blog/electricite') THEN
    RAISE EXCEPTION 'début de mot non trouvé';
  END IF;
  IF (SELECT url FROM public.search_site('électricité') WHERE kind = 'article' ORDER BY rank DESC LIMIT 1)
     <> '/blog/electricite' THEN RAISE EXCEPTION 'classement : le titre doit primer'; END IF;
  -- Plusieurs mots : tous requis.
  IF NOT EXISTS (SELECT 1 FROM public.search_site('devis tableau') WHERE url = '/forum/00000000-0000-0000-0000-0000000000f1') THEN
    RAISE EXCEPTION 'forum non trouvé';
  END IF;
  IF EXISTS (SELECT 1 FROM public.search_site('devis plomberie')) THEN RAISE EXCEPTION 'mots non tous requis'; END IF;
  -- Pages libres.
  IF NOT EXISTS (SELECT 1 FROM public.search_site('services') WHERE url = '/pages/services') THEN
    RAISE EXCEPTION 'page libre non trouvée';
  END IF;
END $$;

-- 2. Jamais le contenu réservé ni les coordonnées de l'annuaire ---------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.search_site('motsecretdelecon')) THEN RAISE EXCEPTION 'contenu de leçon trouvé'; END IF;
  IF EXISTS (SELECT 1 FROM public.search_site('durand.fr')) OR EXISTS (SELECT 1 FROM public.search_site('0600000000')) THEN
    RAISE EXCEPTION 'coordonnées de l''annuaire indexées';
  END IF;
  IF EXISTS (SELECT 1 FROM public.search_site('electricien') WHERE excerpt LIKE '%durand.fr%') THEN
    RAISE EXCEPTION 'coordonnées renvoyées';
  END IF;
END $$;

-- 3. Saisies vides ou piégées : aucune erreur, aucun résultat -----------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.search_site('')) OR EXISTS (SELECT 1 FROM public.search_site('   '))
     OR EXISTS (SELECT 1 FROM public.search_site(NULL)) THEN RAISE EXCEPTION 'saisie vide'; END IF;
  PERFORM * FROM public.search_site($q$a & | ! :* ( ) ' " \ <-> électricien$q$);
  PERFORM * FROM public.search_site(repeat('x', 5000));
  IF (SELECT count(*) FROM public.search_site('electricien', 1000)) > 50 THEN RAISE EXCEPTION 'limite non plafonnée'; END IF;
END $$;

-- 4. Modules éteints : leurs contenus disparaissent ; recherche éteinte : rien --------------------
RESET ROLE;
UPDATE public.site_settings SET value = value || '{"lms": false, "blog": false}' WHERE key = 'modules';
SELECT pg_temp.as_anon();
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.search_site('electricien') WHERE kind IN ('article', 'formation')) THEN
    RAISE EXCEPTION 'module éteint trouvé';
  END IF;
END $$;
RESET ROLE;
UPDATE public.site_settings SET value = value || '{"search": false}' WHERE key = 'modules';
SELECT pg_temp.as_anon();
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.search_site('electricien')) THEN RAISE EXCEPTION 'recherche éteinte'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
  IF NOT public.module_defaults() ? 'search' OR NOT (public.module_defaults()->>'search')::boolean THEN
    RAISE EXCEPTION 'module search absent ou éteint par défaut';
  END IF;
END $$;
ROLLBACK;
