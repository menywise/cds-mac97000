ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS statut text NOT NULL DEFAULT 'redaction';
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS relu_par uuid;
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS auteur_nom text NOT NULL DEFAULT '';
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS est_pilier boolean NOT NULL DEFAULT false;
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS pilier_id uuid
  REFERENCES public.contenus_publics (id) ON DELETE SET NULL;
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS public_vise text NOT NULL DEFAULT '';
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS requete_visee text NOT NULL DEFAULT '';
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS date_prevue date;
ALTER TABLE public.contenus_publics DROP CONSTRAINT IF EXISTS contenus_publics_statut_check;
ALTER TABLE public.contenus_publics ADD CONSTRAINT contenus_publics_statut_check
  CHECK (statut IN ('idee', 'redaction', 'a_relire', 'pret', 'publie', 'a_actualiser'));
ALTER TABLE public.contenus_publics DROP CONSTRAINT IF EXISTS contenus_publics_statut_page_check;
ALTER TABLE public.contenus_publics ADD CONSTRAINT contenus_publics_statut_page_check
  CHECK (type = 'article' OR statut IN ('redaction', 'publie'));
ALTER TABLE public.contenus_publics DROP CONSTRAINT IF EXISTS contenus_publics_editorial_check;
ALTER TABLE public.contenus_publics ADD CONSTRAINT contenus_publics_editorial_check
  CHECK (char_length(public_vise) <= 120 AND char_length(requete_visee) <= 120
         AND char_length(auteur_nom) <= 80
         AND (pilier_id IS NULL OR pilier_id <> id)
         AND NOT (est_pilier AND pilier_id IS NOT NULL));
UPDATE public.contenus_publics SET statut = CASE WHEN publie THEN 'publie' ELSE 'redaction' END
WHERE publie <> (statut IN ('publie', 'a_actualiser'));
