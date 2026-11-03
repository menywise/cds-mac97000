CREATE TABLE IF NOT EXISTS public.series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (char_length(slug) <= 80 AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  titre text NOT NULL CHECK (char_length(btrim(titre)) BETWEEN 3 AND 120),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 600),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.series TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.series TO authenticated;
GRANT ALL ON public.series TO service_role;
DROP POLICY IF EXISTS "Series visibles de tous" ON public.series;
CREATE POLICY "Series visibles de tous" ON public.series FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Redacteurs creent les series" ON public.series;
CREATE POLICY "Redacteurs creent les series" ON public.series FOR INSERT TO authenticated
  WITH CHECK (public.can_write_content(auth.uid()));
DROP POLICY IF EXISTS "Redacteurs modifient les series" ON public.series;
CREATE POLICY "Redacteurs modifient les series" ON public.series FOR UPDATE TO authenticated
  USING (public.can_write_content(auth.uid())) WITH CHECK (public.can_write_content(auth.uid()));
DROP POLICY IF EXISTS "Admins suppriment les series" ON public.series;
CREATE POLICY "Admins suppriment les series" ON public.series FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS serie_id uuid
  REFERENCES public.series (id) ON DELETE SET NULL;
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS serie_ordre integer;
ALTER TABLE public.contenus_publics DROP CONSTRAINT IF EXISTS contenus_publics_serie_check;
ALTER TABLE public.contenus_publics ADD CONSTRAINT contenus_publics_serie_check
  CHECK (serie_ordre IS NULL OR (serie_ordre BETWEEN 1 AND 999 AND serie_id IS NOT NULL));
