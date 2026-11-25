-- Socle 1.21.0 — clé d'usage. À côté de l'échelle lecture, compléter, corriger, une clé peut servir
-- un seul usage nommé (par exemple un script du poste lancé après chaque récupération du code) :
-- niveau « usage », nom de l'usage dans usage_code. Une telle clé ne fait que les actions déclarées
-- pour cet usage, et une clé de l'échelle, même « corriger », ne les fait pas. Le serveur identifie
-- une clé par agent_identifier(), qui rend aussi son usage ; agent_authentifier() garde sa forme
-- pour les serveurs pas encore mis à niveau, mais refuse une clé d'usage : un ancien serveur ne
-- peut pas la prendre pour une clé ordinaire. Né d'un besoin du premier clone (clé « recette »
-- d'un script du poste, hors échelle). Rejouable sans danger. Écrit pour l'éditeur SQL de Lovable :
-- ni antislash ni point d'interrogation, aucune ligne vide dans une instruction.

-- 1. Clés : niveau « usage » et nom de l'usage ---------------------------------------------------
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

-- 2. Pour le serveur : identifier une clé, avec son usage ------------------------------------------
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

-- 3. Ancienne entrée : une clé d'usage n'y passe pas ----------------------------------------------
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

-- 4. Version -------------------------------------------------------------------------------------
INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.21.0', 'brique', '2026-11-25',
  'Clé d''usage : une clé qui ne sert qu''un usage nommé, hors de l''échelle lecture, compléter, corriger.',
  'Niveau « usage » et colonne usage_code dans agent_cles. Une action déclarée pour un usage ne répond qu''aux clés de cet usage ; une clé d''usage ne fait que ses actions et « aide ». agent_identifier() rend la clé et son usage au serveur ; agent_authentifier() refuse désormais une clé d''usage. Écran Admin, Co-intervenants IA : choix de l''usage parmi ceux que l''installation déclare. Remontée du premier clone.',
  '20261123120000_v1_21_0_cles_usage')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.21.0', 'publie_le', '2026-11-25',
  'migration_reference', '20261123120000_v1_21_0_cles_usage'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.21.0', '.')::int[];
