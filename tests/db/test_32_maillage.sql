-- Socle 1.11.0 : taxonomie et maillage interne. Rubriques, étiquettes contrôlées, séries, liens
-- internes lus dans le texte, manques « liens » et « pilier », état du maillage, redirections,
-- « À lire ensuite ».
\set ON_ERROR_STOP 1
\i tests/db/_helpers.sql
BEGIN;
-- a1 : admin · a2 : rédacteur
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr'),
  ('00000000-0000-0000-0000-0000000000a2', 'redacteur@test.fr');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
SELECT public.bootstrap_current_user('Administrateur');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', 'redacteur@test.fr');
SELECT public.bootstrap_current_user('Rédacteur');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
SELECT public.admin_set_editor('00000000-0000-0000-0000-0000000000a2', true);
RESET ROLE;
UPDATE public.site_settings SET value = value || '{"circuit": "simple", "exiger_sources": false, "longueurs_seo": false, "exiger_auteur": false}'
WHERE key = 'editorial';

-- 1. Outils -----------------------------------------------------------------------------------------
DO $$ BEGIN
  IF public.slug_depuis('  Référencement & SEO local !') <> 'referencement-seo-local' THEN RAISE EXCEPTION 'slug_depuis'; END IF;
  IF (SELECT string_agg(ancre || '=' || chemin, ';' ORDER BY rang)
      FROM public.extraire_liens('Voir [le guide](/blog/guide/) et [ici](/blog/autre#x), [ext](https://a.fr).'))
     <> 'le guide=/blog/guide;ici=/blog/autre' THEN RAISE EXCEPTION 'extraire_liens'; END IF;
  IF public.slug_article_du_chemin('/blog/rubrique/seo') IS NOT NULL OR public.slug_article_du_chemin('/blog/guide') <> 'guide' THEN
    RAISE EXCEPTION 'slug_article_du_chemin'; END IF;
END $$;

-- 2. Rubriques : admin seul, deux niveaux au plus ---------------------------------------------------
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', 'redacteur@test.fr');
SELECT pg_temp.expect_error($$INSERT INTO public.rubriques (slug, libelle) VALUES ('seo', 'Référencement')$$, 'rédacteur crée une rubrique');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
INSERT INTO public.rubriques (id, slug, libelle, intro) VALUES
  ('00000000-0000-0000-0000-0000000000d1', 'seo', 'Référencement', 'Tout sur le référencement.');
INSERT INTO public.rubriques (id, slug, libelle, parent_id) VALUES
  ('00000000-0000-0000-0000-0000000000d2', 'seo-local', 'Référencement local', '00000000-0000-0000-0000-0000000000d1');
SELECT pg_temp.expect_error($$INSERT INTO public.rubriques (slug, libelle, parent_id) VALUES ('trop', 'Trop profond', '00000000-0000-0000-0000-0000000000d2')$$, 'trois niveaux');
SELECT pg_temp.expect_error($$UPDATE public.rubriques SET parent_id = '00000000-0000-0000-0000-0000000000d2' WHERE id = '00000000-0000-0000-0000-0000000000d1'$$, 'mère devenue fille');

-- 3. Étiquettes contrôlées --------------------------------------------------------------------------
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', 'redacteur@test.fr');
INSERT INTO public.etiquettes (libelle, definition) VALUES ('  Maillage interne ', 'Liens entre les contenus du site.');
DO $$ BEGIN
  IF (SELECT slug FROM public.etiquettes WHERE libelle = 'Maillage interne') <> 'maillage-interne' THEN RAISE EXCEPTION 'adresse d''étiquette'; END IF;
END $$;
SELECT pg_temp.expect_error($$INSERT INTO public.contenus_publics (slug, titre, etiquettes) VALUES ('x', 'Étiquette inconnue', '{Inconnue}')$$, 'étiquette inconnue');
DO $$ BEGIN
  DELETE FROM public.etiquettes WHERE slug = 'maillage-interne';
  IF NOT EXISTS (SELECT 1 FROM public.etiquettes WHERE slug = 'maillage-interne') THEN
    RAISE EXCEPTION 'le rédacteur ne supprime pas une étiquette'; END IF;
END $$;

-- 4. Articles : pilier, satellites, liens -----------------------------------------------------------
-- p : pilier · s1, s2 : satellites · o : article isolé
INSERT INTO public.contenus_publics (id, slug, titre, corps, etiquettes, rubrique_id, est_pilier, requete_visee) VALUES
  ('00000000-0000-0000-0000-0000000000b1', 'guide-du-maillage', 'Guide du maillage', 'Le guide : voir [le maillage des satellites](/blog/satellite-un).',
   '{maillage interne}', '00000000-0000-0000-0000-0000000000d1', true, 'maillage interne');
