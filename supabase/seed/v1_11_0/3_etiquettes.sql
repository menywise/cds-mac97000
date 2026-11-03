CREATE TABLE IF NOT EXISTS public.etiquettes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (char_length(slug) <= 80 AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  libelle text NOT NULL CHECK (char_length(btrim(libelle)) BETWEEN 2 AND 60),
  definition text NOT NULL DEFAULT '' CHECK (char_length(definition) <= 300),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.etiquettes ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.etiquettes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.etiquettes TO authenticated;
GRANT ALL ON public.etiquettes TO service_role;
DROP POLICY IF EXISTS "Etiquettes visibles de tous" ON public.etiquettes;
CREATE POLICY "Etiquettes visibles de tous" ON public.etiquettes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Redacteurs creent les etiquettes" ON public.etiquettes;
CREATE POLICY "Redacteurs creent les etiquettes" ON public.etiquettes FOR INSERT TO authenticated
  WITH CHECK (public.can_write_content(auth.uid()));
DROP POLICY IF EXISTS "Redacteurs modifient les etiquettes" ON public.etiquettes;
CREATE POLICY "Redacteurs modifient les etiquettes" ON public.etiquettes FOR UPDATE TO authenticated
  USING (public.can_write_content(auth.uid())) WITH CHECK (public.can_write_content(auth.uid()));
DROP POLICY IF EXISTS "Admins suppriment les etiquettes" ON public.etiquettes;
CREATE POLICY "Admins suppriment les etiquettes" ON public.etiquettes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE OR REPLACE FUNCTION public.garde_etiquettes_ref()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  new.libelle := btrim(new.libelle);
  new.slug := public.slug_depuis(new.libelle);
  RETURN new;
END;
$$;
DROP TRIGGER IF EXISTS etiquettes_garde ON public.etiquettes;
CREATE TRIGGER etiquettes_garde BEFORE INSERT OR UPDATE ON public.etiquettes
  FOR EACH ROW EXECUTE FUNCTION public.garde_etiquettes_ref();
INSERT INTO public.etiquettes (slug, libelle)
SELECT DISTINCT ON (public.slug_depuis(e)) public.slug_depuis(e), btrim(e)
FROM public.contenus_publics c, unnest(c.etiquettes) e
WHERE char_length(btrim(e)) BETWEEN 2 AND 60 AND public.slug_depuis(e) <> ''
ORDER BY public.slug_depuis(e), btrim(e)
ON CONFLICT (slug) DO NOTHING;
CREATE OR REPLACE FUNCTION public.garde_etiquettes_contenus()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  serveur boolean := auth.uid() IS NULL OR coalesce(current_setting('role', true), 'none') NOT IN ('authenticated', 'anon');
  e text;
  ref text;
  sortie text[] := '{}';
BEGIN
  IF tg_op = 'UPDATE' AND new.etiquettes IS NOT DISTINCT FROM old.etiquettes THEN
    RETURN new;
  END IF;
  FOREACH e IN ARRAY coalesce(new.etiquettes, '{}') LOOP
    CONTINUE WHEN public.slug_depuis(e) = '';
    SELECT libelle INTO ref FROM public.etiquettes WHERE slug = public.slug_depuis(e);
    IF ref IS NULL THEN
      IF NOT serveur OR char_length(btrim(e)) NOT BETWEEN 2 AND 60 THEN
        RAISE EXCEPTION 'Étiquette inconnue : %. La créer d''abord dans la taxonomie.', btrim(e) USING ERRCODE = '23514';
      END IF;
      INSERT INTO public.etiquettes (slug, libelle) VALUES (public.slug_depuis(e), btrim(e)) RETURNING libelle INTO ref;
    END IF;
    IF NOT ref = ANY (sortie) THEN
      sortie := sortie || ref;
    END IF;
  END LOOP;
  new.etiquettes := sortie;
  RETURN new;
END;
$$;
REVOKE ALL ON FUNCTION public.garde_etiquettes_contenus() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS contenus_publics_c_etiquettes ON public.contenus_publics;
CREATE TRIGGER contenus_publics_c_etiquettes BEFORE INSERT OR UPDATE ON public.contenus_publics
  FOR EACH ROW EXECUTE FUNCTION public.garde_etiquettes_contenus();
