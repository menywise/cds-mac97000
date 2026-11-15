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

DO $$
DECLARE
  _e record;
BEGIN
  FOR _e IN SELECT * FROM public.ecritures_visiteur_sans_politique() LOOP
    EXECUTE format('REVOKE %s ON public.%I FROM anon', _e.droit, _e.table_name);
  END LOOP;
END;
$$;

SELECT public.registre_inscrire('autre', 'public.ecritures_visiteur_sans_politique()',
  'Liste les droits d''écriture du visiteur (ajout, modification, suppression) qu''aucune politique n''ouvre. Doit rester vide ; la migration 1.16.3 les retire.',
  'Administrateurs, éditeur SQL, bloc de contrôle de la 1.16.3', 'en_service', CURRENT_DATE + 182,
  'Socle 1.16.3, suite du scanner Lovable LOV.DB.RLS_TAUTOLOGY_PERMISSIVE.V1');
