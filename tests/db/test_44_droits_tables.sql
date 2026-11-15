-- Socle 1.16.2 : droits des rôles publics sur les tables. Le banc local ne reproduit pas les droits par
-- défaut de Supabase (tous les droits aux rôles anon et authenticated sur chaque table créée) : le test
-- les recrée, rejoue la migration, et vérifie l'état obtenu, contre-épreuves comprises.
\set ON_ERROR_STOP 1
\i tests/db/_helpers.sql
BEGIN;
SET client_min_messages = warning;

-- 0. Les trois tables du lot : aucune lecture sans condition, dans tout le schéma public ---------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND cmd IN ('SELECT', 'ALL') AND qual = 'true') THEN
    RAISE EXCEPTION 'politique de lecture USING (true) : %', (SELECT string_agg(tablename || '.' || policyname, ', ')
      FROM pg_policies WHERE schemaname = 'public' AND cmd IN ('SELECT', 'ALL') AND qual = 'true'); END IF;
  IF to_regclass('public.geo_communes') IS NOT NULL THEN RAISE EXCEPTION 'geo_communes existe encore'; END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.geo_places'::regclass)
     OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.template_checks'::regclass)
  THEN RAISE EXCEPTION 'sécurité par ligne inactive'; END IF;
END $$;

-- 1. Base comme en production : droits par défaut de Supabase, posés après coup -----------------------
DO $$
DECLARE _t record;
BEGIN
  FOR _t IN SELECT c.relname FROM pg_class c WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r', 'p') LOOP
    EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated', _t.relname);
  END LOOP;
END $$;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
DO $$ BEGIN
  IF NOT has_table_privilege('anon', 'public.user_roles', 'TRUNCATE') THEN RAISE EXCEPTION 'simulation : droit absent'; END IF;
END $$;
-- Contre-épreuve : avant la migration, un visiteur vide la grille malgré la sécurité par ligne.
SAVEPOINT avant;
SELECT pg_temp.as_anon();
TRUNCATE public.template_checks;
RESET ROLE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.template_checks) THEN RAISE EXCEPTION 'simulation : grille non vidée'; END IF;
END $$;
ROLLBACK TO SAVEPOINT avant;

-- 2. La migration retire les droits de structure, tables existantes ---------------------------------
\i supabase/migrations/20261116120000_v1_16_2_droits_tables.sql
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c, unnest(ARRAY['anon', 'authenticated']) AS r(role), unnest(ARRAY['TRUNCATE', 'REFERENCES', 'TRIGGER']) AS d(droit)
      WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r', 'p') AND has_table_privilege(r.role, c.oid, d.droit))
  THEN RAISE EXCEPTION 'droit de structure restant sur % tables, dont %', (SELECT count(DISTINCT c.relname)
      FROM pg_class c, unnest(ARRAY['anon', 'authenticated']) AS r(role), unnest(ARRAY['TRUNCATE', 'REFERENCES', 'TRIGGER']) AS d(droit)
      WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r', 'p') AND has_table_privilege(r.role, c.oid, d.droit)),
    (SELECT min(c.relname) FROM pg_class c WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r', 'p')
      AND (has_table_privilege('anon', c.oid, 'TRUNCATE') OR has_table_privilege('authenticated', c.oid, 'TRUNCATE'))); END IF;
  -- Contre-épreuve : la migration ne touche ni aux lectures ni aux écritures gardées par la sécurité par ligne.
  IF NOT has_table_privilege('authenticated', 'public.forum_topics', 'INSERT') THEN RAISE EXCEPTION 'écriture des membres retirée'; END IF;
  IF NOT has_table_privilege('anon', 'public.contenus_publics', 'SELECT') THEN RAISE EXCEPTION 'lecture des visiteurs retirée'; END IF;
  IF NOT has_table_privilege('service_role', 'public.user_roles', 'TRUNCATE') THEN RAISE EXCEPTION 'service_role touché'; END IF;
  -- Grille de conformité : le visiteur n'écrit plus, il garde une lecture vide.
  IF has_table_privilege('anon', 'public.template_checks', 'INSERT') OR has_table_privilege('anon', 'public.template_checks', 'UPDATE')
     OR has_table_privilege('anon', 'public.template_checks', 'DELETE') THEN RAISE EXCEPTION 'visiteur écrit la grille'; END IF;
  IF NOT has_table_privilege('anon', 'public.template_checks', 'SELECT') THEN RAISE EXCEPTION 'lecture visiteur de la grille retirée'; END IF;
  IF NOT has_table_privilege('authenticated', 'public.template_checks', 'UPDATE') THEN RAISE EXCEPTION 'administrateur sans écriture de la grille'; END IF;
END $$;
SELECT pg_temp.as_anon();
DO $$ BEGIN
  IF (SELECT count(*) FROM public.template_checks) <> 0 THEN RAISE EXCEPTION 'visiteur lit la grille'; END IF;
END $$;
SELECT pg_temp.expect_error($$TRUNCATE public.template_checks$$, 'visiteur vide la grille');
RESET ROLE;
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'membre@test.fr');
SELECT pg_temp.expect_error($$TRUNCATE public.template_checks$$, 'membre vide la grille');
RESET ROLE;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.template_checks) = 0 THEN RAISE EXCEPTION 'grille vidée'; END IF;
END $$;

-- 3. Tables créées ensuite : lecture par défaut gardée, droits de structure absents ----------------------
CREATE TABLE public.essai_droits (id int PRIMARY KEY);
DO $$ BEGIN
  IF NOT has_table_privilege('anon', 'public.essai_droits', 'SELECT') THEN RAISE EXCEPTION 'défaut : lecture perdue'; END IF;
  IF has_table_privilege('anon', 'public.essai_droits', 'TRUNCATE') OR has_table_privilege('authenticated', 'public.essai_droits', 'TRUNCATE')
     OR has_table_privilege('authenticated', 'public.essai_droits', 'TRIGGER') OR has_table_privilege('anon', 'public.essai_droits', 'REFERENCES')
  THEN RAISE EXCEPTION 'défaut : droit de structure accordé à une table nouvelle'; END IF;
END $$;

-- 4. Rejouable, version ----------------------------------------------------------------------------------
\i supabase/migrations/20261116120000_v1_16_2_droits_tables.sql
DO $$ BEGIN
  IF (SELECT count(*) FROM public.socle_versions WHERE version = '1.16.2' AND niveau = 'correctif') <> 1 THEN RAISE EXCEPTION 'version 1.16.2'; END IF;
  IF (SELECT value ->> 'version' FROM public.site_settings WHERE key = 'socle') <> '1.16.2' THEN RAISE EXCEPTION 'réglage socle'; END IF;
END $$;
RESET client_min_messages;
ROLLBACK;
