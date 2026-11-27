INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.22.0', 'brique', '2026-11-27',
  'Page hors index : une page libre satellite d''une campagne, en ligne pour qui a le lien, hors des moteurs.',
  'Colonne hors_index dans pages, refusée sur la page d''accueil. Une page hors index porte la balise noindex et sort du plan du site, de la page « Plan du site » et de la recherche du site (search_site). Écran Admin, Pages : case « Page satellite » et pastille « Hors index ». Remontée du deuxième clone.',
  '20261124120000_v1_22_0_pages_hors_index')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.22.0', 'publie_le', '2026-11-27',
  'migration_reference', '20261124120000_v1_22_0_pages_hors_index'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.22.0', '.')::int[];
