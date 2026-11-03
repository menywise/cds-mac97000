INSERT INTO public.socle_installation (version, niveau, installe_le, resume, detail, migration_reference)
VALUES ('1.15.2', 'mise_a_niveau', CURRENT_DATE,
  'Mise à niveau vers le socle 1.15.2.',
  'Audit : search_path figé sur search_tags, search_excerpt et geo_distance_km.',
  '20261105120000_v1_15_2_search_path')
ON CONFLICT (version) DO NOTHING;
