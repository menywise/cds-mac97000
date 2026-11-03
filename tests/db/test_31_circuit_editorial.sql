-- Socle 1.10.0 : circuit de rédaction. Rôle rédacteur, passages imposés par la base, manques,
-- relecture, programmation, passages automatiques, journal, versions, termes interdits, réglages.
\set ON_ERROR_STOP 1
\i tests/db/_helpers.sql
BEGIN;
-- a1 : admin · a2 : rédacteur · a3 : membre
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

-- 1. Rôle rédacteur : donné par un admin seulement --------------------------------------------------
SELECT pg_temp.expect_error($$SELECT public.admin_set_editor('00000000-0000-0000-0000-0000000000a2', true)$$, 'membre nomme un rédacteur');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
SELECT public.admin_set_editor('00000000-0000-0000-0000-0000000000a2', true);
SELECT public.admin_set_editor('00000000-0000-0000-0000-0000000000a2', true);
RESET ROLE;
DO $$ BEGIN
  IF to_regclass('public.blog_posts') IS NOT NULL THEN RAISE EXCEPTION 'vue blog_posts retirée en 1.10.0'; END IF;
  IF NOT public.can_write_content('00000000-0000-0000-0000-0000000000a2') THEN RAISE EXCEPTION 'rédacteur'; END IF;
  IF public.can_write_content('00000000-0000-0000-0000-0000000000a3') THEN RAISE EXCEPTION 'membre rédacteur'; END IF;
  IF (SELECT value ->> 'circuit' FROM public.site_settings WHERE key = 'editorial') <> 'complet' THEN
    RAISE EXCEPTION 'réglage editorial par défaut'; END IF;
END $$;

-- 2. Le rédacteur écrit, ne publie pas --------------------------------------------------------------
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', 'redacteur@test.fr');
SELECT pg_temp.expect_error($$INSERT INTO public.contenus_publics (slug, titre, publie) VALUES ('direct', 'Publication directe', true)$$, 'création publiée');
SELECT pg_temp.expect_error($$INSERT INTO public.contenus_publics (slug, titre, statut) VALUES ('direct', 'Publication directe', 'pret')$$, 'création prête');
INSERT INTO public.contenus_publics (id, slug, titre, description, chapo, corps, sources, auteur_fonction) VALUES
  ('00000000-0000-0000-0000-0000000000b1', 'guide-du-maillage', 'Le maillage interne sans effort',
   'Relier ses contenus entre eux aide le lecteur et les moteurs de recherche à comprendre ce qui compte.',
   'Chapô', 'Texte de l''article.', 'Guide officiel — https://exemple.fr/guide', 'Rédactrice spécialisée');
DO $$ BEGIN
  IF (SELECT statut FROM public.contenus_publics WHERE id = '00000000-0000-0000-0000-0000000000b1') <> 'redaction' THEN
    RAISE EXCEPTION 'statut de départ'; END IF;
END $$;
SELECT public.changer_statut_contenu('00000000-0000-0000-0000-0000000000b1', 'idee');
SELECT public.changer_statut_contenu('00000000-0000-0000-0000-0000000000b1', 'redaction');
SELECT public.changer_statut_contenu('00000000-0000-0000-0000-0000000000b1', 'a_relire');
SELECT pg_temp.expect_error($$SELECT public.changer_statut_contenu('00000000-0000-0000-0000-0000000000b1', 'pret')$$, 'rédacteur valide la relecture');
SELECT pg_temp.expect_error($$UPDATE public.contenus_publics SET publie = true WHERE id = '00000000-0000-0000-0000-0000000000b1'$$, 'rédacteur publie');
SELECT pg_temp.expect_error($$UPDATE public.contenus_publics SET relu_le = current_date WHERE id = '00000000-0000-0000-0000-0000000000b1'$$, 'rédacteur pose la relecture');
SELECT pg_temp.expect_error($$SELECT public.changer_statut_contenu('00000000-0000-0000-0000-0000000000b1', 'redaction')$$, 'retour sans motif');
SELECT public.changer_statut_contenu('00000000-0000-0000-0000-0000000000b1', 'redaction', 'Exemple à préciser');
SELECT public.changer_statut_contenu('00000000-0000-0000-0000-0000000000b1', 'a_relire');
DO $$ BEGIN
  DELETE FROM public.contenus_publics WHERE id = '00000000-0000-0000-0000-0000000000b1';
  IF NOT EXISTS (SELECT 1 FROM public.contenus_publics WHERE id = '00000000-0000-0000-0000-0000000000b1') THEN
    RAISE EXCEPTION 'le rédacteur ne supprime pas'; END IF;
