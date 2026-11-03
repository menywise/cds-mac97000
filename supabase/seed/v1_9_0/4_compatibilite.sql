CREATE OR REPLACE VIEW public.blog_posts WITH (security_invoker = true) AS
SELECT id, slug, titre AS title, chapo AS excerpt, corps AS content, image_url AS cover_url,
  auteur_id AS author_id, publie AS published, publie_le AS published_at, created_at, updated_at,
  etiquettes AS tags, search_doc
FROM public.contenus_publics
WHERE type = 'article'
WITH CASCADED CHECK OPTION;
GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;
