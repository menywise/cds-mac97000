CREATE OR REPLACE FUNCTION public.liens_du_texte(_corps text)
RETURNS TABLE (rang integer, ancre text, chemin text, cible_id uuid, cible_publiee boolean, redirige_vers text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.rang, l.ancre, l.chemin, c.id,
         coalesce(c.publie AND (c.publie_le IS NULL OR c.publie_le <= now()), false),
         r.vers
  FROM public.extraire_liens(_corps) l
  LEFT JOIN public.redirections r ON r.de = l.chemin
  LEFT JOIN public.contenus_publics c
    ON c.type = 'article' AND c.slug = public.slug_article_du_chemin(coalesce(r.vers, l.chemin))
  WHERE public.slug_article_du_chemin(l.chemin) IS NOT NULL
$$;
REVOKE ALL ON FUNCTION public.liens_du_texte(text) FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.manques_contenu(_c public.contenus_publics)
RETURNS TABLE (code text, message text) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r jsonb := public.editorial_reglages();
  trouves text[];
  casses text[];
  lt integer := char_length(btrim(_c.titre));
  ld integer := char_length(btrim(_c.description));
  pilier_slug text;
BEGIN
  IF coalesce((r ->> 'longueurs_seo')::boolean, true) THEN
    IF lt < 10 OR lt > 70 THEN
      code := 'titre'; message := format('Titre : de 10 à 70 caractères (%s aujourd''hui).', lt); RETURN NEXT;
    END IF;
    IF ld < 70 OR ld > 160 THEN
      code := 'description'; message := format('Description : de 70 à 160 caractères (%s aujourd''hui).', ld); RETURN NEXT;
    END IF;
  END IF;
  IF btrim(_c.corps) = '' THEN
    code := 'corps'; message := 'Le texte est vide.'; RETURN NEXT;
  END IF;
  IF _c.type = 'article' THEN
    IF coalesce((r ->> 'exiger_auteur')::boolean, true) THEN
      IF r ->> 'auteur_mode' = 'nomme' AND btrim(_c.auteur_nom) = '' THEN
        code := 'auteur'; message := 'Nom de l''auteur manquant.'; RETURN NEXT;
      ELSIF coalesce(r ->> 'auteur_mode', 'fonction') <> 'nomme' AND btrim(_c.auteur_fonction) = '' THEN
        code := 'auteur'; message := 'Fonction de l''auteur manquante.'; RETURN NEXT;
      END IF;
    END IF;
    IF coalesce((r ->> 'exiger_sources')::boolean, true) AND strpos(_c.sources, 'https://') = 0 THEN
      code := 'sources'; message := 'Source manquante (adresse https://).'; RETURN NEXT;
    END IF;
    IF coalesce((r ->> 'exiger_relecture')::boolean, true) AND _c.relu_le IS NULL THEN
      code := 'relecture'; message := 'Relecture à valider.'; RETURN NEXT;
    END IF;
  END IF;
  SELECT array_agg(DISTINCT l.chemin ORDER BY l.chemin) INTO casses
  FROM public.liens_du_texte(_c.corps) l
  WHERE (l.cible_id IS NULL OR NOT l.cible_publiee) AND l.cible_id IS DISTINCT FROM _c.id;
  IF cardinality(casses) > 0 THEN
    code := 'liens'; message := format('Liens internes cassés ou vers un contenu hors ligne : %s.', array_to_string(casses, ', ')); RETURN NEXT;
  END IF;
  IF _c.pilier_id IS NOT NULL THEN
    SELECT slug INTO pilier_slug FROM public.contenus_publics WHERE id = _c.pilier_id;
    IF pilier_slug IS NOT NULL AND NOT EXISTS (
         SELECT 1 FROM public.liens_du_texte(_c.corps) l WHERE l.cible_id = _c.pilier_id) THEN
      code := 'pilier'; message := format('Lien vers le pilier manquant : [texte](/blog/%s).', pilier_slug); RETURN NEXT;
    END IF;
  END IF;
  trouves := public.termes_interdits_trouves(public.texte_contenu_public(_c));
  IF cardinality(trouves) > 0 THEN
    code := 'termes'; message := format('Termes interdits repérés : %s.', array_to_string(trouves, ', ')); RETURN NEXT;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.manques_contenu(public.contenus_publics) FROM PUBLIC, anon, authenticated;
