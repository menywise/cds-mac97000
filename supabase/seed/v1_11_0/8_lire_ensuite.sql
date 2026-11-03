CREATE OR REPLACE FUNCTION public.lire_ensuite(_id uuid, _n integer DEFAULT 3)
RETURNS TABLE (id uuid, slug text, titre text, chapo text, publie_le timestamptz)
LANGUAGE sql STABLE SET search_path = public AS $$
  WITH s AS (SELECT * FROM public.contenus_publics WHERE id = _id)
  SELECT c.id, c.slug, c.titre, c.chapo, c.publie_le
  FROM public.contenus_publics c, s
  WHERE c.type = 'article' AND c.publie AND (c.publie_le IS NULL OR c.publie_le <= now()) AND c.id <> s.id
  ORDER BY
    (CASE WHEN c.id = s.pilier_id OR c.pilier_id = s.id
               OR (s.pilier_id IS NOT NULL AND c.pilier_id = s.pilier_id) THEN 100 ELSE 0 END
     + 10 * (SELECT count(*) FROM unnest(c.etiquettes) e WHERE e = ANY (s.etiquettes))
     + CASE WHEN s.rubrique_id IS NOT NULL AND c.rubrique_id = s.rubrique_id THEN 5 ELSE 0 END
     + CASE WHEN s.serie_id IS NOT NULL AND c.serie_id = s.serie_id THEN 3 ELSE 0 END) DESC,
    c.publie_le DESC NULLS LAST
  LIMIT least(greatest(coalesce(_n, 3), 1), 12)
$$;
GRANT EXECUTE ON FUNCTION public.lire_ensuite(uuid, integer) TO anon, authenticated, service_role;
