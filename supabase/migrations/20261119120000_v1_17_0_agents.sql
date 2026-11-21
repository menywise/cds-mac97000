-- Socle 1.17.0 — co-intervenant IA. Une IA qui écrit dans l'application est un intervenant comme
-- un autre : une clé avec sa fiche d'identité (usage, utilisateur, dernier jour), un niveau
-- (lecture, compléter, corriger), et la trace de tout ce qu'elle écrit (agent_journal). La fiche
-- de la clé fait foi : sa ligne au registre s'écrit seule (type « cle »), et registre_manquants()
-- signale une clé dont la ligne a disparu. Le serveur de l'application authentifie une clé par
-- agent_authentifier() et journalise par agent_journaliser() : ces deux fonctions ne sont ouvertes
-- qu'au rôle de service. Les administrateurs créent, coupent et relisent les clés et le journal
-- dans Admin, Co-intervenants IA ; les actions qu'une clé peut faire sont déclarées par chaque
-- installation dans sa prise de greffe (src/greffe/index.ts, actionsAgent), servies par /api/agent.
-- Né d'un besoin du premier clone (clés d'agent sans fiche, journal des écritures de l'agent).
-- Rejouable sans danger. Écrit pour l'éditeur SQL de Lovable : ni antislash ni point
-- d'interrogation, aucune ligne vide dans une instruction.

-- 1. Clés ----------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_cles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  cle_hash text NOT NULL,
  niveau text NOT NULL DEFAULT 'completer',
  actif boolean NOT NULL DEFAULT true,
  usage text,
  utilisateur text,
  expire_le date,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agent_cles_nom_unique UNIQUE (nom),
  CONSTRAINT agent_cles_cle_hash_unique UNIQUE (cle_hash),
  CONSTRAINT agent_cles_nom_check CHECK (btrim(nom) <> ''),
  CONSTRAINT agent_cles_niveau_check CHECK (niveau IN ('lecture', 'completer', 'corriger')),
  CONSTRAINT agent_cles_fiche_check CHECK (NOT actif OR (nullif(btrim(usage), '') IS NOT NULL
    AND nullif(btrim(utilisateur), '') IS NOT NULL AND expire_le IS NOT NULL))
);
COMMENT ON TABLE public.agent_cles IS
  'Clés des co-intervenants IA (socle 1.17.0) : une fiche obligatoire pour une clé active. Seule l''empreinte de la clé est gardée.';
COMMENT ON COLUMN public.agent_cles.cle_hash IS 'Empreinte SHA-256 (hexadécimal) de la clé ; la clé en clair n''est montrée qu''à sa création.';
COMMENT ON COLUMN public.agent_cles.niveau IS 'lecture : lit seulement ; completer : remplit des cases vides ; corriger : modifie et supprime.';
COMMENT ON COLUMN public.agent_cles.usage IS 'À quoi sert la clé et dans quel cadre. Obligatoire pour une clé active.';
COMMENT ON COLUMN public.agent_cles.utilisateur IS 'Qui s''en sert : script, session, outil. Obligatoire pour une clé active.';
COMMENT ON COLUMN public.agent_cles.expire_le IS 'Dernier jour d''utilisation (heure de Paris) ; le lendemain, le serveur refuse la clé.';
DROP TRIGGER IF EXISTS agent_cles_updated_at ON public.agent_cles;
CREATE TRIGGER agent_cles_updated_at BEFORE UPDATE ON public.agent_cles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.agent_cles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.agent_cles FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_cles TO authenticated;
GRANT ALL ON public.agent_cles TO service_role;
DROP POLICY IF EXISTS "Clés d'agent : administrateurs" ON public.agent_cles;
CREATE POLICY "Clés d'agent : administrateurs" ON public.agent_cles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Journal : tout ce qu'une clé écrit ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_journal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cle_id uuid REFERENCES public.agent_cles (id) ON DELETE SET NULL,
  agent text NOT NULL,
  action text NOT NULL,
  table_cible text NOT NULL,
  ligne_id uuid,
  champ text,
  avant text,
  apres text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agent_journal_action_check CHECK (btrim(action) <> '' AND btrim(table_cible) <> '')
);
COMMENT ON TABLE public.agent_journal IS
  'Journal des écritures des co-intervenants IA (socle 1.17.0) : qui, quelle action, quelle table, quelle ligne, avant, après. Lu par les administrateurs, écrit par le serveur.';
CREATE INDEX IF NOT EXISTS agent_journal_created_idx ON public.agent_journal (created_at DESC);
CREATE INDEX IF NOT EXISTS agent_journal_cle_idx ON public.agent_journal (cle_id);
ALTER TABLE public.agent_journal ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.agent_journal FROM PUBLIC, anon;
GRANT SELECT ON public.agent_journal TO authenticated;
GRANT ALL ON public.agent_journal TO service_role;
DROP POLICY IF EXISTS "Journal des agents : administrateurs" ON public.agent_journal;
CREATE POLICY "Journal des agents : administrateurs" ON public.agent_journal FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Pour le serveur : authentifier une clé, journaliser ------------------------------------------
CREATE OR REPLACE FUNCTION public.agent_authentifier(_cle_hash text)
RETURNS TABLE (id uuid, nom text, niveau text) LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE _cle public.agent_cles;
BEGIN
  SELECT * INTO _cle FROM public.agent_cles c
  WHERE c.cle_hash = _cle_hash AND c.actif
    AND c.expire_le >= (now() AT TIME ZONE 'Europe/Paris')::date;
  IF _cle.id IS NULL THEN RETURN; END IF;
  UPDATE public.agent_cles SET last_used_at = now() WHERE agent_cles.id = _cle.id;
  RETURN QUERY SELECT _cle.id, _cle.nom, _cle.niveau;
