CREATE OR REPLACE FUNCTION public.suggestion_recherche(_q text)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  mots text[] := ARRAY(SELECT w FROM regexp_split_to_table(lower(left(coalesce(_q, ''), 200)), '[^[:alnum:]]+') w
                       WHERE w <> '' LIMIT 8);
  vocabulaire text[];
  sortie text[] := '{}';
  w text;
  proche text;
  change boolean := false;
BEGIN
  IF cardinality(mots) = 0 THEN
    RETURN NULL;
  END IF;
  vocabulaire := ARRAY(
    SELECT DISTINCT v FROM (
      SELECT regexp_split_to_table(lower(c.titre || ' ' || array_to_string(c.etiquettes, ' ')), '[^[:alnum:]]+') AS v
      FROM public.contenus_publics c
      WHERE c.type = 'article' AND c.publie AND (c.publie_le IS NULL OR c.publie_le <= now())
      UNION ALL
      SELECT regexp_split_to_table(lower(x), '[^[:alnum:]]+') FROM public.synonymes s, unnest(s.variantes || s.terme) x
    ) t WHERE char_length(v) >= 4);
  FOREACH w IN ARRAY mots LOOP
    proche := NULL;
    IF char_length(w) >= 4
       AND NOT extensions.unaccent(w) = ANY (SELECT extensions.unaccent(v) FROM unnest(vocabulaire) v) THEN
      SELECT v INTO proche FROM unnest(vocabulaire) v
      WHERE extensions.similarity(extensions.unaccent(v), extensions.unaccent(w)) >= 0.35
      ORDER BY extensions.similarity(extensions.unaccent(v), extensions.unaccent(w)) DESC, v LIMIT 1;
    END IF;
    IF proche IS NOT NULL THEN
      sortie := sortie || proche;
      change := true;
    ELSE
      sortie := sortie || w;
    END IF;
  END LOOP;
  RETURN CASE WHEN change THEN array_to_string(sortie, ' ') END;
END;
$$;
REVOKE ALL ON FUNCTION public.suggestion_recherche(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.suggestion_recherche(text) TO anon, authenticated, service_role;
