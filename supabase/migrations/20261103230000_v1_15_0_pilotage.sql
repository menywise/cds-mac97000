-- Socle 1.15.0 — pilotage du contenu éditorial.
-- Lot 7 du plan docs/plans/CONTENUS_EDITORIAUX.md. Le calendrier et le tableau de santé se
-- calculent à l'écran à partir des données existantes (date prévue, statut, maillage, sources,
-- recherches sans résultat). La base apporte :
-- 1. Brief : intention du contenu (comprendre, comparer, agir) et appel à l'action choisi.
-- 2. Appels à l'action : encarts réglables affichés en fin d'article (démonstration, lettre
--    d'information, adhésion, contact…), gérés par les admins, lisibles de tous.
-- 3. Réglage : appel à l'action par défaut, utilisé quand un article n'en choisit pas.
-- 4. Grille de conformité et version 1.15.0.
-- Rejouable sans danger. Écrit pour l'éditeur SQL de Lovable : ni antislash ni point d'interrogation,
-- aucune ligne vide dans une instruction.

-- 2. Appels à l'action (avant le brief, qui y renvoie) ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.appels_action (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL CHECK (char_length(btrim(nom)) BETWEEN 2 AND 60),
  titre text NOT NULL CHECK (char_length(btrim(titre)) BETWEEN 3 AND 120),
  texte text NOT NULL DEFAULT '' CHECK (char_length(texte) <= 400),
  bouton text NOT NULL CHECK (char_length(btrim(bouton)) BETWEEN 2 AND 40),
  lien text NOT NULL CHECK (lien ~ '^(/|https://)' AND char_length(lien) <= 500),
  actif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.appels_action ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.appels_action TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appels_action TO authenticated;
GRANT ALL ON public.appels_action TO service_role;
DROP POLICY IF EXISTS "Appels a l action visibles de tous" ON public.appels_action;
CREATE POLICY "Appels a l action visibles de tous" ON public.appels_action FOR SELECT TO anon
  USING (actif);
DROP POLICY IF EXISTS "Appels a l action visibles des comptes" ON public.appels_action;
CREATE POLICY "Appels a l action visibles des comptes" ON public.appels_action FOR SELECT TO authenticated
  USING (actif OR public.can_write_content(auth.uid()));
DROP POLICY IF EXISTS "Admins gerent les appels a l action" ON public.appels_action;
CREATE POLICY "Admins gerent les appels a l action" ON public.appels_action FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 1. Brief -----------------------------------------------------------------------------------------
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS intention text NOT NULL DEFAULT '';
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS appel_action_id uuid
  REFERENCES public.appels_action (id) ON DELETE SET NULL;
ALTER TABLE public.contenus_publics DROP CONSTRAINT IF EXISTS contenus_publics_intention_check;
ALTER TABLE public.contenus_publics ADD CONSTRAINT contenus_publics_intention_check
  CHECK (intention IN ('', 'comprendre', 'comparer', 'agir'));

-- 3. Réglage ---------------------------------------------------------------------------------------
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
    'format_citation', 'vancouver',
    'appel_action_defaut', '')
$$;

-- 4. Grille de conformité et version ---------------------------------------------------------------
INSERT INTO public.template_checks (code, area, label, requirement, status, severity, evidence, position, modules)
SELECT 'V1-PILOTAGE-CONTENU', 'Contenus', 'Pilotage du contenu',
  'Brief (public, requête, intention, appel à l''action) ; appels à l''action réglables en fin d''article, gérés par les admins ; calendrier par date prévue et tableau de santé du contenu dans le poste Éditorial.',
  'conforme', 'mineur', 'tests/db/test_36',
  coalesce((SELECT max(position) FROM public.template_checks), 0) + 1, ARRAY['blog']
ON CONFLICT (code) DO NOTHING;
INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.15.0', 'brique', '2026-11-03',
  'Pilotage du contenu : brief, appels à l''action, calendrier, santé du contenu.',
  'Table appels_action ; colonnes intention et appel_action_id ; réglage appel_action_defaut. Calendrier et santé du contenu calculés dans le poste Éditorial.',
  '20261103230000_v1_15_0_pilotage')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.15.0', 'publie_le', '2026-11-03',
  'migration_reference', '20261103230000_v1_15_0_pilotage'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.15.0', '.')::int[];
