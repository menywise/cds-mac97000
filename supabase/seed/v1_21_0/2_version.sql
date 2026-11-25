INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.21.0', 'brique', '2026-11-25',
  'Clé d''usage : une clé qui ne sert qu''un usage nommé, hors de l''échelle lecture, compléter, corriger.',
  'Niveau « usage » et colonne usage_code dans agent_cles. Une action déclarée pour un usage ne répond qu''aux clés de cet usage ; une clé d''usage ne fait que ses actions et « aide ». agent_identifier() rend la clé et son usage au serveur ; agent_authentifier() refuse désormais une clé d''usage. Écran Admin, Co-intervenants IA : choix de l''usage parmi ceux que l''installation déclare. Remontée du premier clone.',
  '20261123120000_v1_21_0_cles_usage')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.21.0', 'publie_le', '2026-11-25',
  'migration_reference', '20261123120000_v1_21_0_cles_usage'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.21.0', '.')::int[];
