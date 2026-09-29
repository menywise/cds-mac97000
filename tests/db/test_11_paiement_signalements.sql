\set ON_ERROR_STOP 1
\i tests/db/_helpers.sql
BEGIN;
-- a1 : admin du studio · a2 : membre · a3 : autre membre
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'manuel.rohaut@gmail.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'membre@test.fr'),
  ('00000000-0000-0000-0000-0000000000a3', 'autre@test.fr');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'manuel.rohaut@gmail.com');
SELECT public.bootstrap_current_user('Manu');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', 'membre@test.fr');
SELECT public.bootstrap_current_user('Membre');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a3', 'autre@test.fr');
SELECT public.bootstrap_current_user('Autre');
RESET ROLE;

-- 1. Modules : « payments » éteint par défaut et dépend des formations, « reports » allumé -----
DO $$ BEGIN
  IF NOT public.module_defaults() ? 'payments' THEN RAISE EXCEPTION 'module payments absent'; END IF;
  IF NOT public.module_defaults() ? 'reports' THEN RAISE EXCEPTION 'module reports absent'; END IF;
  IF public.module_enabled('payments') THEN RAISE EXCEPTION 'payments devrait être éteint'; END IF;
  IF NOT public.module_enabled('reports') THEN RAISE EXCEPTION 'reports devrait être allumé'; END IF;
END $$;
SELECT pg_temp.expect_error($$UPDATE public.site_settings SET value = value || '{"payments": true, "lms": false}' WHERE key = 'modules'$$,
  'paiement sans formations');
UPDATE public.site_settings SET value = value || '{"payments": true, "lms": true}' WHERE key = 'modules';

-- 2. Paiement d'une formation -----------------------------------------------------------------
INSERT INTO public.lms_courses (id, title, slug, published, price_cents, currency) VALUES
  ('00000000-0000-0000-0000-0000000000c1', 'Payante', 'payante', true, 4900, 'EUR'),
  ('00000000-0000-0000-0000-0000000000c2', 'Offerte', 'offerte', true, 0, 'EUR'),
  ('00000000-0000-0000-0000-0000000000c3', 'Brouillon', 'brouillon', false, 4900, 'EUR');
INSERT INTO public.lms_modules (id, course_id, title) VALUES
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'Module');
INSERT INTO public.lms_lessons (id, module_id, title, content) VALUES
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1', 'Leçon', 'Secret');

-- Les fonctions de paiement sont réservées au serveur (clé de service), jamais au navigateur.
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', 'membre@test.fr');
SELECT pg_temp.expect_error($$SELECT public.payment_start_course('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000c1', true)$$, 'membre démarre un paiement lui-même');
SELECT pg_temp.expect_error($$SELECT public.payment_mark_paid('cs_x', 'pi_x', 4900, 'eur')$$, 'membre valide un paiement');
SELECT pg_temp.expect_error($$INSERT INTO public.payments (user_id, course_id, product_label, amount_cents, currency, waiver_accepted_at) VALUES ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000c1', 'x', 1, 'EUR', now())$$, 'membre écrit un paiement');
-- Le membre inscrit mais non réglé ne lit pas le contenu.
INSERT INTO public.lms_enrollments (user_id, course_id) VALUES ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000c1');
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.lms_lesson_content('00000000-0000-0000-0000-0000000000f1')) THEN
    RAISE EXCEPTION 'contenu lisible sans paiement'; END IF;
END $$;
RESET ROLE;

-- Contrôles du serveur : renonciation obligatoire, formation publiée et payante.
SELECT pg_temp.expect_error($$SELECT public.payment_start_course('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000c1', false)$$, 'sans renonciation');
SELECT pg_temp.expect_error($$SELECT public.payment_start_course('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000c2', true)$$, 'formation gratuite');
SELECT pg_temp.expect_error($$SELECT public.payment_start_course('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000c3', true)$$, 'formation non publiée');

