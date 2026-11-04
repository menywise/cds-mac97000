-- Socle 1.15.4 : une étiquette s'enregistre sans slug, la base le calcule depuis le libellé (comme
-- enregistrerEtiquette). Contre-épreuve : un slug fourni à la main est remplacé par celui du libellé.
-- Grille : DES-1 parle de la police du système.
\set ON_ERROR_STOP 1
\i tests/db/_helpers.sql
BEGIN;
INSERT INTO auth.users (id, email) VALUES ('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
SELECT public.bootstrap_current_user('Administrateur');
INSERT INTO public.etiquettes (libelle) VALUES ('Révision espacée');
INSERT INTO public.etiquettes (libelle, slug) VALUES ('Bloc opératoire', 'adresse-forcee');
RESET ROLE;
DO $$ BEGIN
  IF (SELECT column_default FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'etiquettes' AND column_name = 'slug') IS NULL THEN
    RAISE EXCEPTION 'slug sans valeur par défaut'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.etiquettes WHERE libelle = 'Révision espacée' AND slug <> '') THEN
    RAISE EXCEPTION 'slug non calculé : %', (SELECT slug FROM public.etiquettes WHERE libelle = 'Révision espacée'); END IF;
  IF (SELECT slug FROM public.etiquettes WHERE libelle = 'Bloc opératoire') = 'adresse-forcee' THEN
    RAISE EXCEPTION 'slug fourni non recalculé'; END IF;
  IF (SELECT label FROM public.template_checks WHERE code = 'DES-1') <> 'Police du système uniquement' THEN
    RAISE EXCEPTION 'grille DES-1'; END IF;
  IF (SELECT value ->> 'version' FROM public.site_settings WHERE key = 'socle') <> '1.15.4' THEN
    RAISE EXCEPTION 'réglage socle'; END IF;
END $$;
ROLLBACK;
