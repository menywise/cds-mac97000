CREATE TABLE IF NOT EXISTS public.contenus_publics_journal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contenu_id uuid NOT NULL REFERENCES public.contenus_publics (id) ON DELETE CASCADE,
  de text,
  vers text NOT NULL,
  par uuid,
  auto boolean NOT NULL DEFAULT false,
  motif text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contenus_publics_journal_contenu_idx
  ON public.contenus_publics_journal (contenu_id, created_at DESC);
CREATE TABLE IF NOT EXISTS public.contenus_publics_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contenu_id uuid NOT NULL REFERENCES public.contenus_publics (id) ON DELETE CASCADE,
  numero integer NOT NULL,
  titre text NOT NULL,
  description text NOT NULL,
  chapo text NOT NULL,
  corps text NOT NULL,
  sources text NOT NULL,
  par uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contenu_id, numero)
);
ALTER TABLE public.contenus_publics_journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contenus_publics_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.contenus_publics_journal, public.contenus_publics_versions FROM anon, authenticated;
GRANT SELECT ON public.contenus_publics_journal, public.contenus_publics_versions TO authenticated;
GRANT ALL ON public.contenus_publics_journal, public.contenus_publics_versions TO service_role;
DROP POLICY IF EXISTS "Redacteurs lisent le journal" ON public.contenus_publics_journal;
CREATE POLICY "Redacteurs lisent le journal" ON public.contenus_publics_journal FOR SELECT TO authenticated
  USING (public.can_write_content(auth.uid()));
DROP POLICY IF EXISTS "Redacteurs lisent les versions" ON public.contenus_publics_versions;
CREATE POLICY "Redacteurs lisent les versions" ON public.contenus_publics_versions FOR SELECT TO authenticated
  USING (public.can_write_content(auth.uid()));
CREATE OR REPLACE FUNCTION public.texte_editorial(_c public.contenus_publics)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT concat_ws(chr(31), _c.titre, _c.description, _c.chapo, _c.corps, _c.sources)
$$;
CREATE OR REPLACE FUNCTION public.libelle_statut(_s text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _s
    WHEN 'idee' THEN 'idée' WHEN 'redaction' THEN 'en rédaction' WHEN 'a_relire' THEN 'à relire'
    WHEN 'pret' THEN 'prêt' WHEN 'programme' THEN 'programmé' WHEN 'publie' THEN 'publié'
    WHEN 'a_actualiser' THEN 'à actualiser' ELSE coalesce(_s, '—') END
$$;
