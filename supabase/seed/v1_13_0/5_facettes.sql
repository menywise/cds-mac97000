CREATE OR REPLACE FUNCTION public.recherche_articles_facettes(_q text)
RETURNS TABLE (facette text, cle text, libelle text, nombre integer)
LANGUAGE plpgsql STABLE SET search_path = public AS $$
#variable_conflict use_column
DECLARE
  tsq tsquery := public.requete_articles(_q);
BEGIN
  IF tsq IS NULL THEN
    RETURN;
  END IF;
  RETURN QUERY
  WITH trouves AS (
    SELECT c.* FROM public.contenus_publics c
    WHERE c.type = 'article' AND c.publie AND (c.publie_le IS NULL OR c.publie_le <= now())
      AND c.search_doc @@ tsq
  )
  SELECT 'rubrique', r.slug, r.libelle, count(*)::integer
  FROM trouves t JOIN public.rubriques x ON x.id = t.rubrique_id
  JOIN public.rubriques r ON r.id = coalesce(x.parent_id, x.id)
  GROUP BY r.slug, r.libelle
  UNION ALL
  SELECT 'etiquette', e.slug, e.libelle, count(*)::integer
  FROM trouves t, unnest(t.etiquettes) l JOIN public.etiquettes e ON e.libelle = l
  GROUP BY e.slug, e.libelle
  UNION ALL
  SELECT 'serie', s.slug, s.titre, count(*)::integer
  FROM trouves t JOIN public.series s ON s.id = t.serie_id
  GROUP BY s.slug, s.titre
  UNION ALL
  SELECT 'annee', to_char(t.publie_le, 'YYYY'), to_char(t.publie_le, 'YYYY'), count(*)::integer
  FROM trouves t WHERE t.publie_le IS NOT NULL
  GROUP BY to_char(t.publie_le, 'YYYY')
  ORDER BY 1, 4 DESC, 3;
END;
$$;
GRANT EXECUTE ON FUNCTION public.recherche_articles_facettes(text) TO anon, authenticated, service_role;
