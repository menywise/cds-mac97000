CREATE OR REPLACE FUNCTION public.ancre_pauvre(_ancre text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT lower(btrim(_ancre)) IN ('ici', 'cliquez ici', 'cliquer ici', 'ce lien', 'lien', 'cet article',
    'cette page', 'en savoir plus', 'lire la suite', 'la suite', 'voir', 'voir plus', 'plus', 'là', 'article')
$$;
GRANT EXECUTE ON FUNCTION public.ancre_pauvre(text) TO anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.maillage_etat()
RETURNS TABLE (id uuid, sortants integer, entrants integer, orphelin boolean, liens_casses text[],
               liens_rediriges text[], ancres_pauvres text[], satellites_absents text[], requete_en_double text[])
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
BEGIN
  IF NOT public.can_write_content(auth.uid()) THEN
    RAISE EXCEPTION 'Réservé aux rédacteurs et aux administrateurs.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  WITH arts AS (
    SELECT c.* FROM public.contenus_publics c WHERE c.type = 'article'
  ), liens AS (
    SELECT a.id AS source_id, a.publie AS source_en_ligne, l.*
    FROM arts a CROSS JOIN LATERAL public.liens_du_texte(a.corps) l
  )
  SELECT a.id,
    (SELECT count(*)::integer FROM liens WHERE source_id = a.id),
    (SELECT count(DISTINCT source_id)::integer FROM liens WHERE cible_id = a.id AND source_id <> a.id AND source_en_ligne),
    a.publie AND NOT EXISTS (SELECT 1 FROM liens WHERE cible_id = a.id AND source_id <> a.id AND source_en_ligne),
    coalesce((SELECT array_agg(DISTINCT chemin ORDER BY chemin) FROM liens
              WHERE source_id = a.id AND (cible_id IS NULL OR NOT cible_publiee)), '{}'),
    coalesce((SELECT array_agg(DISTINCT chemin ORDER BY chemin) FROM liens
              WHERE source_id = a.id AND redirige_vers IS NOT NULL), '{}'),
    coalesce((SELECT array_agg(DISTINCT ancre ORDER BY ancre) FROM liens
              WHERE source_id = a.id AND public.ancre_pauvre(ancre)), '{}'),
    CASE WHEN a.est_pilier THEN coalesce((
      SELECT array_agg(s.titre ORDER BY s.titre) FROM arts s
      WHERE s.pilier_id = a.id AND s.publie
        AND NOT EXISTS (SELECT 1 FROM liens WHERE source_id = a.id AND cible_id = s.id)), '{}')
    ELSE '{}'::text[] END,
    CASE WHEN btrim(a.requete_visee) = '' THEN '{}'::text[] ELSE coalesce((
      SELECT array_agg(o.titre ORDER BY o.titre) FROM arts o
      WHERE o.id <> a.id AND lower(btrim(o.requete_visee)) = lower(btrim(a.requete_visee))), '{}') END
  FROM arts a;
END;
$$;
REVOKE ALL ON FUNCTION public.maillage_etat() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.maillage_etat() TO authenticated;
