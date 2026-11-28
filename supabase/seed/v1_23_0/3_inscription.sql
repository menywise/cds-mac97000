INSERT INTO public.socle_installation (version, niveau, installe_le, resume, detail, migration_reference)
VALUES ('1.23.0', 'mise_a_niveau', CURRENT_DATE,
  'Mise à niveau vers le socle 1.23.0.',
  'Redirection de toute adresse : un ancien site garde ses anciennes adresses, fichiers compris.',
  '20261125120000_v1_23_0_redirections_toute_adresse')
ON CONFLICT (version) DO NOTHING;
