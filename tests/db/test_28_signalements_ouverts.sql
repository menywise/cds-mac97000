\set ON_ERROR_STOP 1
\i tests/db/_helpers.sql
BEGIN;
-- Socle 1.7.0 : signalements ouverts aux visiteurs (erreur, oubli, correction proposée), champ piège,
-- un lien au plus, plafonds sans adresse IP, code de suivi, réponse publique, page des améliorations,
-- effacement de l'adresse e-mail du visiteur.
-- a1 : administrateur · b1 : membre
CREATE OR REPLACE FUNCTION pg_temp.expect_sqlstate(_sql text, _code text, _label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE _sql;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE = _code THEN RETURN; END IF;
    RAISE EXCEPTION 'ÉCHEC % : code % attendu, % reçu (%)', _label, _code, SQLSTATE, SQLERRM;
  END;
  RAISE EXCEPTION 'ÉCHEC attendu non survenu : %', _label;
END $$;
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr'),
  ('00000000-0000-0000-0000-0000000000b1', 'un@test.fr');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
SELECT public.bootstrap_current_user('Administrateur');
RESET ROLE;
DELETE FROM public.reports;

-- 1. Module éteint : rien ne passe ------------------------------------------------------------------
UPDATE public.site_settings SET value = value || '{"reports": false}' WHERE key = 'modules';
SELECT pg_temp.as_anon();
SELECT pg_temp.expect_sqlstate($$SELECT public.report_submit('page', 'information_erronee', 'Horaires faux', NULL)$$, '42501', 'module éteint');
RESET ROLE;
UPDATE public.site_settings SET value = value || '{"reports": true}' WHERE key = 'modules';

-- 2. Visiteur : envoi par la fonction, jamais en direct --------------------------------------------
SELECT pg_temp.as_anon();
SELECT pg_temp.expect_error($$INSERT INTO public.reports (source, content_type, reason, details) VALUES ('visiteur', 'page', 'oubli', 'En direct')$$, 'visiteur écrit en direct');
SELECT pg_temp.expect_error($$SELECT * FROM public.reports$$, 'visiteur lit les signalements');
CREATE TEMP TABLE codes (nom text, code text);
GRANT ALL ON codes TO anon, authenticated;
INSERT INTO codes SELECT 'erreur', public.report_submit('fiche', 'information_erronee', 'Le numéro de téléphone est faux', '00000000-0000-0000-0000-0000000000f1', NULL, '/annuaire/plombier', 'Visiteur@Test.fr ');
INSERT INTO codes SELECT 'correction', public.report_submit('fiche', 'correction', NULL, '00000000-0000-0000-0000-0000000000f1', '05 55 00 00 00', '/annuaire/plombier');
-- Correction sans valeur proposée, texte trop court, deux liens, motif ou type inconnus : refusés.
SELECT pg_temp.expect_sqlstate($$SELECT public.report_submit('fiche', 'correction', 'Il faut corriger', NULL)$$, '23514', 'correction sans valeur');
SELECT pg_temp.expect_sqlstate($$SELECT public.report_submit('page', 'oubli', 'abc', NULL)$$, '23514', 'texte trop court');
SELECT pg_temp.expect_sqlstate($$SELECT public.report_submit('page', 'oubli', 'Voir https://a.fr et https://b.fr', NULL)$$, '23514', 'deux liens');
SELECT pg_temp.expect_sqlstate($$SELECT public.report_submit('page', 'oubli', 'Voir www.a.fr', NULL, 'puis http://b.fr')$$, '23514', 'un lien dans chaque champ');
SELECT pg_temp.expect_sqlstate($$SELECT public.report_submit('page', 'inconnu', 'Motif inconnu', NULL)$$, '23514', 'motif inconnu');
SELECT pg_temp.expect_sqlstate($$SELECT public.report_submit('inconnu', 'oubli', 'Type inconnu', NULL)$$, '23514', 'type inconnu');
SELECT pg_temp.expect_sqlstate($$SELECT public.report_submit('page', 'oubli', 'Adresse piégée', NULL, NULL, 'javascript:alert(1)')$$, '23514', 'adresse piégée');
SELECT pg_temp.expect_sqlstate($$SELECT public.report_submit('page', 'oubli', 'Adresse mal formée', NULL, NULL, '/a', 'pas-une-adresse')$$, '23514', 'e-mail mal formé');
-- Le même texte déjà en attente sur la même page : refusé.
SELECT pg_temp.expect_sqlstate($$SELECT public.report_submit('fiche', 'information_erronee', 'Le numéro de téléphone est faux', '00000000-0000-0000-0000-0000000000f1', NULL, '/annuaire/plombier')$$, 'CDS06', 'doublon visiteur');
-- Champ piège rempli : un code est rendu, rien n'est enregistré.
INSERT INTO codes SELECT 'piege', public.report_submit('page', 'spam', 'Achetez maintenant', NULL, NULL, '/', NULL, 'Société Robot');
RESET ROLE;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.reports) <> 2 THEN RAISE EXCEPTION 'signalements des visiteurs : 2 attendus'; END IF;
  IF EXISTS (SELECT 1 FROM public.reports WHERE details = 'Achetez maintenant') THEN RAISE EXCEPTION 'champ piège enregistré'; END IF;
  IF (SELECT char_length(code) FROM codes WHERE nom = 'piege') <> 10 THEN RAISE EXCEPTION 'faux code du champ piège'; END IF;
  IF EXISTS (SELECT 1 FROM public.reports WHERE source <> 'visiteur' OR reporter_id IS NOT NULL) THEN RAISE EXCEPTION 'source du visiteur'; END IF;
  IF (SELECT contact_email FROM public.reports WHERE reason = 'information_erronee') <> 'visiteur@test.fr' THEN RAISE EXCEPTION 'adresse normalisée'; END IF;
  IF (SELECT proposed_value FROM public.reports WHERE reason = 'correction') <> '05 55 00 00 00' THEN RAISE EXCEPTION 'valeur proposée'; END IF;
  IF (SELECT code FROM codes WHERE nom = 'erreur') <> (SELECT tracking_code FROM public.reports WHERE reason = 'information_erronee')
  THEN RAISE EXCEPTION 'code de suivi rendu'; END IF;
  IF (SELECT count(DISTINCT tracking_code) FROM public.reports) <> 2 THEN RAISE EXCEPTION 'codes de suivi distincts'; END IF;
