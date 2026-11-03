-- Socle 1.13.0 : recherche avancée dans les articles. Opérateurs, synonymes, filtres, facettes,
-- extrait surligné, pondération, suggestion, recherches sans résultat, règles d'accès.
\set ON_ERROR_STOP 1
\i tests/db/_helpers.sql
BEGIN;
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr'),
  ('00000000-0000-0000-0000-0000000000a2', 'redacteur@test.fr'),
  ('00000000-0000-0000-0000-0000000000a3', 'membre@test.fr');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
SELECT public.bootstrap_current_user('Administrateur');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', 'redacteur@test.fr');
SELECT public.bootstrap_current_user('Rédacteur');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a3', 'membre@test.fr');
SELECT public.bootstrap_current_user('Membre');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
SELECT public.admin_set_editor('00000000-0000-0000-0000-0000000000a2', true);
RESET ROLE;
INSERT INTO public.rubriques (id, slug, libelle) VALUES
  ('00000000-0000-0000-0000-0000000000d1', 'materiel', 'Matériel'),
  ('00000000-0000-0000-0000-0000000000d2', 'instruments', 'Instruments');
UPDATE public.rubriques SET parent_id = '00000000-0000-0000-0000-0000000000d1' WHERE id = '00000000-0000-0000-0000-0000000000d2';
INSERT INTO public.series (id, slug, titre) VALUES ('00000000-0000-0000-0000-0000000000c1', 'bases', 'Les bases');
INSERT INTO public.contenus_publics (id, slug, titre, chapo, corps, publie, publie_le, etiquettes, rubrique_id, serie_id, est_pilier) VALUES
  ('00000000-0000-0000-0000-0000000000b1', 'pince', 'Choisir sa pince hémostatique', 'Le bon instrument.',
   'La pince hémostatique serre un vaisseau. Le maillage interne aide aussi.', true, '2025-06-01', '{Instruments}', '00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c1', true),
  ('00000000-0000-0000-0000-0000000000b2', 'ecarteur', 'Les écarteurs', 'Ouvrir le champ.',
   'Un écarteur maintient les tissus ; ce texte parle de lien interne entre articles.', true, '2026-06-01', '{Instruments}', '00000000-0000-0000-0000-0000000000d1', NULL, false),
  ('00000000-0000-0000-0000-0000000000b3', 'brouillon', 'Pince en brouillon', '', 'Pince inédite.', false, NULL, '{}', NULL, NULL, false);
INSERT INTO public.synonymes (terme, variantes) VALUES ('kocher', '{pince hémostatique}');

-- 1. Synonymes, début de mot, visiteur limité aux articles en ligne ---------------------------------
SELECT pg_temp.as_anon();
DO $$ BEGIN
  IF (SELECT array_agg(slug ORDER BY slug) FROM public.recherche_articles('kocher')) <> ARRAY['pince'] THEN
    RAISE EXCEPTION 'synonyme : %', (SELECT array_agg(slug) FROM public.recherche_articles('kocher')); END IF;
  IF (SELECT array_agg(slug ORDER BY slug) FROM public.recherche_articles('écart')) <> ARRAY['ecarteur'] THEN
    RAISE EXCEPTION 'début de mot'; END IF;
  IF EXISTS (SELECT 1 FROM public.recherche_articles('pince') WHERE slug = 'brouillon') THEN
    RAISE EXCEPTION 'brouillon trouvé par un visiteur'; END IF;
END $$;

-- 2. Opérateurs : phrase, exclusion, alternative ----------------------------------------------------
DO $$ BEGIN
  IF (SELECT array_agg(slug ORDER BY slug) FROM public.recherche_articles('"lien interne"')) <> ARRAY['ecarteur'] THEN
    RAISE EXCEPTION 'phrase exacte'; END IF;
  IF (SELECT array_agg(slug ORDER BY slug) FROM public.recherche_articles('instruments -pince')) <> ARRAY['ecarteur'] THEN
    RAISE EXCEPTION 'exclusion'; END IF;
  IF (SELECT count(*) FROM public.recherche_articles('vaisseau ou tissus')) <> 2 THEN
    RAISE EXCEPTION 'alternative'; END IF;
  IF (SELECT count(*) FROM public.recherche_articles('-pince')) <> 0 THEN RAISE EXCEPTION 'exclusion seule'; END IF;
END $$;

