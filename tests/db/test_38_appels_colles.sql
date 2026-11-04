-- Socle 1.15.3 : deux appels collés « [1][2] » comptent tous les deux dans le manque « references ».
-- Preuve : avec la seule référence 1, le manque nomme [2] ; contre-épreuve : la référence 2 posée,
-- plus de manque. Un lien « [3](/blog/x) » et un lien « [texte](/blog/x) » ne sont jamais des appels.
\set ON_ERROR_STOP 1
\i tests/db/_helpers.sql
BEGIN;
INSERT INTO auth.users (id, email) VALUES ('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
SELECT public.bootstrap_current_user('Administrateur');
RESET ROLE;
INSERT INTO public.contenus_publics (id, slug, titre, corps) VALUES
  ('00000000-0000-0000-0000-0000000000c1', 'colles', 'Appels collés',
   'Deux sources [1][2]. Voir [3](/blog/autre) et [la page](/blog/autre). Fin [1].');
INSERT INTO public.references_contenu (contenu_id, rang, titre) VALUES
  ('00000000-0000-0000-0000-0000000000c1', 1, 'Première référence');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
DO $$ BEGIN
  IF (SELECT message FROM public.manques_publication('00000000-0000-0000-0000-0000000000c1') WHERE code = 'references')
     IS DISTINCT FROM 'Appels sans référence : [2].' THEN
    RAISE EXCEPTION 'appel [2] collé à [1] non vu : %', (SELECT string_agg(code || ' ' || message, ' | ') FROM public.manques_publication('00000000-0000-0000-0000-0000000000c1'));
  END IF;
END $$;
RESET ROLE;
INSERT INTO public.references_contenu (contenu_id, rang, titre) VALUES
  ('00000000-0000-0000-0000-0000000000c1', 2, 'Deuxième référence');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.manques_publication('00000000-0000-0000-0000-0000000000c1') WHERE code = 'references') THEN
    RAISE EXCEPTION 'manque references malgré [1] et [2] posées ([3] est un lien)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.socle_versions WHERE version = '1.15.3' AND niveau = 'correctif') THEN
    RAISE EXCEPTION 'version 1.15.3';
  END IF;
END $$;
ROLLBACK;
