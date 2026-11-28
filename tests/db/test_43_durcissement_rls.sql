-- Socle 1.16.1 : plus aucune politique de lecture « USING (true) » sur les seize tables signalées par
-- le scanner de Lovable. Chaque règle a sa preuve et sa contre-épreuve.
\set ON_ERROR_STOP 1
\i tests/db/_helpers.sql
BEGIN;
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr'),
  ('00000000-0000-0000-0000-0000000000a2', 'redacteur@test.fr'),
  ('00000000-0000-0000-0000-0000000000a3', 'membre@test.fr');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
SELECT public.bootstrap_current_user('Administrateur');
SELECT public.admin_set_editor('00000000-0000-0000-0000-0000000000a2', true);
RESET ROLE;

-- 0. Aucune des seize tables ne garde une politique de lecture sans condition ---------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND cmd = 'SELECT' AND qual = 'true'
    AND tablename IN ('site_settings', 'forum_topics', 'forum_replies', 'forum_likes', 'series', 'redirections',
      'rubriques', 'etiquettes', 'synonymes', 'forum_categories', 'directory_categories', 'marketplace_categories',
      'geo_departements', 'geo_adjacency', 'socle_versions', 'socle_installation'))
  THEN RAISE EXCEPTION 'une politique USING (true) reste : %', (SELECT string_agg(tablename || '.' || policyname, ', ')
    FROM pg_policies WHERE schemaname = 'public' AND cmd = 'SELECT' AND qual = 'true'); END IF;
END $$;

-- 1. Paramètres du site : clés publiques nommées, le reste aux administrateurs ----------------------------
INSERT INTO public.site_settings (key, value) VALUES ('brand', '{"name": "Site"}'), ('demarrage', '{"modules_choisis_le": "2026-01-01"}')
ON CONFLICT (key) DO NOTHING;
SELECT pg_temp.as_anon();
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.site_settings WHERE key = 'brand') OR NOT EXISTS (SELECT 1 FROM public.site_settings WHERE key = 'modules')
  THEN RAISE EXCEPTION 'visiteur ne lit pas la marque ou les modules'; END IF;
  IF EXISTS (SELECT 1 FROM public.site_settings WHERE NOT public.site_settings_cle_publique(key)) THEN
    RAISE EXCEPTION 'visiteur : clés lues %', (SELECT string_agg(key, ',' ORDER BY key) FROM public.site_settings); END IF;
  IF EXISTS (SELECT 1 FROM public.site_settings WHERE key IN ('socle', 'demarrage')) THEN RAISE EXCEPTION 'visiteur lit socle ou demarrage'; END IF;
END $$;
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a3', 'membre@test.fr');
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.site_settings WHERE key IN ('socle', 'demarrage')) THEN RAISE EXCEPTION 'membre lit socle ou demarrage'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.site_settings WHERE key = 'modules') THEN RAISE EXCEPTION 'membre ne lit pas les modules'; END IF;
END $$;
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
DO $$ BEGIN
  IF (SELECT count(*) FROM public.site_settings WHERE key IN ('socle', 'demarrage', 'brand', 'modules')) <> 4 THEN
    RAISE EXCEPTION 'admin ne lit pas tout'; END IF;
END $$;
RESET ROLE;
-- Prise de greffe : une installation déclare ses clés publiques.
CREATE FUNCTION public.greffe_site_settings_publiques() RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT ARRAY['greffe_test'] $$;
INSERT INTO public.site_settings (key, value) VALUES ('greffe_test', '{"ok": true}'), ('greffe_prive', '{}');
SELECT pg_temp.as_anon();
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.site_settings WHERE key = 'greffe_test') THEN RAISE EXCEPTION 'clé publique de greffe non lue'; END IF;
  IF EXISTS (SELECT 1 FROM public.site_settings WHERE key = 'greffe_prive') THEN RAISE EXCEPTION 'clé privée de greffe lue'; END IF;
END $$;
RESET ROLE;
DROP FUNCTION public.greffe_site_settings_publiques();

-- 2. Forum : lisible quand le module est allumé ; j'aime : chacun les siens -------------------------------
INSERT INTO public.forum_categories (id, slug, name) VALUES ('00000000-0000-0000-0000-0000000000c1', 'general', 'Général');
INSERT INTO public.forum_topics (id, author_id, title, content, category_id) VALUES
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a3', 'Sujet', 'Texte', '00000000-0000-0000-0000-0000000000c1');
INSERT INTO public.forum_replies (id, topic_id, author_id, content) VALUES
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a2', 'Réponse');
INSERT INTO public.forum_likes (user_id, topic_id) VALUES ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000f1');
INSERT INTO public.forum_likes (user_id, reply_id) VALUES ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000e1');
SELECT pg_temp.as_anon();
DO $$ BEGIN
  IF (SELECT count(*) FROM public.forum_topics) + (SELECT count(*) FROM public.forum_replies) + (SELECT count(*) FROM public.forum_categories) <> 0
  THEN RAISE EXCEPTION 'forum éteint lisible du visiteur'; END IF;
  IF (SELECT count(*) FROM public.forum_topic_counts(ARRAY['00000000-0000-0000-0000-0000000000f1']::uuid[])) <> 0
  THEN RAISE EXCEPTION 'compteurs du forum éteint'; END IF;
