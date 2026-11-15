DO $$
DECLARE
  _droits text := 'TRUNCATE, REFERENCES, TRIGGER';
BEGIN
  IF current_setting('server_version_num')::int >= 170000 THEN
    _droits := _droits || ', MAINTAIN';
  END IF;
  EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE %s ON TABLES FROM anon, authenticated', _droits);
END;
$$;
