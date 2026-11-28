DROP POLICY IF EXISTS "Redirections lisibles des visiteurs" ON public.redirections;
REVOKE SELECT ON public.redirections FROM anon;
DROP POLICY IF EXISTS "Redirections lisibles des membres" ON public.redirections;
CREATE POLICY "Redirections lisibles des membres" ON public.redirections FOR SELECT TO authenticated
  USING (public.can_write_content(auth.uid()));
