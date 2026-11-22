CREATE OR REPLACE FUNCTION public.report_capture_permise(_name text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _code text := split_part(coalesce(_name, ''), '/', 1);
  _uid uuid := auth.uid();
BEGIN
  IF NOT public.module_enabled('reports') THEN
    RETURN false;
  END IF;
  IF _code !~ '^[0-9A-F]{10}$' OR _name <> _code || '/capture' THEN
    RETURN false;
  END IF;
  RETURN EXISTS (SELECT 1 FROM public.reports r
    WHERE r.tracking_code = _code AND r.status = 'en_attente'
      AND r.created_at > now() - interval '15 minutes'
      AND ((_uid IS NULL AND r.source = 'visiteur')
           OR (_uid IS NOT NULL AND r.source = 'membre' AND r.reporter_id = _uid)));
END;
$$;
COMMENT ON FUNCTION public.report_capture_permise(text) IS
  'Socle 1.19.0 : vrai si le fichier est la capture (code/capture) d''un signalement envoyé par la même session il y a moins de 15 minutes, encore à examiner.';
REVOKE ALL ON FUNCTION public.report_capture_permise(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_capture_permise(text) TO anon, authenticated, service_role;
DROP POLICY IF EXISTS signalements_captures_depot ON storage.objects;
CREATE POLICY signalements_captures_depot ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'signalements-captures' AND public.report_capture_permise(name));
DROP POLICY IF EXISTS signalements_captures_admin_lecture ON storage.objects;
CREATE POLICY signalements_captures_admin_lecture ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'signalements-captures' AND public.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS signalements_captures_admin_effacement ON storage.objects;
CREATE POLICY signalements_captures_admin_effacement ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'signalements-captures' AND public.has_role(auth.uid(), 'admin'::public.app_role));
