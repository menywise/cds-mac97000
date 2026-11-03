INSERT INTO public.socle_installation (version, niveau, installe_le, resume, detail, migration_reference)
VALUES ('1.14.0', 'mise_a_niveau', CURRENT_DATE,
  'Mise à niveau vers le socle 1.14.0.',
  'Exigences d''une société savante : bibliographie, liens d''intérêts, niveau de preuve, genres de contenu, relecteurs.',
  '20261103220000_v1_14_0_societe_savante')
ON CONFLICT (version) DO NOTHING;
