DROP POLICY IF EXISTS "Contenus publies visibles par les visiteurs" ON public.contenus_publics;
CREATE POLICY "Contenus publies visibles par les visiteurs" ON public.contenus_publics FOR SELECT TO anon
  USING (publie AND (publie_le IS NULL OR publie_le <= now()));
DROP POLICY IF EXISTS "Contenus visibles par les membres" ON public.contenus_publics;
CREATE POLICY "Contenus visibles par les membres" ON public.contenus_publics FOR SELECT TO authenticated
  USING ((publie AND (publie_le IS NULL OR publie_le <= now())) OR public.can_write_content(auth.uid()));
DROP POLICY IF EXISTS "Redacteurs creent les contenus" ON public.contenus_publics;
CREATE POLICY "Redacteurs creent les contenus" ON public.contenus_publics FOR INSERT TO authenticated
  WITH CHECK (public.can_write_content(auth.uid()));
DROP POLICY IF EXISTS "Redacteurs modifient les contenus" ON public.contenus_publics;
CREATE POLICY "Redacteurs modifient les contenus" ON public.contenus_publics FOR UPDATE TO authenticated
  USING (public.can_write_content(auth.uid())) WITH CHECK (public.can_write_content(auth.uid()));
