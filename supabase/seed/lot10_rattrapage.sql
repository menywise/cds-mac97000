-- Rattrapage du lot 10 (30/09) : l'éditeur SQL s'est arrêté avant search_excerpt et search_site.
-- Rejouable. À exécuter seul, en une fois, puis vérifier : 5 lignes attendues.
-- Résumé affiché : texte brut, sans balises ni marques de mise en forme (# * _ ` > [ ]).
-- Caractères écrits avec chr() : certains éditeurs SQL coupent le script sur l'accent grave.
CREATE OR REPLACE FUNCTION public.search_excerpt(_t text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT left(btrim(regexp_replace(
    translate(regexp_replace(coalesce(_t, ''), '<[^>]*>', ' ', 'g'),
      '#*_' || chr(96) || '>' || chr(91) || chr(93), '       '),
    '\s+', ' ', 'g')), 180)
$$;
GRANT EXECUTE ON FUNCTION public.search_excerpt(text) TO anon, authenticated, service_role;

-- 5. Recherche : droits de l'appelant (RLS du site), modules éteints exclus, 50 résultats au plus.
CREATE OR REPLACE FUNCTION public.search_site(_q text, _limit integer DEFAULT 30)
RETURNS TABLE (kind text, title text, excerpt text, url text, rank real, updated_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE
  _tsq tsquery := public.search_query(_q);
  _n integer := least(greatest(coalesce(_limit, 30), 1), 50);
BEGIN
  IF _tsq IS NULL OR NOT public.module_enabled('search') THEN RETURN; END IF;
  RETURN QUERY
  SELECT r.kind, r.title, r.excerpt, r.url, r.rank, r.updated_at FROM (
    SELECT 'article'::text, b.title, public.search_excerpt(coalesce(nullif(b.excerpt, ''), b.content)),
      '/blog/' || b.slug, ts_rank(b.search_doc, _tsq), coalesce(b.published_at, b.created_at)
    FROM public.blog_posts b
    WHERE public.module_enabled('blog') AND b.published AND b.search_doc @@ _tsq
    UNION ALL
    SELECT 'faq', f.question, public.search_excerpt(f.answer), '/faq', ts_rank(f.search_doc, _tsq), f.updated_at
    FROM public.faq_items f
    WHERE public.module_enabled('faq') AND f.published AND f.search_doc @@ _tsq
    UNION ALL
    SELECT 'sujet', t.title, public.search_excerpt(t.content), '/forum/' || t.id, ts_rank(t.search_doc, _tsq),
      coalesce(t.last_activity_at, t.created_at)
    FROM public.forum_topics t
    WHERE public.module_enabled('forum') AND t.search_doc @@ _tsq
    UNION ALL
    SELECT 'formation', c.title, public.search_excerpt(coalesce(nullif(c.excerpt, ''), c.description)),
      '/formation/' || c.slug, ts_rank(c.search_doc, _tsq), c.updated_at
    FROM public.lms_courses c
    WHERE public.module_enabled('lms') AND c.published AND c.search_doc @@ _tsq
    UNION ALL
    SELECT 'annonce', m.title, public.search_excerpt(m.description), '/marketplace/' || m.slug,
      ts_rank(m.search_doc, _tsq), m.updated_at
    FROM public.marketplace_listings m
    WHERE public.module_enabled('marketplace') AND m.status = 'active' AND m.approved AND m.search_doc @@ _tsq
    UNION ALL
    SELECT 'annuaire', d.name, public.search_excerpt(concat_ws(' · ', nullif(d.excerpt, ''), nullif(d.city, ''))),
      '/annuaire/' || d.slug, ts_rank(d.search_doc, _tsq), d.updated_at
    FROM public.directory_listings d
    WHERE public.module_enabled('directory') AND d.status = 'published' AND d.search_doc @@ _tsq
    UNION ALL
    SELECT 'membre', p.display_name, public.search_excerpt(concat_ws(' · ', nullif(p.job_title, ''), nullif(p.bio, ''))),
      '/membres/' || p.user_id, ts_rank(p.search_doc, _tsq), p.updated_at
    FROM public.member_profiles p
    WHERE public.module_enabled('members') AND p.listed AND p.search_doc @@ _tsq
    UNION ALL
    SELECT 'page', g.title, public.search_excerpt(g.description), '/pages/' || g.slug,
      ts_rank(g.search_doc, _tsq), g.updated_at
    FROM public.pages g
    WHERE public.module_enabled('pages') AND g.published AND NOT g.is_home AND g.search_doc @@ _tsq
  ) AS r(kind, title, excerpt, url, rank, updated_at)
  ORDER BY r.rank DESC, r.updated_at DESC NULLS LAST
  LIMIT _n;
END;
$$;
GRANT EXECUTE ON FUNCTION public.search_site(text, integer) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

SELECT p.proname, true AS present
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('search_tags', 'search_query', 'search_excerpt', 'search_site', 'recette_purge')
ORDER BY 1;