END $$;

-- 3. Plafonds des visiteurs : 5 par adresse e-mail et par 24 heures, 30 par heure pour le site -------
SELECT pg_temp.as_anon();
DO $$ BEGIN
  FOR i IN 1..4 LOOP
    PERFORM public.report_submit('page', 'oubli', 'Oubli numéro ' || i, NULL, NULL, '/a', 'visiteur@test.fr');
  END LOOP;
END $$;
SELECT pg_temp.expect_sqlstate($$SELECT public.report_submit('page', 'oubli', 'Oubli numéro 5', NULL, NULL, '/a', 'VISITEUR@test.fr')$$, 'CDS05', 'sixième envoi de la même adresse');
DO $$ BEGIN
  FOR i IN 1..24 LOOP
    PERFORM public.report_submit('page', 'oubli', 'Oubli anonyme ' || i, NULL, NULL, '/b');
  END LOOP;
END $$;
SELECT pg_temp.expect_sqlstate($$SELECT public.report_submit('page', 'oubli', 'Un de trop', NULL, NULL, '/b')$$, 'CDS04', 'plafond horaire du site');
RESET ROLE;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.reports WHERE source = 'visiteur') <> 30 THEN RAISE EXCEPTION 'plafond horaire : 30 attendus'; END IF;
END $$;
-- La date reste tenue par la base, même pour une modification.
UPDATE public.reports SET created_at = now() - interval '1 year';
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.reports WHERE created_at < now() - interval '1 minute') THEN RAISE EXCEPTION 'date modifiée'; END IF;
END $$;

