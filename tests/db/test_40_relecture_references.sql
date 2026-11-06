-- Socle 1.15.5 : la relecture couvre aussi la bibliographie. Preuves, chacune avec sa contre-épreuve :
--   1. une référence modifiée sur un article prêt le renvoie à relire (motif au journal) ; une mise à
--      jour sans changement réel le laisse prêt ;
--   2. une référence ajoutée à un article en ligne le passe à actualiser, il reste en ligne ;
--      un brouillon dont on retire la référence reste en rédaction.
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
UPDATE public.site_settings SET value = value || '{"exiger_sources": false, "longueurs_seo": false, "exiger_auteur": false}'
WHERE key = 'editorial';
CREATE OR REPLACE FUNCTION pg_temp.statut(_id uuid) RETURNS text LANGUAGE sql AS $$
  SELECT public.statut_effectif(statut, type, publie_le, relu_le) FROM public.contenus_publics WHERE id = _id
$$;

SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', 'redacteur@test.fr');
INSERT INTO public.contenus_publics (id, slug, titre, corps) VALUES
  ('00000000-0000-0000-0000-0000000000d1', 'article-relu', 'Un article relu', 'Texte cité [1].'),
  ('00000000-0000-0000-0000-0000000000d2', 'brouillon-refs', 'Un brouillon', 'Texte [1].');
INSERT INTO public.references_contenu (contenu_id, rang, titre) VALUES
  ('00000000-0000-0000-0000-0000000000d1', 1, 'Référence de départ'),
  ('00000000-0000-0000-0000-0000000000d2', 1, 'Référence du brouillon');
SELECT public.changer_statut_contenu('00000000-0000-0000-0000-0000000000d1', 'a_relire');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
SELECT public.changer_statut_contenu('00000000-0000-0000-0000-0000000000d1', 'pret');

-- 1 bis. Contre-épreuve : une mise à jour sans changement réel laisse l'article prêt.
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', 'redacteur@test.fr');
UPDATE public.references_contenu SET titre = titre WHERE contenu_id = '00000000-0000-0000-0000-0000000000d1';
DO $$ BEGIN
  IF pg_temp.statut('00000000-0000-0000-0000-0000000000d1') <> 'pret' THEN
    RAISE EXCEPTION 'mise à jour sans changement : prêt attendu, % lu', pg_temp.statut('00000000-0000-0000-0000-0000000000d1'); END IF;
END $$;

-- 1. Référence modifiée sur un article prêt : à relire, motif au journal.
UPDATE public.references_contenu SET titre = 'Référence corrigée'
WHERE contenu_id = '00000000-0000-0000-0000-0000000000d1' AND rang = 1;
DO $$ BEGIN
  IF pg_temp.statut('00000000-0000-0000-0000-0000000000d1') <> 'a_relire' THEN
    RAISE EXCEPTION 'référence modifiée en prêt : à relire attendu, % lu', pg_temp.statut('00000000-0000-0000-0000-0000000000d1'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.contenus_publics_journal WHERE contenu_id = '00000000-0000-0000-0000-0000000000d1'
       AND vers = 'a_relire' AND auto AND motif = 'Références modifiées après la relecture.') THEN
    RAISE EXCEPTION 'motif du journal absent'; END IF;
END $$;

-- 2. Publication, puis référence ajoutée : à actualiser, toujours en ligne.
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
SELECT public.changer_statut_contenu('00000000-0000-0000-0000-0000000000d1', 'pret');
SELECT public.changer_statut_contenu('00000000-0000-0000-0000-0000000000d1', 'publie');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', 'redacteur@test.fr');
INSERT INTO public.references_contenu (contenu_id, rang, titre) VALUES
  ('00000000-0000-0000-0000-0000000000d1', 2, 'Deuxième référence');
DO $$ BEGIN
  IF pg_temp.statut('00000000-0000-0000-0000-0000000000d1') <> 'a_actualiser' THEN
    RAISE EXCEPTION 'référence ajoutée en ligne : à actualiser attendu, % lu', pg_temp.statut('00000000-0000-0000-0000-0000000000d1'); END IF;
  IF NOT (SELECT publie FROM public.contenus_publics WHERE id = '00000000-0000-0000-0000-0000000000d1') THEN
    RAISE EXCEPTION 'article retiré du site'; END IF;
END $$;

-- 2 bis. Contre-épreuve : un brouillon dont on retire la référence reste en rédaction.
DELETE FROM public.references_contenu WHERE contenu_id = '00000000-0000-0000-0000-0000000000d2';
DO $$ BEGIN
  IF pg_temp.statut('00000000-0000-0000-0000-0000000000d2') <> 'redaction' THEN
    RAISE EXCEPTION 'brouillon : en rédaction attendu, % lu', pg_temp.statut('00000000-0000-0000-0000-0000000000d2'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.socle_versions WHERE version = '1.15.5' AND niveau = 'correctif') THEN
    RAISE EXCEPTION 'version 1.15.5'; END IF;
END $$;
ROLLBACK;
