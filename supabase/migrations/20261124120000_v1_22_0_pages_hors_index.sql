-- Socle 1.22.0 — page hors index. Une page libre peut servir de satellite à une campagne : page
-- d'inscription à un webinaire, page de remerciement, page d'un séminaire envoyée par e-mail ou sur
-- un réseau social. Elle reste en ligne pour qui a le lien, mais n'est faite ni pour les moteurs de
-- recherche ni pour la navigation du site. Une page hors index porte la balise « noindex », sort du
-- plan du site, de la page « Plan du site » et de la recherche du site. La page d'accueil ne peut pas
-- être hors index. Née d'un besoin du deuxième clone (pages de campagne de ses webinaires et de ses
-- séminaires). Rejouable sans danger. Écrit pour l'éditeur SQL de Lovable : ni antislash ni point
-- d'interrogation, aucune ligne vide dans une instruction.

-- 1. Pages : colonne « hors index » ------------------------------------------------------------------
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS hors_index boolean NOT NULL DEFAULT false;
ALTER TABLE public.pages DROP CONSTRAINT IF EXISTS pages_accueil_indexee_check;
ALTER TABLE public.pages ADD CONSTRAINT pages_accueil_indexee_check CHECK (NOT (is_home AND hors_index));
COMMENT ON COLUMN public.pages.hors_index IS
  'Page satellite (campagne, inscription, remerciement) : en ligne pour qui a le lien, balise noindex, absente du plan du site et de la recherche. Jamais pour la page d''accueil.';

-- 2. Recherche du site : une page hors index n'y figure pas ------------------------------------------
CREATE OR REPLACE FUNCTION public.search_site(_q text, _limit integer DEFAULT 30)
 RETURNS TABLE(kind text, title text, excerpt text, url text, rank real, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  _tsq tsquery := public.search_query(_q);
  _n integer := least(greatest(coalesce(_limit, 30), 1), 50);
BEGIN
  IF _tsq IS NULL OR NOT public.module_enabled('search') THEN RETURN; END IF;
  RETURN QUERY
  SELECT r.kind, r.title, r.excerpt, r.url, r.rank, r.updated_at FROM (
    SELECT 'article'::text, b.titre, public.search_excerpt(coalesce(nullif(b.chapo, ''), b.corps)),
      '/blog/' || b.slug, ts_rank(b.search_doc, _tsq), coalesce(b.publie_le, b.created_at)
    FROM public.contenus_publics b
    WHERE public.module_enabled('blog') AND b.type = 'article' AND b.publie AND b.search_doc @@ _tsq
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
    WHERE public.module_enabled('pages') AND g.published AND NOT g.is_home AND NOT g.hors_index
      AND g.search_doc @@ _tsq
  ) AS r(kind, title, excerpt, url, rank, updated_at)
  ORDER BY r.rank DESC, r.updated_at DESC NULLS LAST
  LIMIT _n;
END;
$function$;

-- 3. Version -------------------------------------------------------------------------------------
INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.22.0', 'brique', '2026-11-27',
  'Page hors index : une page libre satellite d''une campagne, en ligne pour qui a le lien, hors des moteurs.',
  'Colonne hors_index dans pages, refusée sur la page d''accueil. Une page hors index porte la balise noindex et sort du plan du site, de la page « Plan du site » et de la recherche du site (search_site). Écran Admin, Pages : case « Page satellite » et pastille « Hors index ». Remontée du deuxième clone.',
  '20261124120000_v1_22_0_pages_hors_index')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.22.0', 'publie_le', '2026-11-27',
  'migration_reference', '20261124120000_v1_22_0_pages_hors_index'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.22.0', '.')::int[];
