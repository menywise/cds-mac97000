CREATE OR REPLACE FUNCTION public.recherche_articles(_q text, _rubrique text DEFAULT NULL, _etiquette text DEFAULT NULL,
  _serie text DEFAULT NULL, _depuis date DEFAULT NULL, _limite integer DEFAULT 12, _decalage integer DEFAULT 0)
RETURNS TABLE (id uuid, slug text, titre text, chapo text, publie_le timestamptz, etiquettes text[],
               extrait text, rang real, total bigint)
LANGUAGE plpgsql VOLATILE SET search_path = public AS $$
#variable_conflict use_column
DECLARE
  tsq tsquery := public.requete_articles(_q);
  rubriques uuid[];
  libelle_etiquette text;
  n bigint;
BEGIN
  IF tsq IS NULL THEN
    RETURN;
  END IF;
  IF _rubrique IS NOT NULL THEN
    rubriques := ARRAY(SELECT r.id FROM public.rubriques r
                       WHERE r.slug = _rubrique
                          OR r.parent_id = (SELECT x.id FROM public.rubriques x WHERE x.slug = _rubrique));
  END IF;
  IF _etiquette IS NOT NULL THEN
    SELECT e.libelle INTO libelle_etiquette FROM public.etiquettes e WHERE e.slug = _etiquette;
  END IF;
  RETURN QUERY
  WITH trouves AS (
    SELECT c.*,
      ts_rank(c.search_doc, tsq)
        * CASE WHEN c.est_pilier THEN 1.2 ELSE 1 END
        * CASE WHEN public.statut_effectif(c.statut, c.type, c.publie_le, c.relu_le) = 'a_actualiser' THEN 0.8 ELSE 1 END AS r
    FROM public.contenus_publics c
    WHERE c.type = 'article' AND c.publie AND (c.publie_le IS NULL OR c.publie_le <= now())
      AND c.search_doc @@ tsq
      AND (_rubrique IS NULL OR c.rubrique_id = ANY (rubriques))
      AND (_etiquette IS NULL OR libelle_etiquette = ANY (c.etiquettes))
      AND (_serie IS NULL OR c.serie_id = (SELECT s.id FROM public.series s WHERE s.slug = _serie))
      AND (_depuis IS NULL OR c.publie_le >= _depuis)
  )
  SELECT t.id, t.slug, t.titre, t.chapo, t.publie_le, t.etiquettes,
    ts_headline('public.cds_fr',
      public.search_excerpt(t.titre || '. ' || coalesce(nullif(t.chapo, ''), '') || ' ' || t.corps),
      tsq, 'StartSel=⟦, StopSel=⟧, MaxWords=35, MinWords=15, ShortWord=2, MaxFragments=2, FragmentDelimiter= … '),
    t.r::real, count(*) OVER ()
  FROM trouves t
  ORDER BY t.r DESC, t.publie_le DESC NULLS LAST
  LIMIT least(greatest(coalesce(_limite, 12), 1), 50) OFFSET greatest(coalesce(_decalage, 0), 0);
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 AND coalesce(_decalage, 0) = 0 AND _rubrique IS NULL AND _etiquette IS NULL AND _serie IS NULL AND _depuis IS NULL THEN
    PERFORM public.noter_recherche_sans_resultat(_q);
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.recherche_articles(text, text, text, text, date, integer, integer) TO anon, authenticated, service_role;
