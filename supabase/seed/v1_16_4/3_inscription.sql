INSERT INTO public.socle_installation (version, niveau, installe_le, resume, detail, migration_reference)
VALUES ('1.16.4', 'mise_a_niveau', CURRENT_DATE,
  'Mise à niveau vers le socle 1.16.4.',
  'Visiteurs : une table nouvelle ne leur donne plus rien par défaut ; droits accordés table par table.',
  '20261118120000_v1_16_4_defaut_visiteur')
ON CONFLICT (version) DO NOTHING;
