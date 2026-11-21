-- Socle 1.17.0 : co-intervenant IA. Preuves, chacune avec sa contre-épreuve :
--   1. une clé active porte sa fiche (usage, utilisateur, dernier jour) ; sans elle, refus ;
--      un nom en double et un niveau inconnu sont refusés ;
--   2. la ligne au registre suit la fiche de la clé : créée, coupée, supprimée ; effacée à la main,
--      la clé est hors registre (registre_manquants) ;
--   3. agent_authentifier répond pour une clé active dans sa période, rien pour une clé coupée,
--      expirée ou inconnue, et note le dernier usage ; agent_journaliser écrit au nom de la clé ;
--   4. seul un administrateur lit et écrit les clés, lit le journal ; membre et visiteur refusés ;
--      les deux fonctions ne sont pas appelables par un membre.
\set ON_ERROR_STOP 1
\i tests/db/_helpers.sql
BEGIN;
-- 1. Fiche obligatoire pour une clé active.
SELECT pg_temp.expect_error($$INSERT INTO public.agent_cles (nom, cle_hash) VALUES ('Sans fiche', 'h0')$$,
  'clé active sans fiche');
INSERT INTO public.agent_cles (nom, cle_hash, actif) VALUES ('Coupée sans fiche', 'h1', false);
INSERT INTO public.agent_cles (nom, cle_hash, niveau, usage, utilisateur, expire_le)
VALUES ('Session essai', 'h2', 'completer', 'Essai du test 47.', 'Test de base', CURRENT_DATE);
SELECT pg_temp.expect_error($$INSERT INTO public.agent_cles (nom, cle_hash, usage, utilisateur, expire_le)
  VALUES ('Session essai', 'h3', 'Doublon.', 'Test', CURRENT_DATE)$$, 'nom en double');
SELECT pg_temp.expect_error($$INSERT INTO public.agent_cles (nom, cle_hash, niveau, usage, utilisateur, expire_le)
  VALUES ('Niveau', 'h4', 'admin', 'Essai.', 'Test', CURRENT_DATE)$$, 'niveau inconnu');
-- 2. La ligne au registre suit la fiche.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.registre WHERE type = 'cle' AND identifiant = 'Session essai'
                 AND etat = 'en_service' AND usage = 'Essai du test 47.' AND a_revoir_le = CURRENT_DATE) THEN
    RAISE EXCEPTION 'La ligne d''une clé créée doit reprendre sa fiche';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.registre WHERE type = 'cle' AND identifiant = 'Coupée sans fiche'
                 AND etat = 'abandonne' AND a_revoir_le IS NULL) THEN
    RAISE EXCEPTION 'Une clé coupée a sa ligne « abandonné »';
  END IF;
  IF EXISTS (SELECT 1 FROM public.registre_manquants() WHERE type = 'cle') THEN
    RAISE EXCEPTION 'Aucune clé hors registre tant que sa ligne suit';
  END IF;
END $$;
DELETE FROM public.registre WHERE type = 'cle' AND identifiant = 'Session essai';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.registre_manquants() WHERE type = 'cle' AND identifiant = 'Session essai') THEN
    RAISE EXCEPTION 'Une clé dont la ligne a été effacée est hors registre';
  END IF;
END $$;
UPDATE public.agent_cles SET actif = false WHERE nom = 'Session essai';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.registre WHERE type = 'cle' AND identifiant = 'Session essai' AND etat = 'abandonne') THEN
    RAISE EXCEPTION 'Une clé coupée passe « abandonné » au registre';
  END IF;
END $$;
UPDATE public.agent_cles SET actif = true WHERE nom = 'Session essai';
DELETE FROM public.agent_cles WHERE nom = 'Coupée sans fiche';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.registre WHERE type = 'cle' AND identifiant = 'Coupée sans fiche'
                 AND etat = 'abandonne' AND usage LIKE '%Clé supprimée le%') THEN
    RAISE EXCEPTION 'La ligne d''une clé supprimée reste, « abandonné »';
  END IF;
