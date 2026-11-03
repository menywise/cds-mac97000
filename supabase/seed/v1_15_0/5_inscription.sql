INSERT INTO public.socle_installation (version, niveau, installe_le, resume, detail, migration_reference)
VALUES ('1.15.0', 'mise_a_niveau', CURRENT_DATE,
  'Mise à niveau vers le socle 1.15.0.',
  'Pilotage du contenu : brief, appels à l''action, calendrier, santé du contenu.',
  '20261103230000_v1_15_0_pilotage')
ON CONFLICT (version) DO NOTHING;
