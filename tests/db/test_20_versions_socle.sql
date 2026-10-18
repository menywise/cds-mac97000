\set ON_ERROR_STOP 1
\i tests/db/_helpers.sql
BEGIN;
-- Socle 1.1.0 : registre des versions du socle et registre de l'installation (historique jusqu'à 1.8.0). Lecture publique,
-- aucune écriture depuis un compte ; réglage « socle » jamais revu à la baisse.
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
SELECT public.bootstrap_current_user('Administrateur');
RESET ROLE;

-- 1. Historique écrit par la migration -----------------------------------------------------------------
DO $$ BEGIN
  IF (SELECT string_agg(version || ':' || niveau, ',' ORDER BY version) FROM public.socle_versions)
     <> '1.0.0:initial,1.1.0:brique,1.2.0:brique,1.3.0:brique,1.4.0:brique,1.4.1:correctif,1.5.0:brique,1.6.0:brique,1.6.1:correctif,1.7.0:brique,1.8.0:brique' THEN RAISE EXCEPTION 'historique des versions'; END IF;
  IF (SELECT value ->> 'version' FROM public.site_settings WHERE key = 'socle') <> '1.8.0' THEN
    RAISE EXCEPTION 'réglage socle'; END IF;
  IF EXISTS (SELECT 1 FROM public.socle_installation) THEN RAISE EXCEPTION 'installation vide dans le socle'; END IF;
END $$;

-- 2. Lecture publique, écriture refusée ----------------------------------------------------------------
SELECT pg_temp.as_anon();
DO $$ BEGIN
  IF (SELECT count(*) FROM public.socle_versions) <> 11 THEN RAISE EXCEPTION 'visiteur lit les versions'; END IF;
END $$;
SELECT pg_temp.expect_error($$INSERT INTO public.socle_versions (version, niveau, resume, migration_reference)
  VALUES ('9.9.9', 'palier', 'x', 'x')$$, 'visiteur publie une version');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
SELECT pg_temp.expect_error($$INSERT INTO public.socle_installation (version, niveau, installe_le, resume)
  VALUES ('9.9.9', 'installation', CURRENT_DATE, 'x')$$, 'admin écrit dans le registre');
SELECT pg_temp.expect_error($$DELETE FROM public.socle_versions WHERE version = '1.0.0'$$, 'admin efface une version');
RESET ROLE;

-- 3. Contraintes ---------------------------------------------------------------------------------------
SELECT pg_temp.expect_error($$INSERT INTO public.socle_installation (version, niveau, installe_le, resume)
  VALUES ('1.1', 'installation', CURRENT_DATE, 'x')$$, 'version mal formée');
SELECT pg_temp.expect_error($$INSERT INTO public.socle_installation (version, niveau, installe_le, resume)
  VALUES ('1.1.0', 'autre', CURRENT_DATE, 'x')$$, 'niveau inconnu');

-- 4. Rejouable, et jamais de retour en arrière du réglage ---------------------------------------------
UPDATE public.site_settings SET value = '{"version": "1.10.0"}' WHERE key = 'socle';
\i supabase/migrations/20261003120000_v1_1_0_versions_installation.sql
DO $$ BEGIN
  IF (SELECT value ->> 'version' FROM public.site_settings WHERE key = 'socle') <> '1.10.0' THEN
    RAISE EXCEPTION 'réglage revu à la baisse'; END IF;
  IF (SELECT count(*) FROM public.socle_versions) <> 11 THEN RAISE EXCEPTION 'doublon de version'; END IF;
END $$;
UPDATE public.site_settings SET value = '{"version": "0.0.0", "ecart": "non mesure"}' WHERE key = 'socle';
\i supabase/migrations/20261003120000_v1_1_0_versions_installation.sql
DO $$ BEGIN
  IF (SELECT value FROM public.site_settings WHERE key = 'socle') ->> 'version' <> '1.1.0'
     OR (SELECT value FROM public.site_settings WHERE key = 'socle') ? 'ecart' THEN
    RAISE EXCEPTION 'mise à niveau du réglage'; END IF;
END $$;
ROLLBACK;
