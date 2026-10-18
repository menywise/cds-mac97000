-- Socle 1.8.0 — messagerie en direct.
-- 1. La table des messages entre dans la publication temps réel de Supabase (supabase_realtime) : un
--    message reçu, ou lu par l'autre membre, s'affiche sans recharger la page. Le temps réel applique
--    les règles d'accès de la table : chaque membre ne reçoit que les messages de ses conversations.
-- 2. Index des messages non lus : le compteur de l'en-tête reste rapide.
-- 3. Grille de conformité et version 1.8.0.
-- Rejouable sans danger. Base sans publication supabase_realtime (hors Supabase) : avis, rien d'autre.

-- 1. Publication temps réel ------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE NOTICE 'Publication supabase_realtime absente : messagerie sans temps réel';
  ELSIF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;

-- 2. Messages non lus --------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS messages_unread_idx ON public.messages (conversation_id) WHERE read_at IS NULL;

-- 3. Grille de conformité et version ---------------------------------------------------------------
INSERT INTO public.template_checks (code, area, label, requirement, status, severity, evidence, position, modules)
SELECT 'V1-MESSAGERIE-DIRECT', 'Communaute', 'Messagerie en direct',
  'Message reçu et accusé de lecture affichés sans recharger la page, pour les seuls participants de la conversation ; nombre de messages non lus dans l''en-tête ; signalement de l''autre membre par le bouton « Signaler ».',
  'conforme', 'mineur', 'tests/db/test_29',
  coalesce((SELECT max(position) FROM public.template_checks), 0) + 1, ARRAY['messaging']
ON CONFLICT (code) DO NOTHING;
INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.8.0', 'brique', '2026-10-18',
  'Messagerie en direct : messages et accusés de lecture sans recharger la page, non lus dans l''en-tête.',
  'Table messages dans la publication supabase_realtime (règles d''accès appliquées : participants seulement) ; index des messages non lus ; compteur dans l''en-tête ; « Vu à » sur ses propres messages ; signalement de l''autre membre par report_submit.',
  '20261018120000_v1_8_0_messagerie_direct')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.8.0', 'publie_le', '2026-10-18',
  'migration_reference', '20261018120000_v1_8_0_messagerie_direct'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.8.0', '.')::int[];