-- 4. Membre : même fonction, en son nom, limite du dépôt --------------------------------------------
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000b1', 'un@test.fr');
INSERT INTO codes SELECT 'membre', public.report_submit('sujet', 'spam', NULL, '00000000-0000-0000-0000-0000000000c1', NULL, '/forum/x', 'ignoree@test.fr');
SELECT pg_temp.expect_sqlstate($$SELECT public.report_submit('sujet', 'spam', NULL, '00000000-0000-0000-0000-0000000000c1')$$, '23505', 'doublon membre');
-- Le membre lit son signalement, avec son code ; il ne choisit ni réponse publique, ni code, ni source.
DO $$ BEGIN
  IF (SELECT count(*) FROM public.reports) <> 1 THEN RAISE EXCEPTION 'le membre ne lit que les siens'; END IF;
  IF (SELECT tracking_code FROM public.reports) <> (SELECT code FROM codes WHERE nom = 'membre') THEN RAISE EXCEPTION 'code du membre'; END IF;
  IF (SELECT contact_email FROM public.reports) IS NOT NULL THEN RAISE EXCEPTION 'adresse gardée pour un membre'; END IF;
END $$;
SELECT pg_temp.expect_error($$INSERT INTO public.reports (reporter_id, content_type, reason, public_note) VALUES ('00000000-0000-0000-0000-0000000000b1', 'page', 'oubli', 'Publié')$$, 'membre écrit une réponse publique');
SELECT pg_temp.expect_error($$INSERT INTO public.reports (reporter_id, source, content_type, reason) VALUES ('00000000-0000-0000-0000-0000000000b1', 'visiteur', 'page', 'oubli')$$, 'membre se dit visiteur');
INSERT INTO public.reports (reporter_id, content_type, reason, tracking_code) VALUES ('00000000-0000-0000-0000-0000000000b1', 'page', 'oubli', 'CHOISI');
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.reports WHERE tracking_code = 'CHOISI') THEN RAISE EXCEPTION 'code choisi par le membre'; END IF;
END $$;
UPDATE public.reports SET public_note = 'Modifié par le membre';
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.reports WHERE public_note IS NOT NULL) THEN RAISE EXCEPTION 'le membre traite'; END IF;
END $$;
RESET ROLE;

-- 5. Traitement : l'administrateur répond publiquement ; le dépôt reste figé --------------------------
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
UPDATE public.reports SET status = 'action_prise', public_note = 'Numéro de téléphone corrigé, merci !',
  admin_note = 'Vérifié au registre', proposed_value = 'réécrit', details = 'réécrit', source = 'membre',
  tracking_code = 'REECRIT', contact_email = 'autre@test.fr'
  WHERE reason = 'correction';
UPDATE public.reports SET status = 'action_prise', admin_note = 'Corrigé sans réponse publique'
  WHERE reason = 'information_erronee';
RESET ROLE;
DO $$ BEGIN
  IF (SELECT proposed_value FROM public.reports WHERE reason = 'correction') <> '05 55 00 00 00' THEN RAISE EXCEPTION 'valeur proposée réécrite'; END IF;
  IF (SELECT details FROM public.reports WHERE reason = 'correction') IS NOT NULL THEN RAISE EXCEPTION 'texte réécrit'; END IF;
  IF (SELECT source FROM public.reports WHERE reason = 'correction') <> 'visiteur' THEN RAISE EXCEPTION 'source réécrite'; END IF;
  IF (SELECT tracking_code FROM public.reports WHERE reason = 'correction') <> (SELECT code FROM codes WHERE nom = 'correction')
  THEN RAISE EXCEPTION 'code réécrit'; END IF;
  IF (SELECT handled_by FROM public.reports WHERE reason = 'correction') <> '00000000-0000-0000-0000-0000000000a1'
  THEN RAISE EXCEPTION 'traitement non signé'; END IF;
END $$;

-- 6. Suivi par code et page des améliorations -------------------------------------------------------
SELECT pg_temp.as_anon();
DO $$
DECLARE _s record;
BEGIN
  SELECT * INTO _s FROM public.report_status((SELECT lower(code) || ' ' FROM codes WHERE nom = 'correction'));
  IF _s.status <> 'action_prise' OR _s.public_note <> 'Numéro de téléphone corrigé, merci !' OR _s.handled_at IS NULL
  THEN RAISE EXCEPTION 'suivi par code'; END IF;
  IF EXISTS (SELECT 1 FROM public.report_status('')) OR EXISTS (SELECT 1 FROM public.report_status('ABCDEF1234'))
  THEN RAISE EXCEPTION 'code vide ou inconnu'; END IF;
  -- La page ne montre que les actions suivies d'une réponse publique.
  IF (SELECT count(*) FROM public.report_improvements()) <> 1 THEN RAISE EXCEPTION 'améliorations : 1 attendue'; END IF;
  IF (SELECT public_note FROM public.report_improvements()) <> 'Numéro de téléphone corrigé, merci !' THEN RAISE EXCEPTION 'réponse publique'; END IF;
