INSERT INTO public.socle_installation (version, niveau, installe_le, resume, detail, migration_reference)
VALUES ('1.21.0', 'mise_a_niveau', CURRENT_DATE,
  'Mise à niveau vers le socle 1.21.0.',
  'Clé d''usage : une clé qui ne sert qu''un usage nommé, hors de l''échelle lecture, compléter, corriger.',
  '20261123120000_v1_21_0_cles_usage')
ON CONFLICT (version) DO NOTHING;
