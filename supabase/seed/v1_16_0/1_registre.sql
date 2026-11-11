CREATE TABLE IF NOT EXISTS public.registre (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  identifiant text NOT NULL,
  usage text NOT NULL,
  utilisateur text NOT NULL,
  etat text NOT NULL DEFAULT 'a_confirmer',
  a_revoir_le date,
  decision text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid DEFAULT auth.uid(),
  CONSTRAINT registre_element_unique UNIQUE (type, identifiant),
  CONSTRAINT registre_type_check CHECK (type IN ('module', 'cle', 'tache', 'script', 'automatisme',
    'compte', 'adresse', 'integration', 'export', 'autre')),
  CONSTRAINT registre_etat_check CHECK (etat IN ('en_service', 'en_construction', 'prevu', 'en_pause',
    'a_confirmer', 'abandonne')),
  CONSTRAINT registre_fiche_check CHECK (btrim(identifiant) <> '' AND btrim(usage) <> ''
    AND btrim(utilisateur) <> ''),
  CONSTRAINT registre_date_check CHECK (etat = 'abandonne' OR a_revoir_le IS NOT NULL)
);
COMMENT ON TABLE public.registre IS
  'Registre de l''application (socle 1.16.0) : quoi, qui, jusqu''à quand. Les fiches de décision disent le pourquoi.';
COMMENT ON COLUMN public.registre.usage IS 'À quoi sert l''élément, ce qu''il fait ou devait faire.';
COMMENT ON COLUMN public.registre.utilisateur IS 'Qui s''en sert : public, rôle, script, outil, session.';
COMMENT ON COLUMN public.registre.a_revoir_le IS 'Date à laquelle revoir l''élément ; obligatoire sauf abandonné.';
COMMENT ON COLUMN public.registre.decision IS 'Fiche de décision ou document qui le justifie.';
DROP TRIGGER IF EXISTS registre_updated_at ON public.registre;
CREATE TRIGGER registre_updated_at BEFORE UPDATE ON public.registre
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.registre ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.registre FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registre TO authenticated;
GRANT ALL ON public.registre TO service_role;
DROP POLICY IF EXISTS "Registre : administrateurs" ON public.registre;
CREATE POLICY "Registre : administrateurs" ON public.registre FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE OR REPLACE FUNCTION public.registre_inscrire(_type text, _identifiant text, _usage text,
  _utilisateur text, _etat text, _a_revoir_le date, _decision text DEFAULT NULL)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.registre (type, identifiant, usage, utilisateur, etat, a_revoir_le, decision)
  VALUES (_type, _identifiant, _usage, _utilisateur, _etat, _a_revoir_le, _decision)
  ON CONFLICT (type, identifiant) DO NOTHING
$$;
REVOKE ALL ON FUNCTION public.registre_inscrire(text, text, text, text, text, date, text)
  FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.registre_attendus()
RETURNS TABLE (type text, identifiant text) LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Réservé aux administrateurs.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT 'module'::text, k::text FROM jsonb_object_keys(public.module_defaults()) AS k;
  IF to_regclass('cron.job') IS NOT NULL THEN
    RETURN QUERY EXECUTE 'SELECT ''tache''::text, jobname::text FROM cron.job WHERE jobname IS NOT NULL';
  END IF;
  IF to_regprocedure('public.greffe_registre_attendus()') IS NOT NULL THEN
    RETURN QUERY EXECUTE 'SELECT g.type::text, g.identifiant::text FROM public.greffe_registre_attendus() AS g';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.registre_attendus() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registre_attendus() TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.registre_manquants()
RETURNS TABLE (type text, identifiant text) LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT DISTINCT a.type, a.identifiant FROM public.registre_attendus() AS a
  WHERE NOT EXISTS (SELECT 1 FROM public.registre r WHERE r.type = a.type AND r.identifiant = a.identifiant)
  ORDER BY 1, 2
$$;
REVOKE ALL ON FUNCTION public.registre_manquants() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registre_manquants() TO authenticated, service_role;
