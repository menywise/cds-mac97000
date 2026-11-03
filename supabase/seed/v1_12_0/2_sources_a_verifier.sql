CREATE OR REPLACE FUNCTION public.sources_a_verifier()
RETURNS TABLE (url text, contenus text[], verifie_le timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
BEGIN
  IF NOT public.can_write_content(auth.uid()) THEN
    RAISE EXCEPTION 'Réservé aux rédacteurs et aux administrateurs.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT s.url, array_agg(DISTINCT s.titre ORDER BY s.titre), max(e.verifie_le)
  FROM (
    SELECT (regexp_matches(c.sources, 'https://[^[:space:]]+', 'g'))[1] AS url, c.titre
    FROM public.contenus_publics c
  ) s
  LEFT JOIN public.liens_sources_etat e ON e.url = s.url
  GROUP BY s.url
  ORDER BY max(e.verifie_le) NULLS FIRST, s.url;
END;
$$;
REVOKE ALL ON FUNCTION public.sources_a_verifier() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sources_a_verifier() TO authenticated;
