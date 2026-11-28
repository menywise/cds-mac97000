INSERT INTO public.socle_installation (version, niveau, installe_le, resume, detail, migration_reference)
VALUES ('1.23.1', 'mise_a_niveau', CURRENT_DATE,
  'Mise à niveau vers le socle 1.23.1.',
  'Redirections fermées à la lecture en masse : un visiteur ne lit plus la table, redirection_pour() lui suffit.',
  '20261126120000_v1_23_1_redirections_fermees')
ON CONFLICT (version) DO NOTHING;
