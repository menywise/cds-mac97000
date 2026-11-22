INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.20.0', 'brique', '2026-11-22',
  'Radar des installations : où chaque installation en est par rapport au socle, dans les deux sens.',
  'Code seul : scripts/radar-socle.mjs (lecture seule). Version du code et de la base de chaque installation, versions à porter, base en retard sur le code (réglage « socle », socle_installation, objets témoins de chaque version), ajouts hors greffe, copies exactes à reprendre, remontées ouvertes au registre de synchronisation. Rapport hebdomadaire, une action proposée par écart. Méthode : docs/RADAR.md.',
  '20261122120000_v1_20_0_radar_installations')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.20.0', 'publie_le', '2026-11-22',
  'migration_reference', '20261122120000_v1_20_0_radar_installations'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.20.0', '.')::int[];
