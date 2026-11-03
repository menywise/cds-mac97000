-- Socle 1.13.0 — recherche avancée dans les articles.
-- Lot 5 du plan docs/plans/CONTENUS_EDITORIAUX.md.
-- 1. Synonymes : un terme et ses variantes (« trois noms pour le même objet ») ; une recherche sur
--    l'un trouve les autres. Écrits par les rédacteurs.
-- 2. Requête : mots cherchés par leur début, phrase exacte entre guillemets, mot exclu par « - »,
--    alternative par « ou » ; chaque mot élargi à ses synonymes.
-- 3. Recherche des articles : filtres (rubrique, étiquette, série, depuis une date), pagination,
--    extrait surligné, pondération (titre, puis chapô et étiquettes, puis texte ; bonus pilier,
--    malus « à actualiser »). Règles d'accès du lecteur : un visiteur ne trouve que les articles
--    en ligne.
-- 4. Facettes : nombre de résultats par rubrique, étiquette, série et année.
-- 5. « Vouliez-vous dire » : mot le plus proche du vocabulaire des articles en ligne (pg_trgm).
-- 6. Recherches sans résultat : journal anonyme (terme, nombre, dates ; ni compte ni adresse),
--    lisible des rédacteurs, borné à 1 000 termes.
-- 7. Grille de conformité et version 1.13.0.
-- Rejouable sans danger. Écrit pour l'éditeur SQL de Lovable : ni antislash ni point d'interrogation,
-- aucune ligne vide dans une instruction.

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- 1. Synonymes -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.synonymes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  terme text NOT NULL CHECK (char_length(btrim(terme)) BETWEEN 2 AND 60),
  variantes text[] NOT NULL DEFAULT '{}' CHECK (cardinality(variantes) BETWEEN 1 AND 20),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS synonymes_terme_idx ON public.synonymes (lower(btrim(terme)));
ALTER TABLE public.synonymes ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.synonymes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.synonymes TO authenticated;
GRANT ALL ON public.synonymes TO service_role;
DROP POLICY IF EXISTS "Synonymes lisibles de tous" ON public.synonymes;
CREATE POLICY "Synonymes lisibles de tous" ON public.synonymes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Redacteurs gerent les synonymes" ON public.synonymes;
CREATE POLICY "Redacteurs gerent les synonymes" ON public.synonymes FOR ALL TO authenticated
  USING (public.can_write_content(auth.uid())) WITH CHECK (public.can_write_content(auth.uid()));

-- 2. Requête ---------------------------------------------------------------------------------------
-- Mot cherché : lettres et chiffres seulement, cherché par son début, élargi à ses synonymes ; une
-- variante de plusieurs mots est cherchée comme une phrase.
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
-- Requête complète : « phrase exacte », -exclu, ou, le reste en « et ». Null si rien à chercher.
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
    -- « ou » relie le mot qui suit au seul mot qui précède : a b ou c = a et (b ou c).
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

-- 6. Recherches sans résultat (avant la recherche, qui l'appelle) ----------------------------------
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
-- Terme ramené à des mots minuscules (5 au plus) ; rien d'autre n'est gardé.
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

-- 3. Recherche des articles ------------------------------------------------------------------------
-- Extrait surligné : les mots trouvés entre ⟦ et ⟧, que l'écran met en valeur.
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

-- 4. Facettes --------------------------------------------------------------------------------------
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

-- 5. Vouliez-vous dire -----------------------------------------------------------------------------
-- Chaque mot de 4 lettres au moins, absent du vocabulaire, est remplacé par le mot le plus proche
-- (titres et étiquettes des articles en ligne, synonymes). Null si rien à corriger.
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
    -- Comparaison sans accents : les trigrammes d'une lettre accentuée dépendent du serveur.
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

-- 7. Grille de conformité et version ---------------------------------------------------------------
INSERT INTO public.template_checks (code, area, label, requirement, status, severity, evidence, position, modules)
SELECT 'V1-RECHERCHE-ARTICLES', 'Contenus', 'Recherche avancée dans les articles',
  'Début de mot, phrase exacte, mot exclu, alternative, synonymes ; filtres et facettes (rubrique, étiquette, série, année) ; extrait surligné ; suggestion de mot proche ; visiteur limité aux articles en ligne ; recherches sans résultat notées sans compte ni adresse.',
  'conforme', 'mineur', 'tests/db/test_34',
  coalesce((SELECT max(position) FROM public.template_checks), 0) + 1, ARRAY['blog']
ON CONFLICT (code) DO NOTHING;
INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.13.0', 'brique', '2026-11-03',
  'Recherche avancée dans les articles : opérateurs, synonymes, facettes, extraits, suggestions, recherches sans résultat.',
  'pg_trgm ; table synonymes ; requete_articles ; recherche_articles (filtres, pagination, extrait surligné, pondération) ; recherche_articles_facettes ; suggestion_recherche ; table recherches_sans_resultat (anonyme, 1 000 termes au plus).',
  '20261103200000_v1_13_0_recherche')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.13.0', 'publie_le', '2026-11-03',
  'migration_reference', '20261103200000_v1_13_0_recherche'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.13.0', '.')::int[];
