INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.16.4', 'correctif', '2026-11-18',
  'Visiteurs : une table nouvelle ne leur donne plus rien par défaut ; droits accordés table par table.',
  'Règle reprise du premier clone, qui l''applique en production. Droits par défaut des tables du schéma public : plus rien pour anon (avant : lire, ajouter, modifier, supprimer). Tables existantes inchangées : le socle accorde déjà chaque droit visiteur par GRANT. Une table de greffe ouverte aux visiteurs accorde ses droits elle-même (docs/CLONER.md). Séquences et fonctions inchangées. Remplace le choix de la 1.16.3 sur les droits par défaut.',
  '20261118120000_v1_16_4_defaut_visiteur')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.16.4', 'publie_le', '2026-11-18',
  'migration_reference', '20261118120000_v1_16_4_defaut_visiteur'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.16.4', '.')::int[];
