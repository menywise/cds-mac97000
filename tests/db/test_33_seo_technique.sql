-- Socle 1.12.0 : état des liens de sources (droit revérifié par la base), sources à vérifier,
-- réglage du type de page.
\set ON_ERROR_STOP 1
\i tests/db/_helpers.sql
BEGIN;
-- a1 : admin · a2 : rédacteur · a3 : membre
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr'),
  ('00000000-0000-0000-0000-0000000000a2', 'redacteur@test.fr'),
  ('00000000-0000-0000-0000-0000000000a3', 'membre@test.fr');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
SELECT public.bootstrap_current_user('Administrateur');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', 'redacteur@test.fr');
SELECT public.bootstrap_current_user('Rédacteur');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a3', 'membre@test.fr');
SELECT public.bootstrap_current_user('Membre');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
SELECT public.admin_set_editor('00000000-0000-0000-0000-0000000000a2', true);
RESET ROLE;
INSERT INTO public.contenus_publics (slug, titre, corps, sources) VALUES
  ('un', 'Article un', 'Texte.', 'Guide — https://exemple.fr/guide' || chr(10) || 'https://exemple.fr/mort'),
  ('deux', 'Article deux', 'Texte.', 'https://exemple.fr/guide');

-- 1. Sources à vérifier : une ligne par adresse, avec les contenus qui la citent -------------------
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', 'redacteur@test.fr');
DO $$ BEGIN
  IF (SELECT contenus FROM public.sources_a_verifier() WHERE url = 'https://exemple.fr/guide') <> ARRAY['Article deux', 'Article un'] THEN
    RAISE EXCEPTION 'contenus d''une source'; END IF;
  IF (SELECT count(*) FROM public.sources_a_verifier()) <> 2 THEN RAISE EXCEPTION 'deux adresses'; END IF;
END $$;

-- 2. Résultats enregistrés par un rédacteur, refusés à un membre ------------------------------------
SELECT public.enregistrer_liens_sources('[{"url": "https://exemple.fr/guide", "ok": true, "code_http": 200},
  {"url": "https://exemple.fr/mort", "ok": false, "code_http": 404, "erreur": "Page introuvable"},
  {"url": "http://non-securise.fr", "ok": true}]');
SELECT public.enregistrer_liens_sources('[{"url": "https://exemple.fr/mort", "ok": false, "code_http": 410}]');
DO $$ BEGIN
  IF (SELECT count(*) FROM public.liens_sources_etat) <> 2 THEN RAISE EXCEPTION 'adresse http ignorée'; END IF;
  IF (SELECT code_http FROM public.liens_sources_etat WHERE url = 'https://exemple.fr/mort') <> 410 THEN
    RAISE EXCEPTION 'dernier résultat gardé'; END IF;
END $$;
SELECT pg_temp.expect_error($$INSERT INTO public.liens_sources_etat (url, ok) VALUES ('https://direct.fr', true)$$, 'écriture directe');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a3', 'membre@test.fr');
SELECT pg_temp.expect_error($$SELECT public.enregistrer_liens_sources('[]')$$, 'membre enregistre');
SELECT pg_temp.expect_error($$SELECT public.sources_a_verifier()$$, 'membre lit les sources');
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.liens_sources_etat) THEN RAISE EXCEPTION 'membre lit l''état des sources'; END IF;
END $$;
SELECT pg_temp.as_anon();
SELECT pg_temp.expect_error($$SELECT count(*) FROM public.liens_sources_etat$$, 'visiteur lit l''état des sources');

-- 3. Réglage et version -----------------------------------------------------------------------------
RESET ROLE;
DO $$ BEGIN
  IF public.editorial_reglages() ->> 'type_page' <> 'WebPage' THEN RAISE EXCEPTION 'type de page par défaut'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.socle_versions WHERE version = '1.12.0') THEN RAISE EXCEPTION 'version 1.12.0'; END IF;
END $$;
ROLLBACK;
