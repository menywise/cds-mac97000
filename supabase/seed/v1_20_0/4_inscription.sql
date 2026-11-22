INSERT INTO public.socle_installation (version, niveau, installe_le, resume, detail, migration_reference)
VALUES ('1.20.0', 'mise_a_niveau', CURRENT_DATE,
  'Mise à niveau vers le socle 1.20.0.',
  'Radar des installations : où chaque installation en est par rapport au socle, dans les deux sens.',
  '20261122120000_v1_20_0_radar_installations')
ON CONFLICT (version) DO NOTHING;
