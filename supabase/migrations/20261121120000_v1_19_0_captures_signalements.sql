-- Socle 1.19.0 — capture d'écran jointe à un signalement, motif « La page s'affiche mal ».
-- 1. Nouveau motif d'amélioration : « affichage », pour un défaut visuel.
-- 2. Dossier de fichiers privé « signalements-captures » : 2 Mo au plus, PNG, JPEG ou WebP. Aucune
--    lecture publique : seuls les administrateurs voient une capture, par un lien signé de courte durée.
-- 3. Dépôt facultatif, juste après l'envoi : une capture par signalement, au nom « <code>/capture »,
--    dans les 15 minutes qui suivent l'envoi, par l'auteur du signalement (le visiteur sans compte pour
--    un signalement de visiteur, le membre lui-même pour le sien), tant qu'il est à examiner. Le code de
--    suivi (10 caractères tirés au hasard) n'est connu que de l'auteur. Ni remplacement ni suppression
--    par l'auteur. Le navigateur réécrit l'image avant l'envoi : les métadonnées (lieu, appareil) partent.
-- 4. Effacement : 3 mois après le traitement, 12 mois après l'envoi sans traitement, aussitôt si le
--    signalement est supprimé. La base dresse la liste (report_captures_a_effacer) ; l'effacement passe
--    par l'interface des fichiers (écran des signalements, adresse /api/cron/purge-contact), la seule
--    que la plateforme autorise pour retirer un fichier.
-- 5. Grille de conformité, registre et version 1.19.0.
-- Rejouable sans danger. Écrit pour l'éditeur SQL de Lovable : ni antislash ni point
-- d'interrogation, aucune ligne vide dans une instruction.

-- 1. Motif « La page s'affiche mal » ------------------------------------------------------------
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_reason_check;
ALTER TABLE public.reports ADD CONSTRAINT reports_reason_check CHECK (reason IN (
  'spam', 'contenu_inapproprie', 'harcelement', 'fraude', 'information_erronee', 'doublon',
  'droit_auteur', 'contenu_illegal', 'oubli', 'correction', 'affichage', 'autre'));

-- 2. Dossier privé des captures -------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('signalements-captures', 'signalements-captures', false, 2097152,
  ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp'];

-- 3. Dépôt d'une capture par l'auteur du signalement --------------------------------------------
-- Vrai si le nom de fichier désigne la capture d'un signalement que la session vient d'envoyer.
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

-- 4. Captures à effacer ---------------------------------------------------------------------------
-- Signalement supprimé, traité depuis plus de 3 mois, ou envoyé depuis plus de 12 mois.
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

-- 5. Grille de conformité, registre et version -----------------------------------------------------
INSERT INTO public.template_checks (code, area, label, requirement, status, severity, evidence, position, modules)
SELECT 'V1-SIGNALEMENTS-CAPTURES', 'Modération', 'Capture d''écran jointe à un signalement',
  'Capture facultative, 2 Mo au plus, PNG, JPEG ou WebP, réécrite par le navigateur (métadonnées retirées) ; une par signalement, par son auteur, dans les 15 minutes ; dossier privé lu des seuls administrateurs ; effacée 3 mois après le traitement, 12 mois après l''envoi, aussitôt avec le signalement.',
  'conforme', 'majeur', 'tests/db/test_49',
  coalesce((SELECT max(position) FROM public.template_checks), 0) + 1, ARRAY['reports']
ON CONFLICT (code) DO NOTHING;
UPDATE public.registre
SET usage = 'Lance la purge des messages de contact et l''effacement des captures de signalements expirées, pour une plateforme qui planifie par appel web.'
WHERE type = 'adresse' AND identifiant = '/api/cron/purge-contact';
INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.19.0', 'brique', '2026-11-22',
  'Signalements : capture d''écran facultative, motif « La page s''affiche mal », pied de page partout avec la version du socle.',
  'Capture jointe par l''auteur du signalement dans les 15 minutes (dossier privé signalements-captures, 2 Mo, PNG, JPEG ou WebP, image réécrite par le navigateur), lue des seuls administrateurs par lien signé, effacée 3 mois après le traitement (report_captures_a_effacer). Nouveau motif affichage. Côté code : version du socle dans le pied de page, pied de page réduit sur les pages de connexion, de maintenance et d''erreur.',
  '20261121120000_v1_19_0_captures_signalements')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.19.0', 'publie_le', '2026-11-22',
  'migration_reference', '20261121120000_v1_19_0_captures_signalements'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.19.0', '.')::int[];
