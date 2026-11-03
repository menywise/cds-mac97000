INSERT INTO public.socle_installation (version, niveau, installe_le, resume, detail, migration_reference)
VALUES ('1.13.0', 'mise_a_niveau', CURRENT_DATE,
  'Mise à niveau vers le socle 1.13.0.',
  'Recherche avancée dans les articles : opérateurs, synonymes, facettes, extraits, suggestions, recherches sans résultat.',
  '20261103200000_v1_13_0_recherche')
ON CONFLICT (version) DO NOTHING;
