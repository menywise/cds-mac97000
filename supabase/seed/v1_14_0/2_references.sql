CREATE TABLE IF NOT EXISTS public.references_contenu (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contenu_id uuid NOT NULL REFERENCES public.contenus_publics (id) ON DELETE CASCADE,
  rang integer NOT NULL CHECK (rang BETWEEN 1 AND 999),
  auteurs text NOT NULL DEFAULT '' CHECK (char_length(auteurs) <= 300),
  titre text NOT NULL CHECK (char_length(btrim(titre)) BETWEEN 3 AND 300),
  revue text NOT NULL DEFAULT '' CHECK (char_length(revue) <= 200),
  annee integer CHECK (annee BETWEEN 1800 AND 2100),
  doi text NOT NULL DEFAULT '' CHECK (doi = '' OR (doi ~ '^10[.][0-9]{4,9}/[^[:space:]]+$' AND char_length(doi) <= 200)),
  pmid text NOT NULL DEFAULT '' CHECK (pmid = '' OR pmid ~ '^[0-9]{1,9}$'),
  url text NOT NULL DEFAULT '' CHECK (url = '' OR (url ~ '^https://' AND char_length(url) <= 2000)),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contenu_id, rang)
);
ALTER TABLE public.references_contenu ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.references_contenu TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.references_contenu TO authenticated;
GRANT ALL ON public.references_contenu TO service_role;
DROP POLICY IF EXISTS "References lisibles avec leur contenu" ON public.references_contenu;
CREATE POLICY "References lisibles avec leur contenu" ON public.references_contenu FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.contenus_publics c WHERE c.id = contenu_id));
DROP POLICY IF EXISTS "Redacteurs ecrivent les references" ON public.references_contenu;
CREATE POLICY "Redacteurs ecrivent les references" ON public.references_contenu FOR ALL TO authenticated
  USING (public.can_write_content(auth.uid())) WITH CHECK (public.can_write_content(auth.uid()));
