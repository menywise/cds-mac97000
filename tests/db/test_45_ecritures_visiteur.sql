-- Socle 1.16.3 : un visiteur n'écrit que là où une politique le lui ouvre. Le banc local ne reproduit
-- pas les droits par défaut de Supabase : le test les recrée (tous les droits au rôle anon), rejoue la
-- migration, et vérifie l'état obtenu, contre-épreuves comprises.
\set ON_ERROR_STOP 1
\i tests/db/_helpers.sql
BEGIN;
SET client_min_messages = warning;
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr'),
  ('00000000-0000-0000-0000-0000000000a2', 'membre@test.fr');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
SELECT public.bootstrap_current_user('Administrateur');
RESET ROLE;

-- 0. Après les migrations : aucun écart, et les deux écritures ouvertes gardées -----------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.ecritures_visiteur_sans_politique()) THEN
    RAISE EXCEPTION 'écart après les migrations : %', (SELECT string_agg(table_name || ' ' || droit, ', ') FROM public.ecritures_visiteur_sans_politique()); END IF;
  IF NOT has_table_privilege('anon', 'public.contact_messages', 'INSERT') OR NOT has_table_privilege('anon', 'public.ad_events', 'INSERT') THEN
    RAISE EXCEPTION 'écriture ouverte aux visiteurs retirée'; END IF;
END $$;

-- 1. Base comme en production : tous les droits au visiteur ; table de greffe ouverte aux visiteurs -------
DO $$
DECLARE _t record;
BEGIN
  FOR _t IN SELECT c.relname FROM pg_class c WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r', 'p') LOOP
    EXECUTE format('GRANT INSERT, UPDATE, DELETE ON public.%I TO anon', _t.relname);
  END LOOP;
END $$;
CREATE TABLE public.greffe_essai_avis (id serial PRIMARY KEY, texte text NOT NULL);
ALTER TABLE public.greffe_essai_avis ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.greffe_essai_avis TO anon;
GRANT USAGE ON SEQUENCE public.greffe_essai_avis_id_seq TO anon;
CREATE POLICY greffe_essai_avis_depot ON public.greffe_essai_avis FOR INSERT TO anon WITH CHECK (true);
-- Contre-épreuve : l'écart est vu, table par table et écriture par écriture.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.ecritures_visiteur_sans_politique() WHERE table_name = 'user_roles' AND droit = 'UPDATE') THEN
    RAISE EXCEPTION 'écart non vu : user_roles UPDATE'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.ecritures_visiteur_sans_politique() WHERE table_name = 'greffe_essai_avis' AND droit = 'DELETE') THEN
    RAISE EXCEPTION 'écart non vu : greffe DELETE'; END IF;
  IF EXISTS (SELECT 1 FROM public.ecritures_visiteur_sans_politique() WHERE table_name IN ('contact_messages', 'ad_events', 'greffe_essai_avis') AND droit = 'INSERT') THEN
    RAISE EXCEPTION 'écriture ouverte comptée comme écart'; END IF;
END $$;

-- 2. La migration retire les droits sans politique, garde les autres -------------------------------------
\i supabase/migrations/20261117120000_v1_16_3_ecritures_visiteur.sql
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.ecritures_visiteur_sans_politique()) THEN
    RAISE EXCEPTION 'écart restant : %', (SELECT string_agg(table_name || ' ' || droit, ', ') FROM public.ecritures_visiteur_sans_politique()); END IF;
  IF has_table_privilege('anon', 'public.user_roles', 'INSERT') OR has_table_privilege('anon', 'public.profiles', 'UPDATE')
     OR has_table_privilege('anon', 'public.site_settings', 'DELETE') THEN RAISE EXCEPTION 'droit d''écriture sans politique gardé'; END IF;
  IF NOT has_table_privilege('anon', 'public.contact_messages', 'INSERT') OR NOT has_table_privilege('anon', 'public.ad_events', 'INSERT')
     OR NOT has_table_privilege('anon', 'public.greffe_essai_avis', 'INSERT') THEN RAISE EXCEPTION 'écriture ouverte retirée'; END IF;
  IF has_table_privilege('anon', 'public.greffe_essai_avis', 'UPDATE') OR has_table_privilege('anon', 'public.greffe_essai_avis', 'DELETE') THEN
    RAISE EXCEPTION 'greffe : écriture sans politique gardée'; END IF;
  -- Ni la lecture du visiteur ni les écritures des membres ne bougent.
  IF NOT has_table_privilege('anon', 'public.contenus_publics', 'SELECT') OR NOT has_table_privilege('anon', 'public.greffe_essai_avis', 'SELECT') THEN
    RAISE EXCEPTION 'lecture du visiteur retirée'; END IF;
  IF NOT has_table_privilege('authenticated', 'public.forum_topics', 'INSERT') THEN RAISE EXCEPTION 'écriture des membres retirée'; END IF;
END $$;

-- 3. À l'écran : le visiteur écrit ce qui lui est ouvert, rien d'autre -------------------------------------
SELECT pg_temp.as_anon();
INSERT INTO public.contact_messages (name, email, subject, message) VALUES ('Visiteur', 'v@test.fr', 'Sujet', 'Un message de test.');
INSERT INTO public.greffe_essai_avis (texte) VALUES ('Avis déposé');
SELECT pg_temp.expect_error($$UPDATE public.site_settings SET value = '{}' WHERE key = 'brand'$$, 'visiteur modifie la marque');
SELECT pg_temp.expect_error($$DELETE FROM public.user_roles$$, 'visiteur supprime les rôles');
SELECT pg_temp.expect_error($$INSERT INTO public.user_roles (user_id, role) VALUES ('00000000-0000-0000-0000-0000000000a2', 'admin')$$, 'visiteur se nomme administrateur');
RESET ROLE;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.contact_messages WHERE email = 'v@test.fr') <> 1 THEN RAISE EXCEPTION 'message de contact perdu'; END IF;
  IF (SELECT count(*) FROM public.greffe_essai_avis) <> 1 THEN RAISE EXCEPTION 'avis de greffe perdu'; END IF;
END $$;

-- 4. Fonction réservée aux administrateurs ---------------------------------------------------------------
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', 'membre@test.fr');
SELECT pg_temp.expect_error($$SELECT * FROM public.ecritures_visiteur_sans_politique()$$, 'membre lit les écarts');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.ecritures_visiteur_sans_politique()) THEN RAISE EXCEPTION 'admin : écart'; END IF;
END $$;
RESET ROLE;
SELECT pg_temp.as_anon();
SELECT pg_temp.expect_error($$SELECT * FROM public.ecritures_visiteur_sans_politique()$$, 'visiteur lit les écarts');
RESET ROLE;

-- 5. Rejouable, version, registre ------------------------------------------------------------------------
\i supabase/migrations/20261117120000_v1_16_3_ecritures_visiteur.sql
DO $$ BEGIN
  IF (SELECT count(*) FROM public.socle_versions WHERE version = '1.16.3' AND niveau = 'correctif') <> 1 THEN RAISE EXCEPTION 'version 1.16.3'; END IF;
  IF string_to_array((SELECT value ->> 'version' FROM public.site_settings WHERE key = 'socle'), '.')::int[] < ARRAY[1, 16, 3] THEN
    RAISE EXCEPTION 'réglage socle sous 1.16.3'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.registre WHERE type = 'autre' AND identifiant = 'public.ecritures_visiteur_sans_politique()') THEN
    RAISE EXCEPTION 'registre'; END IF;
END $$;
RESET client_min_messages;
ROLLBACK;