END $$;

-- 3. Le membre ne voit ni brouillon ni journal ------------------------------------------------------
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a3', 'membre@test.fr');
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.contenus_publics WHERE id = '00000000-0000-0000-0000-0000000000b1') THEN
    RAISE EXCEPTION 'membre lit un brouillon'; END IF;
  IF EXISTS (SELECT 1 FROM public.contenus_publics_journal) THEN RAISE EXCEPTION 'membre lit le journal'; END IF;
END $$;
SELECT pg_temp.expect_error($$SELECT public.editorial_etat()$$, 'membre lit l''état éditorial');

-- 4. L'admin relit : manques, puis relecture posée par la base --------------------------------------
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
UPDATE public.contenus_publics SET auteur_fonction = '' WHERE id = '00000000-0000-0000-0000-0000000000b1';
SELECT pg_temp.expect_error($$SELECT public.changer_statut_contenu('00000000-0000-0000-0000-0000000000b1', 'pret')$$, 'manque la fonction');
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.manques_publication('00000000-0000-0000-0000-0000000000b1') WHERE code = 'auteur') THEN
    RAISE EXCEPTION 'manque auteur attendu'; END IF;
END $$;
UPDATE public.contenus_publics SET auteur_fonction = 'Rédactrice spécialisée' WHERE id = '00000000-0000-0000-0000-0000000000b1';
SELECT public.changer_statut_contenu('00000000-0000-0000-0000-0000000000b1', 'pret');
DO $$ BEGIN
  IF (SELECT relu_le || '/' || relu_par FROM public.contenus_publics WHERE id = '00000000-0000-0000-0000-0000000000b1')
     <> current_date || '/00000000-0000-0000-0000-0000000000a1' THEN RAISE EXCEPTION 'relecture posée par la base'; END IF;
END $$;

-- 5. Texte modifié après relecture : retour automatique « à relire » --------------------------------
UPDATE public.contenus_publics SET corps = 'Texte corrigé.' WHERE id = '00000000-0000-0000-0000-0000000000b1';
DO $$ BEGIN
  IF (SELECT statut FROM public.contenus_publics WHERE id = '00000000-0000-0000-0000-0000000000b1') <> 'a_relire' THEN
    RAISE EXCEPTION 'retour à relire'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.contenus_publics_journal WHERE contenu_id = '00000000-0000-0000-0000-0000000000b1' AND auto) THEN
    RAISE EXCEPTION 'passage automatique journalisé'; END IF;
END $$;
SELECT public.changer_statut_contenu('00000000-0000-0000-0000-0000000000b1', 'pret');

-- 6. Programmation : invisible avant l'heure --------------------------------------------------------
SELECT pg_temp.expect_error($$SELECT public.changer_statut_contenu('00000000-0000-0000-0000-0000000000b1', 'programme', '', now() - interval '1 day')$$, 'programmé dans le passé');
SELECT public.changer_statut_contenu('00000000-0000-0000-0000-0000000000b1', 'programme', '', now() + interval '2 days');
DO $$ BEGIN
  IF (SELECT statut_lu FROM public.editorial_etat() WHERE id = '00000000-0000-0000-0000-0000000000b1') <> 'programme' THEN
    RAISE EXCEPTION 'statut lu programmé'; END IF;
