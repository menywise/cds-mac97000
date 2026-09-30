-- CDS — Retire tout le contenu du seed de recette (recette_seed.sql). Rejouable sans danger.
-- Ne touche qu'aux identifiants e7000000-…-00000000XXXX créés par le seed, et aux données
-- marquées « [recette] » laissées par un parcours cliqué interrompu (lot 9, recette_purge).
SELECT public.recette_purge(NULL);
DELETE FROM public.blog_comments WHERE id = 'e7000000-0000-4000-8000-000000000050';
DELETE FROM public.testimonials WHERE id = 'e7000000-0000-4000-8000-000000000041';
DELETE FROM public.reviews WHERE id = 'e7000000-0000-4000-8000-000000000040';
DELETE FROM public.marketplace_listings WHERE id = 'e7000000-0000-4000-8000-000000000030';
-- Inscriptions, progression et paiements de recette sur les formations d'exemple
DELETE FROM public.lms_progress WHERE lesson_id IN (
  'e7000000-0000-4000-8000-000000000024', 'e7000000-0000-4000-8000-000000000025',
  'e7000000-0000-4000-8000-000000000026', 'e7000000-0000-4000-8000-000000000027');
DELETE FROM public.lms_enrollments WHERE course_id IN (
  'e7000000-0000-4000-8000-000000000020', 'e7000000-0000-4000-8000-000000000021');
-- Les paiements restent (pièces comptables) : ils perdent seulement le lien vers la formation.
DELETE FROM public.lms_courses WHERE id IN (
  'e7000000-0000-4000-8000-000000000020', 'e7000000-0000-4000-8000-000000000021');
DELETE FROM public.forum_replies WHERE topic_id = 'e7000000-0000-4000-8000-000000000010';
DELETE FROM public.forum_topics WHERE id = 'e7000000-0000-4000-8000-000000000010';
DELETE FROM public.reports WHERE content_id::text LIKE 'e7000000-%';
DELETE FROM auth.users WHERE id = 'e7000000-0000-4000-8000-000000000001';
