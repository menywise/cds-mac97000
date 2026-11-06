INSERT INTO public.socle_installation (version, niveau, installe_le, resume, detail, migration_reference)
VALUES ('1.15.3', 'mise_a_niveau', CURRENT_DATE,
  'Mise à niveau vers le socle 1.15.3.',
  'Bibliographie : deux appels collés « [1][2] » comptent tous les deux dans le manque references.',
  '20261106120000_v1_15_3_appels_colles')
ON CONFLICT (version) DO NOTHING;
