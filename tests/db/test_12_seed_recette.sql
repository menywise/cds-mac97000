\set ON_ERROR_STOP 1
\i tests/db/_helpers.sql
BEGIN;
-- Seed de recette : rejouable, visible des visiteurs, retiré entièrement par le nettoyage.
UPDATE public.site_settings SET value = value || '{"lms": true, "marketplace": true}' WHERE key = 'modules';
INSERT INTO public.blog_posts (id, slug, title, content, published, published_at)
  VALUES ('00000000-0000-0000-0000-0000000000b1', 'article-test', 'Article', 'Texte', true, now());
\i supabase/seed/recette_seed.sql
\i supabase/seed/recette_seed.sql
SELECT pg_temp.as_anon();
DO $$ BEGIN
  IF (SELECT count(*) FROM public.forum_topics WHERE title LIKE 'Exemple — %') <> 1 THEN RAISE EXCEPTION 'sujet d''exemple'; END IF;
  IF (SELECT count(*) FROM public.lms_courses WHERE slug LIKE 'exemple-%') <> 2 THEN RAISE EXCEPTION 'formations d''exemple'; END IF;
  IF (SELECT count(*) FROM public.marketplace_listings WHERE slug = 'exemple-annonce-demonstration') <> 1 THEN RAISE EXCEPTION 'annonce d''exemple invisible'; END IF;
  IF (SELECT count(*) FROM public.member_profiles WHERE display_name = 'Membre exemple') <> 1 THEN RAISE EXCEPTION 'profil d''exemple invisible'; END IF;
  IF (SELECT count(*) FROM public.reviews WHERE title LIKE 'Exemple — %') <> 1 THEN RAISE EXCEPTION 'avis d''exemple'; END IF;
  IF (SELECT count(*) FROM public.testimonials WHERE content LIKE 'Exemple — %') <> 1 THEN RAISE EXCEPTION 'témoignage d''exemple'; END IF;
  IF (SELECT count(*) FROM public.blog_comments WHERE content LIKE 'Exemple — %') <> 1 THEN RAISE EXCEPTION 'commentaire d''exemple'; END IF;
  -- Aperçu libre lisible, leçon payante fermée.
  IF NOT EXISTS (SELECT 1 FROM public.lms_lesson_content('e7000000-0000-4000-8000-000000000026')) THEN RAISE EXCEPTION 'aperçu fermé'; END IF;
  IF EXISTS (SELECT 1 FROM public.lms_lesson_content('e7000000-0000-4000-8000-000000000027')) THEN RAISE EXCEPTION 'leçon payante ouverte'; END IF;
END $$;
RESET ROLE;
\i supabase/seed/recette_nettoyage.sql
\i supabase/seed/recette_nettoyage.sql
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.forum_topics WHERE id::text LIKE 'e7000000-%')
     OR EXISTS (SELECT 1 FROM public.lms_courses WHERE id::text LIKE 'e7000000-%')
     OR EXISTS (SELECT 1 FROM public.member_profiles WHERE user_id::text LIKE 'e7000000-%')
     OR EXISTS (SELECT 1 FROM auth.users WHERE id::text LIKE 'e7000000-%')
     OR EXISTS (SELECT 1 FROM public.blog_comments WHERE id::text LIKE 'e7000000-%')
  THEN RAISE EXCEPTION 'nettoyage incomplet'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.blog_posts WHERE id = '00000000-0000-0000-0000-0000000000b1') THEN RAISE EXCEPTION 'article réel supprimé'; END IF;
END $$;
ROLLBACK;
