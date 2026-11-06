-- Socle 1.15.7 (correctif, code seul) : les tests du socle passent dans un clone, qui n'a pas de
-- supabase/migrations (le remix le retire) ; emplacement docs/greffe/ pour les documents d'un projet.
-- Aucun changement de schéma : cette migration n'enregistre que la version.

-- 1. Version -------------------------------------------------------------------------------------
INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.15.7', 'correctif', '2026-11-10',
  'Clones : les tests du socle passent sans supabase/migrations ; emplacement docs/greffe/ pour les documents d''un projet.',
  'Code seul, aucun changement de schéma. modules-sql lit module_defaults() dans les blocs supabase/seed/ quand le remix a retiré les migrations (et vérifie dans le socle que blocs et migrations concordent). socle-neutre reconnaît un clone à sa prise remplie, n''y exige pas supabase/migrations et laisse hors du contrôle d''identité les cinq emplacements de greffe, dont docs/greffe/. Remontée d''une installation.',
  '20261110120000_v1_15_7_clones_sans_migrations')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.15.7', 'publie_le', '2026-11-10',
  'migration_reference', '20261110120000_v1_15_7_clones_sans_migrations'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.15.7', '.')::int[];
