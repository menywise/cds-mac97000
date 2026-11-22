INSERT INTO public.template_checks (code, area, label, requirement, status, severity, evidence, position, modules)
SELECT 'V1-SIGNALEMENTS-CAPTURES', 'Modération', 'Capture d''écran jointe à un signalement',
  'Capture facultative, 2 Mo au plus, PNG, JPEG ou WebP, réécrite par le navigateur (métadonnées retirées) ; une par signalement, par son auteur, dans les 15 minutes ; dossier privé lu des seuls administrateurs ; effacée 3 mois après le traitement, 12 mois après l''envoi, aussitôt avec le signalement.',
  'conforme', 'majeur', 'tests/db/test_49',
  coalesce((SELECT max(position) FROM public.template_checks), 0) + 1, ARRAY['reports']
ON CONFLICT (code) DO NOTHING;
UPDATE public.registre
SET usage = 'Lance la purge des messages de contact et l''effacement des captures de signalements expirées, pour une plateforme qui planifie par appel web.'
WHERE type = 'adresse' AND identifiant = '/api/cron/purge-contact';
INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.19.0', 'brique', '2026-11-22',
  'Signalements : capture d''écran facultative, motif « La page s''affiche mal », pied de page partout avec la version du socle.',
  'Capture jointe par l''auteur du signalement dans les 15 minutes (dossier privé signalements-captures, 2 Mo, PNG, JPEG ou WebP, image réécrite par le navigateur), lue des seuls administrateurs par lien signé, effacée 3 mois après le traitement (report_captures_a_effacer). Nouveau motif affichage. Côté code : version du socle dans le pied de page, pied de page réduit sur les pages de connexion, de maintenance et d''erreur.',
  '20261121120000_v1_19_0_captures_signalements')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.19.0', 'publie_le', '2026-11-22',
  'migration_reference', '20261121120000_v1_19_0_captures_signalements'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.19.0', '.')::int[];
