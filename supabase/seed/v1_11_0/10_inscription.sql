INSERT INTO public.socle_installation (version, niveau, installe_le, resume, detail, migration_reference)
VALUES ('1.11.0', 'mise_a_niveau', CURRENT_DATE,
  'Mise à niveau vers le socle 1.11.0.',
  'Taxonomie et maillage interne : rubriques, étiquettes contrôlées, séries, contrôles de liens, redirections.',
  '20261103160000_v1_11_0_maillage')
ON CONFLICT (version) DO NOTHING;
