CREATE TABLE IF NOT EXISTS public.rubriques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (char_length(slug) <= 80 AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  libelle text NOT NULL CHECK (char_length(btrim(libelle)) BETWEEN 2 AND 60),
  intro text NOT NULL DEFAULT '' CHECK (char_length(intro) <= 2000),
  parent_id uuid REFERENCES public.rubriques (id) ON DELETE RESTRICT,
  ordre integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (parent_id IS NULL OR parent_id <> id)
);
ALTER TABLE public.rubriques ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.rubriques TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rubriques TO authenticated;
GRANT ALL ON public.rubriques TO service_role;
DROP POLICY IF EXISTS "Rubriques visibles de tous" ON public.rubriques;
CREATE POLICY "Rubriques visibles de tous" ON public.rubriques FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admins gerent les rubriques" ON public.rubriques;
CREATE POLICY "Admins gerent les rubriques" ON public.rubriques FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE OR REPLACE FUNCTION public.garde_rubriques()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF new.parent_id IS NOT NULL THEN
    IF (SELECT parent_id FROM public.rubriques WHERE id = new.parent_id) IS NOT NULL THEN
      RAISE EXCEPTION 'Deux niveaux de rubriques au plus.' USING ERRCODE = '23514';
    END IF;
    IF tg_op = 'UPDATE' AND EXISTS (SELECT 1 FROM public.rubriques WHERE parent_id = new.id) THEN
      RAISE EXCEPTION 'Deux niveaux de rubriques au plus : cette rubrique a déjà des sous-rubriques.' USING ERRCODE = '23514';
    END IF;
  END IF;
  new.updated_at := now();
  RETURN new;
END;
$$;
REVOKE ALL ON FUNCTION public.garde_rubriques() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS rubriques_garde ON public.rubriques;
CREATE TRIGGER rubriques_garde BEFORE INSERT OR UPDATE ON public.rubriques
  FOR EACH ROW EXECUTE FUNCTION public.garde_rubriques();
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS rubrique_id uuid
  REFERENCES public.rubriques (id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS contenus_publics_rubrique_idx ON public.contenus_publics (rubrique_id);
