INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.15.5', 'correctif', '2026-11-08',
  'Bibliographie : une référence modifiée renvoie l''article en relecture, comme un texte modifié.',
  'garde_statut_contenus lit le drapeau cds.refs_modifiees comme un texte modifié ; les déclencheurs de references_contenu le posent. Article prêt ou programmé : à relire. Article en ligne : à actualiser, il reste en ligne. Une mise à jour sans changement réel ne déclenche rien. Remontée d''une installation.',
  '20261108120000_v1_15_5_relecture_references')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.15.5', 'publie_le', '2026-11-08',
  'migration_reference', '20261108120000_v1_15_5_relecture_references'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.15.5', '.')::int[];
