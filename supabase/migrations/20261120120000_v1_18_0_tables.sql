-- Socle 1.18.0 — Tables : faire vivre la base sans écrire de code. Un administrateur ouvre
-- n'importe quelle table de l'application dans Admin, Tables : grille, fiche d'une ligne, ajout,
-- modification, suppression, export CSV, import CSV en masse. L'écran ne contourne rien : il lit et
-- écrit par l'interface de données ordinaire, sous les politiques de sécurité par ligne de chaque
-- table ; ce qu'une politique refuse à l'administrateur reste refusé. Le seul ajout en base est le
-- catalogue : tables_catalogue() décrit chaque table du schéma public (colonnes, types, clé
-- primaire, clés étrangères, valeurs d'une énumération, nombre de lignes approché) pour les seuls
-- administrateurs. Né d'un besoin du premier clone (un back-office façon tableur, sans code).
-- Rejouable sans danger. Écrit pour l'éditeur SQL de Lovable : ni antislash ni point
-- d'interrogation, aucune ligne vide dans une instruction.

-- 1. Catalogue des tables ------------------------------------------------------------------------
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

-- 2. Version -------------------------------------------------------------------------------------
INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.18.0', 'brique', '2026-11-21',
  'Tables : faire vivre la base sans écrire de code, grille, fiche, import et export CSV.',
  'Écran Admin, Tables : chaque table du schéma public en grille (tri, recherche, pages), fiche d''une ligne (ajout, modification, suppression), export CSV de la sélection, import CSV en masse (aperçu, erreurs ligne par ligne, insertion ou mise à jour sur la clé). Lit et écrit par l''interface de données, sous les politiques de sécurité par ligne. Seul ajout en base : tables_catalogue(), réservée aux administrateurs. Remontée du premier clone.',
  '20261120120000_v1_18_0_tables')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.18.0', 'publie_le', '2026-11-21',
  'migration_reference', '20261120120000_v1_18_0_tables'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.18.0', '.')::int[];
