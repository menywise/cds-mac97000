-- Socle 1.15.0 : appels à l'action (admins, lisibles de tous quand actifs), brief, réglage.
\set ON_ERROR_STOP 1
\i tests/db/_helpers.sql
BEGIN;
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr'),
  ('00000000-0000-0000-0000-0000000000a2', 'redacteur@test.fr');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
SELECT public.bootstrap_current_user('Administrateur');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', 'redacteur@test.fr');
SELECT public.bootstrap_current_user('Rédacteur');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
SELECT public.admin_set_editor('00000000-0000-0000-0000-0000000000a2', true);
INSERT INTO public.appels_action (id, nom, titre, bouton, lien, actif) VALUES
  ('00000000-0000-0000-0000-0000000000e1', 'Démo', 'Voir l''outil en action', 'Demander une démonstration', '/contact', true),
  ('00000000-0000-0000-0000-0000000000e2', 'Ancien', 'Ancien encart', 'Ancien bouton', '/ancien', false);
SELECT pg_temp.expect_error($$INSERT INTO public.appels_action (nom, titre, bouton, lien) VALUES ('Piège', 'Lien dangereux', 'Cliquer', 'javascript:alert(1)')$$, 'lien non sûr');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', 'redacteur@test.fr');
SELECT pg_temp.expect_error($$INSERT INTO public.appels_action (nom, titre, bouton, lien) VALUES ('Rédacteur', 'Encart', 'Bouton', '/x')$$, 'rédacteur crée un encart');
DO $$ BEGIN
  IF (SELECT count(*) FROM public.appels_action) <> 2 THEN RAISE EXCEPTION 'rédacteur voit aussi les inactifs'; END IF;
END $$;
INSERT INTO public.contenus_publics (slug, titre, intention, appel_action_id)
  VALUES ('brief', 'Article avec brief', 'comparer', '00000000-0000-0000-0000-0000000000e1');
SELECT pg_temp.expect_error($$INSERT INTO public.contenus_publics (slug, titre, intention) VALUES ('x', 'Intention inconnue', 'vendre')$$, 'intention inconnue');
SELECT pg_temp.as_anon();
DO $$ BEGIN
  IF (SELECT array_agg(nom) FROM public.appels_action) <> ARRAY['Démo'] THEN RAISE EXCEPTION 'visiteur : encarts actifs seulement'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
  IF public.editorial_reglages() ->> 'appel_action_defaut' <> '' THEN RAISE EXCEPTION 'réglage par défaut'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.socle_versions WHERE version = '1.15.0') THEN RAISE EXCEPTION 'version 1.15.0'; END IF;
END $$;
ROLLBACK;
