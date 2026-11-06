INSERT INTO public.socle_installation (version, niveau, installe_le, resume, detail, migration_reference)
VALUES ('1.15.6', 'mise_a_niveau', CURRENT_DATE,
  'Mise à niveau vers le socle 1.15.6.',
  'Bibliographie : les termes interdits sont aussi cherchés dans les références.',
  '20261109120000_v1_15_6_termes_references')
ON CONFLICT (version) DO NOTHING;
