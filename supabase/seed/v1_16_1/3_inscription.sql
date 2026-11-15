INSERT INTO public.socle_installation (version, niveau, installe_le, resume, detail, migration_reference)
VALUES ('1.16.1', 'mise_a_niveau', CURRENT_DATE,
  'Mise à niveau vers le socle 1.16.1.',
  'Lecture durcie sur seize tables : chaque politique dit ce qu''elle laisse lire, plus aucune politique « USING (true) ».',
  '20261115120000_v1_16_1_durcissement_rls')
ON CONFLICT (version) DO NOTHING;
