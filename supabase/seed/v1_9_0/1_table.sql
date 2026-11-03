DO $$ BEGIN
  IF to_regclass('public.contenus_publics') IS NULL THEN
    ALTER TABLE public.blog_posts RENAME TO contenus_publics;
    ALTER TABLE public.contenus_publics RENAME COLUMN title TO titre;
    ALTER TABLE public.contenus_publics RENAME COLUMN excerpt TO chapo;
    ALTER TABLE public.contenus_publics RENAME COLUMN content TO corps;
    ALTER TABLE public.contenus_publics RENAME COLUMN cover_url TO image_url;
    ALTER TABLE public.contenus_publics RENAME COLUMN author_id TO auteur_id;
    ALTER TABLE public.contenus_publics RENAME COLUMN published TO publie;
    ALTER TABLE public.contenus_publics RENAME COLUMN published_at TO publie_le;
    ALTER TABLE public.contenus_publics RENAME COLUMN tags TO etiquettes;
    ALTER TABLE public.contenus_publics RENAME CONSTRAINT blog_posts_pkey TO contenus_publics_pkey;
    ALTER INDEX public.blog_posts_search_idx RENAME TO contenus_publics_search_idx;
    ALTER TRIGGER blog_posts_updated_at ON public.contenus_publics RENAME TO contenus_publics_updated_at;
  END IF;
END $$;

ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'article';
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS libelle_menu text NOT NULL DEFAULT '';
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS ordre integer NOT NULL DEFAULT 0;
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS sources text NOT NULL DEFAULT '';
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS relu_le date;
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS auteur_fonction text NOT NULL DEFAULT '';
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS image_alt text NOT NULL DEFAULT '';
UPDATE public.contenus_publics
SET description = CASE
  WHEN char_length(btrim(chapo)) <= 160 THEN btrim(chapo)
  ELSE regexp_replace(left(btrim(chapo), 159), '[[:space:]]+[^[:space:]]*$', '') || '…'
END
WHERE description = '' AND btrim(chapo) <> '';
