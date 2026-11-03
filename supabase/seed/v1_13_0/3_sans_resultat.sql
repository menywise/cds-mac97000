CREATE TABLE IF NOT EXISTS public.recherches_sans_resultat (
  terme text PRIMARY KEY CHECK (char_length(terme) BETWEEN 2 AND 100),
  nombre integer NOT NULL DEFAULT 1,
  premiere timestamptz NOT NULL DEFAULT now(),
  derniere timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.recherches_sans_resultat ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.recherches_sans_resultat FROM anon;
GRANT SELECT, DELETE ON public.recherches_sans_resultat TO authenticated;
GRANT ALL ON public.recherches_sans_resultat TO service_role;
DROP POLICY IF EXISTS "Redacteurs lisent les recherches sans resultat" ON public.recherches_sans_resultat;
CREATE POLICY "Redacteurs lisent les recherches sans resultat" ON public.recherches_sans_resultat FOR SELECT
  TO authenticated USING (public.can_write_content(auth.uid()));
DROP POLICY IF EXISTS "Redacteurs effacent les recherches sans resultat" ON public.recherches_sans_resultat;
CREATE POLICY "Redacteurs effacent les recherches sans resultat" ON public.recherches_sans_resultat FOR DELETE
  TO authenticated USING (public.can_write_content(auth.uid()));
CREATE OR REPLACE FUNCTION public.noter_recherche_sans_resultat(_q text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  t text := btrim(array_to_string(ARRAY(
    SELECT w FROM regexp_split_to_table(lower(left(coalesce(_q, ''), 200)), '[^[:alnum:]]+') w
    WHERE char_length(w) >= 2 LIMIT 5), ' '));
BEGIN
  IF char_length(t) < 2 THEN
    RETURN;
  END IF;
  t := left(t, 100);
  INSERT INTO public.recherches_sans_resultat (terme) VALUES (t)
  ON CONFLICT (terme) DO UPDATE SET nombre = public.recherches_sans_resultat.nombre + 1, derniere = now();
  DELETE FROM public.recherches_sans_resultat
  WHERE terme IN (SELECT terme FROM public.recherches_sans_resultat ORDER BY derniere DESC OFFSET 1000);
END;
$$;
REVOKE ALL ON FUNCTION public.noter_recherche_sans_resultat(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.noter_recherche_sans_resultat(text) TO anon, authenticated, service_role;
