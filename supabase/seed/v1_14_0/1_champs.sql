ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS genre text NOT NULL DEFAULT 'article';
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS evenement text NOT NULL DEFAULT '';
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS evenement_le date;
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS liens_interets text NOT NULL DEFAULT '';
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS niveau_preuve text NOT NULL DEFAULT '';
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS relecteurs text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.contenus_publics DROP CONSTRAINT IF EXISTS contenus_publics_savante_check;
ALTER TABLE public.contenus_publics ADD CONSTRAINT contenus_publics_savante_check
  CHECK (genre IN ('article', 'guide', 'actualite', 'compte_rendu', 'entretien', 'fiche_pratique')
         AND char_length(evenement) <= 160 AND char_length(liens_interets) <= 600
         AND char_length(niveau_preuve) <= 60 AND cardinality(relecteurs) <= 5
         AND char_length(array_to_string(relecteurs, '')) <= 400);
