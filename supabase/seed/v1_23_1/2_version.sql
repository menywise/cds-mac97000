INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.23.1', 'correctif', '2026-11-28',
  'Redirections fermées à la lecture en masse : un visiteur ne lit plus la table, redirection_pour() lui suffit.',
  'La politique de lecture des visiteurs (1.16.1) est retirée, avec le droit de lecture de anon ; un compte connecté lit la table s''il rédige ou administre. La 1.23.0 laissait cette lecture ouverte, module blog allumé. Relevé par la relecture automatique d''une demande de fusion du deuxième clone.',
  '20261126120000_v1_23_1_redirections_fermees')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.23.1', 'publie_le', '2026-11-28',
  'migration_reference', '20261126120000_v1_23_1_redirections_fermees'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.23.1', '.')::int[];
