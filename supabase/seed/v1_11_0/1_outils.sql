CREATE OR REPLACE FUNCTION public.slug_depuis(_t text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT trim(both '-' from left(trim(both '-' from
    regexp_replace(lower(extensions.unaccent(coalesce(_t, ''))), '[^a-z0-9]+', '-', 'g')), 80))
$$;
GRANT EXECUTE ON FUNCTION public.slug_depuis(text) TO anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.extraire_liens(_corps text)
RETURNS TABLE (rang integer, ancre text, chemin text) LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT m.n::integer, btrim(m.r[1]),
         rtrim(split_part(split_part(m.r[2], '#', 1), chr(63), 1), '/')
  FROM regexp_matches(coalesce(_corps, ''), '[[]([^]]+)[]][(](/[^)[:space:]]*)[)]', 'g')
       WITH ORDINALITY AS m(r, n)
$$;
GRANT EXECUTE ON FUNCTION public.extraire_liens(text) TO anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.slug_article_du_chemin(_chemin text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN _chemin ~ '^/blog/[a-z0-9]+(-[a-z0-9]+)*$' THEN substr(_chemin, 7) END
$$;
GRANT EXECUTE ON FUNCTION public.slug_article_du_chemin(text) TO anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.editorial_defaults()
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT jsonb_build_object(
    'circuit', 'complet',
    'delai_relecture_mois', 12,
    'exiger_sources', true,
    'exiger_relecture', true,
    'exiger_auteur', true,
    'longueurs_seo', true,
    'auteur_mode', 'fonction',
    'avertissement', '',
    'seuil_etiquette', 3)
$$;
