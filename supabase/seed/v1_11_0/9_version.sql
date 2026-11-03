INSERT INTO public.template_checks (code, area, label, requirement, status, severity, evidence, position, modules)
SELECT 'V1-MAILLAGE', 'Contenus', 'Taxonomie et maillage interne',
  'Rubriques sur deux niveaux, étiquettes contrôlées, séries ; publication refusée si un lien interne est cassé ou si un satellite ne renvoie pas vers son pilier ; état du maillage (orphelins, ancres pauvres, requête en double) ; redirection permanente au changement d''adresse d''un article publié.',
  'conforme', 'majeur', 'tests/db/test_32',
  coalesce((SELECT max(position) FROM public.template_checks), 0) + 1, ARRAY['blog']
ON CONFLICT (code) DO NOTHING;
INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.11.0', 'brique', '2026-11-03',
  'Taxonomie et maillage interne : rubriques, étiquettes contrôlées, séries, contrôles de liens, redirections.',
  'Tables rubriques, etiquettes, series, redirections ; liens internes lus dans le texte (extraire_liens) ; manques « liens » et « pilier » ; maillage_etat ; lire_ensuite ; réglage seuil_etiquette ; redirection automatique au changement d''adresse.',
  '20261103160000_v1_11_0_maillage')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.11.0', 'publie_le', '2026-11-03',
  'migration_reference', '20261103160000_v1_11_0_maillage'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.11.0', '.')::int[];
