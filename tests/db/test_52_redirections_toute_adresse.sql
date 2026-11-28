-- Socle 1.23.0 : redirection de toute adresse. Preuves, chacune avec sa contre-épreuve :
--   1. la table accepte l'adresse d'un fichier d'un ancien site et une destination en https ; elle
--      refuse toujours une adresse relative, une adresse avec espace ou une destination non https ;
--   2. redirection_pour() trouve une ancienne adresse avec ou sans barre oblique finale, préfère
--      l'adresse exacte, ne rend rien pour une adresse inconnue ;
--   3. un visiteur s'en sert, module blog éteint ou allumé, sans jamais lire la table en masse (1.23.1) ;
--   4. version 1.23.0 publiée.
\set ON_ERROR_STOP 1
\i tests/db/_helpers.sql
BEGIN;
UPDATE public.site_settings SET value = value || '{"blog": false}' WHERE key = 'modules';

-- 1. Forme des adresses --------------------------------------------------------------------------
INSERT INTO public.redirections (de, vers) VALUES
  ('/ancienne-rubrique/ancien-article/', '/blog/nouvel-article'),
  ('/wp-content/uploads/2021/02/Extrait_Livre-Gratuit.pdf', 'https://exemple.fr/fichiers/extrait.pdf'),
  ('/a-propos-ancien', '/pages/a-propos'),
  ('/a-propos-ancien/', '/pages/a-propos-exact');
SELECT pg_temp.expect_error($$INSERT INTO public.redirections (de, vers) VALUES ('sans-barre', '/x')$$, 'adresse relative');
SELECT pg_temp.expect_error($$INSERT INTO public.redirections (de, vers) VALUES ('/avec espace', '/x')$$, 'adresse avec espace');
SELECT pg_temp.expect_error($$INSERT INTO public.redirections (de, vers) VALUES ('/x1', 'http://exemple.fr/x')$$, 'destination non https');
SELECT pg_temp.expect_error($$INSERT INTO public.redirections (de, vers) VALUES ('/x2', 'javascript:alert(1)')$$, 'destination script');
SELECT pg_temp.expect_error($$INSERT INTO public.redirections (de, vers) VALUES ('/x3', '/x3')$$, 'redirection vers elle-même');

-- 2 et 3. Recherche d'une adresse, par un visiteur, module blog éteint ------------------------------
SELECT pg_temp.as_anon();
DO $$ BEGIN
  IF public.redirection_pour('/ancienne-rubrique/ancien-article/') IS DISTINCT FROM '/blog/nouvel-article' THEN
    RAISE EXCEPTION 'adresse exacte non trouvée';
  END IF;
  IF public.redirection_pour('/ancienne-rubrique/ancien-article') IS DISTINCT FROM '/blog/nouvel-article' THEN
    RAISE EXCEPTION 'adresse sans barre oblique finale non trouvée';
  END IF;
  IF public.redirection_pour('/wp-content/uploads/2021/02/Extrait_Livre-Gratuit.pdf') IS DISTINCT FROM 'https://exemple.fr/fichiers/extrait.pdf' THEN
    RAISE EXCEPTION 'fichier d''un ancien site non trouvé';
  END IF;
  IF public.redirection_pour('/a-propos-ancien/') IS DISTINCT FROM '/pages/a-propos-exact' THEN
    RAISE EXCEPTION 'l''adresse exacte doit primer';
  END IF;
  IF public.redirection_pour('/adresse-inconnue') IS NOT NULL THEN
    RAISE EXCEPTION 'contre-épreuve : une adresse inconnue ne rend rien';
  END IF;
END $$;
-- Lecture en masse fermée au visiteur, même module blog allumé (1.23.1).
SELECT pg_temp.expect_error($$SELECT count(*) FROM public.redirections$$, 'visiteur lit la table, blog éteint');
RESET ROLE;
UPDATE public.site_settings SET value = value || '{"blog": true}' WHERE key = 'modules';
SELECT pg_temp.as_anon();
SELECT pg_temp.expect_error($$SELECT count(*) FROM public.redirections$$, 'visiteur lit la table, blog allumé');
DO $$ BEGIN
  IF public.redirection_pour('/ancienne-rubrique/ancien-article') IS DISTINCT FROM '/blog/nouvel-article' THEN
    RAISE EXCEPTION 'contre-épreuve : la fonction sert toujours le visiteur, blog allumé';
  END IF;
END $$;
RESET ROLE;

-- 4. Version ---------------------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.socle_versions WHERE version = '1.23.0' AND niveau = 'brique') THEN
    RAISE EXCEPTION 'version 1.23.0 absente';
  END IF;
END $$;
ROLLBACK;
