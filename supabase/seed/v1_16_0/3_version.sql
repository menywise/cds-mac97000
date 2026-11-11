INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.16.0', 'brique', '2026-11-11',
  'Registre de l''application : à quoi sert chaque élément, qui s''en sert, jusqu''à quand.',
  'Table registre (type, identifiant, usage, utilisateur, état, date à revoir, décision), réservée aux administrateurs ; écran Admin, Registre, éléments à revoir en tête. registre_manquants() liste les modules et tâches planifiées sans ligne (et ceux d''une installation par greffe_registre_attendus) ; les scripts du dépôt sont contrôlés par un test unitaire. Remontée d''une installation.',
  '20261111120000_v1_16_0_registre')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.16.0', 'publie_le', '2026-11-11',
  'migration_reference', '20261111120000_v1_16_0_registre'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.16.0', '.')::int[];