END $$;
RESET ROLE;
UPDATE public.site_settings SET value = value || '{"reports": false}' WHERE key = 'modules';
SELECT pg_temp.as_anon();
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.report_improvements()) THEN RAISE EXCEPTION 'améliorations module éteint'; END IF;
  IF EXISTS (SELECT 1 FROM public.report_status((SELECT code FROM codes WHERE nom = 'correction'))) THEN RAISE EXCEPTION 'suivi module éteint'; END IF;
END $$;
RESET ROLE;
UPDATE public.site_settings SET value = value || '{"reports": true}' WHERE key = 'modules';

-- 7. Effacement des adresses : 3 mois après le traitement, 12 mois sans traitement --------------------
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000b1', 'un@test.fr');
SELECT pg_temp.expect_sqlstate($$SELECT public.purge_report_contacts()$$, '42501', 'membre efface les adresses');
RESET ROLE;
ALTER TABLE public.reports DISABLE TRIGGER reports_guard;
UPDATE public.reports SET handled_at = now() - interval '4 months' WHERE reason = 'information_erronee';
UPDATE public.reports SET created_at = now() - interval '13 months' WHERE details = 'Oubli numéro 1';
UPDATE public.reports SET created_at = now() - interval '2 months' WHERE details = 'Oubli numéro 2';
ALTER TABLE public.reports ENABLE TRIGGER reports_guard;
SELECT set_config('request.jwt.claims', '{}', true); -- appel sans session (pg_cron)
DO $$ BEGIN
  IF public.purge_report_contacts() <> 2 THEN RAISE EXCEPTION 'effacement : 2 adresses attendues'; END IF;
  IF (SELECT contact_email FROM public.reports WHERE details = 'Oubli numéro 2') IS NULL THEN RAISE EXCEPTION 'adresse récente effacée'; END IF;
  IF (SELECT count(*) FROM public.reports WHERE contact_email IS NOT NULL) <> 3 THEN RAISE EXCEPTION 'adresses restantes'; END IF;
END $$;

-- 8. Suppression du compte : le signalement du membre reste, anonymisé ------------------------------
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000b1', 'un@test.fr');
SELECT public.delete_my_account();
RESET ROLE;
DO $$ BEGIN
  IF (SELECT reporter_id FROM public.reports WHERE reason = 'spam') <> '00000000-0000-0000-0000-000000000000'
  THEN RAISE EXCEPTION 'signalement du membre non anonymisé'; END IF;
END $$;

-- 9. Grille, version, rejeu ------------------------------------------------------------------------
DO $$ BEGIN
  IF (SELECT modules FROM public.template_checks WHERE code = 'V1-SIGNALEMENTS-VISITEURS') <> ARRAY['reports']
  THEN RAISE EXCEPTION 'point de la grille'; END IF;
  -- Réglage relevé au moins à 1.7.0 (une version suivante le relève encore).
  IF string_to_array((SELECT value ->> 'version' FROM public.site_settings WHERE key = 'socle'), '.')::int[]
     < string_to_array('1.7.0', '.')::int[] THEN RAISE EXCEPTION 'version'; END IF;
END $$;
SET client_min_messages = warning;
\i supabase/migrations/20261015120000_v1_7_0_signalements_ouverts.sql
RESET client_min_messages;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.template_checks WHERE code = 'V1-SIGNALEMENTS-VISITEURS') <> 1 THEN RAISE EXCEPTION 'rejeu : point en double'; END IF;
  IF (SELECT count(*) FROM public.socle_versions WHERE version = '1.7.0') <> 1 THEN RAISE EXCEPTION 'rejeu : version en double'; END IF;
END $$;
ROLLBACK;
