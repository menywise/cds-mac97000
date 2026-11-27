-- Socle 1.22.0 : page hors index. Preuves, chacune avec sa contre-épreuve :
--   1. une page se crée indexée par défaut ; une page peut passer hors index ; la page d'accueil
--      ne le peut pas ;
--   2. une page hors index publiée reste lisible du visiteur par son adresse (le lien d'une
--      campagne marche) ;
--   3. la recherche du site trouve une page indexée, jamais une page hors index ;
--   4. version 1.22.0 publiée.
\set ON_ERROR_STOP 1
\i tests/db/_helpers.sql
BEGIN;
UPDATE public.site_settings SET value = value || '{"pages": true, "search": true}' WHERE key = 'modules';

-- 1. Forme : indexée par défaut, accueil jamais hors index ------------------------------------------
INSERT INTO public.pages (id, slug, title, description, is_home, published) VALUES
  ('00000000-0000-0000-0000-0000000005a1', 'accueil-essai', 'Accueil', 'Accueil du site', true, true),
  ('00000000-0000-0000-0000-0000000005a2', 'atelier-cuisine', 'Atelier cuisine', 'Atelier cuisine du samedi', false, true),
  ('00000000-0000-0000-0000-0000000005a3', 'merci-atelier-cuisine', 'Merci', 'Merci pour votre inscription atelier cuisine', false, true);
DO $$ BEGIN
  IF (SELECT bool_or(hors_index) FROM public.pages WHERE id::text LIKE '00000000-0000-0000-0000-0000000005a%') THEN
    RAISE EXCEPTION 'une page doit naître indexée';
  END IF;
END $$;
UPDATE public.pages SET hors_index = true WHERE id = '00000000-0000-0000-0000-0000000005a3';
SELECT pg_temp.expect_error($$UPDATE public.pages SET hors_index = true
  WHERE id = '00000000-0000-0000-0000-0000000005a1'$$, 'accueil hors index');
SELECT pg_temp.expect_error($$UPDATE public.pages SET is_home = false WHERE is_home;
  UPDATE public.pages SET is_home = true WHERE id = '00000000-0000-0000-0000-0000000005a3'$$, 'satellite devenu accueil');

-- 2. Le lien d'une campagne marche : la page hors index publiée reste lisible du visiteur ----------
SELECT pg_temp.as_anon();
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.pages WHERE slug = 'merci-atelier-cuisine' AND published) THEN
    RAISE EXCEPTION 'la page hors index doit rester lisible par son adresse';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.pages WHERE slug = 'atelier-cuisine') THEN
    RAISE EXCEPTION 'contre-épreuve : la page indexée doit être lisible';
  END IF;
END $$;

-- 3. Recherche du site : la page indexée, jamais la page hors index ---------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.search_site('atelier cuisine') WHERE url = '/pages/atelier-cuisine') THEN
    RAISE EXCEPTION 'contre-épreuve : la recherche doit trouver la page indexée';
  END IF;
  IF EXISTS (SELECT 1 FROM public.search_site('atelier cuisine') WHERE url = '/pages/merci-atelier-cuisine') THEN
    RAISE EXCEPTION 'la recherche ne doit pas trouver une page hors index';
  END IF;
END $$;
RESET ROLE;

-- 4. Version ---------------------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.socle_versions WHERE version = '1.22.0' AND niveau = 'brique') THEN
    RAISE EXCEPTION 'version 1.22.0 absente';
  END IF;
END $$;
ROLLBACK;
