-- Socle 1.16.4 : une table nouvelle ne donne rien par défaut au visiteur. Le banc local ne reproduit
-- pas les droits par défaut de Supabase : le test les recrée, rejoue la migration, et vérifie l'état
-- obtenu, contre-épreuves comprises.
\set ON_ERROR_STOP 1
\i tests/db/_helpers.sql
BEGIN;
SET client_min_messages = warning;

-- 1. Base comme en production : droits par défaut de Supabase ----------------------------------------
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
-- Contre-épreuve : avant la migration, une table nouvelle s'ouvre seule au visiteur.
CREATE TABLE public.essai_46_avant (id int PRIMARY KEY);
DO $$ BEGIN
  IF NOT has_table_privilege('anon', 'public.essai_46_avant', 'SELECT') OR NOT has_table_privilege('anon', 'public.essai_46_avant', 'INSERT') THEN
    RAISE EXCEPTION 'simulation : table nouvelle fermée au visiteur avant la migration'; END IF;
END $$;

-- 2. La migration : une table nouvelle ne donne plus rien au visiteur -----------------------------------
\i supabase/migrations/20261118120000_v1_16_4_defaut_visiteur.sql
CREATE TABLE public.essai_46_apres (id int PRIMARY KEY);
DO $$ BEGIN
  IF has_table_privilege('anon', 'public.essai_46_apres', 'SELECT') OR has_table_privilege('anon', 'public.essai_46_apres', 'INSERT')
     OR has_table_privilege('anon', 'public.essai_46_apres', 'UPDATE') OR has_table_privilege('anon', 'public.essai_46_apres', 'DELETE') THEN
    RAISE EXCEPTION 'défaut : droit accordé au visiteur'; END IF;
  -- Le membre garde ses droits par défaut ; la table créée avant garde les siens.
  IF NOT has_table_privilege('authenticated', 'public.essai_46_apres', 'SELECT') THEN RAISE EXCEPTION 'défaut : membre sans lecture'; END IF;
  IF NOT has_table_privilege('anon', 'public.essai_46_avant', 'SELECT') THEN RAISE EXCEPTION 'table existante touchée'; END IF;
  -- Tables du socle inchangées : leurs droits visiteur sont accordés un par un.
  IF NOT has_table_privilege('anon', 'public.contenus_publics', 'SELECT') OR NOT has_table_privilege('anon', 'public.contact_messages', 'INSERT') THEN
    RAISE EXCEPTION 'droit visiteur du socle retiré'; END IF;
  IF EXISTS (SELECT 1 FROM pg_default_acl d, aclexplode(d.defaclacl) a
      WHERE d.defaclrole = current_user::regrole AND d.defaclnamespace = 'public'::regnamespace AND d.defaclobjtype = 'r'
        AND a.grantee = 'anon'::regrole) THEN RAISE EXCEPTION 'droit par défaut restant pour anon'; END IF;
END $$;

-- 3. Une table de greffe ouverte aux visiteurs accorde ses droits elle-même (docs/CLONER.md) -------------
CREATE TABLE public.greffe_essai_46 (id int PRIMARY KEY, texte text NOT NULL DEFAULT '');
ALTER TABLE public.greffe_essai_46 ENABLE ROW LEVEL SECURITY;
CREATE POLICY greffe_essai_46_lecture ON public.greffe_essai_46 FOR SELECT TO anon, authenticated USING (true);
INSERT INTO public.greffe_essai_46 VALUES (1, 'ligne');
SELECT pg_temp.as_anon();
SELECT pg_temp.expect_error($$SELECT count(*) FROM public.greffe_essai_46$$, 'visiteur lit sans droit accordé');
RESET ROLE;
GRANT SELECT ON public.greffe_essai_46 TO anon;
SELECT pg_temp.as_anon();
DO $$ BEGIN
  IF (SELECT count(*) FROM public.greffe_essai_46) <> 1 THEN RAISE EXCEPTION 'visiteur ne lit pas après GRANT'; END IF;
END $$;
RESET ROLE;

-- 4. Rejouable, version ----------------------------------------------------------------------------------
\i supabase/migrations/20261118120000_v1_16_4_defaut_visiteur.sql
DO $$ BEGIN
  IF (SELECT count(*) FROM public.socle_versions WHERE version = '1.16.4' AND niveau = 'correctif') <> 1 THEN RAISE EXCEPTION 'version 1.16.4'; END IF;
  IF (SELECT value ->> 'version' FROM public.site_settings WHERE key = 'socle') <> '1.18.0' THEN RAISE EXCEPTION 'réglage socle'; END IF;
END $$;
RESET client_min_messages;
ROLLBACK;
