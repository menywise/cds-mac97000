CREATE OR REPLACE FUNCTION public.tables_catalogue()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _resultat jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Réservé aux administrateurs.' USING ERRCODE = '42501';
  END IF;
  SELECT coalesce(jsonb_agg(t ORDER BY t ->> 'nom'), '[]'::jsonb) INTO _resultat
  FROM (
    SELECT jsonb_build_object(
      'nom', c.relname,
      'commentaire', obj_description(c.oid, 'pg_class'),
      'lignes_environ', greatest(c.reltuples, 0)::bigint,
      'rls', c.relrowsecurity,
      'colonnes', (
        SELECT jsonb_agg(jsonb_build_object(
          'nom', a.attname,
          'type', format_type(a.atttypid, a.atttypmod),
          'nullable', NOT a.attnotnull,
          'defaut', pg_get_expr(d.adbin, d.adrelid),
          'cle_primaire', EXISTS (
            SELECT 1 FROM pg_constraint k
            WHERE k.conrelid = c.oid AND k.contype = 'p' AND a.attnum = ANY (k.conkey)),
          'reference', (
            SELECT f.confrelid::regclass::text || '.' || fa.attname
            FROM pg_constraint f
            JOIN pg_attribute fa ON fa.attrelid = f.confrelid AND fa.attnum = f.confkey[1]
            WHERE f.conrelid = c.oid AND f.contype = 'f' AND f.conkey[1] = a.attnum
              AND array_length(f.conkey, 1) = 1
            LIMIT 1),
          'enum', (
            SELECT jsonb_agg(e.enumlabel ORDER BY e.enumsortorder)
            FROM pg_enum e WHERE e.enumtypid = a.atttypid),
          'commentaire', col_description(c.oid, a.attnum)
        ) ORDER BY a.attnum)
        FROM pg_attribute a
        LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
        WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
      )
    ) AS t
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
  ) AS tables;
  RETURN _resultat;
END;
$$;
COMMENT ON FUNCTION public.tables_catalogue() IS
  'Socle 1.18.0 : décrit chaque table du schéma public (colonnes, types, clé primaire, références, énumérations, lignes approchées) pour les administrateurs. L''écran Admin, Tables lit et écrit ensuite par l''interface de données, sous les politiques de chaque table.';
REVOKE ALL ON FUNCTION public.tables_catalogue() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tables_catalogue() TO authenticated, service_role;
