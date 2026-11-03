INSERT INTO public.template_checks (code, area, label, requirement, status, severity, evidence, position, modules)
SELECT 'V1-PILOTAGE-CONTENU', 'Contenus', 'Pilotage du contenu',
  'Brief (public, requête, intention, appel à l''action) ; appels à l''action réglables en fin d''article, gérés par les admins ; calendrier par date prévue et tableau de santé du contenu dans le poste Éditorial.',
  'conforme', 'mineur', 'tests/db/test_36',
  coalesce((SELECT max(position) FROM public.template_checks), 0) + 1, ARRAY['blog']
ON CONFLICT (code) DO NOTHING;
INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.15.0', 'brique', '2026-11-03',
  'Pilotage du contenu : brief, appels à l''action, calendrier, santé du contenu.',
  'Table appels_action ; colonnes intention et appel_action_id ; réglage appel_action_defaut. Calendrier et santé du contenu calculés dans le poste Éditorial.',
  '20261103230000_v1_15_0_pilotage')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.15.0', 'publie_le', '2026-11-03',
  'migration_reference', '20261103230000_v1_15_0_pilotage'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.15.0', '.')::int[];