END $$;
-- 3. Authentifier et journaliser (rôle de service).
INSERT INTO public.agent_cles (nom, cle_hash, usage, utilisateur, expire_le)
VALUES ('Expirée', 'h5', 'Hier.', 'Test', CURRENT_DATE - 1);
DO $$
DECLARE _id uuid; _journal uuid;
BEGIN
  SELECT id INTO _id FROM public.agent_authentifier('h2');
  IF _id IS NULL THEN RAISE EXCEPTION 'Une clé active dans sa période répond'; END IF;
  IF (SELECT last_used_at FROM public.agent_cles WHERE nom = 'Session essai') IS NULL THEN
    RAISE EXCEPTION 'Le dernier usage est noté';
  END IF;
  IF EXISTS (SELECT 1 FROM public.agent_authentifier('h5')) THEN RAISE EXCEPTION 'Une clé expirée ne répond pas'; END IF;
  IF EXISTS (SELECT 1 FROM public.agent_authentifier('inconnue')) THEN RAISE EXCEPTION 'Une clé inconnue ne répond pas'; END IF;
  UPDATE public.agent_cles SET actif = false WHERE nom = 'Session essai';
  IF EXISTS (SELECT 1 FROM public.agent_authentifier('h2')) THEN RAISE EXCEPTION 'Une clé coupée ne répond pas'; END IF;
  UPDATE public.agent_cles SET actif = true WHERE nom = 'Session essai';
  _journal := public.agent_journaliser(_id, 'completer_fiche', 'glossaire', NULL, 'definition', NULL, 'Texte.');
  IF NOT EXISTS (SELECT 1 FROM public.agent_journal WHERE id = _journal AND agent = 'Session essai'
                 AND cle_id = _id AND champ = 'definition' AND apres = 'Texte.') THEN
    RAISE EXCEPTION 'Le journal porte le nom de la clé et ce qu''elle a écrit';
  END IF;
  IF public.agent_journaliser(gen_random_uuid(), 'x', 'y') IS NOT NULL THEN
    RAISE EXCEPTION 'Journaliser pour une clé inconnue n''écrit rien';
  END IF;
END $$;
SELECT pg_temp.expect_error($$INSERT INTO public.agent_journal (agent, action, table_cible) VALUES ('x', ' ', 'y')$$,
  'action vide');
-- 4. Droits.
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr'),
  ('00000000-0000-0000-0000-0000000000b1', 'membre@test.fr');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
SELECT public.bootstrap_current_user('Administrateur');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000b1', 'membre@test.fr');
SELECT public.bootstrap_current_user('Membre');
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.agent_cles) THEN RAISE EXCEPTION 'Un membre ne voit aucune clé'; END IF;
  IF EXISTS (SELECT 1 FROM public.agent_journal) THEN RAISE EXCEPTION 'Un membre ne lit pas le journal'; END IF;
END $$;
SELECT pg_temp.expect_error($$INSERT INTO public.agent_cles (nom, cle_hash, usage, utilisateur, expire_le)
  VALUES ('Membre', 'h6', 'Essai.', 'Test', CURRENT_DATE)$$, 'clé créée par un membre');
SELECT pg_temp.expect_error($$SELECT * FROM public.agent_authentifier('h2')$$, 'authentifier par un membre');
SELECT pg_temp.expect_error($$SELECT public.agent_journaliser(gen_random_uuid(), 'x', 'y')$$, 'journaliser par un membre');
SELECT pg_temp.as_anon();
SELECT pg_temp.expect_error('SELECT * FROM public.agent_cles', 'clés lues par un visiteur');
SELECT pg_temp.expect_error('SELECT * FROM public.agent_journal', 'journal lu par un visiteur');
-- Contre-épreuve : l'administrateur lit, crée, coupe et relit le journal.
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
DO $$ BEGIN
  IF (SELECT count(*) FROM public.agent_cles) < 2 THEN RAISE EXCEPTION 'L''administrateur lit les clés'; END IF;
  INSERT INTO public.agent_cles (nom, cle_hash, usage, utilisateur, expire_le)
  VALUES ('Clé admin', 'h7', 'Créée par un admin.', 'Test', CURRENT_DATE);
  UPDATE public.agent_cles SET actif = false WHERE nom = 'Clé admin';
  IF (SELECT count(*) FROM public.agent_journal WHERE agent = 'Session essai') <> 1 THEN
    RAISE EXCEPTION 'L''administrateur lit ce que la clé a écrit';
  END IF;
END $$;
ROLLBACK;