END $$;
SELECT pg_temp.expect_error($$SELECT count(*) FROM public.forum_likes$$, 'visiteur lit les j''aime');
RESET ROLE;
UPDATE public.site_settings SET value = value || '{"forum": true}' WHERE key = 'modules';
SELECT pg_temp.as_anon();
DO $$ BEGIN
  IF (SELECT count(*) FROM public.forum_topics) <> 1 OR (SELECT count(*) FROM public.forum_replies) <> 1
     OR NOT EXISTS (SELECT 1 FROM public.forum_categories WHERE id = '00000000-0000-0000-0000-0000000000c1')
  THEN RAISE EXCEPTION 'forum allumé invisible du visiteur'; END IF;
  -- Les compteurs comptent tous les j'aime, sans ouvrir la table au visiteur.
  IF (SELECT likes FROM public.forum_topic_counts(ARRAY['00000000-0000-0000-0000-0000000000f1']::uuid[])) <> 1
  THEN RAISE EXCEPTION 'j''aime du sujet non comptés'; END IF;
  IF (SELECT likes FROM public.forum_reply_like_counts('00000000-0000-0000-0000-0000000000f1')) <> 1
  THEN RAISE EXCEPTION 'j''aime des réponses non comptés'; END IF;
  IF (SELECT likes FROM public.forum_category_counts() WHERE category_id = '00000000-0000-0000-0000-0000000000c1') <> 2
  THEN RAISE EXCEPTION 'j''aime de la thématique non comptés'; END IF;
END $$;
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a3', 'membre@test.fr');
DO $$ BEGIN
  IF (SELECT count(*) FROM public.forum_likes) <> 1 OR (SELECT user_id FROM public.forum_likes) <> '00000000-0000-0000-0000-0000000000a3'
  THEN RAISE EXCEPTION 'un membre lit les j''aime des autres'; END IF;
END $$;
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
DO $$ BEGIN
  IF (SELECT count(*) FROM public.forum_likes) <> 2 THEN RAISE EXCEPTION 'admin ne lit pas tous les j''aime'; END IF;
END $$;
RESET ROLE;
UPDATE public.site_settings SET value = value || '{"forum": false}' WHERE key = 'modules';
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
DO $$ BEGIN
  IF (SELECT count(*) FROM public.forum_topics) <> 1 THEN RAISE EXCEPTION 'admin ne modère plus un forum éteint'; END IF;
END $$;
RESET ROLE;

-- 3. Référentiels d'un module : annuaire, annonces, départements, voisinages ------------------------------
INSERT INTO public.directory_categories (id, name, slug) VALUES ('00000000-0000-0000-0000-0000000000d1', 'Artisans', 'artisans');
INSERT INTO public.marketplace_categories (id, name, slug) VALUES ('00000000-0000-0000-0000-0000000000d2', 'Outils', 'outils');
INSERT INTO public.geo_departements (code, nom, slug) VALUES ('99', 'Test', 'test-99') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.geo_places (id, kind, code, name, slug) VALUES
  ('00000000-0000-0000-0000-0000000000a9', 'commune', '99001', 'Ville A', 'ville-a'),
  ('00000000-0000-0000-0000-0000000000b9', 'commune', '99002', 'Ville B', 'ville-b');
INSERT INTO public.geo_adjacency (place_id, neighbor_id, distance_km) VALUES
  ('00000000-0000-0000-0000-0000000000a9', '00000000-0000-0000-0000-0000000000b9', 3);
SELECT pg_temp.as_anon();
DO $$ BEGIN
  IF (SELECT count(*) FROM public.directory_categories) + (SELECT count(*) FROM public.marketplace_categories)
     + (SELECT count(*) FROM public.geo_departements) + (SELECT count(*) FROM public.geo_adjacency) <> 0
  THEN RAISE EXCEPTION 'référentiels de modules éteints lisibles'; END IF;
