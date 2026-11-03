CREATE OR REPLACE FUNCTION public.sources_valides(_sources text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT coalesce(bool_and(btrim(l) = '' OR l ~ 'https://[^[:space:]]+'), true)
  FROM regexp_split_to_table(coalesce(_sources, ''), chr(10)) l
$$;
ALTER TABLE public.contenus_publics DROP CONSTRAINT IF EXISTS blog_posts_slug_key;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contenus_publics_type_slug_key'
                 AND conrelid = 'public.contenus_publics'::regclass) THEN
    ALTER TABLE public.contenus_publics ADD CONSTRAINT contenus_publics_type_slug_key UNIQUE (type, slug);
  END IF;
END $$;
ALTER TABLE public.contenus_publics DROP CONSTRAINT IF EXISTS contenus_publics_type_check;
ALTER TABLE public.contenus_publics ADD CONSTRAINT contenus_publics_type_check
  CHECK (type IN ('page', 'article')) NOT VALID;
ALTER TABLE public.contenus_publics DROP CONSTRAINT IF EXISTS contenus_publics_slug_check;
ALTER TABLE public.contenus_publics ADD CONSTRAINT contenus_publics_slug_check
  CHECK (char_length(slug) <= 80 AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$') NOT VALID;
ALTER TABLE public.contenus_publics DROP CONSTRAINT IF EXISTS contenus_publics_titre_check;
ALTER TABLE public.contenus_publics ADD CONSTRAINT contenus_publics_titre_check
  CHECK (char_length(btrim(titre)) BETWEEN 3 AND 120) NOT VALID;
ALTER TABLE public.contenus_publics DROP CONSTRAINT IF EXISTS contenus_publics_description_check;
ALTER TABLE public.contenus_publics ADD CONSTRAINT contenus_publics_description_check
  CHECK (char_length(description) <= 160) NOT VALID;
ALTER TABLE public.contenus_publics DROP CONSTRAINT IF EXISTS contenus_publics_chapo_check;
ALTER TABLE public.contenus_publics ADD CONSTRAINT contenus_publics_chapo_check
  CHECK (char_length(chapo) <= 600) NOT VALID;
ALTER TABLE public.contenus_publics DROP CONSTRAINT IF EXISTS contenus_publics_corps_check;
ALTER TABLE public.contenus_publics ADD CONSTRAINT contenus_publics_corps_check
  CHECK (char_length(corps) <= 100000) NOT VALID;
ALTER TABLE public.contenus_publics DROP CONSTRAINT IF EXISTS contenus_publics_libelle_menu_check;
ALTER TABLE public.contenus_publics ADD CONSTRAINT contenus_publics_libelle_menu_check
  CHECK (char_length(libelle_menu) <= 30) NOT VALID;
ALTER TABLE public.contenus_publics DROP CONSTRAINT IF EXISTS contenus_publics_sources_check;
ALTER TABLE public.contenus_publics ADD CONSTRAINT contenus_publics_sources_check
  CHECK (char_length(sources) <= 4000 AND public.sources_valides(sources)) NOT VALID;
ALTER TABLE public.contenus_publics DROP CONSTRAINT IF EXISTS contenus_publics_auteur_fonction_check;
ALTER TABLE public.contenus_publics ADD CONSTRAINT contenus_publics_auteur_fonction_check
  CHECK (char_length(auteur_fonction) <= 80) NOT VALID;
ALTER TABLE public.contenus_publics DROP CONSTRAINT IF EXISTS contenus_publics_image_alt_check;
ALTER TABLE public.contenus_publics ADD CONSTRAINT contenus_publics_image_alt_check
  CHECK (char_length(image_alt) <= 200) NOT VALID;
DO $$
DECLARE _c record;
BEGIN
  FOR _c IN SELECT conname FROM pg_constraint
            WHERE conrelid = 'public.contenus_publics'::regclass AND contype = 'c' AND NOT convalidated LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.contenus_publics VALIDATE CONSTRAINT %I', _c.conname);
    EXCEPTION WHEN check_violation THEN
      RAISE NOTICE 'Règle % non validée : un contenu existant la dépasse (voir le bloc de contrôle)', _c.conname;
    END;
  END LOOP;
END $$;
