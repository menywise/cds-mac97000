INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.15.1', 'correctif', '2026-11-04',
  'Correctifs de la recette des contenus : suggestion de mot proche plus tolérante, pages introuvables non indexées.',
  'suggestion_recherche : seuil de similarité ramené de 0,35 à 0,3 (une faute d''une lettre dans un mot de cinq lettres trouve sa suggestion). Côté code : article, rubrique, étiquette et série introuvables servis en noindex.',
  '20261104120000_v1_15_1_correctifs_recette')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.15.1', 'publie_le', '2026-11-04',
  'migration_reference', '20261104120000_v1_15_1_correctifs_recette'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.15.1', '.')::int[];
