INSERT INTO public.socle_installation (version, niveau, installe_le, resume, detail, migration_reference)
VALUES ('1.15.7', 'mise_a_niveau', CURRENT_DATE,
  'Mise à niveau vers le socle 1.15.7.',
  'Clones : les tests du socle passent sans supabase/migrations ; emplacement docs/greffe/ pour les documents d''un projet.',
  '20261110120000_v1_15_7_clones_sans_migrations')
ON CONFLICT (version) DO NOTHING;
