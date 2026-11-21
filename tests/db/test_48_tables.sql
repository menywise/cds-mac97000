-- Socle 1.18.0 : Tables, le catalogue. Preuves, chacune avec sa contre-épreuve :
--   1. tables_catalogue() décrit la table registre : colonnes dans l'ordre, clé primaire, défaut,
--      non nullable, sécurité par ligne ; une référence et une énumération sont rendues ;
--   2. seul un administrateur lit le catalogue ; un membre et un visiteur sont refusés.
\set ON_ERROR_STOP 1
\i tests/db/_helpers.sql
BEGIN;
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr'),
  ('00000000-0000-0000-0000-0000000000b1', 'membre@test.fr');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
SELECT public.bootstrap_current_user('Administrateur');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000b1', 'membre@test.fr');
SELECT public.bootstrap_current_user('Membre');
-- 2. Refus d'un membre et d'un visiteur.
SELECT pg_temp.expect_error('SELECT public.tables_catalogue()', 'catalogue lu par un membre');
SELECT pg_temp.as_anon();
SELECT pg_temp.expect_error('SELECT public.tables_catalogue()', 'catalogue lu par un visiteur');
-- 1. L'administrateur lit un catalogue juste.
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
DO $$
DECLARE _cat jsonb; _registre jsonb; _roles jsonb; _journal jsonb;
BEGIN
  _cat := public.tables_catalogue();
  IF jsonb_array_length(_cat) < 50 THEN RAISE EXCEPTION 'le catalogue compte les tables du socle'; END IF;
  SELECT t INTO _registre FROM jsonb_array_elements(_cat) t WHERE t ->> 'nom' = 'registre';
  IF _registre IS NULL THEN RAISE EXCEPTION 'la table registre est au catalogue'; END IF;
  IF NOT (_registre ->> 'rls')::boolean THEN RAISE EXCEPTION 'registre : sécurité par ligne'; END IF;
  IF (_registre -> 'colonnes' -> 0 ->> 'nom') <> 'id' OR NOT (_registre -> 'colonnes' -> 0 ->> 'cle_primaire')::boolean
     OR (_registre -> 'colonnes' -> 0 ->> 'defaut') NOT LIKE 'gen_random_uuid%' THEN
    RAISE EXCEPTION 'registre.id : première colonne, clé primaire, valeur par défaut';
  END IF;
  IF (SELECT (c ->> 'nullable')::boolean FROM jsonb_array_elements(_registre -> 'colonnes') c WHERE c ->> 'nom' = 'usage') THEN
    RAISE EXCEPTION 'registre.usage est obligatoire';
  END IF;
  IF (SELECT c ->> 'type' FROM jsonb_array_elements(_registre -> 'colonnes') c WHERE c ->> 'nom' = 'a_revoir_le') <> 'date' THEN
    RAISE EXCEPTION 'registre.a_revoir_le est une date';
  END IF;
  SELECT t INTO _roles FROM jsonb_array_elements(_cat) t WHERE t ->> 'nom' = 'user_roles';
  IF (SELECT c -> 'enum' FROM jsonb_array_elements(_roles -> 'colonnes') c WHERE c ->> 'nom' = 'role') IS NULL THEN
    RAISE EXCEPTION 'user_roles.role rend les valeurs de son énumération';
  END IF;
  SELECT t INTO _journal FROM jsonb_array_elements(_cat) t WHERE t ->> 'nom' = 'agent_journal';
  IF (SELECT c ->> 'reference' FROM jsonb_array_elements(_journal -> 'colonnes') c WHERE c ->> 'nom' = 'cle_id') <> 'agent_cles.id' THEN
    RAISE EXCEPTION 'agent_journal.cle_id rend sa référence';
  END IF;
END $$;
ROLLBACK;
