ALTER TABLE public.redirections DROP CONSTRAINT IF EXISTS redirections_de_check;
ALTER TABLE public.redirections ADD CONSTRAINT redirections_de_check
  CHECK (de ~ '^/[A-Za-z0-9/._~%-]*$' AND char_length(de) <= 300);
ALTER TABLE public.redirections DROP CONSTRAINT IF EXISTS redirections_check;
ALTER TABLE public.redirections DROP CONSTRAINT IF EXISTS redirections_vers_check;
ALTER TABLE public.redirections ADD CONSTRAINT redirections_vers_check
  CHECK ((vers ~ '^/[A-Za-z0-9/._~%-]*$' OR vers ~ '^https://[^ ]+$') AND char_length(vers) <= 500 AND vers <> de);
COMMENT ON TABLE public.redirections IS
  'Anciennes adresses du site et leur nouvelle adresse (redirection permanente). Lue une adresse à la fois par redirection_pour().';
CREATE OR REPLACE FUNCTION public.redirection_pour(_chemin text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.vers FROM public.redirections r
  WHERE char_length(_chemin) <= 300
    AND r.de IN (_chemin, rtrim(_chemin, '/'), rtrim(_chemin, '/') || '/')
  ORDER BY (r.de = _chemin) DESC
  LIMIT 1;
$$;
COMMENT ON FUNCTION public.redirection_pour(text) IS
  'Nouvelle adresse d''une ancienne adresse du site (avec ou sans barre oblique finale), ou rien. Une adresse à la fois : la table n''est pas lisible en masse.';
REVOKE ALL ON FUNCTION public.redirection_pour(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redirection_pour(text) TO anon, authenticated, service_role;
