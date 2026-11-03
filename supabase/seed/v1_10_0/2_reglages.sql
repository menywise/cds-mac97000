CREATE OR REPLACE FUNCTION public.editorial_defaults()
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT jsonb_build_object(
    'circuit', 'complet',
    'delai_relecture_mois', 12,
    'exiger_sources', true,
    'exiger_relecture', true,
    'exiger_auteur', true,
    'longueurs_seo', true,
    'auteur_mode', 'fonction',
    'avertissement', '')
$$;
GRANT EXECUTE ON FUNCTION public.editorial_defaults() TO anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.editorial_reglages()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.editorial_defaults()
    || coalesce((SELECT value FROM public.site_settings WHERE key = 'editorial'), '{}'::jsonb)
$$;
GRANT EXECUTE ON FUNCTION public.editorial_reglages() TO anon, authenticated, service_role;
INSERT INTO public.site_settings (key, value) VALUES ('editorial', public.editorial_defaults())
ON CONFLICT (key) DO NOTHING;
CREATE OR REPLACE FUNCTION public.can_write_content(_user_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN _user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text IN ('admin', 'editor'));
END;
$$;
REVOKE ALL ON FUNCTION public.can_write_content(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_write_content(uuid) TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.admin_set_editor(_user_id uuid, _editor boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Réservé aux administrateurs' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _user_id) THEN
    RAISE EXCEPTION 'Utilisateur introuvable' USING ERRCODE = 'P0002';
  END IF;
  IF _editor THEN
    EXECUTE 'INSERT INTO public.user_roles (user_id, role) VALUES ($1, $2::public.app_role) ON CONFLICT (user_id, role) DO NOTHING'
      USING _user_id, 'editor';
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role::text = 'editor';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_editor(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_editor(uuid, boolean) TO authenticated;
