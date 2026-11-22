CREATE OR REPLACE FUNCTION public.report_captures_a_effacer()
RETURNS text[] LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _noms text[];
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Réservé aux administrateurs.' USING ERRCODE = '42501';
  END IF;
  SELECT coalesce(array_agg(o.name ORDER BY o.name), ARRAY[]::text[]) INTO _noms
  FROM storage.objects o
  LEFT JOIN public.reports r ON r.tracking_code = split_part(o.name, '/', 1)
  WHERE o.bucket_id = 'signalements-captures'
    AND (r.id IS NULL
         OR (r.handled_at IS NOT NULL AND r.handled_at < now() - interval '3 months')
         OR r.created_at < now() - interval '12 months');
  RETURN _noms;
END;
$$;
COMMENT ON FUNCTION public.report_captures_a_effacer() IS
  'Socle 1.19.0 : captures de signalements à effacer (signalement supprimé, traité depuis 3 mois, envoyé depuis 12 mois). L''effacement passe par l''interface des fichiers.';
REVOKE ALL ON FUNCTION public.report_captures_a_effacer() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_captures_a_effacer() TO authenticated, service_role;
