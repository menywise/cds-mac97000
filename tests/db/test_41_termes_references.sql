-- Socle 1.15.6 : les termes interdits sont aussi cherchés dans les références. Preuves, chacune avec
-- sa contre-épreuve :
--   1. brouillon : un terme interdit dans une référence donne le manque « termes » et bloque la
--      relecture validée ; la référence corrigée, le passage se fait ;
--   2. contenu en ligne : une référence au terme interdit est refusée, une référence propre passe ;
--   3. les noms d'une installation (greffe_termes_nominatifs) sont cherchés dans les références.
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
RESET ROLE;
INSERT INTO public.termes_interdits_publics (terme, categorie) VALUES ('Marquefictive', 'marque');
UPDATE public.site_settings SET value = value || '{"exiger_sources": false, "longueurs_seo": false, "exiger_auteur": false}'
WHERE key = 'editorial';
CREATE OR REPLACE FUNCTION pg_temp.erreur_de(_sql text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE _etat text; _msg text;
BEGIN
  BEGIN
    EXECUTE _sql;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS _etat = RETURNED_SQLSTATE, _msg = MESSAGE_TEXT;
    RETURN _etat || ' ' || _msg;
  END;
  RETURN 'aucune';
END $$;

SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', 'redacteur@test.fr');
INSERT INTO public.contenus_publics (id, slug, titre, corps) VALUES
  ('00000000-0000-0000-0000-0000000000e1', 'article-termes', 'Un article cité', 'Texte cité [1].');
INSERT INTO public.references_contenu (contenu_id, rang, auteurs, titre) VALUES
  ('00000000-0000-0000-0000-0000000000e1', 1, '', 'Notice Marquefictive du dispositif');
SELECT public.changer_statut_contenu('00000000-0000-0000-0000-0000000000e1', 'a_relire');

-- 1. Brouillon : manque « termes », relecture validée refusée.
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
DO $$ DECLARE e text; BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.manques_publication('00000000-0000-0000-0000-0000000000e1') WHERE code = 'termes') THEN
    RAISE EXCEPTION 'manque termes absent : %', (SELECT string_agg(code, ',') FROM public.manques_publication('00000000-0000-0000-0000-0000000000e1')); END IF;
  e := pg_temp.erreur_de($q$SELECT public.changer_statut_contenu('00000000-0000-0000-0000-0000000000e1', 'pret')$q$);
  IF e NOT LIKE '23514 Publication refusée%Marquefictive%' THEN RAISE EXCEPTION 'relecture validée malgré le terme : %', e; END IF;
END $$;

-- 1 bis. Contre-épreuve : référence corrigée, relecture validée puis publication.
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', 'redacteur@test.fr');
UPDATE public.references_contenu SET titre = 'Notice générique du dispositif'
WHERE contenu_id = '00000000-0000-0000-0000-0000000000e1' AND rang = 1;
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
SELECT public.changer_statut_contenu('00000000-0000-0000-0000-0000000000e1', 'pret');
SELECT public.changer_statut_contenu('00000000-0000-0000-0000-0000000000e1', 'publie');

-- 2. En ligne : une référence au terme interdit est refusée et rien n'est écrit.
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', 'redacteur@test.fr');
DO $$ DECLARE e text; BEGIN
  e := pg_temp.erreur_de($q$INSERT INTO public.references_contenu (contenu_id, rang, titre)
         VALUES ('00000000-0000-0000-0000-0000000000e1', 2, 'Catalogue Marquefictive')$q$);
  IF e NOT LIKE '23514 Référence refusée%Marquefictive%' THEN RAISE EXCEPTION 'référence au terme interdit acceptée : %', e; END IF;
  IF EXISTS (SELECT 1 FROM public.references_contenu WHERE contenu_id = '00000000-0000-0000-0000-0000000000e1' AND rang = 2) THEN
    RAISE EXCEPTION 'référence refusée mais écrite'; END IF;
END $$;

-- 2 bis. Contre-épreuve : une référence propre passe.
INSERT INTO public.references_contenu (contenu_id, rang, auteurs, titre) VALUES
  ('00000000-0000-0000-0000-0000000000e1', 2, 'Auteurfictif A', 'Une étude fictive');

-- 3. Noms d'une installation : greffe_termes_nominatifs est cherché dans les références.
RESET ROLE;
CREATE FUNCTION public.greffe_termes_nominatifs(_texte text) RETURNS text[] LANGUAGE sql STABLE AS $$
  SELECT CASE WHEN _texte ILIKE '%Nomfictifgreffe%' THEN ARRAY['Nomfictifgreffe'] ELSE '{}'::text[] END
$$;
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', 'redacteur@test.fr');
DO $$ DECLARE e text; BEGIN
  e := pg_temp.erreur_de($q$INSERT INTO public.references_contenu (contenu_id, rang, auteurs, titre)
         VALUES ('00000000-0000-0000-0000-0000000000e1', 3, 'Nomfictifgreffe B', 'Un retour de terrain')$q$);
  IF e NOT LIKE '23514 Référence refusée%Nomfictifgreffe%' THEN RAISE EXCEPTION 'nom de greffe accepté : %', e; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.socle_versions WHERE version = '1.15.6' AND niveau = 'correctif') THEN
    RAISE EXCEPTION 'version 1.15.6'; END IF;
END $$;
ROLLBACK;
