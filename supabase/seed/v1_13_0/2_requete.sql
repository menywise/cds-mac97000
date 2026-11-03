CREATE OR REPLACE FUNCTION public.requete_mot(_mot text)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  m text := lower(regexp_replace(coalesce(_mot, ''), '[^[:alnum:]]+', '', 'g'));
  formes text[];
BEGIN
  IF char_length(m) < 2 THEN
    RETURN NULL;
  END IF;
  SELECT array_agg(DISTINCT f) INTO formes FROM (
    SELECT m || ':*' AS f
    UNION
    SELECT CASE WHEN cardinality(w) = 1 THEN w[1] || ':*' ELSE '(' || array_to_string(w, ' <-> ') || ')' END
    FROM public.synonymes s, unnest(s.variantes || s.terme) x,
         LATERAL (SELECT ARRAY(SELECT y FROM regexp_split_to_table(lower(x), '[^[:alnum:]]+') y WHERE y <> '') AS w) d
    WHERE (lower(btrim(s.terme)) = m OR m = ANY (SELECT lower(btrim(v)) FROM unnest(s.variantes) v))
      AND cardinality(w) >= 1
  ) t;
  RETURN '(' || array_to_string(formes, ' | ') || ')';
END;
$$;
GRANT EXECUTE ON FUNCTION public.requete_mot(text) TO anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.requete_articles(_q text)
RETURNS tsquery LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE
  jeton text;
  morceaux text[] := '{}';
  ou boolean := false;
  partie text;
  mots text[];
  expr text := '';
BEGIN
  FOR jeton IN
    SELECT (regexp_matches(left(coalesce(_q, ''), 200), '"[^"]+"|[^[:space:]"]+', 'g'))[1] LIMIT 12
  LOOP
    IF lower(jeton) IN ('ou', 'or') THEN
      ou := cardinality(morceaux) > 0;
      CONTINUE;
    END IF;
    IF left(jeton, 1) = '"' THEN
      mots := ARRAY(SELECT lower(w) FROM regexp_split_to_table(jeton, '[^[:alnum:]]+') w WHERE char_length(w) >= 1);
      CONTINUE WHEN cardinality(mots) = 0;
      partie := '(' || array_to_string(mots, ' <-> ') || ')';
    ELSIF left(jeton, 1) = '-' THEN
      partie := public.requete_mot(substr(jeton, 2));
      CONTINUE WHEN partie IS NULL;
      partie := '!' || partie;
    ELSE
      partie := public.requete_mot(jeton);
      CONTINUE WHEN partie IS NULL;
    END IF;
    IF ou THEN
      morceaux[cardinality(morceaux)] := '(' || morceaux[cardinality(morceaux)] || ' | ' || partie || ')';
    ELSE
      morceaux := morceaux || partie;
    END IF;
    ou := false;
  END LOOP;
  expr := array_to_string(morceaux, ' & ');
  IF expr = '' OR (expr ~ '^!' AND expr !~ ' & ') THEN
    RETURN NULL;
  END IF;
  RETURN to_tsquery('public.cds_fr', expr);
EXCEPTION WHEN syntax_error OR invalid_parameter_value THEN
  RETURN public.search_query(_q);
END;
$$;
GRANT EXECUTE ON FUNCTION public.requete_articles(text) TO anon, authenticated, service_role;
