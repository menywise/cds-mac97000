\set ON_ERROR_STOP 1
\i tests/db/_helpers.sql
BEGIN;
-- Deux paiements lancés pour la même formation (deux onglets) : le premier est remplacé,
-- sa session Stripe est rendue au serveur pour être expirée. Jamais deux tentatives en attente.
INSERT INTO auth.users (id, email) VALUES ('00000000-0000-0000-0000-0000000000a2', 'membre@test.fr');
UPDATE public.site_settings SET value = value || '{"payments": true, "lms": true}' WHERE key = 'modules';
INSERT INTO public.lms_courses (id, title, slug, published, price_cents) VALUES
  ('00000000-0000-0000-0000-0000000000c1', 'Payante', 'payante', true, 4900),
  ('00000000-0000-0000-0000-0000000000c2', 'Autre', 'autre', true, 900);

CREATE TEMP TABLE p1 AS SELECT * FROM public.payment_start_course('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000c1', true);
SELECT public.payment_attach_session((SELECT id FROM p1), 'cs_onglet_1');
-- Autre formation en attente : jamais touchée.
CREATE TEMP TABLE pa AS SELECT * FROM public.payment_start_course('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000c2', true);
SELECT public.payment_attach_session((SELECT id FROM pa), 'cs_autre');

CREATE TEMP TABLE p2 AS SELECT * FROM public.payment_start_course('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000c1', true);
DO $$ BEGIN
  IF (SELECT superseded_sessions FROM p2) IS DISTINCT FROM ARRAY['cs_onglet_1'] THEN
    RAISE EXCEPTION 'session remplacée non rendue : %', (SELECT superseded_sessions FROM p2); END IF;
  IF (SELECT status FROM public.payments WHERE stripe_session_id = 'cs_onglet_1') <> 'expired' THEN
    RAISE EXCEPTION 'ancienne tentative encore en attente'; END IF;
  IF (SELECT count(*) FROM public.payments WHERE status = 'pending'
      AND course_id = '00000000-0000-0000-0000-0000000000c1') <> 1 THEN RAISE EXCEPTION 'deux tentatives en attente'; END IF;
  IF (SELECT status FROM public.payments WHERE stripe_session_id = 'cs_autre') <> 'pending' THEN
    RAISE EXCEPTION 'autre formation touchée'; END IF;
END $$;
-- Une tentative sans session (Stripe pas encore joint) est aussi remplacée, sans session à expirer.
CREATE TEMP TABLE p3 AS SELECT * FROM public.payment_start_course('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000c1', true);
DO $$ BEGIN
  IF cardinality((SELECT superseded_sessions FROM p3)) <> 0 THEN RAISE EXCEPTION 'session fantôme rendue'; END IF;
  IF (SELECT status FROM public.payments WHERE id = (SELECT id FROM p2)) <> 'expired' THEN RAISE EXCEPTION 'p2 non remplacée'; END IF;
END $$;
-- L'ancienne session payée malgré tout (course contre l'expiration) : le paiement est tout de même enregistré.
DO $$ BEGIN
  IF NOT public.payment_mark_paid('cs_onglet_1', 'pi_1', 4900, 'eur') THEN RAISE EXCEPTION 'paiement tardif perdu'; END IF;
END $$;
-- Formation réglée : plus de nouvelle tentative.
SELECT pg_temp.expect_error($$SELECT public.payment_start_course('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000c1', true)$$, 'déjà réglée');
ROLLBACK;
