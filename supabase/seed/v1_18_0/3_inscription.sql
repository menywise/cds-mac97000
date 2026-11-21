INSERT INTO public.socle_installation (version, niveau, installe_le, resume, detail, migration_reference)
VALUES ('1.18.0', 'mise_a_niveau', CURRENT_DATE,
  'Mise à niveau vers le socle 1.18.0.',
  'Tables : faire vivre la base sans écrire de code, grille, fiche, import et export CSV.',
  '20261120120000_v1_18_0_tables')
ON CONFLICT (version) DO NOTHING;
