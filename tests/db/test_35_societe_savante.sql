-- Socle 1.14.0 : bibliographie, appels [n], liens d'intérêts, niveau de preuve, compte rendu,
-- relecteurs ; droits sur les références.
\set ON_ERROR_STOP 1
\i tests/db/_helpers.sql
BEGIN;
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr'),
  ('00000000-0000-0000-0000-0000000000a3', 'membre@test.fr');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
SELECT public.bootstrap_current_user('Administrateur');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a3', 'membre@test.fr');
SELECT public.bootstrap_current_user('Membre');
RESET ROLE;
UPDATE public.site_settings SET value = value || '{"circuit": "simple", "exiger_sources": false, "longueurs_seo": false, "exiger_auteur": false, "exiger_liens_interets": true}'
WHERE key = 'editorial';
INSERT INTO public.contenus_publics (id, slug, titre, corps, genre) VALUES
  ('00000000-0000-0000-0000-0000000000b1', 'etude', 'Une étude', 'Selon [1] et [2], voir aussi [lien](/blog/etude).', 'compte_rendu'),
  ('00000000-0000-0000-0000-0000000000b2', 'brouillon', 'Brouillon', 'Texte [1].', 'article');

-- 1. Contraintes des champs et des références -------------------------------------------------------
SELECT pg_temp.expect_error($$UPDATE public.contenus_publics SET genre = 'roman' WHERE id = '00000000-0000-0000-0000-0000000000b1'$$, 'genre inconnu');
SELECT pg_temp.expect_error($$UPDATE public.contenus_publics SET relecteurs = '{a,b,c,d,e,f}' WHERE id = '00000000-0000-0000-0000-0000000000b1'$$, 'six relecteurs');
SELECT pg_temp.expect_error($$INSERT INTO public.references_contenu (contenu_id, rang, titre, doi) VALUES ('00000000-0000-0000-0000-0000000000b1', 1, 'Titre', 'doi:10.1/x')$$, 'DOI mal formé');
SELECT pg_temp.expect_error($$INSERT INTO public.references_contenu (contenu_id, rang, titre, url) VALUES ('00000000-0000-0000-0000-0000000000b1', 1, 'Titre', 'http://a.fr')$$, 'adresse http');

-- 2. Manques ----------------------------------------------------------------------------------------
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
DO $$ BEGIN
  IF (SELECT array_agg(code ORDER BY code) FROM public.manques_publication('00000000-0000-0000-0000-0000000000b1'))
     <> ARRAY['evenement', 'liens_interets', 'references', 'relecture'] THEN
    RAISE EXCEPTION 'manques : %', (SELECT array_agg(code ORDER BY code) FROM public.manques_publication('00000000-0000-0000-0000-0000000000b1')); END IF;
  IF (SELECT message FROM public.manques_publication('00000000-0000-0000-0000-0000000000b1') WHERE code = 'references') <> 'Appels sans référence : [1], [2].' THEN
    RAISE EXCEPTION 'appels manquants'; END IF;
END $$;
INSERT INTO public.references_contenu (contenu_id, rang, auteurs, titre, revue, annee, doi, pmid) VALUES
  ('00000000-0000-0000-0000-0000000000b1', 1, 'Dupont A, Martin B', 'Un essai', 'Revue exemple', 2024, '10.1234/abcd.5678', '12345678'),
  ('00000000-0000-0000-0000-0000000000b1', 2, '', 'Un guide', '', NULL, '', '');
UPDATE public.contenus_publics SET liens_interets = 'Aucun', evenement = 'Congrès exemple', evenement_le = '2026-10-15',
  niveau_preuve = 'Classement inventé' WHERE id = '00000000-0000-0000-0000-0000000000b1';
DO $$ BEGIN
  IF (SELECT array_agg(code ORDER BY code) FROM public.manques_publication('00000000-0000-0000-0000-0000000000b1'))
     <> ARRAY['niveau_preuve', 'relecture'] THEN RAISE EXCEPTION 'niveau de preuve hors liste'; END IF;
END $$;
UPDATE public.contenus_publics SET niveau_preuve = 'Étude publiée', relecteurs = '{Rédactrice en chef,Comité scientifique}'
WHERE id = '00000000-0000-0000-0000-0000000000b1';
SELECT public.changer_statut_contenu('00000000-0000-0000-0000-0000000000b1', 'publie');

-- 3. Références : lisibles avec leur contenu, écrites par les rédacteurs ----------------------------
INSERT INTO public.references_contenu (contenu_id, rang, titre) VALUES ('00000000-0000-0000-0000-0000000000b2', 1, 'Référence d''un brouillon');
SELECT pg_temp.as_anon();
DO $$ BEGIN
  IF (SELECT count(*) FROM public.references_contenu) <> 2 THEN RAISE EXCEPTION 'visiteur : références des contenus en ligne seulement'; END IF;
END $$;
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a3', 'membre@test.fr');
SELECT pg_temp.expect_error($$INSERT INTO public.references_contenu (contenu_id, rang, titre) VALUES ('00000000-0000-0000-0000-0000000000b1', 3, 'Ajout d''un membre')$$, 'membre ajoute une référence');

-- 4. Version ----------------------------------------------------------------------------------------
RESET ROLE;
DO $$ BEGIN
  IF public.editorial_reglages() ->> 'format_citation' <> 'vancouver' THEN RAISE EXCEPTION 'format par défaut'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.socle_versions WHERE version = '1.14.0') THEN RAISE EXCEPTION 'version 1.14.0'; END IF;
END $$;
ROLLBACK;
