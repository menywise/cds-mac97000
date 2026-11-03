-- Socle 1.15.2 : toute fonction du schéma public fige son search_path (avis Supabase
-- « function_search_path_mutable »). Un clone qui ajoute une fonction greffe_* sans le fixer échoue ici.
\set ON_ERROR_STOP 1
\i tests/db/_helpers.sql
BEGIN;
DO $$
DECLARE _noms text;
BEGIN
  SELECT string_agg(p.proname, ', ' ORDER BY p.proname) INTO _noms
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.prokind = 'f'
    AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig, '{}')) c WHERE c LIKE 'search_path=%');
  IF _noms IS NOT NULL THEN
    RAISE EXCEPTION 'fonctions sans search_path : %', _noms;
  END IF;
END $$;
ROLLBACK;
