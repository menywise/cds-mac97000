-- Socle 1.16.0 : registre de l'application. Preuves, chacune avec sa contre-épreuve :
--   1. après les migrations, aucun module ni aucune tâche planifiée hors registre ;
--      un module ou une tâche ajoutés sans ligne apparaissent dans registre_manquants() ;
--   2. la table refuse une fiche incomplète (usage vide, date absente hors abandon, type inconnu) ;
--   3. seul un administrateur lit le registre et ses manquants ; un membre et un visiteur sont refusés ;
--   4. registre_inscrire n'écrase jamais une ligne existante.
\set ON_ERROR_STOP 1
\i tests/db/_helpers.sql
BEGIN;
-- 1. Rien hors registre après les migrations.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.registre_manquants()) THEN
    RAISE EXCEPTION 'Éléments hors registre après les migrations : %',
      (SELECT string_agg(type || ' ' || identifiant, ', ') FROM public.registre_manquants());
  END IF;
END $$;
-- Contre-épreuve : une tâche planifiée sans ligne apparaît.
DO $$ BEGIN
  IF to_regclass('cron.job') IS NOT NULL THEN
    EXECUTE 'INSERT INTO cron.job (jobname, schedule, command) VALUES (''essai_sans_ligne'', ''0 0 * * *'', ''SELECT 1'')';
    IF NOT EXISTS (SELECT 1 FROM public.registre_manquants() WHERE type = 'tache' AND identifiant = 'essai_sans_ligne') THEN
      RAISE EXCEPTION 'Une tâche planifiée sans ligne devrait être hors registre';
    END IF;
  END IF;
END $$;
-- Contre-épreuve : un élément d'installation sans ligne apparaît (greffe_registre_attendus).
CREATE FUNCTION public.greffe_registre_attendus() RETURNS TABLE (type text, identifiant text)
LANGUAGE sql AS $$ SELECT 'cle'::text, 'cle_essai'::text $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.registre_manquants() WHERE type = 'cle' AND identifiant = 'cle_essai') THEN
    RAISE EXCEPTION 'Un élément d''installation sans ligne devrait être hors registre';
  END IF;
  PERFORM public.registre_inscrire('cle', 'cle_essai', 'Essai.', 'Test', 'en_service', CURRENT_DATE);
  IF EXISTS (SELECT 1 FROM public.registre_manquants() WHERE identifiant = 'cle_essai') THEN
    RAISE EXCEPTION 'Une fois inscrit, l''élément ne doit plus être hors registre';
  END IF;
END $$;
-- 2. Fiche complète exigée.
SELECT pg_temp.expect_error($$INSERT INTO public.registre (type, identifiant, usage, utilisateur, etat, a_revoir_le)
  VALUES ('script', 'scripts/x', ' ', 'Moi', 'en_service', CURRENT_DATE)$$, 'usage vide');
SELECT pg_temp.expect_error($$INSERT INTO public.registre (type, identifiant, usage, utilisateur, etat)
  VALUES ('script', 'scripts/x', 'Essai', 'Moi', 'en_service')$$, 'date absente hors abandon');
SELECT pg_temp.expect_error($$INSERT INTO public.registre (type, identifiant, usage, utilisateur, etat, a_revoir_le)
  VALUES ('inconnu', 'x', 'Essai', 'Moi', 'en_service', CURRENT_DATE)$$, 'type inconnu');
SELECT pg_temp.expect_error($$INSERT INTO public.registre (type, identifiant, usage, utilisateur, etat, a_revoir_le)
  VALUES ('script', 'scripts/x', 'Essai', 'Moi', 'oublie', CURRENT_DATE)$$, 'état inconnu');
-- Contre-épreuve : un abandonné se passe de date.
INSERT INTO public.registre (type, identifiant, usage, utilisateur, etat)
VALUES ('script', 'scripts/ancien', 'Ancien script.', 'Personne', 'abandonne');
-- 4. registre_inscrire n'écrase pas.
SELECT public.registre_inscrire('script', 'scripts/ancien', 'Autre usage.', 'Autre', 'en_service', CURRENT_DATE);
DO $$ BEGIN
  IF (SELECT usage FROM public.registre WHERE identifiant = 'scripts/ancien') <> 'Ancien script.' THEN
    RAISE EXCEPTION 'registre_inscrire a écrasé une ligne existante';
  END IF;
END $$;
-- 3. Droits.
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr'),
  ('00000000-0000-0000-0000-0000000000b1', 'membre@test.fr');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
SELECT public.bootstrap_current_user('Administrateur');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000b1', 'membre@test.fr');
SELECT public.bootstrap_current_user('Membre');
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.registre) THEN
    RAISE EXCEPTION 'Un membre ne doit voir aucune ligne du registre';
  END IF;
END $$;
SELECT pg_temp.expect_error('SELECT * FROM public.registre_manquants()', 'manquants lus par un membre');
SELECT pg_temp.expect_error($$INSERT INTO public.registre (type, identifiant, usage, utilisateur, etat, a_revoir_le)
  VALUES ('script', 'scripts/y', 'Essai', 'Moi', 'en_service', CURRENT_DATE)$$, 'écriture par un membre');
SELECT pg_temp.expect_error($$SELECT public.registre_inscrire('script', 'scripts/y', 'Essai', 'Moi', 'en_service', CURRENT_DATE)$$,
  'registre_inscrire par un membre');
SELECT pg_temp.as_anon();
SELECT pg_temp.expect_error('SELECT * FROM public.registre', 'lecture par un visiteur');
SELECT pg_temp.expect_error('SELECT * FROM public.registre_manquants()', 'manquants lus par un visiteur');
-- Contre-épreuve : l'administrateur lit, écrit et voit les manquants.
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
DO $$ BEGIN
  IF (SELECT count(*) FROM public.registre WHERE type = 'module') < 25 THEN
    RAISE EXCEPTION 'L''administrateur doit lire les modules du registre';
  END IF;
  INSERT INTO public.registre (type, identifiant, usage, utilisateur, etat, a_revoir_le)
  VALUES ('export', 'export-essai', 'Essai.', 'Administrateurs', 'prevu', CURRENT_DATE);
  PERFORM * FROM public.registre_manquants();
END $$;
ROLLBACK;
