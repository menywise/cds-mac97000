-- Socle 1.12.0 — référencement technique des contenus éditoriaux.
-- Lot 4 du plan docs/plans/CONTENUS_EDITORIAUX.md. L'essentiel de ce lot est dans le code : moteur
-- de texte des articles (intertitres ancrés, sommaire, encadré, questions-réponses), données
-- structurées, balises d'article, plan du site des images, flux RSS par rubrique et par étiquette.
-- La base apporte :
-- 1. État des liens de sources : vérifiés à la demande par le serveur, pour un rédacteur ; la base
--    enregistre le résultat après avoir revérifié le droit du compte (aucune clé de service).
-- 2. Sources à vérifier : adresses citées par les contenus, avec les contenus qui les citent.
-- 3. Réglage « type_page » : WebPage (par défaut) ou MedicalWebPage, pour un site santé.
-- 4. Grille de conformité et version 1.12.0.
-- Rejouable sans danger. Écrit pour l'éditeur SQL de Lovable : ni antislash ni point d'interrogation,
-- aucune ligne vide dans une instruction.

-- 1. État des liens de sources ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.liens_sources_etat (
  url text PRIMARY KEY CHECK (url ~ '^https://' AND char_length(url) <= 2000),
  ok boolean NOT NULL,
  code_http integer,
  erreur text NOT NULL DEFAULT '' CHECK (char_length(erreur) <= 300),
  verifie_le timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.liens_sources_etat ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.liens_sources_etat FROM anon;
GRANT SELECT ON public.liens_sources_etat TO authenticated;
GRANT ALL ON public.liens_sources_etat TO service_role;
DROP POLICY IF EXISTS "Redacteurs lisent l etat des sources" ON public.liens_sources_etat;
CREATE POLICY "Redacteurs lisent l etat des sources" ON public.liens_sources_etat FOR SELECT TO authenticated
  USING (public.can_write_content(auth.uid()));
-- Résultats d'une vérification : [{url, ok, code_http, erreur}], 100 au plus par appel.
CREATE OR REPLACE FUNCTION public.enregistrer_liens_sources(_etats jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  e jsonb;
  n integer := 0;
BEGIN
  IF NOT public.can_write_content(auth.uid()) THEN
    RAISE EXCEPTION 'Réservé aux rédacteurs et aux administrateurs.' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(_etats) <> 'array' OR jsonb_array_length(_etats) > 100 THEN
    RAISE EXCEPTION 'Liste de résultats attendue, 100 au plus.' USING ERRCODE = '22023';
  END IF;
  FOR e IN SELECT * FROM jsonb_array_elements(_etats) LOOP
    CONTINUE WHEN coalesce(e ->> 'url', '') !~ '^https://' OR char_length(e ->> 'url') > 2000;
    INSERT INTO public.liens_sources_etat (url, ok, code_http, erreur, verifie_le)
    VALUES (e ->> 'url', coalesce((e ->> 'ok')::boolean, false),
            CASE WHEN coalesce(e ->> 'code_http', '') ~ '^[0-9]{3}$' THEN (e ->> 'code_http')::integer END,
            left(coalesce(e ->> 'erreur', ''), 300), now())
    ON CONFLICT (url) DO UPDATE SET ok = EXCLUDED.ok, code_http = EXCLUDED.code_http,
      erreur = EXCLUDED.erreur, verifie_le = EXCLUDED.verifie_le;
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION public.enregistrer_liens_sources(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enregistrer_liens_sources(jsonb) TO authenticated;

-- 2. Sources à vérifier ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sources_a_verifier()
RETURNS TABLE (url text, contenus text[], verifie_le timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
BEGIN
  IF NOT public.can_write_content(auth.uid()) THEN
    RAISE EXCEPTION 'Réservé aux rédacteurs et aux administrateurs.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT s.url, array_agg(DISTINCT s.titre ORDER BY s.titre), max(e.verifie_le)
  FROM (
    SELECT (regexp_matches(c.sources, 'https://[^[:space:]]+', 'g'))[1] AS url, c.titre
    FROM public.contenus_publics c
  ) s
  LEFT JOIN public.liens_sources_etat e ON e.url = s.url
  GROUP BY s.url
  ORDER BY max(e.verifie_le) NULLS FIRST, s.url;
END;
$$;
REVOKE ALL ON FUNCTION public.sources_a_verifier() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sources_a_verifier() TO authenticated;

-- 3. Réglage du type de page -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.editorial_defaults()
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT jsonb_build_object(
    'circuit', 'complet',
    'delai_relecture_mois', 12,
    'exiger_sources', true,
    'exiger_relecture', true,
    'exiger_auteur', true,
    'longueurs_seo', true,
    'auteur_mode', 'fonction',
    'avertissement', '',
    'seuil_etiquette', 3,
    'type_page', 'WebPage')
$$;

-- 4. Grille de conformité et version ---------------------------------------------------------------
INSERT INTO public.template_checks (code, area, label, requirement, status, severity, evidence, position, modules)
SELECT 'V1-SEO-ARTICLES', 'Contenus', 'Référencement technique des articles',
  'Intertitres ancrés et sommaire, données structurées (dates, relecture, auteur, rubrique, étiquettes, série, sources, questions-réponses), balises d''article, plan du site des images, flux RSS par rubrique et par étiquette, état des liens de sources vérifié à la demande.',
  'conforme', 'mineur', 'tests/db/test_33',
  coalesce((SELECT max(position) FROM public.template_checks), 0) + 1, ARRAY['blog']
ON CONFLICT (code) DO NOTHING;
INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.12.0', 'brique', '2026-11-03',
  'Référencement technique des articles : texte structuré, données structurées, flux, liens de sources.',
  'Table liens_sources_etat et enregistrer_liens_sources (droit revérifié par la base) ; sources_a_verifier ; réglage type_page. Côté code : moteur de texte des articles, données structurées, balises d''article, plan du site des images, flux RSS par rubrique et par étiquette.',
  '20261103180000_v1_12_0_seo_technique')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.12.0', 'publie_le', '2026-11-03',
  'migration_reference', '20261103180000_v1_12_0_seo_technique'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.12.0', '.')::int[];
