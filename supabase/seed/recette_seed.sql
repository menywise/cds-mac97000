-- CDS — Seed de recette (lot 7). À exécuter à la main dans l'éditeur SQL, APRÈS les migrations.
-- But : donner à chaque page dynamique un contenu à ouvrir, pour que la recette automatisée
-- (tests/e2e/recette.ts) teste de vraies pages et pas seulement la page « introuvable ».
--
-- Tout est marqué : titres commençant par « Exemple — », identifiants fixes en e7000000-…,
-- membre fictif « Membre exemple » (adresse @example.invalid, sans mot de passe : aucune connexion
-- possible). Ce contenu est PUBLIC tant qu'il est en base : retirez-le avec recette_nettoyage.sql.
-- Rejouable sans danger : rien n'est dupliqué, rien d'existant n'est modifié.

-- Membre fictif (auteur de tout le contenu d'exemple)
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES ('e7000000-0000-4000-8000-000000000001', 'membre-exemple@example.invalid',
        '{"full_name": "Membre exemple"}')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.profiles (id, email, full_name)
VALUES ('e7000000-0000-4000-8000-000000000001', 'membre-exemple@example.invalid', 'Membre exemple')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.member_profiles (user_id, display_name, bio, job_title, listed, accepts_messages)
VALUES ('e7000000-0000-4000-8000-000000000001', 'Membre exemple',
        'Profil fictif servant à la recette du site.', 'Profil de démonstration', true, false)
ON CONFLICT (user_id) DO NOTHING;

-- Forum : une discussion et une réponse, dans la première thématique existante
INSERT INTO public.forum_topics (id, author_id, author_name, title, content, category_id)
SELECT 'e7000000-0000-4000-8000-000000000010', 'e7000000-0000-4000-8000-000000000001',
       'Membre exemple', 'Exemple — Présentez-vous ici',
       'Discussion d''exemple servant à la recette du site. Elle peut être supprimée sans risque.',
       (SELECT id FROM public.forum_categories ORDER BY position, created_at LIMIT 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.forum_replies (id, topic_id, author_id, author_name, content)
VALUES ('e7000000-0000-4000-8000-000000000011', 'e7000000-0000-4000-8000-000000000010',
        'e7000000-0000-4000-8000-000000000001', 'Membre exemple',
        'Réponse d''exemple servant à la recette du site.')
ON CONFLICT (id) DO NOTHING;

-- Formations : une gratuite, une payante (1 € : ne pas l'acheter en mode réel)
INSERT INTO public.lms_courses (id, title, slug, excerpt, description, level, duration_minutes, price_cents, currency, published, position)
VALUES
  ('e7000000-0000-4000-8000-000000000020', 'Exemple — Formation offerte', 'exemple-formation-offerte',
   'Formation d''exemple, gratuite, servant à la recette du site.',
   'Contenu fictif : deux leçons courtes pour vérifier l''inscription et la progression.',
   'debutant', 10, 0, 'EUR', true, 900),
  ('e7000000-0000-4000-8000-000000000021', 'Exemple — Formation payante', 'exemple-formation-payante',
   'Formation d''exemple, payante, servant à la recette du paiement (mode test Stripe).',
   'Contenu fictif : une leçon en aperçu libre, une leçon réservée aux inscrits qui ont réglé.',
   'debutant', 10, 100, 'EUR', true, 901)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.lms_modules (id, course_id, title, position) VALUES
  ('e7000000-0000-4000-8000-000000000022', 'e7000000-0000-4000-8000-000000000020', 'Module d''exemple', 0),
  ('e7000000-0000-4000-8000-000000000023', 'e7000000-0000-4000-8000-000000000021', 'Module d''exemple', 0)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.lms_lessons (id, module_id, title, content, duration_minutes, position, free_preview) VALUES
  ('e7000000-0000-4000-8000-000000000024', 'e7000000-0000-4000-8000-000000000022', 'Leçon 1 (aperçu libre)', 'Texte d''exemple de la leçon 1.', 5, 0, true),
  ('e7000000-0000-4000-8000-000000000025', 'e7000000-0000-4000-8000-000000000022', 'Leçon 2', 'Texte d''exemple de la leçon 2.', 5, 1, false),
  ('e7000000-0000-4000-8000-000000000026', 'e7000000-0000-4000-8000-000000000023', 'Leçon 1 (aperçu libre)', 'Texte d''exemple, visible sans payer.', 5, 0, true),
  ('e7000000-0000-4000-8000-000000000027', 'e7000000-0000-4000-8000-000000000023', 'Leçon 2 (réservée)', 'Texte d''exemple, visible après paiement.', 5, 1, false)
ON CONFLICT (id) DO NOTHING;

-- Petites annonces : une annonce validée
INSERT INTO public.marketplace_listings (id, seller_id, seller_name, title, slug, description, category_id, price_cents, city, status, approved)
SELECT 'e7000000-0000-4000-8000-000000000030', 'e7000000-0000-4000-8000-000000000001', 'Membre exemple',
       'Exemple — Annonce de démonstration', 'exemple-annonce-demonstration',
       'Annonce fictive servant à la recette du site. Rien n''est à vendre.',
       (SELECT id FROM public.marketplace_categories ORDER BY position, created_at LIMIT 1),
       1000, 'Exempleville', 'active', true
ON CONFLICT (id) DO NOTHING;

-- Avis et témoignage validés
INSERT INTO public.reviews (id, author_id, author_name, rating, title, content, approved)
VALUES ('e7000000-0000-4000-8000-000000000040', 'e7000000-0000-4000-8000-000000000001', 'Membre exemple',
        5, 'Exemple — Avis de démonstration', 'Avis fictif servant à la recette du site.', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.testimonials (id, author_id, author_name, role_title, content, approved, position)
VALUES ('e7000000-0000-4000-8000-000000000041', 'e7000000-0000-4000-8000-000000000001', 'Membre exemple',
        'Profil de démonstration', 'Exemple — Témoignage fictif servant à la recette du site.', true, 900)
ON CONFLICT (id) DO NOTHING;

-- Blog : un commentaire validé sous le premier article publié (s'il y en a un)
INSERT INTO public.blog_comments (id, post_id, author_id, author_name, content, approved)
SELECT 'e7000000-0000-4000-8000-000000000050', p.id, 'e7000000-0000-4000-8000-000000000001',
       'Membre exemple', 'Exemple — Commentaire fictif servant à la recette du site.', true
FROM public.blog_posts p WHERE p.published ORDER BY p.published_at DESC NULLS LAST LIMIT 1
ON CONFLICT (id) DO NOTHING;
