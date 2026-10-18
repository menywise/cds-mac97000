\set ON_ERROR_STOP 1
\i tests/db/_helpers.sql
BEGIN;
-- Socle 1.3.0 : accroches pour greffes. Modules greffe_ acceptés, conservés et lus par la base ;
-- une table d'extension d'une fiche d'annuaire reprend les droits de la fiche.
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr'),
  ('00000000-0000-0000-0000-0000000000a2', 'auteur@test.fr'),
  ('00000000-0000-0000-0000-0000000000a3', 'autre@test.fr');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
SELECT public.bootstrap_current_user('Administrateur');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', 'auteur@test.fr');
SELECT public.bootstrap_current_user('Auteur');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a3', 'autre@test.fr');
SELECT public.bootstrap_current_user('Autre');
RESET ROLE;

-- 1. Clé de module d'un projet ----------------------------------------------------------------------
DO $$ BEGIN
  IF NOT public.module_is_greffe('greffe_veille') OR NOT public.module_is_greffe('greffe_veille_2') THEN
    RAISE EXCEPTION 'clé valide refusée'; END IF;
  IF public.module_is_greffe('veille') OR public.module_is_greffe('greffe_') OR public.module_is_greffe('greffe_Veille')
     OR public.module_is_greffe('greffe-veille') OR public.module_is_greffe(NULL)
     OR public.module_is_greffe('greffe_' || repeat('x', 41)) THEN
    RAISE EXCEPTION 'clé invalide acceptée'; END IF;
END $$;

-- 2. Réglage : clé greffe_ acceptée, éteinte par défaut, lue par la base ----------------------------
SELECT set_config('request.jwt.claims', '{}', true);
DO $$ BEGIN
  IF public.module_enabled('greffe_veille') THEN RAISE EXCEPTION 'module de projet allumé par défaut'; END IF;
END $$;
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
UPDATE public.site_settings SET value = value || '{"greffe_veille": true, "directory": true}' WHERE key = 'modules';
SELECT pg_temp.expect_error($$UPDATE public.site_settings SET value = value || '{"veille": true}' WHERE key = 'modules'$$, 'clé inconnue sans marque');
SELECT pg_temp.expect_error($$UPDATE public.site_settings SET value = value || '{"greffe_veille": "oui"}' WHERE key = 'modules'$$, 'valeur non booléenne');
SELECT pg_temp.expect_error($$UPDATE public.site_settings SET value = value || '{"greffe_Veille": true}' WHERE key = 'modules'$$, 'clé greffe mal formée');
DO $$ BEGIN
  IF NOT public.module_enabled('greffe_veille') THEN RAISE EXCEPTION 'module de projet non lu'; END IF;
  IF public.module_enabled('greffe_autre') THEN RAISE EXCEPTION 'module absent allumé'; END IF;
  IF public.module_greffe_values((SELECT value FROM public.site_settings WHERE key = 'modules'))
     <> '{"greffe_veille": true}'::jsonb THEN RAISE EXCEPTION 'extraction des modules de projet'; END IF;
END $$;
RESET ROLE;

-- 3. Rejouable : la migration garde les modules du projet ------------------------------------------
SELECT set_config('request.jwt.claims', '{}', true);
\i supabase/migrations/20261004120000_v1_3_0_accroches_greffes.sql
DO $$ BEGIN
  IF NOT public.module_enabled('greffe_veille') THEN RAISE EXCEPTION 'module de projet effacé'; END IF;
END $$;

-- 4. Table d'extension d'une fiche : mêmes droits que la fiche --------------------------------------
CREATE TABLE public.greffe_essai (
  listing_id uuid PRIMARY KEY REFERENCES public.directory_listings(id) ON DELETE CASCADE,
  note text NOT NULL DEFAULT ''
);
ALTER TABLE public.greffe_essai ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.greffe_essai TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.greffe_essai TO authenticated;
CREATE POLICY greffe_essai_lecture ON public.greffe_essai FOR SELECT TO anon, authenticated
  USING (public.directory_listing_visible(listing_id));
CREATE POLICY greffe_essai_ecriture ON public.greffe_essai FOR ALL TO authenticated
  USING (public.directory_listing_modifiable(listing_id))
  WITH CHECK (public.directory_listing_modifiable(listing_id));
INSERT INTO public.directory_listings (id, name, slug, created_by, status) VALUES
  ('00000000-0000-0000-0000-0000000000f1', 'Publiée', 'publiee', '00000000-0000-0000-0000-0000000000a2', 'published'),
  ('00000000-0000-0000-0000-0000000000f2', 'Brouillon', 'brouillon', '00000000-0000-0000-0000-0000000000a2', 'draft');
INSERT INTO public.greffe_essai (listing_id, note) VALUES
  ('00000000-0000-0000-0000-0000000000f1', 'publique'),
  ('00000000-0000-0000-0000-0000000000f2', 'brouillon');

SELECT pg_temp.as_anon();
DO $$ BEGIN
  IF (SELECT string_agg(note, ',' ORDER BY note) FROM public.greffe_essai) <> 'publique' THEN
    RAISE EXCEPTION 'visiteur : extension d''une fiche non publiée lue'; END IF;
END $$;
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a3', 'autre@test.fr');
DO $$ BEGIN
  IF (SELECT count(*) FROM public.greffe_essai) <> 1 THEN RAISE EXCEPTION 'autre membre : brouillon lu'; END IF;
END $$;
UPDATE public.greffe_essai SET note = 'piratée' WHERE listing_id = '00000000-0000-0000-0000-0000000000f1';
SELECT pg_temp.expect_error($$INSERT INTO public.greffe_essai (listing_id) VALUES ('00000000-0000-0000-0000-0000000000f3')$$, 'extension d''une fiche absente');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', 'auteur@test.fr');
DO $$ BEGIN
  IF (SELECT count(*) FROM public.greffe_essai) <> 2 THEN RAISE EXCEPTION 'auteur : brouillon non lu'; END IF;
  IF (SELECT note FROM public.greffe_essai WHERE listing_id = '00000000-0000-0000-0000-0000000000f1') <> 'publique' THEN
    RAISE EXCEPTION 'autre membre a modifié l''extension'; END IF;
END $$;
UPDATE public.greffe_essai SET note = 'modifiée' WHERE listing_id = '00000000-0000-0000-0000-0000000000f2';
DO $$ BEGIN
  IF (SELECT note FROM public.greffe_essai WHERE listing_id = '00000000-0000-0000-0000-0000000000f2') <> 'modifiée' THEN
    RAISE EXCEPTION 'auteur ne modifie pas son extension'; END IF;
END $$;
RESET ROLE;
DELETE FROM public.directory_listings WHERE id = '00000000-0000-0000-0000-0000000000f2';
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.greffe_essai WHERE listing_id = '00000000-0000-0000-0000-0000000000f2') THEN
    RAISE EXCEPTION 'extension non supprimée avec la fiche'; END IF;
END $$;

-- 5. Version ---------------------------------------------------------------------------------------
DO $$ BEGIN
  IF (SELECT value ->> 'version' FROM public.site_settings WHERE key = 'socle') <> '1.8.0' THEN
    RAISE EXCEPTION 'réglage socle'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.socle_versions WHERE version = '1.3.0') THEN RAISE EXCEPTION 'version 1.3.0'; END IF;
END $$;
ROLLBACK;