END;
$$;
REVOKE ALL ON FUNCTION public.agent_authentifier(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.agent_authentifier(text) TO service_role;
CREATE OR REPLACE FUNCTION public.agent_journaliser(_cle_id uuid, _action text, _table_cible text,
  _ligne_id uuid DEFAULT NULL, _champ text DEFAULT NULL, _avant text DEFAULT NULL, _apres text DEFAULT NULL)
RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.agent_journal (cle_id, agent, action, table_cible, ligne_id, champ, avant, apres)
  SELECT c.id, c.nom, _action, _table_cible, _ligne_id, _champ, _avant, _apres
  FROM public.agent_cles c WHERE c.id = _cle_id
  RETURNING id
$$;
REVOKE ALL ON FUNCTION public.agent_journaliser(uuid, text, text, uuid, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.agent_journaliser(uuid, text, text, uuid, text, text, text) TO service_role;

-- 4. Registre : la fiche de la clé fait foi, sa ligne suit -------------------------------------------
CREATE OR REPLACE FUNCTION public.agent_cles_registre_miroir()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _nom text := coalesce(NEW.nom, OLD.nom);
  _cle public.agent_cles;
BEGIN
  SELECT * INTO _cle FROM public.agent_cles WHERE nom = _nom;
  IF _cle.id IS NULL THEN
    UPDATE public.registre SET etat = 'abandonne', a_revoir_le = NULL,
      usage = usage || ' Clé supprimée le ' || to_char(CURRENT_DATE, 'DD/MM/YYYY') || '.'
    WHERE type = 'cle' AND identifiant = _nom AND usage NOT LIKE '%Clé supprimée le%';
    RETURN NULL;
  END IF;
  INSERT INTO public.registre (type, identifiant, usage, utilisateur, etat, a_revoir_le, decision)
  VALUES ('cle', _nom,
    coalesce(nullif(btrim(_cle.usage), ''), 'À confirmer : clé sans fiche.'),
    coalesce(nullif(btrim(_cle.utilisateur), ''), 'À confirmer'),
    CASE WHEN _cle.actif THEN 'en_service' ELSE 'abandonne' END,
    CASE WHEN _cle.actif THEN coalesce(_cle.expire_le, CURRENT_DATE) END,
    'Socle 1.17.0, co-intervenant IA')
  ON CONFLICT (type, identifiant) DO UPDATE SET
    usage = EXCLUDED.usage, utilisateur = EXCLUDED.utilisateur,
    etat = EXCLUDED.etat, a_revoir_le = EXCLUDED.a_revoir_le;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.agent_cles_registre_miroir() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS agent_cles_registre_miroir ON public.agent_cles;
CREATE TRIGGER agent_cles_registre_miroir AFTER INSERT OR UPDATE OR DELETE ON public.agent_cles
  FOR EACH ROW EXECUTE FUNCTION public.agent_cles_registre_miroir();
CREATE OR REPLACE FUNCTION public.registre_attendus()
RETURNS TABLE (type text, identifiant text) LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Réservé aux administrateurs.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT 'module'::text, k::text FROM jsonb_object_keys(public.module_defaults()) AS k;
  RETURN QUERY SELECT 'cle'::text, c.nom::text FROM public.agent_cles c;
  IF to_regclass('cron.job') IS NOT NULL THEN
    RETURN QUERY EXECUTE 'SELECT ''tache''::text, jobname::text FROM cron.job WHERE jobname IS NOT NULL';
  END IF;
  IF to_regprocedure('public.greffe_registre_attendus()') IS NOT NULL THEN
    RETURN QUERY EXECUTE 'SELECT g.type::text, g.identifiant::text FROM public.greffe_registre_attendus() AS g';
  END IF;
END;
$$;
SELECT public.registre_inscrire('adresse', '/api/agent',
  'Entrée des co-intervenants IA : clé dans l''en-tête x-agent-key, action et paramètres en JSON. Le socle authentifie et journalise ; l''installation déclare les actions (src/greffe/index.ts, actionsAgent).',
  'Clés de agent_cles (scripts, sessions, outils), quand une installation déclare des actions',
  'en_service', CURRENT_DATE + 182, 'Socle 1.17.0, co-intervenant IA');

-- 5. Version -------------------------------------------------------------------------------------
INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.17.0', 'brique', '2026-11-21',
  'Co-intervenant IA : une clé avec sa fiche, un niveau, et la trace de tout ce qu''elle écrit.',
  'Tables agent_cles (fiche obligatoire pour une clé active, empreinte seule, niveau lecture, compléter ou corriger) et agent_journal (qui, action, table, ligne, avant, après), réservées aux administrateurs. agent_authentifier() et agent_journaliser() pour le serveur seul ; entrée /api/agent, actions déclarées par la greffe. La ligne au registre suit la fiche de la clé. Écran Admin, Co-intervenants IA. Remontée du premier clone.',
  '20261119120000_v1_17_0_agents')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.17.0', 'publie_le', '2026-11-21',
  'migration_reference', '20261119120000_v1_17_0_agents'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.17.0', '.')::int[];
