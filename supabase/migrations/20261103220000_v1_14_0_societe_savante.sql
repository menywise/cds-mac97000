-- Socle 1.14.0 — exigences d'une société savante pour les contenus éditoriaux.
-- Lot 6 du plan docs/plans/CONTENUS_EDITORIAUX.md. Chaque exigence est un réglage ou un champ
-- facultatif : un site qui n'en veut pas ne voit rien changer.
-- 1. Champs : genre (article, guide, actualité, compte rendu, entretien, fiche pratique) ; événement
--    et date d'un compte rendu ; déclaration de liens d'intérêts ; niveau de preuve ; relecteurs
--    (leur fonction, cinq au plus).
-- 2. Bibliographie structurée : références numérotées d'un contenu (auteurs, titre, revue, année,
--    DOI, PMID, adresse), lisibles comme le contenu, écrites par les rédacteurs. Un appel [n] dans
--    le texte renvoie à la référence n.
-- 3. Réglages : liens d'intérêts exigés (non par défaut), liste des niveaux de preuve, format de
--    citation (Vancouver par défaut, ou APA).
-- 4. Manques : liens d'intérêts exigés et absents ; compte rendu sans événement ; niveau de preuve
--    hors de la liste ; appel [n] sans référence.
-- 5. Grille de conformité et version 1.14.0.
-- L'accès réservé aux membres est reporté à un lot dédié (masquer le texte sans fuite par la
-- recherche ni les extraits).
-- Rejouable sans danger. Écrit pour l'éditeur SQL de Lovable : ni antislash ni point d'interrogation,
-- aucune ligne vide dans une instruction.

-- 1. Champs ----------------------------------------------------------------------------------------
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS genre text NOT NULL DEFAULT 'article';
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS evenement text NOT NULL DEFAULT '';
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS evenement_le date;
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS liens_interets text NOT NULL DEFAULT '';
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS niveau_preuve text NOT NULL DEFAULT '';
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS relecteurs text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.contenus_publics DROP CONSTRAINT IF EXISTS contenus_publics_savante_check;
ALTER TABLE public.contenus_publics ADD CONSTRAINT contenus_publics_savante_check
  CHECK (genre IN ('article', 'guide', 'actualite', 'compte_rendu', 'entretien', 'fiche_pratique')
         AND char_length(evenement) <= 160 AND char_length(liens_interets) <= 600
         AND char_length(niveau_preuve) <= 60 AND cardinality(relecteurs) <= 5
         AND char_length(array_to_string(relecteurs, '')) <= 400);

-- 2. Bibliographie structurée ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.references_contenu (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contenu_id uuid NOT NULL REFERENCES public.contenus_publics (id) ON DELETE CASCADE,
  rang integer NOT NULL CHECK (rang BETWEEN 1 AND 999),
  auteurs text NOT NULL DEFAULT '' CHECK (char_length(auteurs) <= 300),
  titre text NOT NULL CHECK (char_length(btrim(titre)) BETWEEN 3 AND 300),
  revue text NOT NULL DEFAULT '' CHECK (char_length(revue) <= 200),
  annee integer CHECK (annee BETWEEN 1800 AND 2100),
  doi text NOT NULL DEFAULT '' CHECK (doi = '' OR (doi ~ '^10[.][0-9]{4,9}/[^[:space:]]+$' AND char_length(doi) <= 200)),
  pmid text NOT NULL DEFAULT '' CHECK (pmid = '' OR pmid ~ '^[0-9]{1,9}$'),
  url text NOT NULL DEFAULT '' CHECK (url = '' OR (url ~ '^https://' AND char_length(url) <= 2000)),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contenu_id, rang)
);
ALTER TABLE public.references_contenu ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.references_contenu TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.references_contenu TO authenticated;
GRANT ALL ON public.references_contenu TO service_role;
-- Lisible quand le contenu l'est : les règles d'accès de contenus_publics s'appliquent au lecteur.
DROP POLICY IF EXISTS "References lisibles avec leur contenu" ON public.references_contenu;
CREATE POLICY "References lisibles avec leur contenu" ON public.references_contenu FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.contenus_publics c WHERE c.id = contenu_id));
DROP POLICY IF EXISTS "Redacteurs ecrivent les references" ON public.references_contenu;
CREATE POLICY "Redacteurs ecrivent les references" ON public.references_contenu FOR ALL TO authenticated
  USING (public.can_write_content(auth.uid())) WITH CHECK (public.can_write_content(auth.uid()));

