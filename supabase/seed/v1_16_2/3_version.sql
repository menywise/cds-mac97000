INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.16.2', 'correctif', '2026-11-16',
  'Rôles publics : plus de droit de vider une table (TRUNCATE) ni de droit de structure, tables existantes et futures.',
  'Supabase donne par défaut tous les droits aux rôles anon et authenticated sur chaque table créée. Retirés sur toutes les tables du schéma public et dans les droits par défaut : TRUNCATE, REFERENCES, TRIGGER, et MAINTAIN à partir de PostgreSQL 17. template_checks : un visiteur n''écrit plus. Contrôle des tables geo_communes (supprimée au lot 11), geo_places (fermée en 1.5.0) et template_checks (administrateurs depuis le 18/09) : aucune lecture sans condition.',
  '20261116120000_v1_16_2_droits_tables')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.16.2', 'publie_le', '2026-11-16',
  'migration_reference', '20261116120000_v1_16_2_droits_tables'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.16.2', '.')::int[];
