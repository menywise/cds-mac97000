-- Socle 1.16.2 (correctif) : droits des rôles publics sur les tables, suite de la 1.16.1.
-- Contrôle des trois tables restées hors du scanner de Lovable (geo_communes, geo_places,
-- template_checks) : aucune n'a de politique de lecture « USING (true) » dans le schéma du dépôt ni en
-- production (geo_communes supprimée au lot 11, template_checks lue par les administrateurs depuis le
-- 18/09, geo_places fermée en 1.5.0). Le contrôle de la production a trouvé un autre écart : Supabase
-- donne par défaut tous les droits aux rôles anon et authenticated sur chaque table créée, et le dépôt
-- ne les retirait pas. Résultat en production : un visiteur peut vider (TRUNCATE) 47 tables, un membre
-- 56, dont user_roles et profiles. TRUNCATE passe par-dessus la sécurité par ligne. L'API publique ne
-- l'expose pas, mais rien ne le justifie : aucune fonction, aucun écran ne s'en sert.
-- Cette migration retire aux rôles anon et authenticated, sur toutes les tables du schéma public :
-- TRUNCATE (vider), REFERENCES (clé étrangère), TRIGGER (déclencheur), et MAINTAIN (verrou, réindexation)
-- à partir de PostgreSQL 17. Les tables créées ensuite ne les reçoivent plus (droits par défaut).
-- template_checks : un visiteur n'écrit plus (aucune politique ne le lui permettait) ; il garde la
-- lecture, que la sécurité par ligne rend vide, pour qu'une lecture visiteur reçoive une liste vide et
-- pas une erreur.
-- Rejouable sans danger. Écrit pour l'éditeur SQL de Lovable : ni antislash ni point d'interrogation,
-- aucune ligne vide dans un bloc.

-- 1. Droits de structure retirés aux rôles publics, tables existantes ------------------------------
DO $$
DECLARE
  _t record;
  _droits text := 'TRUNCATE, REFERENCES, TRIGGER';
BEGIN
  IF current_setting('server_version_num')::int >= 170000 THEN
    _droits := _droits || ', MAINTAIN';
  END IF;
  FOR _t IN SELECT c.relname FROM pg_class c
    WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r', 'p') ORDER BY c.relname LOOP
    EXECUTE format('REVOKE %s ON public.%I FROM anon, authenticated', _droits, _t.relname);
  END LOOP;
END;
$$;

-- 2. Mêmes droits retirés des droits par défaut : tables créées ensuite -----------------------------
-- S'applique aux tables créées par le rôle qui passe la migration (postgres sur Lovable Cloud, qui
-- possède toutes les tables du schéma public).
DO $$
DECLARE
  _droits text := 'TRUNCATE, REFERENCES, TRIGGER';
BEGIN
  IF current_setting('server_version_num')::int >= 170000 THEN
    _droits := _droits || ', MAINTAIN';
  END IF;
  EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE %s ON TABLES FROM anon, authenticated', _droits);
END;
$$;

-- 3. Grille de conformité : un visiteur n'écrit pas -------------------------------------------------
REVOKE INSERT, UPDATE, DELETE ON public.template_checks FROM anon;

-- 4. Version -------------------------------------------------------------------------------------
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
