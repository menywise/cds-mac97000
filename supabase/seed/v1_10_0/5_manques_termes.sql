CREATE OR REPLACE FUNCTION public.statut_effectif(_statut text, _type text, _publie_le timestamptz, _relu_le date)
RETURNS text LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE
  r jsonb := public.editorial_reglages();
BEGIN
  IF _statut = 'publie' AND _publie_le > now() THEN
    RETURN 'programme';
  END IF;
  IF _statut = 'publie' AND _type = 'article' AND coalesce((r ->> 'exiger_relecture')::boolean, true)
     AND (_relu_le IS NULL
          OR _relu_le + make_interval(months => coalesce((r ->> 'delai_relecture_mois')::int, 12)) < current_date) THEN
    RETURN 'a_actualiser';
  END IF;
  RETURN _statut;
END;
$$;
GRANT EXECUTE ON FUNCTION public.statut_effectif(text, text, timestamptz, date) TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.texte_normalise(_t text)
RETURNS text LANGUAGE sql STABLE SET search_path = public, extensions AS $$
  SELECT ' ' || btrim(regexp_replace(lower(extensions.unaccent(coalesce(_t, ''))), '[^[:alnum:]]+', ' ', 'g')) || ' '
$$;
GRANT EXECUTE ON FUNCTION public.texte_normalise(text) TO authenticated, service_role;
CREATE TABLE IF NOT EXISTS public.termes_interdits_publics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  terme text NOT NULL CHECK (char_length(btrim(terme)) BETWEEN 3 AND 120),
  categorie text NOT NULL DEFAULT 'autre'
    CHECK (categorie IN ('etablissement', 'groupe', 'ville', 'marque', 'personne', 'autre')),
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS termes_interdits_publics_terme_idx
  ON public.termes_interdits_publics (lower(btrim(terme)));
ALTER TABLE public.termes_interdits_publics ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.termes_interdits_publics FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.termes_interdits_publics TO authenticated;
GRANT ALL ON public.termes_interdits_publics TO service_role;
DROP POLICY IF EXISTS "Admins gerent les termes interdits" ON public.termes_interdits_publics;
CREATE POLICY "Admins gerent les termes interdits" ON public.termes_interdits_publics FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE OR REPLACE FUNCTION public.termes_interdits_trouves(_texte text)
RETURNS text[] LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  n text := public.texte_normalise(_texte);
  trouves text[] := '{}';
  extra text[];
  r record;
BEGIN
  IF btrim(n) = '' THEN
    RETURN trouves;
  END IF;
  FOR r IN SELECT btrim(terme) AS terme FROM public.termes_interdits_publics LOOP
    IF btrim(public.texte_normalise(r.terme)) <> '' AND strpos(n, public.texte_normalise(r.terme)) > 0 THEN
      trouves := trouves || r.terme;
    END IF;
  END LOOP;
  IF to_regprocedure('public.greffe_termes_nominatifs(text)') IS NOT NULL THEN
    EXECUTE 'SELECT public.greffe_termes_nominatifs($1)' INTO extra USING _texte;
    trouves := trouves || coalesce(extra, '{}');
  END IF;
  RETURN (SELECT coalesce(array_agg(DISTINCT x ORDER BY x), '{}') FROM unnest(trouves) x);
END;
$$;
REVOKE ALL ON FUNCTION public.termes_interdits_trouves(text) FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.texte_contenu_public(_c public.contenus_publics)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT concat_ws(chr(10), _c.titre, _c.description, _c.chapo, _c.corps, replace(_c.slug, '-', ' '))
$$;
CREATE OR REPLACE FUNCTION public.manques_contenu(_c public.contenus_publics)
RETURNS TABLE (code text, message text) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r jsonb := public.editorial_reglages();
  trouves text[];
  lt integer := char_length(btrim(_c.titre));
  ld integer := char_length(btrim(_c.description));
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
  trouves := public.termes_interdits_trouves(public.texte_contenu_public(_c));
  IF cardinality(trouves) > 0 THEN
    code := 'termes'; message := format('Termes interdits repérés : %s.', array_to_string(trouves, ', ')); RETURN NEXT;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.manques_contenu(public.contenus_publics) FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.manques_publication(_id uuid)
RETURNS TABLE (code text, message text) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.contenus_publics;
BEGIN
  IF NOT public.can_write_content(auth.uid()) THEN
    RAISE EXCEPTION 'Réservé aux rédacteurs et aux administrateurs.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO c FROM public.contenus_publics WHERE id = _id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contenu introuvable.' USING ERRCODE = 'P0002';
  END IF;
  RETURN QUERY SELECT m.code, m.message FROM public.manques_contenu(c) m;
END;
$$;
REVOKE ALL ON FUNCTION public.manques_publication(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manques_publication(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.editorial_etat()
RETURNS TABLE (id uuid, statut_lu text, codes text[], manques text[])
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_write_content(auth.uid()) THEN
    RAISE EXCEPTION 'Réservé aux rédacteurs et aux administrateurs.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT c.id, public.statut_effectif(c.statut, c.type, c.publie_le, c.relu_le),
           coalesce(array_agg(m.code) FILTER (WHERE m.code IS NOT NULL), '{}'),
           coalesce(array_agg(m.message) FILTER (WHERE m.code IS NOT NULL), '{}')
    FROM public.contenus_publics c
    LEFT JOIN LATERAL public.manques_contenu(c) m ON true
    GROUP BY c.id;
END;
$$;
REVOKE ALL ON FUNCTION public.editorial_etat() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.editorial_etat() TO authenticated;
CREATE OR REPLACE FUNCTION public.contenus_publics_a_revoir()
RETURNS TABLE (id uuid, type text, slug text, titre text, termes text[])
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Réservé aux administrateurs.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT c.id, c.type, c.slug, c.titre, t.termes
    FROM public.contenus_publics c
    CROSS JOIN LATERAL (SELECT public.termes_interdits_trouves(public.texte_contenu_public(c)) AS termes) t
    WHERE c.publie AND cardinality(t.termes) > 0
    ORDER BY c.type, c.slug;
END;
$$;
REVOKE ALL ON FUNCTION public.contenus_publics_a_revoir() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.contenus_publics_a_revoir() TO authenticated;
