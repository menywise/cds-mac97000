INSERT INTO public.socle_installation (version, niveau, installe_le, resume, detail, migration_reference)
VALUES ('1.16.0', 'mise_a_niveau', CURRENT_DATE,
  'Mise à niveau vers le socle 1.16.0.',
  'Registre de l''application : à quoi sert chaque élément, qui s''en sert, jusqu''à quand.',
  '20261111120000_v1_16_0_registre')
ON CONFLICT (version) DO NOTHING;
