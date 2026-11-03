INSERT INTO public.socle_installation (version, niveau, installe_le, resume, detail, migration_reference)
VALUES ('1.15.1', 'mise_a_niveau', CURRENT_DATE,
  'Mise à niveau vers le socle 1.15.1.',
  'Correctifs de la recette des contenus : suggestion de mot proche, pages introuvables non indexées.',
  '20261104120000_v1_15_1_correctifs_recette')
ON CONFLICT (version) DO NOTHING;