INSERT INTO public.contenus_publics (id, slug, titre, corps, etiquettes, rubrique_id, pilier_id, requete_visee) VALUES
  ('00000000-0000-0000-0000-0000000000b2', 'satellite-un', 'Satellite un', 'Retour au [guide du maillage](/blog/guide-du-maillage).',
   '{Maillage Interne}', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', 'Maillage interne'),
  ('00000000-0000-0000-0000-0000000000b3', 'satellite-deux', 'Satellite deux', 'Texte sans lien. [ici](/blog/inexistant)',
   '{}', NULL, '00000000-0000-0000-0000-0000000000b1', '');
INSERT INTO public.contenus_publics (id, slug, titre, corps) VALUES
  ('00000000-0000-0000-0000-0000000000b4', 'isole', 'Article isolé', 'Texte.');
DO $$ BEGIN
  IF (SELECT etiquettes FROM public.contenus_publics WHERE id = '00000000-0000-0000-0000-0000000000b2') <> ARRAY['Maillage interne'] THEN
    RAISE EXCEPTION 'étiquette écrite sous son libellé de référence'; END IF;
END $$;

-- 5. Manques : lien vers un contenu hors ligne, lien cassé, pilier absent --------------------------
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
SELECT pg_temp.expect_error($$SELECT public.changer_statut_contenu('00000000-0000-0000-0000-0000000000b1', 'publie')$$, 'lien vers un satellite hors ligne');
SELECT pg_temp.expect_error($$SELECT public.changer_statut_contenu('00000000-0000-0000-0000-0000000000b2', 'publie')$$, 'lien vers un pilier hors ligne');
UPDATE public.contenus_publics SET corps = 'Le guide.' WHERE id = '00000000-0000-0000-0000-0000000000b1';
SELECT public.changer_statut_contenu('00000000-0000-0000-0000-0000000000b1', 'publie');
SELECT public.changer_statut_contenu('00000000-0000-0000-0000-0000000000b2', 'publie');
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.manques_publication('00000000-0000-0000-0000-0000000000b3') WHERE code = 'liens') THEN
    RAISE EXCEPTION 'manque liens attendu'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.manques_publication('00000000-0000-0000-0000-0000000000b3') WHERE code = 'pilier') THEN
    RAISE EXCEPTION 'manque pilier attendu'; END IF;
END $$;
SELECT pg_temp.expect_error($$SELECT public.changer_statut_contenu('00000000-0000-0000-0000-0000000000b3', 'publie')$$, 'satellite sans lien vers le pilier');

-- 6. Redirection au changement d'adresse d'un article publié ----------------------------------------
UPDATE public.contenus_publics SET slug = 'satellite-premier' WHERE id = '00000000-0000-0000-0000-0000000000b2';
UPDATE public.contenus_publics SET slug = 'satellite-1' WHERE id = '00000000-0000-0000-0000-0000000000b2';
DO $$ BEGIN
  IF (SELECT string_agg(de || '>' || vers, ';' ORDER BY de) FROM public.redirections)
     <> '/blog/satellite-premier>/blog/satellite-1;/blog/satellite-un>/blog/satellite-1' THEN
    RAISE EXCEPTION 'redirections sans chaîne : %', (SELECT string_agg(de || '>' || vers, ';' ORDER BY de) FROM public.redirections); END IF;
END $$;
UPDATE public.contenus_publics SET slug = 'satellite-un' WHERE id = '00000000-0000-0000-0000-0000000000b2';
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.redirections WHERE de = '/blog/satellite-un') THEN
    RAISE EXCEPTION 'adresse reprise : plus de redirection'; END IF;
END $$;
UPDATE public.contenus_publics SET slug = 'isole-brouillon' WHERE id = '00000000-0000-0000-0000-0000000000b4';
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.redirections WHERE de = '/blog/isole') THEN
    RAISE EXCEPTION 'brouillon jamais publié : pas de redirection'; END IF;
END $$;

