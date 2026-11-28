\set ON_ERROR_STOP 1
\i tests/db/_helpers.sql
BEGIN;
-- Socle 1.19.0 : capture d'écran jointe à un signalement (dossier privé signalements-captures),
-- motif « affichage ». Dépôt par l'auteur seul, dans les 15 minutes, une capture par signalement ;
-- lecture et effacement réservés aux administrateurs ; liste des captures à effacer.
-- a1 : administrateur · b1, b2 : membres
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr'),
  ('00000000-0000-0000-0000-0000000000b1', 'un@test.fr'),
  ('00000000-0000-0000-0000-0000000000b2', 'deux@test.fr');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
SELECT public.bootstrap_current_user('Administrateur');
RESET ROLE;
DELETE FROM public.reports;
UPDATE public.site_settings SET value = value || '{"reports": true}' WHERE key = 'modules';
CREATE TEMP TABLE codes (nom text, code text);
GRANT ALL ON codes TO anon, authenticated;

-- 1. Dossier privé, bornes de taille et de type ---------------------------------------------------
DO $$ DECLARE _b storage.buckets; BEGIN
  SELECT * INTO _b FROM storage.buckets WHERE id = 'signalements-captures';
  IF _b.id IS NULL OR _b.public THEN RAISE EXCEPTION 'dossier privé absent'; END IF;
  IF _b.file_size_limit <> 2097152 THEN RAISE EXCEPTION 'taille maximale'; END IF;
  IF _b.allowed_mime_types <> ARRAY['image/png', 'image/jpeg', 'image/webp'] THEN RAISE EXCEPTION 'types admis'; END IF;
END $$;

-- 2. Nouveau motif « affichage » ------------------------------------------------------------------
SELECT pg_temp.as_anon();
INSERT INTO codes SELECT 'visiteur', public.report_submit('page', 'affichage', 'Le menu recouvre le titre', NULL, NULL, '/tarifs');
RESET ROLE;
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000b1', 'un@test.fr');
INSERT INTO codes SELECT 'membre', public.report_submit('page', 'affichage', 'Bouton illisible', NULL, NULL, '/forum');
RESET ROLE;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.reports WHERE reason = 'affichage') <> 2 THEN RAISE EXCEPTION 'motif affichage refusé'; END IF;
END $$;

-- 3. Dépôt : l'auteur seul, au bon nom, une fois -----------------------------------------------------
SELECT pg_temp.as_anon();
SELECT pg_temp.expect_error(format($$INSERT INTO storage.objects (bucket_id, name) VALUES ('signalements-captures', %L)$$,
  (SELECT code FROM codes WHERE nom = 'membre') || '/capture'), 'visiteur dépose sur le signalement d''un membre');
SELECT pg_temp.expect_error(format($$INSERT INTO storage.objects (bucket_id, name) VALUES ('signalements-captures', %L)$$,
  (SELECT code FROM codes WHERE nom = 'visiteur') || '/autre.png'), 'nom de fichier libre');
SELECT pg_temp.expect_error($$INSERT INTO storage.objects (bucket_id, name) VALUES ('signalements-captures', 'ABCDEF0123/capture')$$, 'code inconnu');
SELECT pg_temp.expect_error($$INSERT INTO storage.objects (bucket_id, name) VALUES ('signalements-captures', 'capture')$$, 'sans code');
INSERT INTO storage.objects (bucket_id, name) SELECT 'signalements-captures', code || '/capture' FROM codes WHERE nom = 'visiteur';
SELECT pg_temp.expect_error(format($$INSERT INTO storage.objects (bucket_id, name) VALUES ('signalements-captures', %L)$$,
  (SELECT code FROM codes WHERE nom = 'visiteur') || '/capture'), 'deuxième capture');
DO $$ BEGIN
  IF (SELECT count(*) FROM storage.objects WHERE bucket_id = 'signalements-captures') <> 0 THEN RAISE EXCEPTION 'visiteur lit les captures'; END IF;
END $$;
UPDATE storage.objects SET name = 'x' WHERE bucket_id = 'signalements-captures';
DELETE FROM storage.objects WHERE bucket_id = 'signalements-captures';
RESET ROLE;
DO $$ BEGIN
  IF (SELECT count(*) FROM storage.objects WHERE bucket_id = 'signalements-captures') <> 1 THEN RAISE EXCEPTION 'capture du visiteur modifiée ou absente'; END IF;
END $$;
-- Un autre membre ne dépose pas sur le signalement de b1 ; b1 le peut.
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000b2', 'deux@test.fr');
SELECT pg_temp.expect_error(format($$INSERT INTO storage.objects (bucket_id, name) VALUES ('signalements-captures', %L)$$,
  (SELECT code FROM codes WHERE nom = 'membre') || '/capture'), 'autre membre dépose');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000b1', 'un@test.fr');
SELECT pg_temp.expect_error(format($$INSERT INTO storage.objects (bucket_id, name) VALUES ('signalements-captures', %L)$$,
  (SELECT code FROM codes WHERE nom = 'visiteur') || '/capture'), 'membre dépose sur le signalement d''un visiteur');
