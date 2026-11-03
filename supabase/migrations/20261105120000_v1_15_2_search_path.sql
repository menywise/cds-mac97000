-- Socle 1.15.2 — audit du 03/11/2026 : trois fonctions de public sans search_path figé
-- (avis Supabase « function_search_path_mutable »). Même réglage que les autres fonctions du socle.
-- Rejouable sans danger. Écrit pour l'éditeur SQL de Lovable : ni antislash ni point d'interrogation,
-- aucune ligne vide dans une instruction.

-- 1. search_path figé -----------------------------------------------------------------------------
ALTER FUNCTION public.search_tags(text[]) SET search_path = public;
ALTER FUNCTION public.search_excerpt(text) SET search_path = public;
ALTER FUNCTION public.geo_distance_km(double precision, double precision, double precision, double precision)
  SET search_path = public;

-- 2. Version -------------------------------------------------------------------------------------
INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.15.2', 'correctif', '2026-11-05',
  'Audit : search_path figé sur les trois dernières fonctions qui ne le fixaient pas.',
  'search_tags, search_excerpt et geo_distance_km fixent search_path = public, comme toutes les autres fonctions du socle (avis Supabase function_search_path_mutable). Aucun changement de comportement.',
  '20261105120000_v1_15_2_search_path')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.15.2', 'publie_le', '2026-11-05',
  'migration_reference', '20261105120000_v1_15_2_search_path'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.15.2', '.')::int[];
