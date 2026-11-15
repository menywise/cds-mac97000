INSERT INTO public.socle_installation (version, niveau, installe_le, resume, detail, migration_reference)
VALUES ('1.16.3', 'mise_a_niveau', CURRENT_DATE,
  'Mise à niveau vers le socle 1.16.3.',
  'Visiteurs : plus de droit d''écriture là où aucune politique ne l''ouvre.',
  '20261117120000_v1_16_3_ecritures_visiteur')
ON CONFLICT (version) DO NOTHING;