INSERT INTO storage.objects (bucket_id, name) SELECT 'signalements-captures', code || '/capture' FROM codes WHERE nom = 'membre';
DO $$ BEGIN
  IF (SELECT count(*) FROM storage.objects WHERE bucket_id = 'signalements-captures') <> 0 THEN RAISE EXCEPTION 'membre lit les captures'; END IF;
END $$;
SELECT pg_temp.expect_error($$SELECT public.report_captures_a_effacer()$$, 'membre liste les captures à effacer');
RESET ROLE;

-- 4. Délai de 15 minutes, signalement traité, module éteint --------------------------------------------
SELECT pg_temp.as_anon();
INSERT INTO codes SELECT 'ancien', public.report_submit('page', 'affichage', 'Image déformée', NULL, NULL, '/blog');
INSERT INTO codes SELECT 'traite', public.report_submit('page', 'affichage', 'Texte coupé', NULL, NULL, '/faq');
RESET ROLE;
ALTER TABLE public.reports DISABLE TRIGGER reports_guard;
UPDATE public.reports SET created_at = now() - interval '16 minutes' WHERE tracking_code = (SELECT code FROM codes WHERE nom = 'ancien');
ALTER TABLE public.reports ENABLE TRIGGER reports_guard;
UPDATE public.reports SET status = 'classe' WHERE tracking_code = (SELECT code FROM codes WHERE nom = 'traite');
SELECT pg_temp.as_anon();
SELECT pg_temp.expect_error(format($$INSERT INTO storage.objects (bucket_id, name) VALUES ('signalements-captures', %L)$$,
  (SELECT code FROM codes WHERE nom = 'ancien') || '/capture'), 'capture après 15 minutes');
SELECT pg_temp.expect_error(format($$INSERT INTO storage.objects (bucket_id, name) VALUES ('signalements-captures', %L)$$,
  (SELECT code FROM codes WHERE nom = 'traite') || '/capture'), 'capture d''un signalement traité');
RESET ROLE;
INSERT INTO codes SELECT 'eteint', 'x';
SELECT pg_temp.as_anon();
UPDATE codes SET code = public.report_submit('page', 'affichage', 'Colonne vide', NULL, NULL, '/aide') WHERE nom = 'eteint';
RESET ROLE;
UPDATE public.site_settings SET value = value || '{"reports": false}' WHERE key = 'modules';
SELECT pg_temp.as_anon();
SELECT pg_temp.expect_error(format($$INSERT INTO storage.objects (bucket_id, name) VALUES ('signalements-captures', %L)$$,
  (SELECT code FROM codes WHERE nom = 'eteint') || '/capture'), 'capture module éteint');
RESET ROLE;
UPDATE public.site_settings SET value = value || '{"reports": true}' WHERE key = 'modules';

-- 5. Administrateur : lecture, captures à effacer, effacement -------------------------------------------
INSERT INTO storage.objects (bucket_id, name) VALUES ('signalements-captures', 'FFFFFFFFFF/capture');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
DO $$ BEGIN
  IF (SELECT count(*) FROM storage.objects WHERE bucket_id = 'signalements-captures') <> 3 THEN RAISE EXCEPTION 'admin lit les captures'; END IF;
  IF public.report_captures_a_effacer() <> ARRAY['FFFFFFFFFF/capture'] THEN RAISE EXCEPTION 'capture orpheline à effacer'; END IF;
END $$;
RESET ROLE;
ALTER TABLE public.reports DISABLE TRIGGER reports_guard;
UPDATE public.reports SET status = 'action_prise', handled_at = now() - interval '4 months'
WHERE tracking_code = (SELECT code FROM codes WHERE nom = 'visiteur');
ALTER TABLE public.reports ENABLE TRIGGER reports_guard;
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
DO $$ BEGIN
  IF array_length(public.report_captures_a_effacer(), 1) <> 2 THEN RAISE EXCEPTION 'capture traitée depuis 3 mois à effacer'; END IF;
  IF (SELECT code FROM codes WHERE nom = 'membre') || '/capture' = ANY (public.report_captures_a_effacer()) THEN
    RAISE EXCEPTION 'capture en cours effacée'; END IF;
END $$;
DELETE FROM storage.objects WHERE bucket_id = 'signalements-captures' AND name = 'FFFFFFFFFF/capture';
DO $$ BEGIN
  IF (SELECT count(*) FROM storage.objects WHERE bucket_id = 'signalements-captures') <> 2 THEN RAISE EXCEPTION 'admin efface une capture'; END IF;
END $$;
RESET ROLE;
SELECT pg_temp.as_anon();
SELECT pg_temp.expect_error($$SELECT public.report_captures_a_effacer()$$, 'visiteur liste les captures à effacer');
RESET ROLE;

-- 6. Version ---------------------------------------------------------------------------------------
DO $$ BEGIN
  IF (SELECT value ->> 'version' FROM public.site_settings WHERE key = 'socle') <> '1.23.0' THEN RAISE EXCEPTION 'réglage socle'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.template_checks WHERE code = 'V1-SIGNALEMENTS-CAPTURES') THEN RAISE EXCEPTION 'grille de conformité'; END IF;
END $$;
ROLLBACK;
