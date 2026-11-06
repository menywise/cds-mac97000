INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.15.4', 'correctif', '2026-11-07',
  'Étiquettes : adresse calculée par la base sans casser les types générés ; grille DES-1 alignée sur la charte 2.0.',
  'etiquettes.slug prend la valeur par défaut vide, que le déclencheur garde_etiquettes_ref remplace par l''adresse tirée du libellé. Les types régénérés par la plateforme rendent slug facultatif, comme enregistrerEtiquette l''attend : un clone ne casse plus à la compilation. Point DES-1 de la grille : police du système, Inter retirée depuis la charte 2.0. Remontée d''une installation.',
  '20261107120000_v1_15_4_etiquette_slug')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.15.4', 'publie_le', '2026-11-07',
  'migration_reference', '20261107120000_v1_15_4_etiquette_slug'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.15.4', '.')::int[];