END $$;
SELECT pg_temp.as_anon();
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.contenus_publics WHERE id = '00000000-0000-0000-0000-0000000000b1') THEN
    RAISE EXCEPTION 'visiteur lit un contenu programmé'; END IF;
END $$;

-- 7. Publication, puis texte modifié en ligne : « à actualiser », reste en ligne -------------------
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
SELECT public.changer_statut_contenu('00000000-0000-0000-0000-0000000000b1', 'pret');
SELECT public.changer_statut_contenu('00000000-0000-0000-0000-0000000000b1', 'publie');
SELECT pg_temp.as_anon();
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.contenus_publics WHERE id = '00000000-0000-0000-0000-0000000000b1') THEN
    RAISE EXCEPTION 'visiteur lit le publié'; END IF;
END $$;
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', 'redacteur@test.fr');
UPDATE public.contenus_publics SET chapo = 'Chapô revu.' WHERE id = '00000000-0000-0000-0000-0000000000b1';
DO $$ BEGIN
  IF (SELECT statut || '/' || publie FROM public.contenus_publics WHERE id = '00000000-0000-0000-0000-0000000000b1') <> 'a_actualiser/true' THEN
    RAISE EXCEPTION 'texte modifié en ligne : à actualiser, toujours en ligne'; END IF;
  IF (SELECT count(*) FROM public.contenus_publics_versions WHERE contenu_id = '00000000-0000-0000-0000-0000000000b1') <> 3 THEN
    RAISE EXCEPTION 'une version par texte modifié'; END IF;
END $$;
SELECT pg_temp.expect_error($$SELECT public.changer_statut_contenu('00000000-0000-0000-0000-0000000000b1', 'publie')$$, 'rédacteur republie');

-- 8. Termes interdits : liste, accroche de greffe, contenus à revoir -------------------------------
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
UPDATE public.contenus_publics SET corps = 'Texte qui cite une marque déposée.' WHERE id = '00000000-0000-0000-0000-0000000000b1';
RESET ROLE;
INSERT INTO public.termes_interdits_publics (terme, categorie) VALUES ('Marque Déposée', 'marque');
CREATE FUNCTION public.greffe_termes_nominatifs(_texte text) RETURNS text[] LANGUAGE sql AS $$
  SELECT CASE WHEN strpos(public.texte_normalise(_texte), ' dupont ') > 0 THEN ARRAY['Dupont'] ELSE '{}'::text[] END
$$;
DO $$ BEGIN
  IF public.termes_interdits_trouves('Un texte avec la MARQUE deposee et le Dr Dupont.') <> ARRAY['Dupont', 'Marque Déposée'] THEN
    RAISE EXCEPTION 'termes trouvés : %', public.termes_interdits_trouves('Un texte avec la MARQUE deposee et le Dr Dupont.'); END IF;
  IF cardinality(public.termes_interdits_trouves('Une marquee déposée ailleurs.')) <> 0 THEN
    RAISE EXCEPTION 'mot entier seulement'; END IF;
END $$;
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
SELECT pg_temp.expect_error($$UPDATE public.contenus_publics SET chapo = 'Encore une marque déposée.' WHERE id = '00000000-0000-0000-0000-0000000000b1'$$, 'terme interdit écrit en ligne');
SELECT pg_temp.expect_error($$SELECT public.changer_statut_contenu('00000000-0000-0000-0000-0000000000b1', 'publie')$$, 'republication avec terme interdit');
DO $$ BEGIN
  IF (SELECT termes FROM public.contenus_publics_a_revoir() WHERE id = '00000000-0000-0000-0000-0000000000b1') <> ARRAY['Marque Déposée'] THEN
    RAISE EXCEPTION 'contenu à revoir'; END IF;
