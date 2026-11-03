-- Socle 1.9.0 : les articles vivent dans contenus_publics (modèle commun). Règles d'accès,
-- longueurs bornées, adresse unique par type, recherche. La vue blog_posts (1.9.0) est retirée en
-- 1.10.0 : test_31.
\set ON_ERROR_STOP 1
\i tests/db/_helpers.sql
BEGIN;
-- a1 : admin · a2 : membre
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr'),
  ('00000000-0000-0000-0000-0000000000a2', 'membre@test.fr');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
SELECT public.bootstrap_current_user('Administrateur');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', 'membre@test.fr');
SELECT public.bootstrap_current_user('Membre');
RESET ROLE;

-- 1. Structure : table renommée, vue de compatibilité, clé des commentaires -------------------------
DO $$ BEGIN
  IF (SELECT relkind FROM pg_class WHERE oid = 'public.contenus_publics'::regclass) <> 'r' THEN
    RAISE EXCEPTION 'contenus_publics doit être une table'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'blog_comments_post_id_fkey'
                 AND confrelid = 'public.contenus_publics'::regclass) THEN
    RAISE EXCEPTION 'la clé des commentaires doit viser contenus_publics'; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.contenus_publics'::regclass
             AND contype = 'c' AND NOT convalidated) THEN
    RAISE EXCEPTION 'base neuve : toutes les règles de longueur doivent être validées'; END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.contenus_publics'::regclass) THEN
    RAISE EXCEPTION 'règles d''accès inactives'; END IF;
END $$;

-- 2. Données de départ ------------------------------------------------------------------------------
INSERT INTO public.contenus_publics (id, slug, titre, chapo, corps, publie, publie_le, etiquettes, auteur_id) VALUES
  ('00000000-0000-0000-0000-0000000000b1', 'publie', 'Article publié', 'Résumé', 'Le maillage interne relie les contenus.', true, now(), '{seo}', '00000000-0000-0000-0000-0000000000a2'),
  ('00000000-0000-0000-0000-0000000000b2', 'brouillon', 'Article brouillon', '', 'Maillage en préparation.', false, NULL, '{}', NULL);
INSERT INTO public.blog_comments (post_id, author_id, content, approved) VALUES
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a2', 'Validé', true);
DO $$ BEGIN
  IF (SELECT type FROM public.contenus_publics WHERE id = '00000000-0000-0000-0000-0000000000b1') <> 'article' THEN
    RAISE EXCEPTION 'type par défaut : article'; END IF;
END $$;

-- 3. Règles d'accès inchangées ----------------------------------------------------------------------
SELECT pg_temp.as_anon();
DO $$ BEGIN
  IF (SELECT count(*) FROM public.contenus_publics WHERE id::text LIKE '00000000-%') <> 1 THEN RAISE EXCEPTION 'visiteur : publiés seulement'; END IF;
END $$;
SELECT pg_temp.expect_error($$INSERT INTO public.contenus_publics (slug, titre) VALUES ('pirate', 'Article pirate')$$, 'visiteur écrit');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', 'membre@test.fr');
DO $$ BEGIN
  IF (SELECT count(*) FROM public.contenus_publics WHERE id::text LIKE '00000000-%') <> 1 THEN RAISE EXCEPTION 'membre : publiés seulement'; END IF;
END $$;
SELECT pg_temp.expect_error($$INSERT INTO public.contenus_publics (slug, titre) VALUES ('membre', 'Article de membre')$$, 'membre écrit');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
DO $$ BEGIN
  IF (SELECT count(*) FROM public.contenus_publics WHERE id::text LIKE '00000000-%') <> 2 THEN RAISE EXCEPTION 'admin : brouillons compris'; END IF;
END $$;

-- 4. Pages et articles dans la même table --------------------------------------------------------
INSERT INTO public.contenus_publics (id, type, slug, titre) VALUES ('00000000-0000-0000-0000-0000000000b4', 'page', 'une-page', 'Une page');
SELECT pg_temp.expect_error($$INSERT INTO public.contenus_publics (type, slug, titre) VALUES ('page', 'une-page', 'Doublon de page')$$, 'deux pages même adresse');

-- 5. Adresse unique par type, longueurs -------------------------------------------------------------
INSERT INTO public.contenus_publics (type, slug, titre) VALUES ('page', 'publie', 'Page de même adresse qu''un article');
SELECT pg_temp.expect_error($$INSERT INTO public.contenus_publics (slug, titre) VALUES ('publie', 'Doublon d''article')$$, 'deux articles même adresse');
SELECT pg_temp.expect_error($$INSERT INTO public.contenus_publics (type, slug, titre) VALUES ('guide', 'guide', 'Type inconnu')$$, 'type inconnu');
SELECT pg_temp.expect_error($$INSERT INTO public.contenus_publics (slug, titre) VALUES ('Majuscules', 'Adresse invalide')$$, 'adresse invalide');
SELECT pg_temp.expect_error($$INSERT INTO public.contenus_publics (slug, titre) VALUES ('court', 'ab')$$, 'titre trop court');
SELECT pg_temp.expect_error($$INSERT INTO public.contenus_publics (slug, titre, description) VALUES ('desc', 'Description longue', repeat('x', 161))$$, 'description trop longue');
SELECT pg_temp.expect_error($$INSERT INTO public.contenus_publics (slug, titre, chapo) VALUES ('chapo', 'Chapô trop long', repeat('x', 601))$$, 'chapô trop long');
SELECT pg_temp.expect_error($$INSERT INTO public.contenus_publics (slug, titre, sources) VALUES ('src', 'Source sans adresse', 'Une source sans adresse')$$, 'source sans adresse https');
INSERT INTO public.contenus_publics (slug, titre, sources) VALUES ('src-ok', 'Sources valides', 'Référence officielle — https://exemple.fr/guide' || chr(10) || chr(10) || 'https://exemple.fr/autre');

-- 6. Recherche : article publié trouvé, brouillon et page jamais ------------------------------------
RESET ROLE;
UPDATE public.site_settings SET value = value || '{"blog": true, "search": true}' WHERE key = 'modules';
DO $$ BEGIN
  IF (SELECT count(*) FROM public.search_site('maillage') WHERE kind = 'article') <> 1 THEN
    RAISE EXCEPTION 'recherche : un seul article publié attendu'; END IF;
  IF (SELECT url FROM public.search_site('maillage') WHERE kind = 'article') <> '/blog/publie' THEN
    RAISE EXCEPTION 'recherche : adresse /blog/<slug>'; END IF;
END $$;

-- 7. Suppression de compte : l'auteur d'un article est effacé, l'article reste ----------------------
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', 'membre@test.fr');
SELECT public.delete_my_account();
RESET ROLE;
DO $$ BEGIN
  IF (SELECT auteur_id FROM public.contenus_publics WHERE id = '00000000-0000-0000-0000-0000000000b1') IS NOT NULL THEN
    RAISE EXCEPTION 'auteur non effacé'; END IF;
END $$;

-- 8. Version ----------------------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.socle_versions WHERE version = '1.9.0') THEN RAISE EXCEPTION 'version 1.9.0 absente'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.template_checks WHERE code = 'V1-CONTENUS-PUBLICS') THEN RAISE EXCEPTION 'point de grille absent'; END IF;
END $$;
ROLLBACK;
