\set ON_ERROR_STOP 1
\i tests/db/_helpers.sql
BEGIN;
-- Socle 1.6.0 : référentiel des activités (eqNAF). Registre complet installé par la migration,
-- lecture publique des activités actives, écriture réservée à l'administrateur.
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000026a1', 'admin26@test.fr'),
  ('00000000-0000-0000-0000-0000000026a2', 'membre26@test.fr');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000026a1', 'admin26@test.fr');
SELECT public.bootstrap_current_user('Administrateur');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000026a2', 'membre26@test.fr');
SELECT public.bootstrap_current_user('Membre');
RESET ROLE;
DO $$ BEGIN
  IF NOT public.has_role('00000000-0000-0000-0000-0000000026a1', 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES ('00000000-0000-0000-0000-0000000026a1', 'admin');
  END IF;
END $$;

-- 1. Registre installé par la migration --------------------------------------------------------
DO $$ BEGIN
  IF (SELECT count(*) FROM public.activites) <> 164 THEN RAISE EXCEPTION 'registre : % entrées', (SELECT count(*) FROM public.activites); END IF;
  IF (SELECT count(*) FROM public.activites WHERE type = 'professionnel' AND cadran = 'S') <> 120 THEN RAISE EXCEPTION 'cadran S'; END IF;
  IF (SELECT count(*) FROM public.activites WHERE type = 'non_professionnel' AND cadran = 'E') <> 44 THEN RAISE EXCEPTION 'cadran E'; END IF;
  IF (SELECT count(DISTINCT categorie) FROM public.activites) <> 29 THEN RAISE EXCEPTION 'catégories'; END IF;
  IF (SELECT libelle FROM public.activites WHERE code = '96.04Z') NOT LIKE 'Entretien corporel%' THEN RAISE EXCEPTION 'code NAF'; END IF;
END $$;
UPDATE public.activites SET statut = 'inactif' WHERE code = 'NP-SPI';

-- 2. Visiteur et membre : lecture des activités actives, aucune écriture -----------------------
SELECT pg_temp.as_anon();
DO $$ BEGIN
  IF (SELECT count(*) FROM public.activites) <> 163 THEN RAISE EXCEPTION 'visiteur : activité inactive visible'; END IF;
END $$;
SELECT pg_temp.expect_error($$INSERT INTO public.activites (code, libelle, type, categorie) VALUES ('X', 'X', 'professionnel', 'X')$$,
  'visiteur écrit une activité');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000026a2', 'membre26@test.fr');
DO $$ BEGIN
  UPDATE public.activites SET libelle = 'Piraté' WHERE code = '96.04Z';
  IF EXISTS (SELECT 1 FROM public.activites WHERE libelle = 'Piraté') THEN RAISE EXCEPTION 'membre a modifié une activité'; END IF;
END $$;
SELECT pg_temp.expect_error($$INSERT INTO public.activites (code, libelle, type, categorie) VALUES ('X', 'X', 'professionnel', 'X')$$,
  'membre écrit une activité');

-- 3. Administrateur : ajoute une activité rencontrée sur le terrain ----------------------------
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000026a1', 'admin26@test.fr');
INSERT INTO public.activites (code, libelle, type, categorie, cadran) VALUES
  ('NP-TST', 'Activité de test', 'non_professionnel', 'Passion & Collection', 'E');
SELECT pg_temp.expect_error($$INSERT INTO public.activites (code, libelle, type, categorie) VALUES ('Y', 'Y', 'autre', 'Y')$$,
  'type inconnu');
DO $$ BEGIN
  IF (SELECT count(*) FROM public.activites) <> 165 THEN RAISE EXCEPTION 'admin voit tout (inactives comprises)'; END IF;
END $$;

-- 4. Rejouable ---------------------------------------------------------------------------------
RESET ROLE;
\i supabase/migrations/20261007220000_v1_6_0_activites.sql
DO $$ BEGIN
  IF (SELECT count(*) FROM public.activites) <> 165 THEN RAISE EXCEPTION 'rejeu : doublons ou pertes'; END IF;
  IF (SELECT statut FROM public.activites WHERE code = 'NP-SPI') <> 'actif' THEN RAISE EXCEPTION 'rejeu : le registre fait foi'; END IF;
  IF (SELECT value ->> 'version' FROM public.site_settings WHERE key = 'socle') <> '1.8.0' THEN RAISE EXCEPTION 'version'; END IF;
END $$;
ROLLBACK;
