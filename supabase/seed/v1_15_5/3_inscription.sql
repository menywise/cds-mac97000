INSERT INTO public.socle_installation (version, niveau, installe_le, resume, detail, migration_reference)
VALUES ('1.15.5', 'mise_a_niveau', CURRENT_DATE,
  'Mise à niveau vers le socle 1.15.5.',
  'Bibliographie : une référence modifiée renvoie l''article en relecture, comme un texte modifié.',
  '20261108120000_v1_15_5_relecture_references')
ON CONFLICT (version) DO NOTHING;