-- 3. Pondération, extrait surligné, total et pagination --------------------------------------------
DO $$ BEGIN
  IF (SELECT slug FROM public.recherche_articles('instruments') LIMIT 1) <> 'pince' THEN RAISE EXCEPTION 'pilier en tête'; END IF;
  IF (SELECT extrait FROM public.recherche_articles('vaisseau')) NOT LIKE '%⟦vaisseau⟧%' THEN RAISE EXCEPTION 'extrait surligné'; END IF;
  IF (SELECT total FROM public.recherche_articles('instruments', NULL, NULL, NULL, NULL, 1, 1)) <> 2 THEN RAISE EXCEPTION 'total'; END IF;
  IF (SELECT count(*) FROM public.recherche_articles('instruments', NULL, NULL, NULL, NULL, 1, 1)) <> 1 THEN RAISE EXCEPTION 'page'; END IF;
END $$;

-- 4. Filtres et facettes ----------------------------------------------------------------------------
DO $$ BEGIN
  IF (SELECT count(*) FROM public.recherche_articles('instruments', 'materiel')) <> 2 THEN RAISE EXCEPTION 'rubrique et sous-rubrique'; END IF;
  IF (SELECT count(*) FROM public.recherche_articles('instruments', 'instruments')) <> 1 THEN RAISE EXCEPTION 'sous-rubrique seule'; END IF;
  IF (SELECT count(*) FROM public.recherche_articles('instruments', NULL, 'instruments')) <> 2 THEN RAISE EXCEPTION 'étiquette'; END IF;
  IF (SELECT count(*) FROM public.recherche_articles('instruments', NULL, NULL, 'bases')) <> 1 THEN RAISE EXCEPTION 'série'; END IF;
  IF (SELECT count(*) FROM public.recherche_articles('instruments', NULL, NULL, NULL, '2026-01-01')) <> 1 THEN RAISE EXCEPTION 'période'; END IF;
  IF (SELECT string_agg(facette || ':' || cle || '=' || nombre, ' ' ORDER BY facette, cle) FROM public.recherche_articles_facettes('instruments'))
     <> 'annee:2025=1 annee:2026=1 etiquette:instruments=2 rubrique:materiel=2 serie:bases=1' THEN
    RAISE EXCEPTION 'facettes : %', (SELECT string_agg(facette || ':' || cle || '=' || nombre, ' ' ORDER BY facette, cle) FROM public.recherche_articles_facettes('instruments')); END IF;
END $$;

-- 5. Vouliez-vous dire, recherches sans résultat ----------------------------------------------------
DO $$ BEGIN
  IF public.suggestion_recherche('ecartuers') IS DISTINCT FROM 'écarteurs' THEN
    RAISE EXCEPTION 'suggestion : %', public.suggestion_recherche('ecartuers'); END IF;
  IF public.suggestion_recherche('pince') IS NOT NULL THEN RAISE EXCEPTION 'mot connu : pas de suggestion'; END IF;
  -- Socle 1.15.1 : une lettre fausse dans un mot de cinq lettres (similarité 0,33) trouve sa suggestion.
  IF public.suggestion_recherche('pinse') IS DISTINCT FROM 'pince' THEN
    RAISE EXCEPTION 'suggestion mot court : %', public.suggestion_recherche('pinse'); END IF;
  PERFORM public.recherche_articles('Sutures   résorbables !');
  PERFORM public.recherche_articles('sutures résorbables');
  PERFORM public.recherche_articles('sutures', 'materiel');
END $$;
SELECT pg_temp.expect_error($$SELECT count(*) FROM public.recherches_sans_resultat$$, 'visiteur lit le journal');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a3', 'membre@test.fr');
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.recherches_sans_resultat) THEN RAISE EXCEPTION 'membre lit le journal'; END IF;
END $$;
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', 'redacteur@test.fr');
DO $$ BEGIN
  IF (SELECT string_agg(terme || '=' || nombre, ';') FROM public.recherches_sans_resultat) <> 'sutures résorbables=2' THEN
    RAISE EXCEPTION 'journal : %', (SELECT string_agg(terme || '=' || nombre, ';') FROM public.recherches_sans_resultat); END IF;
END $$;
DELETE FROM public.recherches_sans_resultat WHERE terme = 'sutures résorbables';
INSERT INTO public.synonymes (terme, variantes) VALUES ('fil', '{suture}');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a3', 'membre@test.fr');
SELECT pg_temp.expect_error($$INSERT INTO public.synonymes (terme, variantes) VALUES ('x2', '{y2}')$$, 'membre ajoute un synonyme');

-- 6. Version ----------------------------------------------------------------------------------------
RESET ROLE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.recherches_sans_resultat) THEN RAISE EXCEPTION 'le rédacteur efface le journal'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.socle_versions WHERE version = '1.13.0') THEN RAISE EXCEPTION 'version 1.13.0'; END IF;
END $$;
ROLLBACK;
