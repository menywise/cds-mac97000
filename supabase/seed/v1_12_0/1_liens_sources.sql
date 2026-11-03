CREATE TABLE IF NOT EXISTS public.liens_sources_etat (
  url text PRIMARY KEY CHECK (url ~ '^https://' AND char_length(url) <= 2000),
  ok boolean NOT NULL,
  code_http integer,
  erreur text NOT NULL DEFAULT '' CHECK (char_length(erreur) <= 300),
  verifie_le timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.liens_sources_etat ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.liens_sources_etat FROM anon;
GRANT SELECT ON public.liens_sources_etat TO authenticated;
GRANT ALL ON public.liens_sources_etat TO service_role;
DROP POLICY IF EXISTS "Redacteurs lisent l etat des sources" ON public.liens_sources_etat;
CREATE POLICY "Redacteurs lisent l etat des sources" ON public.liens_sources_etat FOR SELECT TO authenticated
  USING (public.can_write_content(auth.uid()));
CREATE OR REPLACE FUNCTION public.enregistrer_liens_sources(_etats jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  e jsonb;
  n integer := 0;
BEGIN
  IF NOT public.can_write_content(auth.uid()) THEN
    RAISE EXCEPTION 'Réservé aux rédacteurs et aux administrateurs.' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(_etats) <> 'array' OR jsonb_array_length(_etats) > 100 THEN
    RAISE EXCEPTION 'Liste de résultats attendue, 100 au plus.' USING ERRCODE = '22023';
  END IF;
  FOR e IN SELECT * FROM jsonb_array_elements(_etats) LOOP
    CONTINUE WHEN coalesce(e ->> 'url', '') !~ '^https://' OR char_length(e ->> 'url') > 2000;
    INSERT INTO public.liens_sources_etat (url, ok, code_http, erreur, verifie_le)
    VALUES (e ->> 'url', coalesce((e ->> 'ok')::boolean, false),
            CASE WHEN coalesce(e ->> 'code_http', '') ~ '^[0-9]{3}$' THEN (e ->> 'code_http')::integer END,
            left(coalesce(e ->> 'erreur', ''), 300), now())
    ON CONFLICT (url) DO UPDATE SET ok = EXCLUDED.ok, code_http = EXCLUDED.code_http,
      erreur = EXCLUDED.erreur, verifie_le = EXCLUDED.verifie_le;
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION public.enregistrer_liens_sources(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enregistrer_liens_sources(jsonb) TO authenticated;
