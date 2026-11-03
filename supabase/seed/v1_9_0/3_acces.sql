DROP POLICY IF EXISTS "Admins gerent le blog" ON public.contenus_publics;
DROP POLICY IF EXISTS "Articles publies visibles par les visiteurs" ON public.contenus_publics;
DROP POLICY IF EXISTS "Articles visibles par les membres" ON public.contenus_publics;
DROP POLICY IF EXISTS "Admins gerent les contenus" ON public.contenus_publics;
CREATE POLICY "Admins gerent les contenus" ON public.contenus_publics FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Contenus publies visibles par les visiteurs" ON public.contenus_publics;
CREATE POLICY "Contenus publies visibles par les visiteurs" ON public.contenus_publics FOR SELECT TO anon
  USING (publie);
DROP POLICY IF EXISTS "Contenus visibles par les membres" ON public.contenus_publics;
CREATE POLICY "Contenus visibles par les membres" ON public.contenus_publics FOR SELECT TO authenticated
  USING (publie OR public.has_role(auth.uid(), 'admin'::app_role));
