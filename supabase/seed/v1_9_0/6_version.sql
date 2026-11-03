INSERT INTO public.template_checks (code, area, label, requirement, status, severity, evidence, position, modules)
SELECT 'V1-CONTENUS-PUBLICS', 'Contenus', 'Modèle commun des contenus éditoriaux',
  'Articles dans contenus_publics (modèle commun avec les installations) : mêmes adresses /blog/<slug>, commentaires rattachés par le même identifiant, une adresse unique par type, longueurs bornées, règles d''accès inchangées.',
  'conforme', 'mineur', 'tests/db/test_30',
  coalesce((SELECT max(position) FROM public.template_checks), 0) + 1, ARRAY['blog']
ON CONFLICT (code) DO NOTHING;
INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.9.0', 'brique', '2026-11-03',
  'Contenus éditoriaux : les articles passent dans le modèle commun contenus_publics, sans changement visible.',
  'blog_posts renommée contenus_publics (identifiants, adresses et commentaires conservés) ; colonnes du modèle commun (type, description, sources, relecture, fonction de l''auteur, texte alternatif de l''image) ; adresse unique par type ; longueurs bornées ; vue de compatibilité blog_posts jusqu''à la 1.10.0 ; recherche, suppression de compte et démarrage lisent la nouvelle table.',
  '20261103120000_v1_9_0_contenus_publics')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.9.0', 'publie_le', '2026-11-03',
  'migration_reference', '20261103120000_v1_9_0_contenus_publics'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.9.0', '.')::int[];
