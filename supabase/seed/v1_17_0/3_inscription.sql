INSERT INTO public.socle_installation (version, niveau, installe_le, resume, detail, migration_reference)
VALUES ('1.17.0', 'mise_a_niveau', CURRENT_DATE,
  'Mise à niveau vers le socle 1.17.0.',
  'Co-intervenant IA : une clé avec sa fiche, un niveau, et la trace de tout ce qu''elle écrit.',
  '20261119120000_v1_17_0_agents')
ON CONFLICT (version) DO NOTHING;