-- 7. Le pilier renvoie vers un satellite, puis état du maillage ------------------------------------
UPDATE public.contenus_publics SET corps = 'Le guide : voir [le maillage des satellites](/blog/satellite-un).' WHERE id = '00000000-0000-0000-0000-0000000000b1';
SELECT public.changer_statut_contenu('00000000-0000-0000-0000-0000000000b1', 'publie');
UPDATE public.contenus_publics SET corps = 'Voir [le guide du maillage](/blog/guide-du-maillage).' WHERE id = '00000000-0000-0000-0000-0000000000b3';
SELECT public.changer_statut_contenu('00000000-0000-0000-0000-0000000000b3', 'publie');
UPDATE public.contenus_publics SET corps = 'Texte. [le premier satellite](/blog/satellite-premier) [ici](/blog/satellite-un)' WHERE id = '00000000-0000-0000-0000-0000000000b4';
SELECT public.changer_statut_contenu('00000000-0000-0000-0000-0000000000b4', 'publie');
DO $$
DECLARE e record;
BEGIN
  SELECT * INTO e FROM public.maillage_etat() WHERE id = '00000000-0000-0000-0000-0000000000b1';
  IF e.entrants <> 2 OR e.orphelin THEN RAISE EXCEPTION 'pilier : 2 liens entrants (%)', e.entrants; END IF;
  IF e.satellites_absents <> ARRAY['Satellite deux'] THEN RAISE EXCEPTION 'satellite absent du pilier : %', e.satellites_absents; END IF;
  IF e.requete_en_double <> ARRAY['Satellite un'] THEN RAISE EXCEPTION 'requête en double : %', e.requete_en_double; END IF;
  SELECT * INTO e FROM public.maillage_etat() WHERE id = '00000000-0000-0000-0000-0000000000b4';
  IF NOT e.orphelin THEN RAISE EXCEPTION 'article isolé orphelin'; END IF;
  IF e.liens_rediriges <> ARRAY['/blog/satellite-premier'] THEN RAISE EXCEPTION 'lien redirigé : %', e.liens_rediriges; END IF;
  IF e.ancres_pauvres <> ARRAY['ici'] THEN RAISE EXCEPTION 'ancre pauvre : %', e.ancres_pauvres; END IF;
  IF e.liens_casses <> '{}' THEN RAISE EXCEPTION 'un lien redirigé n''est pas cassé'; END IF;
END $$;
SELECT pg_temp.as_anon();
SELECT pg_temp.expect_error($$SELECT public.maillage_etat()$$, 'visiteur lit le maillage');

-- 8. À lire ensuite : pilier et frères d'abord, articles en ligne seulement -------------------------
RESET ROLE;
INSERT INTO public.contenus_publics (id, slug, titre, corps, etiquettes) VALUES
  ('00000000-0000-0000-0000-0000000000b5', 'brouillon', 'Brouillon frère', 'Texte.', '{Maillage interne}');
SELECT pg_temp.as_anon();
DO $$ BEGIN
  IF (SELECT array_agg(slug ORDER BY ord) FROM (SELECT slug, row_number() OVER () AS ord
        FROM public.lire_ensuite('00000000-0000-0000-0000-0000000000b2', 2)) x)
     <> ARRAY['guide-du-maillage', 'satellite-deux'] THEN
    RAISE EXCEPTION 'lire ensuite : %', (SELECT array_agg(slug) FROM public.lire_ensuite('00000000-0000-0000-0000-0000000000b2', 2)); END IF;
  IF EXISTS (SELECT 1 FROM public.lire_ensuite('00000000-0000-0000-0000-0000000000b2', 12) WHERE slug = 'brouillon') THEN
    RAISE EXCEPTION 'lire ensuite : brouillon visible'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.redirections) THEN RAISE EXCEPTION 'visiteur lit les redirections'; END IF;
END $$;

-- 9. Séries -----------------------------------------------------------------------------------------
RESET ROLE;
SELECT pg_temp.expect_error($$UPDATE public.contenus_publics SET serie_ordre = 1 WHERE id = '00000000-0000-0000-0000-0000000000b4'$$, 'ordre sans série');
INSERT INTO public.series (id, slug, titre) VALUES ('00000000-0000-0000-0000-0000000000c1', 'debuter', 'Débuter son site');
UPDATE public.contenus_publics SET serie_id = '00000000-0000-0000-0000-0000000000c1', serie_ordre = 1 WHERE id = '00000000-0000-0000-0000-0000000000b4';

-- 10. Version ---------------------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.socle_versions WHERE version = '1.11.0') THEN RAISE EXCEPTION 'version 1.11.0'; END IF;
  IF (public.editorial_reglages() ->> 'seuil_etiquette')::int <> 3 THEN RAISE EXCEPTION 'seuil d''étiquette par défaut'; END IF;
END $$;
ROLLBACK;