-- Montant et devise lus en base, jamais envoyés par le navigateur.
CREATE TEMP TABLE p AS
  SELECT * FROM public.payment_start_course('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000c1', true);
DO $$ BEGIN
  IF (SELECT amount_cents FROM p) <> 4900 OR (SELECT currency FROM p) <> 'eur' THEN RAISE EXCEPTION 'montant faux'; END IF;
  IF (SELECT status FROM public.payments WHERE id = (SELECT id FROM p)) <> 'pending' THEN RAISE EXCEPTION 'statut initial'; END IF;
  IF (SELECT waiver_accepted_at FROM public.payments WHERE id = (SELECT id FROM p)) IS NULL THEN RAISE EXCEPTION 'renonciation non datée'; END IF;
END $$;
SELECT public.payment_attach_session((SELECT id FROM p), 'cs_test_1');

-- Montant différent de celui attendu : refusé.
DO $$ BEGIN
  IF public.payment_mark_paid('cs_test_1', 'pi_1', 100, 'eur') THEN RAISE EXCEPTION 'montant différent accepté'; END IF;
  IF (SELECT status FROM public.payments WHERE stripe_session_id = 'cs_test_1') <> 'pending' THEN RAISE EXCEPTION 'statut modifié à tort'; END IF;
END $$;
-- Paiement confirmé : inscription réglée, contenu ouvert. Deuxième appel (Stripe renvoie) : sans effet.
DO $$ BEGIN
  IF NOT public.payment_mark_paid('cs_test_1', 'pi_1', 4900, 'eur') THEN RAISE EXCEPTION 'paiement non enregistré'; END IF;
  IF public.payment_mark_paid('cs_test_1', 'pi_1', 4900, 'eur') THEN RAISE EXCEPTION 'paiement appliqué deux fois'; END IF;
  IF (SELECT paid_at FROM public.lms_enrollments WHERE user_id = '00000000-0000-0000-0000-0000000000a2'
      AND course_id = '00000000-0000-0000-0000-0000000000c1') IS NULL THEN RAISE EXCEPTION 'inscription non réglée'; END IF;
END $$;
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', 'membre@test.fr');
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.lms_lesson_content('00000000-0000-0000-0000-0000000000f1')) THEN
    RAISE EXCEPTION 'contenu fermé après paiement'; END IF;
  IF (SELECT count(*) FROM public.payments) <> 1 THEN RAISE EXCEPTION 'le membre ne voit pas son paiement'; END IF;
END $$;
-- Un paiement déjà réglé ne se relance pas.
RESET ROLE;
SELECT pg_temp.expect_error($$SELECT public.payment_start_course('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000c1', true)$$, 'déjà réglée');
-- L'autre membre ne voit pas le paiement ; l'admin le voit.
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a3', 'autre@test.fr');
DO $$ BEGIN
  IF (SELECT count(*) FROM public.payments) <> 0 THEN RAISE EXCEPTION 'paiement visible par un tiers'; END IF;
END $$;
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'manuel.rohaut@gmail.com');
DO $$ BEGIN
  IF (SELECT count(*) FROM public.payments) <> 1 THEN RAISE EXCEPTION 'admin ne voit pas le paiement'; END IF;
END $$;
-- L'admin ne falsifie pas un paiement (les remboursements passent par Stripe).
SELECT pg_temp.expect_error($$UPDATE public.payments SET status = 'refunded'$$, 'admin modifie un paiement');
RESET ROLE;
DO $$ BEGIN
  IF (SELECT status FROM public.payments WHERE stripe_session_id = 'cs_test_1') <> 'paid' THEN RAISE EXCEPTION 'paiement modifié par l''admin'; END IF;
END $$;

-- Remboursement : l'accès se ferme.
DO $$ BEGIN
  IF NOT public.payment_mark_refunded('pi_1') THEN RAISE EXCEPTION 'remboursement non appliqué'; END IF;
  IF (SELECT paid_at FROM public.lms_enrollments WHERE user_id = '00000000-0000-0000-0000-0000000000a2'
      AND course_id = '00000000-0000-0000-0000-0000000000c1') IS NOT NULL THEN RAISE EXCEPTION 'accès ouvert après remboursement'; END IF;
