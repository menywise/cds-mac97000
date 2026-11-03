INSERT INTO public.socle_installation (version, niveau, installe_le, resume, detail, migration_reference)
VALUES ('1.9.0', 'mise_a_niveau', CURRENT_DATE,
  'Mise à niveau vers le socle 1.9.0.',
  'Contenus éditoriaux : articles dans le modèle commun contenus_publics, sans changement visible.',
  '20261103120000_v1_9_0_contenus_publics')
ON CONFLICT (version) DO NOTHING;
