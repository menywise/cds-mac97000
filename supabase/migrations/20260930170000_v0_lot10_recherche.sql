-- V0 · Lot 10 — Module F « Recherche globale » : recherche plein texte Postgres, en français.
-- Rejouable sans danger : configuration, colonnes et index créés si absents, fonctions recréées.
-- Choix : Postgres suffit au volume d'un site de TPE ; Meilisearch plus tard si le volume l'exige.

-- 1. Français sans accents : « electricien » trouve « électriciens » -----------------------------
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'cds_fr' AND cfgnamespace = 'public'::regnamespace) THEN
    CREATE TEXT SEARCH CONFIGURATION public.cds_fr (COPY = pg_catalog.french);
    ALTER TEXT SEARCH CONFIGURATION public.cds_fr
      ALTER MAPPING FOR hword, hword_part, word WITH extensions.unaccent, french_stem;
  END IF;
END $$;

-- 2. Module « search » (allumé par défaut, sans dépendance) -------------------------------------
-- Même liste que src/config/modules.ts (24 modules).
CREATE OR REPLACE FUNCTION public.module_defaults()
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT '{
    "blog": true, "faq": true, "contact": true, "newsletter": true, "forum": true,
    "members": true, "messaging": true, "testimonials": true, "reviews": true, "pricing": true,
    "onboarding": true, "directory": false, "geo": false, "crm": false, "lms": false,
    "marketplace": false, "adNetwork": false, "studio": true, "showcase": true,
    "media": true, "pages": false, "payments": false, "reports": true, "search": true
  }'::jsonb
$$;
GRANT EXECUTE ON FUNCTION public.module_defaults() TO anon, authenticated, service_role;

INSERT INTO public.site_settings (key, value) VALUES ('modules', public.module_defaults())
  ON CONFLICT (key) DO UPDATE
  SET value = public.module_defaults() || (
    SELECT coalesce(jsonb_object_agg(k, v), '{}'::jsonb)
    FROM jsonb_each(public.site_settings.value) AS e(k, v)
    WHERE public.module_defaults() ? k
  );

-- 3. Texte indexé de chaque contenu public (A : titre, B : résumé, C : texte) ------------------
-- Étiquettes en texte : array_to_string n'est pas déclarée immuable (exigé pour une colonne calculée).
CREATE OR REPLACE FUNCTION public.search_tags(_tags text[])
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT coalesce(string_agg(t, ' '), '') FROM unnest(_tags) AS t
$$;
-- Jamais indexés : contenu des leçons (réservé aux inscrits), e-mail et téléphone de l'annuaire.
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS search_doc tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('public.cds_fr', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('public.cds_fr', coalesce(excerpt, '') || ' ' || public.search_tags(tags)), 'B') ||
  setweight(to_tsvector('public.cds_fr', coalesce(content, '')), 'C')) STORED;
ALTER TABLE public.faq_items ADD COLUMN IF NOT EXISTS search_doc tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('public.cds_fr', coalesce(question, '')), 'A') ||
  setweight(to_tsvector('public.cds_fr', coalesce(category, '')), 'B') ||
  setweight(to_tsvector('public.cds_fr', coalesce(answer, '')), 'C')) STORED;
ALTER TABLE public.forum_topics ADD COLUMN IF NOT EXISTS search_doc tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('public.cds_fr', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('public.cds_fr', coalesce(content, '')), 'C')) STORED;
ALTER TABLE public.lms_courses ADD COLUMN IF NOT EXISTS search_doc tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('public.cds_fr', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('public.cds_fr', coalesce(excerpt, '')), 'B') ||
  setweight(to_tsvector('public.cds_fr', coalesce(description, '')), 'C')) STORED;
ALTER TABLE public.marketplace_listings ADD COLUMN IF NOT EXISTS search_doc tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('public.cds_fr', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('public.cds_fr', coalesce(city, '') || ' ' || public.search_tags(tags)), 'B') ||
  setweight(to_tsvector('public.cds_fr', coalesce(description, '')), 'C')) STORED;
ALTER TABLE public.directory_listings ADD COLUMN IF NOT EXISTS search_doc tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('public.cds_fr', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('public.cds_fr', coalesce(excerpt, '') || ' ' || coalesce(city, '') || ' ' ||
    public.search_tags(tags)), 'B') ||
  setweight(to_tsvector('public.cds_fr', coalesce(description, '')), 'C')) STORED;
ALTER TABLE public.member_profiles ADD COLUMN IF NOT EXISTS search_doc tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('public.cds_fr', coalesce(display_name, '')), 'A') ||
  setweight(to_tsvector('public.cds_fr', coalesce(job_title, '')), 'B') ||
  setweight(to_tsvector('public.cds_fr', coalesce(bio, '')), 'C')) STORED;
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS search_doc tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('public.cds_fr', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('public.cds_fr', coalesce(description, '')), 'B')) STORED;

CREATE INDEX IF NOT EXISTS blog_posts_search_idx ON public.blog_posts USING gin (search_doc);
CREATE INDEX IF NOT EXISTS faq_items_search_idx ON public.faq_items USING gin (search_doc);
CREATE INDEX IF NOT EXISTS forum_topics_search_idx ON public.forum_topics USING gin (search_doc);
CREATE INDEX IF NOT EXISTS lms_courses_search_idx ON public.lms_courses USING gin (search_doc);
CREATE INDEX IF NOT EXISTS marketplace_listings_search_idx ON public.marketplace_listings USING gin (search_doc);
CREATE INDEX IF NOT EXISTS directory_listings_search_idx ON public.directory_listings USING gin (search_doc);
CREATE INDEX IF NOT EXISTS member_profiles_search_idx ON public.member_profiles USING gin (search_doc);
CREATE INDEX IF NOT EXISTS pages_search_idx ON public.pages USING gin (search_doc);

-- 4. Requête : mots saisis nettoyés (lettres et chiffres seulement), tous requis, début de mot --
CREATE OR REPLACE FUNCTION public.search_query(_q text)
RETURNS tsquery LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT CASE WHEN count(*) = 0 THEN NULL
    ELSE to_tsquery('public.cds_fr', string_agg(w || ':*', ' & ')) END
  FROM (
    SELECT w FROM regexp_split_to_table(lower(left(coalesce(_q, ''), 200)), '[^[:alnum:]]+') AS w
    WHERE length(w) >= 2
    LIMIT 8
  ) mots
$$;
GRANT EXECUTE ON FUNCTION public.search_query(text) TO anon, authenticated, service_role;

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
