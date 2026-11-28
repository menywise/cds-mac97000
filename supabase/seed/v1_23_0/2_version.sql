INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.23.0', 'brique', '2026-11-27',
  'Redirection de toute adresse : un ancien site garde ses anciennes adresses, fichiers compris.',
  'Toute adresse inconnue du site consulte redirection_pour() avant la page introuvable et répond par une redirection permanente. La table redirections accepte les fichiers (point, majuscules, tiret bas) et une destination complète en https ; elle reste fermée à la lecture en masse. Import en masse par Admin, Tables (CSV). Remontée du deuxième clone.',
  '20261125120000_v1_23_0_redirections_toute_adresse')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.23.0', 'publie_le', '2026-11-27',
  'migration_reference', '20261125120000_v1_23_0_redirections_toute_adresse'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.23.0', '.')::int[];
