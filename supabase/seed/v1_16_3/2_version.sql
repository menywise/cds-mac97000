INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.16.3', 'correctif', '2026-11-17',
  'Visiteurs : plus de droit d''écriture là où aucune politique ne l''ouvre.',
  'Supabase donne par défaut au rôle anon les droits d''ajouter, modifier et supprimer sur chaque table. Retirés partout où aucune politique de l''écriture ne vise anon ou public (137 droits sur 48 tables dans la base du socle) ; gardés pour ad_events et contact_messages, et pour toute table de greffe qui ouvre une écriture aux visiteurs. Droits par défaut inchangés. ecritures_visiteur_sans_politique() liste les écarts qui apparaîtraient ensuite.',
  '20261117120000_v1_16_3_ecritures_visiteur')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.16.3', 'publie_le', '2026-11-17',
  'migration_reference', '20261117120000_v1_16_3_ecritures_visiteur'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.16.3', '.')::int[];
