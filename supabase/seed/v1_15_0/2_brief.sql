ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS intention text NOT NULL DEFAULT '';
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS appel_action_id uuid
  REFERENCES public.appels_action (id) ON DELETE SET NULL;
ALTER TABLE public.contenus_publics DROP CONSTRAINT IF EXISTS contenus_publics_intention_check;
ALTER TABLE public.contenus_publics ADD CONSTRAINT contenus_publics_intention_check
  CHECK (intention IN ('', 'comprendre', 'comparer', 'agir'));