END $$;
-- Session expirée : statut « expired », seulement si encore en attente.
CREATE TEMP TABLE p2 AS
  SELECT * FROM public.payment_start_course('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000c1', true);
SELECT public.payment_attach_session((SELECT id FROM p2), 'cs_test_2');
SELECT public.payment_mark_status('cs_test_2', 'expired');
DO $$ BEGIN
  IF (SELECT status FROM public.payments WHERE stripe_session_id = 'cs_test_2') <> 'expired' THEN RAISE EXCEPTION 'expiration'; END IF;
END $$;
SELECT pg_temp.expect_error($$SELECT public.payment_mark_status('cs_test_2', 'paid')$$, 'statut payé hors webhook');

-- Module éteint : aucun nouveau paiement.
UPDATE public.site_settings SET value = value || '{"payments": false}' WHERE key = 'modules';
SELECT pg_temp.expect_error($$SELECT public.payment_start_course('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000c1', true)$$, 'module éteint');

-- Suppression de compte : le paiement reste (comptabilité), anonymisé.
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', 'membre@test.fr');
SELECT public.delete_my_account();
RESET ROLE;
DO $$ BEGIN
  IF (SELECT user_id FROM public.payments WHERE stripe_session_id = 'cs_test_1') <> '00000000-0000-0000-0000-000000000000' THEN
    RAISE EXCEPTION 'paiement non anonymisé'; END IF;
END $$;

-- 3. Signalements -----------------------------------------------------------------------------
SELECT pg_temp.as_anon();
SELECT pg_temp.expect_error($$INSERT INTO public.reports (reporter_id, content_type, reason) VALUES (NULL, 'article', 'spam')$$, 'visiteur signale');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a3', 'autre@test.fr');
SELECT pg_temp.expect_error($$INSERT INTO public.reports (reporter_id, content_type, reason) VALUES ('00000000-0000-0000-0000-0000000000a1', 'article', 'spam')$$, 'signalement au nom d''un autre');
SELECT pg_temp.expect_error($$INSERT INTO public.reports (reporter_id, content_type, reason) VALUES ('00000000-0000-0000-0000-0000000000a3', 'inconnu', 'spam')$$, 'type inconnu');
SELECT pg_temp.expect_error($$INSERT INTO public.reports (reporter_id, content_type, reason) VALUES ('00000000-0000-0000-0000-0000000000a3', 'article', 'blabla')$$, 'motif inconnu');
SELECT pg_temp.expect_error($$INSERT INTO public.reports (reporter_id, content_type, reason, reported_url) VALUES ('00000000-0000-0000-0000-0000000000a3', 'article', 'spam', 'javascript:alert(1)')$$, 'adresse piégée');
SELECT pg_temp.expect_error($$INSERT INTO public.reports (reporter_id, content_type, reason, status) VALUES ('00000000-0000-0000-0000-0000000000a3', 'article', 'spam', 'classe')$$, 'statut imposé');
INSERT INTO public.reports (reporter_id, content_type, content_id, reason, details, reported_url) VALUES
  ('00000000-0000-0000-0000-0000000000a3', 'sujet', '00000000-0000-0000-0000-0000000000b1', 'harcelement', 'Insultes', '/forum/x');
-- Doublon d'un signalement en attente : refusé.
SELECT pg_temp.expect_error($$INSERT INTO public.reports (reporter_id, content_type, content_id, reason) VALUES ('00000000-0000-0000-0000-0000000000a3', 'sujet', '00000000-0000-0000-0000-0000000000b1', 'spam')$$, 'doublon');
-- Limite anti-abus : 10 par 24 h.
DO $$ BEGIN
  FOR i IN 1..9 LOOP
    INSERT INTO public.reports (reporter_id, content_type, content_id, reason)
    VALUES ('00000000-0000-0000-0000-0000000000a3', 'article', gen_random_uuid(), 'spam');
  END LOOP;