-- 3. Réglages --------------------------------------------------------------------------------------
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
    'type_page', 'WebPage',
    'exiger_liens_interets', false,
    'niveaux_preuve', jsonb_build_array('Recommandation officielle', 'Consensus d''experts', 'Étude publiée', 'Retour de terrain'),
    'format_citation', 'vancouver')
$$;

-- 4. Manques ---------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.manques_contenu(_c public.contenus_publics)
 RETURNS TABLE(code text, message text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  r jsonb := public.editorial_reglages();
  trouves text[];
  casses text[];
  lt integer := char_length(btrim(_c.titre));
  ld integer := char_length(btrim(_c.description));
  pilier_slug text;
  appels integer[];
  manquants integer[];
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
  IF _c.type = 'article' THEN
    IF coalesce((r ->> 'exiger_liens_interets')::boolean, false) AND btrim(_c.liens_interets) = '' THEN
      code := 'liens_interets'; message := 'Déclaration de liens d''intérêts manquante (écrire « Aucun » s''il n''y en a pas).'; RETURN NEXT;
    END IF;
    IF _c.genre = 'compte_rendu' AND (btrim(_c.evenement) = '' OR _c.evenement_le IS NULL) THEN
      code := 'evenement'; message := 'Compte rendu : nom et date de l''événement attendus.'; RETURN NEXT;
    END IF;
    IF btrim(_c.niveau_preuve) <> '' AND NOT _c.niveau_preuve IN (
         SELECT jsonb_array_elements_text(coalesce(r -> 'niveaux_preuve', '[]'::jsonb))) THEN
      code := 'niveau_preuve'; message := format('Niveau de preuve inconnu : %s.', _c.niveau_preuve); RETURN NEXT;
    END IF;
  END IF;
  appels := ARRAY(SELECT DISTINCT (m[1])::integer
                  FROM regexp_matches(_c.corps, '[[]([0-9]{1,3})[]]([^(]|$)', 'g') m);
  manquants := ARRAY(SELECT a FROM unnest(appels) a
                     WHERE NOT EXISTS (SELECT 1 FROM public.references_contenu x WHERE x.contenu_id = _c.id AND x.rang = a)
                     ORDER BY a);
  IF cardinality(manquants) > 0 THEN
    code := 'references'; message := format('Appels sans référence : %s.', array_to_string(ARRAY(SELECT '[' || a || ']' FROM unnest(manquants) a), ', ')); RETURN NEXT;
  END IF;
  trouves := public.termes_interdits_trouves(public.texte_contenu_public(_c));
  IF cardinality(trouves) > 0 THEN
    code := 'termes'; message := format('Termes interdits repérés : %s.', array_to_string(trouves, ', ')); RETURN NEXT;
  END IF;
END;
$$;

-- 5. Grille de conformité et version ---------------------------------------------------------------
INSERT INTO public.template_checks (code, area, label, requirement, status, severity, evidence, position, modules)
SELECT 'V1-SOCIETE-SAVANTE', 'Contenus', 'Exigences d''une société savante',
  'Bibliographie structurée et appels numérotés vérifiés avant publication ; liens d''intérêts exigés par réglage ; niveau de preuve tiré d''une liste réglée ; compte rendu daté et rattaché à son événement ; relecteurs désignés par leur fonction.',
  'conforme', 'mineur', 'tests/db/test_35',
  coalesce((SELECT max(position) FROM public.template_checks), 0) + 1, ARRAY['blog']
ON CONFLICT (code) DO NOTHING;
INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.14.0', 'brique', '2026-11-03',
  'Exigences d''une société savante : bibliographie, liens d''intérêts, niveau de preuve, genres de contenu, relecteurs.',
  'Colonnes genre, evenement, evenement_le, liens_interets, niveau_preuve, relecteurs ; table references_contenu ; réglages exiger_liens_interets, niveaux_preuve, format_citation ; manques liens_interets, evenement, niveau_preuve, references.',
  '20261103220000_v1_14_0_societe_savante')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.14.0', 'publie_le', '2026-11-03',
  'migration_reference', '20261103220000_v1_14_0_societe_savante'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.14.0', '.')::int[];
