CREATE TABLE IF NOT EXISTS public.appels_action (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL CHECK (char_length(btrim(nom)) BETWEEN 2 AND 60),
  titre text NOT NULL CHECK (char_length(btrim(titre)) BETWEEN 3 AND 120),
  texte text NOT NULL DEFAULT '' CHECK (char_length(texte) <= 400),
  bouton text NOT NULL CHECK (char_length(btrim(bouton)) BETWEEN 2 AND 40),
  lien text NOT NULL CHECK (lien ~ '^(/|https://)' AND char_length(lien) <= 500),
  actif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.appels_action ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.appels_action TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appels_action TO authenticated;
GRANT ALL ON public.appels_action TO service_role;
DROP POLICY IF EXISTS "Appels a l action visibles de tous" ON public.appels_action;
CREATE POLICY "Appels a l action visibles de tous" ON public.appels_action FOR SELECT TO anon
  USING (actif);
DROP POLICY IF EXISTS "Appels a l action visibles des comptes" ON public.appels_action;
CREATE POLICY "Appels a l action visibles des comptes" ON public.appels_action FOR SELECT TO authenticated
  USING (actif OR public.can_write_content(auth.uid()));
DROP POLICY IF EXISTS "Admins gerent les appels a l action" ON public.appels_action;
CREATE POLICY "Admins gerent les appels a l action" ON public.appels_action FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
