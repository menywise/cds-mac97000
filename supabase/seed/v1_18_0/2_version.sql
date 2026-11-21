INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.18.0', 'brique', '2026-11-21',
  'Tables : faire vivre la base sans écrire de code, grille, fiche, import et export CSV.',
  'Écran Admin, Tables : chaque table du schéma public en grille (tri, recherche, pages), fiche d''une ligne (ajout, modification, suppression), export CSV de la sélection, import CSV en masse (aperçu, erreurs ligne par ligne, insertion ou mise à jour sur la clé). Lit et écrit par l''interface de données, sous les politiques de sécurité par ligne. Seul ajout en base : tables_catalogue(), réservée aux administrateurs. Remontée du premier clone.',
  '20261120120000_v1_18_0_tables')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.18.0', 'publie_le', '2026-11-21',
  'migration_reference', '20261120120000_v1_18_0_tables'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.18.0', '.')::int[];
