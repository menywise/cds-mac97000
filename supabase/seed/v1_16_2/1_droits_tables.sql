DO $$
DECLARE
  _t record;
  _droits text := 'TRUNCATE, REFERENCES, TRIGGER';
BEGIN
  IF current_setting('server_version_num')::int >= 170000 THEN
    _droits := _droits || ', MAINTAIN';
  END IF;
  FOR _t IN SELECT c.relname FROM pg_class c
    WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r', 'p') ORDER BY c.relname LOOP
    EXECUTE format('REVOKE %s ON public.%I FROM anon, authenticated', _droits, _t.relname);
  END LOOP;
END;
$$;

REVOKE INSERT, UPDATE, DELETE ON public.template_checks FROM anon;
