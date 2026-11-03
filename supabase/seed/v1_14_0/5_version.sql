INSERT INTO public.template_checks (code, area, label, requirement, status, severity, evidence, position, modules)
SELECT 'V1-SOCIETE-SAVANTE', 'Contenus', 'Exigences d''une société savante',
  'Bibliographie structurée et appels numérotés vérifiés avant publication ; liens d''intérêts exigés par réglage ; niveau de preuve tiré d''une liste réglée ; compte rendu daté et rattaché à son événement ; relecteurs désignés par leur fonction.',
  'conforme', 'mineur', 'tests/db/test_35',
  coalesce((SELECT max(position) FROM public.template_checks), 0) + 1, ARRAY['blog']
ON CONFLICT (code) DO NOTHING;
INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.14.0', 'brique', '2026-11-03',
  'Exigences d''une société savante : bibliographie, liens d''intérêts, niveau de preuve, genres de contenu, relecteurs.',
  'Colonnes genre, evenement, evenement_le, liens_interets, niveau_preuve, relecteurs ; table references_contenu ; réglages exiger_liens_interets, niveaux_preuve, format_citation ; manques liens_interets, evenement, niveau_preuve, references.',
  '20261103220000_v1_14_0_societe_savante')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.14.0', 'publie_le', '2026-11-03',
  'migration_reference', '20261103220000_v1_14_0_societe_savante'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.14.0', '.')::int[];
