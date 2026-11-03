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
