CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.synonymes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  terme text NOT NULL CHECK (char_length(btrim(terme)) BETWEEN 2 AND 60),
  variantes text[] NOT NULL DEFAULT '{}' CHECK (cardinality(variantes) BETWEEN 1 AND 20),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS synonymes_terme_idx ON public.synonymes (lower(btrim(terme)));
ALTER TABLE public.synonymes ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.synonymes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.synonymes TO authenticated;
GRANT ALL ON public.synonymes TO service_role;
DROP POLICY IF EXISTS "Synonymes lisibles de tous" ON public.synonymes;
CREATE POLICY "Synonymes lisibles de tous" ON public.synonymes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Redacteurs gerent les synonymes" ON public.synonymes;
CREATE POLICY "Redacteurs gerent les synonymes" ON public.synonymes FOR ALL TO authenticated
  USING (public.can_write_content(auth.uid())) WITH CHECK (public.can_write_content(auth.uid()));
