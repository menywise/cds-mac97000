ALTER TABLE public.agent_cles ADD COLUMN IF NOT EXISTS usage_code text;
ALTER TABLE public.agent_cles DROP CONSTRAINT IF EXISTS agent_cles_niveau_check;
ALTER TABLE public.agent_cles ADD CONSTRAINT agent_cles_niveau_check
  CHECK (niveau IN ('lecture', 'completer', 'corriger', 'usage'));
ALTER TABLE public.agent_cles DROP CONSTRAINT IF EXISTS agent_cles_usage_code_check;
ALTER TABLE public.agent_cles ADD CONSTRAINT agent_cles_usage_code_check CHECK (
  (niveau = 'usage' AND usage_code IS NOT NULL AND usage_code ~ '^[a-z][a-z0-9_]{1,39}$')
  OR (niveau <> 'usage' AND usage_code IS NULL));
COMMENT ON COLUMN public.agent_cles.niveau IS
  'lecture : lit seulement ; completer : remplit des cases vides ; corriger : modifie et supprime ; usage : les seules actions déclarées pour usage_code.';
COMMENT ON COLUMN public.agent_cles.usage_code IS
  'Nom de l''usage d''une clé de niveau « usage » (minuscules, chiffres, tiret bas) ; vide pour une clé de l''échelle.';
CREATE OR REPLACE FUNCTION public.agent_identifier(_cle_hash text)
RETURNS TABLE (id uuid, nom text, niveau text, usage_code text) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE _cle public.agent_cles;
BEGIN
  SELECT * INTO _cle FROM public.agent_cles c
  WHERE c.cle_hash = _cle_hash AND c.actif
    AND c.expire_le >= (now() AT TIME ZONE 'Europe/Paris')::date;
  IF _cle.id IS NULL THEN RETURN; END IF;
  UPDATE public.agent_cles SET last_used_at = now() WHERE agent_cles.id = _cle.id;
  RETURN QUERY SELECT _cle.id, _cle.nom, _cle.niveau, _cle.usage_code;
END;
$$;
REVOKE ALL ON FUNCTION public.agent_identifier(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.agent_identifier(text) TO service_role;
CREATE OR REPLACE FUNCTION public.agent_authentifier(_cle_hash text)
RETURNS TABLE (id uuid, nom text, niveau text) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE _cle public.agent_cles;
BEGIN
  SELECT * INTO _cle FROM public.agent_cles c
  WHERE c.cle_hash = _cle_hash AND c.actif AND c.niveau <> 'usage'
    AND c.expire_le >= (now() AT TIME ZONE 'Europe/Paris')::date;
  IF _cle.id IS NULL THEN RETURN; END IF;
  UPDATE public.agent_cles SET last_used_at = now() WHERE agent_cles.id = _cle.id;
  RETURN QUERY SELECT _cle.id, _cle.nom, _cle.niveau;
END;
$$;
REVOKE ALL ON FUNCTION public.agent_authentifier(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.agent_authentifier(text) TO service_role;