END $$;
RESET ROLE;
UPDATE public.site_settings SET value = value || '{"members": true, "messaging": true, "directory": true, "marketplace": true}' WHERE key = 'modules';
SELECT pg_temp.as_anon();
DO $$ BEGIN
  IF (SELECT count(*) FROM public.directory_categories) <> 1 THEN RAISE EXCEPTION 'catégories de l''annuaire invisibles'; END IF;
  IF (SELECT count(*) FROM public.marketplace_categories) <> 1 THEN RAISE EXCEPTION 'catégories des annonces invisibles'; END IF;
  IF (SELECT count(*) FROM public.geo_departements WHERE code = '99') <> 1 THEN RAISE EXCEPTION 'départements invisibles avec l''annuaire'; END IF;
  IF (SELECT count(*) FROM public.geo_adjacency) <> 0 THEN RAISE EXCEPTION 'voisinages lisibles sans la géographie'; END IF;
END $$;
RESET ROLE;
UPDATE public.site_settings SET value = value || '{"geo": true}' WHERE key = 'modules';
SELECT pg_temp.as_anon();
DO $$ BEGIN
  IF (SELECT count(*) FROM public.geo_adjacency) <> 1 THEN RAISE EXCEPTION 'voisinages invisibles avec la géographie'; END IF;
END $$;
RESET ROLE;

-- 4. Taxonomies du blog : module allumé, ou rédacteur ----------------------------------------------------
INSERT INTO public.rubriques (id, slug, libelle) VALUES ('00000000-0000-0000-0000-0000000000a0', 'actualites', 'Actualités');
INSERT INTO public.etiquettes (slug, libelle) VALUES ('conseils', 'Conseils');
INSERT INTO public.series (slug, titre) VALUES ('debuter', 'Débuter');
INSERT INTO public.redirections (de, vers) VALUES ('/blog/ancien', '/blog/nouveau');
SELECT pg_temp.as_anon();
DO $$ BEGIN
  IF (SELECT count(*) FROM public.rubriques) + (SELECT count(*) FROM public.etiquettes) + (SELECT count(*) FROM public.series)
     <> 0 THEN RAISE EXCEPTION 'taxonomies lisibles, blog éteint'; END IF;
END $$;
-- Redirections (1.23.1) : un visiteur ne lit jamais la table ; redirection_pour() lui suffit.
SELECT pg_temp.expect_error($$SELECT count(*) FROM public.redirections$$, 'visiteur lit les redirections');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a3', 'membre@test.fr');
DO $$ BEGIN
  IF (SELECT count(*) FROM public.rubriques) <> 0 THEN RAISE EXCEPTION 'membre lit les rubriques, blog éteint'; END IF;
END $$;
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', 'redacteur@test.fr');
DO $$ BEGIN
  IF (SELECT count(*) FROM public.rubriques) <> 1 OR (SELECT count(*) FROM public.etiquettes) <> 1
     OR (SELECT count(*) FROM public.series) <> 1 OR (SELECT count(*) FROM public.redirections) <> 1
  THEN RAISE EXCEPTION 'rédacteur sans ses taxonomies, blog éteint'; END IF;
END $$;
RESET ROLE;
UPDATE public.site_settings SET value = value || '{"blog": true}' WHERE key = 'modules';
SELECT pg_temp.as_anon();
DO $$ BEGIN
  IF (SELECT count(*) FROM public.rubriques) <> 1 OR (SELECT count(*) FROM public.etiquettes) <> 1
     OR (SELECT count(*) FROM public.series) <> 1 OR public.redirection_pour('/blog/ancien') IS DISTINCT FROM '/blog/nouveau'
  THEN RAISE EXCEPTION 'taxonomies invisibles, blog allumé'; END IF;
END $$;
SELECT pg_temp.expect_error($$SELECT count(*) FROM public.redirections$$, 'visiteur lit les redirections, blog allumé');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a3', 'membre@test.fr');
DO $$ BEGIN
  IF (SELECT count(*) FROM public.redirections) <> 0 THEN RAISE EXCEPTION 'membre lit les redirections en masse'; END IF;
END $$;
RESET ROLE;

-- 5. Synonymes : rédacteurs seulement ; la recherche publique les utilise sans les lire -----------------------
INSERT INTO public.synonymes (terme, variantes) VALUES ('velo', ARRAY['bicyclette']);
SELECT pg_temp.as_anon();
SELECT pg_temp.expect_error($$SELECT count(*) FROM public.synonymes$$, 'visiteur lit les synonymes');
DO $$ BEGIN
  IF position('bicyclette' IN public.requete_mot('velo')) = 0 THEN RAISE EXCEPTION 'la recherche publique ignore les synonymes'; END IF;
END $$;
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a3', 'membre@test.fr');
DO $$ BEGIN
  IF (SELECT count(*) FROM public.synonymes) <> 0 THEN RAISE EXCEPTION 'membre lit les synonymes'; END IF;
END $$;
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', 'redacteur@test.fr');
DO $$ BEGIN
  IF (SELECT count(*) FROM public.synonymes) <> 1 THEN RAISE EXCEPTION 'rédacteur sans les synonymes'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
