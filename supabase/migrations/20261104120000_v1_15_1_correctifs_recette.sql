-- Socle 1.15.1 — correctifs de la recette des contenus (docs/plans/CONTENUS_EDITORIAUX.md,
-- « Recette du 03/11/2026 », écarts R2 et R3).
-- 1. Suggestion de mot proche : seuil de similarité ramené de 0,35 à 0,3. Une faute d'une lettre
--    dans un mot de cinq lettres (similarité 0,33) trouve désormais sa suggestion (R3).
-- 2. Version 1.15.1. Côté code seulement : pages introuvables servies en noindex (R2).
-- Rejouable sans danger. Écrit pour l'éditeur SQL de Lovable : ni antislash ni point d'interrogation,
-- aucune ligne vide dans une instruction.

-- 1. Suggestion de mot proche ---------------------------------------------------------------------
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
      WHERE extensions.similarity(extensions.unaccent(v), extensions.unaccent(w)) >= 0.3
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

-- 2. Version -------------------------------------------------------------------------------------
INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.15.1', 'correctif', '2026-11-04',
  'Correctifs de la recette des contenus : suggestion de mot proche plus tolérante, pages introuvables non indexées.',
  'suggestion_recherche : seuil de similarité ramené de 0,35 à 0,3 (une faute d''une lettre dans un mot de cinq lettres trouve sa suggestion). Côté code : article, rubrique, étiquette et série introuvables servis en noindex.',
  '20261104120000_v1_15_1_correctifs_recette')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.15.1', 'publie_le', '2026-11-04',
  'migration_reference', '20261104120000_v1_15_1_correctifs_recette'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.15.1', '.')::int[];
