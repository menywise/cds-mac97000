-- Socle 1.16.4 (correctif) : une table nouvelle ne donne rien par défaut au visiteur (rôle anon).
-- Règle reprise du premier clone (C1), qui l'applique en production : droits accordés table par
-- table. Remplace le choix de la 1.16.3, qui laissait les droits par défaut intacts en supposant que
-- les clones comptaient sur eux pour les visiteurs ; C1 n'y comptait pas.
-- Mesure du 17/11/2026 sur la base du socle (lecture seule) : droits par défaut des tables du schéma
-- public, rôle postgres, « arwd » pour anon (lire, ajouter, modifier, supprimer).
-- Le dépôt du socle accorde déjà chaque droit visiteur table par table (GRANT … TO anon) : ses tables
-- ne changent pas. Une table de greffe ouverte aux visiteurs accorde ses droits elle-même
-- (docs/CLONER.md, « Tables »).
-- Séquences et fonctions : droits par défaut inchangés, comme dans C1.
-- Rejouable sans danger. Écrit pour l'éditeur SQL de Lovable : ni antislash ni point d'interrogation,
-- aucune ligne vide dans un bloc.

-- 1. Droits par défaut des tables : rien pour le visiteur ------------------------------------------
-- S'applique aux tables créées par le rôle qui passe la migration (postgres sur Lovable Cloud, qui
-- possède toutes les tables du schéma public).
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;

-- 2. Version -------------------------------------------------------------------------------------
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
