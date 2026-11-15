-- Socle 1.16.3 (correctif) : un visiteur (rôle anon) n'a plus de droit d'écriture que là où une
-- politique le lui ouvre. Suite de la 1.16.2.
-- Supabase donne par défaut au rôle anon les droits d'ajouter, modifier et supprimer sur chaque table
-- créée. La sécurité par ligne les bloque tant qu'elle est active ; mais elle a déjà été trouvée
-- désactivée en production (geo_places, 1.4.1). Mesure du 15/11/2026 sur la base du socle : 137 droits
-- d'écriture du visiteur sans aucune politique derrière, sur 48 tables. Seules deux écritures lui sont
-- ouvertes par une politique : ad_events (affichage d'une annonce) et contact_messages (formulaire).
-- Règle : pour chaque table du schéma public et chaque écriture (INSERT, UPDATE, DELETE), le droit du
-- rôle anon est retiré si aucune politique de cette écriture (ou FOR ALL) ne vise anon ou public.
-- Une table de greffe qui ouvre une écriture aux visiteurs par une politique garde son droit.
-- Les droits par défaut ne changent pas : un clone qui compte sur eux pour une table nouvelle n'est pas
-- cassé. ecritures_visiteur_sans_politique() liste les écarts qui apparaîtraient ensuite.
-- Rejouable sans danger. Écrit pour l'éditeur SQL de Lovable : ni antislash ni point d'interrogation,
-- aucune ligne vide dans une fonction ou un bloc.

-- 1. Écarts : droit d'écriture du visiteur sans politique ------------------------------------------
-- Réservée aux administrateurs ; l'éditeur SQL (sans compte) la lit aussi.
CREATE OR REPLACE FUNCTION public.ecritures_visiteur_sans_politique()
RETURNS TABLE (table_name text, droit text) LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Réservé aux administrateurs.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT c.relname::text, x.droit
    FROM pg_class c, unnest(ARRAY['INSERT', 'UPDATE', 'DELETE']) AS x(droit)
    WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r', 'p')
      AND has_table_privilege('anon', c.oid, x.droit)
      AND NOT EXISTS (SELECT 1 FROM pg_policies p
        WHERE p.schemaname = 'public' AND p.tablename = c.relname AND p.cmd IN (x.droit, 'ALL')
          AND p.roles && ARRAY['anon', 'public']::name[])
    ORDER BY 1, 2;
END;
$$;
REVOKE ALL ON FUNCTION public.ecritures_visiteur_sans_politique() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ecritures_visiteur_sans_politique() TO authenticated, service_role;

-- 2. Droits retirés ------------------------------------------------------------------------------
DO $$
DECLARE
  _e record;
BEGIN
  FOR _e IN SELECT * FROM public.ecritures_visiteur_sans_politique() LOOP
    EXECUTE format('REVOKE %s ON public.%I FROM anon', _e.droit, _e.table_name);
  END LOOP;
END;
$$;

-- 3. Registre ------------------------------------------------------------------------------------
SELECT public.registre_inscrire('autre', 'public.ecritures_visiteur_sans_politique()',
  'Liste les droits d''écriture du visiteur (ajout, modification, suppression) qu''aucune politique n''ouvre. Doit rester vide ; la migration 1.16.3 les retire.',
  'Administrateurs, éditeur SQL, bloc de contrôle de la 1.16.3', 'en_service', CURRENT_DATE + 182,
  'Socle 1.16.3, suite du scanner Lovable LOV.DB.RLS_TAUTOLOGY_PERMISSIVE.V1');

-- 4. Version -------------------------------------------------------------------------------------
INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.16.3', 'correctif', '2026-11-17',
  'Visiteurs : plus de droit d''écriture là où aucune politique ne l''ouvre.',
  'Supabase donne par défaut au rôle anon les droits d''ajouter, modifier et supprimer sur chaque table. Retirés partout où aucune politique de l''écriture ne vise anon ou public (137 droits sur 48 tables dans la base du socle) ; gardés pour ad_events et contact_messages, et pour toute table de greffe qui ouvre une écriture aux visiteurs. Droits par défaut inchangés. ecritures_visiteur_sans_politique() liste les écarts qui apparaîtraient ensuite.',
  '20261117120000_v1_16_3_ecritures_visiteur')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.16.3', 'publie_le', '2026-11-17',
  'migration_reference', '20261117120000_v1_16_3_ecritures_visiteur'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.16.3', '.')::int[];