END $$;
UPDATE public.contenus_publics SET corps = 'Texte anonymisé.' WHERE id = '00000000-0000-0000-0000-0000000000b1';
SELECT public.changer_statut_contenu('00000000-0000-0000-0000-0000000000b1', 'publie');
RESET ROLE;
DROP FUNCTION public.greffe_termes_nominatifs(text);

-- 9. Circuit simple et exigences réglables ----------------------------------------------------------
UPDATE public.site_settings SET value = value || '{"circuit": "simple", "exiger_sources": false, "longueurs_seo": false}'
WHERE key = 'editorial';
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
INSERT INTO public.contenus_publics (id, slug, titre, corps, auteur_fonction)
  VALUES ('00000000-0000-0000-0000-0000000000b2', 'court', 'Court', 'Texte.', 'Artisan');
SELECT public.changer_statut_contenu('00000000-0000-0000-0000-0000000000b2', 'publie');
DO $$ BEGIN
  IF (SELECT statut || '/' || (relu_le = current_date) FROM public.contenus_publics WHERE id = '00000000-0000-0000-0000-0000000000b2')
     <> 'publie/true' THEN RAISE EXCEPTION 'circuit simple : publication directe, relecture posée'; END IF;
END $$;
RESET ROLE;
UPDATE public.site_settings SET value = value || '{"circuit": "complet"}' WHERE key = 'editorial';
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
INSERT INTO public.contenus_publics (id, slug, titre, corps, auteur_fonction)
  VALUES ('00000000-0000-0000-0000-0000000000b3', 'complet', 'Complet', 'Texte.', 'Artisan');
SELECT pg_temp.expect_error($$SELECT public.changer_statut_contenu('00000000-0000-0000-0000-0000000000b3', 'publie')$$, 'circuit complet : pas de raccourci');

-- 10. Relecture trop ancienne : « à actualiser » au statut lu -----------------------------------------
RESET ROLE;
ALTER TABLE public.contenus_publics DISABLE TRIGGER contenus_publics_a_statut;
UPDATE public.contenus_publics SET relu_le = current_date - 400 WHERE id = '00000000-0000-0000-0000-0000000000b2';
ALTER TABLE public.contenus_publics ENABLE TRIGGER contenus_publics_a_statut;
DO $$ BEGIN
  IF public.statut_effectif('publie', 'article', now() - interval '1 day', current_date - 400) <> 'a_actualiser' THEN
    RAISE EXCEPTION 'relecture plus vieille que le délai'; END IF;
  IF public.statut_effectif('publie', 'page', now() - interval '1 day', NULL) <> 'publie' THEN
    RAISE EXCEPTION 'une page ne se relit pas'; END IF;
END $$;

-- 11. Pages : rédaction ⇄ publié, par un admin -------------------------------------------------------
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', 'redacteur@test.fr');
INSERT INTO public.contenus_publics (id, type, slug, titre, corps)
  VALUES ('00000000-0000-0000-0000-0000000000b4', 'page', 'une-page', 'Une page', 'Texte.');
SELECT pg_temp.expect_error($$SELECT public.changer_statut_contenu('00000000-0000-0000-0000-0000000000b4', 'publie')$$, 'rédacteur publie une page');
SELECT pg_temp.expect_error($$SELECT public.changer_statut_contenu('00000000-0000-0000-0000-0000000000b4', 'a_relire')$$, 'page à relire');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
SELECT public.changer_statut_contenu('00000000-0000-0000-0000-0000000000b4', 'publie');

-- 12. Version ---------------------------------------------------------------------------------------
RESET ROLE;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.socle_versions WHERE version = '1.10.0') THEN RAISE EXCEPTION 'version 1.10.0'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.template_checks WHERE code = 'V1-CIRCUIT-EDITORIAL') THEN RAISE EXCEPTION 'point de grille'; END IF;
END $$;
ROLLBACK;
