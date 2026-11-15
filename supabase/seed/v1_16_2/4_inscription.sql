INSERT INTO public.socle_installation (version, niveau, installe_le, resume, detail, migration_reference)
VALUES ('1.16.2', 'mise_a_niveau', CURRENT_DATE,
  'Mise à niveau vers le socle 1.16.2.',
  'Rôles publics : plus de droit de vider une table (TRUNCATE) ni de droit de structure, tables existantes et futures.',
  '20261116120000_v1_16_2_droits_tables')
ON CONFLICT (version) DO NOTHING;