END $$;
SELECT pg_temp.expect_error($$INSERT INTO public.reports (reporter_id, content_type, content_id, reason) VALUES ('00000000-0000-0000-0000-0000000000a3', 'article', gen_random_uuid(), 'spam')$$, 'onzième signalement du jour');
-- Le signaleur voit ses signalements, ne les traite pas.
UPDATE public.reports SET status = 'classe';
DO $$ BEGIN
  IF (SELECT count(*) FROM public.reports) <> 10 THEN RAISE EXCEPTION 'le membre ne voit pas ses signalements'; END IF;
  IF EXISTS (SELECT 1 FROM public.reports WHERE status <> 'en_attente') THEN RAISE EXCEPTION 'le membre traite un signalement'; END IF;
END $$;
-- Un autre membre ne voit rien (le signaleur reste confidentiel).
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'manuel.rohaut@gmail.com');
DO $$ BEGIN
  IF (SELECT count(*) FROM public.reports) <> 10 THEN RAISE EXCEPTION 'admin ne voit pas les signalements'; END IF;
END $$;
-- L'admin traite : date et auteur tenus par la base.
UPDATE public.reports SET status = 'action_prise', admin_note = 'Sujet modéré' WHERE content_type = 'sujet';
DO $$ BEGIN
  IF (SELECT handled_by FROM public.reports WHERE content_type = 'sujet') <> '00000000-0000-0000-0000-0000000000a1'
     OR (SELECT handled_at FROM public.reports WHERE content_type = 'sujet') IS NULL THEN RAISE EXCEPTION 'traitement non signé'; END IF;
END $$;
DELETE FROM public.reports WHERE content_type = 'article';
RESET ROLE;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.reports) <> 1 THEN RAISE EXCEPTION 'suppression admin'; END IF;
END $$;
-- Module éteint : plus de nouveau signalement.
UPDATE public.site_settings SET value = value || '{"reports": false}' WHERE key = 'modules';
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a3', 'autre@test.fr');
SELECT pg_temp.expect_error($$INSERT INTO public.reports (reporter_id, content_type, reason) VALUES ('00000000-0000-0000-0000-0000000000a3', 'membre', 'spam')$$, 'module reports éteint');
RESET ROLE;

-- 4. Purge des messages de contact de plus de 3 ans ------------------------------------------
INSERT INTO public.contact_messages (name, email, subject, message, created_at, handled_at, status) VALUES
  ('Vieux', 'v@test.fr', 'S', 'M', now() - interval '4 years', NULL, 'nouveau'),
  ('Vieux traité', 'v2@test.fr', 'S', 'M', now() - interval '4 years', now() - interval '3 years 1 day', 'traite'),
  ('Répondu récemment', 'r@test.fr', 'S', 'M', now() - interval '4 years', now() - interval '1 year', 'traite'),
  ('Récent', 'n@test.fr', 'S', 'M', now() - interval '2 years', NULL, 'nouveau');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a3', 'autre@test.fr');
SELECT pg_temp.expect_error($$SELECT public.purge_contact_messages()$$, 'membre lance la purge');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'manuel.rohaut@gmail.com');
DO $$ BEGIN
  IF public.purge_contact_messages() <> 2 THEN RAISE EXCEPTION 'purge : nombre supprimé'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
  IF (SELECT string_agg(name, ',' ORDER BY name) FROM public.contact_messages) <> 'Récent,Répondu récemment' THEN
    RAISE EXCEPTION 'purge : mauvais messages supprimés'; END IF;
  -- Appel planifié (sans session) : autorisé.
  IF public.purge_contact_messages() <> 0 THEN RAISE EXCEPTION 'purge rejouée'; END IF;
END $$;

ROLLBACK;
