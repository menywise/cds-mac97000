INSERT INTO public.socle_installation (version, niveau, installe_le, resume, detail, migration_reference)
VALUES ('1.10.0', 'mise_a_niveau', CURRENT_DATE,
  'Mise à niveau vers le socle 1.10.0.',
  'Circuit de rédaction : rôle rédacteur, statuts, relecture, exigences réglables, termes interdits.',
  '20261103140000_v1_10_0_circuit_editorial')
ON CONFLICT (version) DO NOTHING;
