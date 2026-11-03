CREATE TABLE IF NOT EXISTS public.redirections (
  de text PRIMARY KEY CHECK (de ~ '^/[a-z0-9/-]*$' AND char_length(de) <= 200),
  vers text NOT NULL CHECK (vers ~ '^/[a-z0-9/-]*$' AND char_length(vers) <= 200 AND vers <> de),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.redirections ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.redirections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.redirections TO authenticated;
GRANT ALL ON public.redirections TO service_role;
DROP POLICY IF EXISTS "Redirections lisibles de tous" ON public.redirections;
CREATE POLICY "Redirections lisibles de tous" ON public.redirections FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admins gerent les redirections" ON public.redirections;
CREATE POLICY "Admins gerent les redirections" ON public.redirections FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE OR REPLACE FUNCTION public.redirection_contenus()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ancien text := '/blog/' || old.slug;
  nouveau text := '/blog/' || new.slug;
BEGIN
  IF new.type <> 'article' OR old.type <> 'article' OR new.slug = old.slug OR old.publie_le IS NULL THEN
    RETURN NULL;
  END IF;
  DELETE FROM public.redirections WHERE de = nouveau;
  UPDATE public.redirections SET vers = nouveau WHERE vers = ancien;
  INSERT INTO public.redirections (de, vers) VALUES (ancien, nouveau)
  ON CONFLICT (de) DO UPDATE SET vers = EXCLUDED.vers;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.redirection_contenus() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS contenus_publics_redirection ON public.contenus_publics;
CREATE TRIGGER contenus_publics_redirection AFTER UPDATE OF slug ON public.contenus_publics
  FOR EACH ROW EXECUTE FUNCTION public.redirection_contenus();
