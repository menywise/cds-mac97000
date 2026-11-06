INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.15.6', 'correctif', '2026-11-09',
  'Bibliographie : les termes interdits sont aussi cherchés dans les références.',
  'texte_contenu_public lit auteurs, titre et revue des références ; garde_termes_contenus contrôle aussi une référence modifiée d''un contenu en ligne (drapeau cds.refs_modifiees de la 1.15.5) et la refuse si elle contient un terme interdit ou un nom de greffe_termes_nominatifs. Remontée d''une installation.',
  '20261109120000_v1_15_6_termes_references')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.15.6', 'publie_le', '2026-11-09',
  'migration_reference', '20261109120000_v1_15_6_termes_references'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.15.6', '.')::int[];
