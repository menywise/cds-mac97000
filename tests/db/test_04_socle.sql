\set ON_ERROR_STOP 1
\i tests/db/_helpers.sql
BEGIN;
-- a1 : premier compte (administrateur) · a2 : membre · a3 : membre qui supprime son compte · a4 : futur admin du studio
-- (adresse confirmée : la liste des adresses nommées d'avance ne promeut qu'un compte confirmé)
INSERT INTO auth.users (id, email, email_confirmed_at) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr', NULL),
  ('00000000-0000-0000-0000-0000000000a2', 'membre@test.fr', NULL),
  ('00000000-0000-0000-0000-0000000000a3', 'partant@test.fr', NULL),
  ('00000000-0000-0000-0000-0000000000a4', 'associe@test.fr', now());
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
SELECT public.bootstrap_current_user('Administrateur');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', 'membre@test.fr');
SELECT public.bootstrap_current_user('Membre');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a3', 'partant@test.fr');
SELECT public.bootstrap_current_user('Jean Partant');
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a4', 'associe@test.fr');
SELECT public.bootstrap_current_user('Associé');
RESET ROLE;

-- 1. Modules en base ------------------------------------------------------------------
-- Un visiteur lit les interrupteurs ; toutes les clés de module_defaults() existent ; les modules sont éteints,
-- les outils d'administration (pilotage, médiathèque, recherche) allumés.
SELECT pg_temp.as_anon();
DO $$ DECLARE _m jsonb; BEGIN
  SELECT value INTO _m FROM public.site_settings WHERE key = 'modules';
  IF _m IS NULL THEN RAISE EXCEPTION 'modules absents'; END IF;
  IF (SELECT count(*) FROM jsonb_object_keys(_m)) <> (SELECT count(*) FROM jsonb_object_keys(public.module_defaults())) OR (SELECT count(*) FROM jsonb_object_keys(_m)) < 19
    THEN RAISE EXCEPTION 'modules incomplets : %', (SELECT count(*) FROM jsonb_object_keys(_m)); END IF;
  IF (_m ->> 'forum')::boolean IS NOT FALSE OR (_m ->> 'geo')::boolean IS NOT FALSE
     OR (_m ->> 'studio')::boolean IS NOT TRUE OR (_m ->> 'media')::boolean IS NOT TRUE OR (_m ->> 'search')::boolean IS NOT TRUE
  THEN RAISE EXCEPTION 'valeurs par défaut inattendues'; END IF;
END $$;
RESET ROLE;

-- Un membre ne modifie pas les modules.
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', 'membre@test.fr');
UPDATE public.site_settings SET value = value || '{"forum": true}' WHERE key = 'modules';
RESET ROLE;
DO $$ BEGIN
  IF (SELECT (value ->> 'forum')::boolean FROM public.site_settings WHERE key = 'modules') IS NOT FALSE
  THEN RAISE EXCEPTION 'un membre a allumé le forum'; END IF;
END $$;

-- L'admin allume un module ; la base refuse une dépendance manquante et une valeur non booléenne.
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
UPDATE public.site_settings SET value = value || '{"members": true, "messaging": true}' WHERE key = 'modules';
UPDATE public.site_settings SET value = value || '{"directory": true}' WHERE key = 'modules';
UPDATE public.site_settings SET value = value || '{"geo": true}' WHERE key = 'modules';
SELECT pg_temp.expect_error($$UPDATE public.site_settings SET value = value || '{"directory": false}' WHERE key = 'modules'$$, 'geo sans directory');
SELECT pg_temp.expect_error($$UPDATE public.site_settings SET value = value || '{"members": false}' WHERE key = 'modules'$$, 'messaging sans members');
SELECT pg_temp.expect_error($$UPDATE public.site_settings SET value = value || '{"marketplace": true, "messaging": false}' WHERE key = 'modules'$$, 'marketplace sans messaging');
SELECT pg_temp.expect_error($$UPDATE public.site_settings SET value = value || '{"blog": "oui"}' WHERE key = 'modules'$$, 'valeur non booléenne');
SELECT pg_temp.expect_error($$UPDATE public.site_settings SET value = value || '{"inconnu": true}' WHERE key = 'modules'$$, 'clé inconnue');
RESET ROLE;

-- 1 bis. Annuaire des membres : inscription volontaire (RGPD), non inscrit par défaut.
INSERT INTO public.member_profiles (user_id, display_name) VALUES ('00000000-0000-0000-0000-0000000000a2', 'Membre');
DO $$ BEGIN
  IF (SELECT listed FROM public.member_profiles WHERE user_id = '00000000-0000-0000-0000-0000000000a2') THEN
    RAISE EXCEPTION 'membre inscrit dans l''annuaire sans l''avoir demandé';
  END IF;
END $$;

-- 2. Utilisateurs et rôles --------------------------------------------------------------
-- Un membre ne voit pas la liste et ne promeut personne.
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', 'membre@test.fr');
SELECT pg_temp.expect_error($$SELECT * FROM public.admin_list_users()$$, 'membre liste les utilisateurs');
SELECT pg_temp.expect_error($$SELECT public.admin_set_admin('00000000-0000-0000-0000-0000000000a2', true)$$, 'membre se promeut');
SELECT pg_temp.as_anon();
SELECT pg_temp.expect_error($$SELECT * FROM public.admin_list_users()$$, 'visiteur liste les utilisateurs');
RESET ROLE;

-- L'admin liste, promeut puis rétrograde un membre.
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
DO $$ BEGIN
  IF (SELECT count(*) FROM public.admin_list_users()) <> 4 THEN RAISE EXCEPTION 'liste incomplète'; END IF;
  IF (SELECT is_studio_admin FROM public.admin_list_users() WHERE id = '00000000-0000-0000-0000-0000000000a1') THEN RAISE EXCEPTION 'premier compte signalé comme nommé d''avance'; END IF;
  IF NOT public.has_role('00000000-0000-0000-0000-0000000000a1', 'admin') THEN RAISE EXCEPTION 'premier compte non administrateur'; END IF;
  IF (SELECT full_name FROM public.admin_list_users() WHERE id = '00000000-0000-0000-0000-0000000000a2') <> 'Membre' THEN RAISE EXCEPTION 'nom absent'; END IF;
END $$;
SELECT public.admin_set_admin('00000000-0000-0000-0000-0000000000a2', true);
DO $$ BEGIN
  IF NOT public.has_role('00000000-0000-0000-0000-0000000000a2', 'admin') THEN RAISE EXCEPTION 'promotion ratée'; END IF;
END $$;
SELECT public.admin_set_admin('00000000-0000-0000-0000-0000000000a2', false);
DO $$ BEGIN
  IF public.has_role('00000000-0000-0000-0000-0000000000a2', 'admin') THEN RAISE EXCEPTION 'rétrogradation ratée'; END IF;
END $$;
-- Garde-fous : pas d'auto-rétrogradation, pas de rétrogradation d'un admin du studio.
SELECT pg_temp.expect_error($$SELECT public.admin_set_admin('00000000-0000-0000-0000-0000000000a1', false)$$, 'auto-rétrogradation');

-- Ajouter une adresse aux admins du studio promeut tout de suite le compte existant.
INSERT INTO public.studio_admins (email) VALUES ('associe@test.fr');
DO $$ BEGIN
  IF NOT public.has_role('00000000-0000-0000-0000-0000000000a4', 'admin') THEN RAISE EXCEPTION 'admin du studio non promu à l''ajout'; END IF;
END $$;
SELECT pg_temp.expect_error($$SELECT public.admin_set_admin('00000000-0000-0000-0000-0000000000a4', false)$$, 'rétrograde un admin du studio');
-- Après retrait de la liste, la rétrogradation redevient possible.
DELETE FROM public.studio_admins WHERE email = 'associe@test.fr';
SELECT public.admin_set_admin('00000000-0000-0000-0000-0000000000a4', false);
-- La liste des adresses nommées d'avance peut être vide : la garantie porte sur les rôles.
DELETE FROM public.studio_admins;
RESET ROLE;

-- 3. Suppression de son compte -------------------------------------------------------------
INSERT INTO public.member_profiles (user_id, display_name) VALUES ('00000000-0000-0000-0000-0000000000a3', 'Jean Partant');
INSERT INTO public.forum_topics (id, author_id, author_name, title, content)
  VALUES ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a3', 'Jean Partant', 'Sujet', 'Texte');
INSERT INTO public.forum_replies (id, topic_id, author_id, author_name, content)
  VALUES ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a3', 'Jean Partant', 'Réponse');
INSERT INTO public.forum_likes (user_id, topic_id) VALUES ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000f1');
INSERT INTO public.forum_follows (user_id, topic_id) VALUES ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000f1');
INSERT INTO public.contenus_publics (id, titre, slug) VALUES ('00000000-0000-0000-0000-0000000000b1', 'Article', 'article');
INSERT INTO public.blog_comments (post_id, author_id, author_name, content)
  VALUES ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a3', 'Jean Partant', 'Commentaire');
INSERT INTO public.reviews (author_id, author_name, rating, content)
  VALUES ('00000000-0000-0000-0000-0000000000a3', 'Jean Partant', 5, 'Avis');
INSERT INTO public.conversations (id, user_a, user_b)
  VALUES ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3');
INSERT INTO public.messages (conversation_id, sender_id, content)
  VALUES ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a3', 'Message privé');
INSERT INTO public.marketplace_listings (seller_id, seller_name, slug, title)
  VALUES ('00000000-0000-0000-0000-0000000000a3', 'Jean Partant', 'annonce', 'Annonce');
INSERT INTO public.crm_prospects (owner_id, name) VALUES ('00000000-0000-0000-0000-0000000000a3', 'Prospect');

-- Un visiteur ne peut pas appeler la fonction.
SELECT pg_temp.as_anon();
SELECT pg_temp.expect_error($$SELECT public.delete_my_account()$$, 'visiteur supprime un compte');

SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a3', 'partant@test.fr');
SELECT public.delete_my_account();
RESET ROLE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-0000000000a3') THEN RAISE EXCEPTION 'compte non supprimé'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = '00000000-0000-0000-0000-0000000000a3') THEN RAISE EXCEPTION 'profil non supprimé'; END IF;
  IF EXISTS (SELECT 1 FROM public.member_profiles WHERE user_id = '00000000-0000-0000-0000-0000000000a3') THEN RAISE EXCEPTION 'fiche membre non supprimée'; END IF;
  -- Contributions publiques conservées mais anonymisées.
  IF (SELECT author_name FROM public.forum_topics WHERE id = '00000000-0000-0000-0000-0000000000f1') <> 'Ancien membre' THEN RAISE EXCEPTION 'sujet non anonymisé'; END IF;
  IF (SELECT author_name FROM public.forum_replies WHERE id = '00000000-0000-0000-0000-0000000000e1') <> 'Ancien membre' THEN RAISE EXCEPTION 'réponse non anonymisée'; END IF;
  IF (SELECT author_name FROM public.blog_comments LIMIT 1) <> 'Ancien membre' THEN RAISE EXCEPTION 'commentaire non anonymisé'; END IF;
  IF (SELECT author_name FROM public.reviews LIMIT 1) <> 'Ancien membre' THEN RAISE EXCEPTION 'avis non anonymisé'; END IF;
  IF EXISTS (SELECT 1 FROM public.forum_topics WHERE author_id = '00000000-0000-0000-0000-0000000000a3')
     OR EXISTS (SELECT 1 FROM public.forum_replies WHERE author_id = '00000000-0000-0000-0000-0000000000a3')
     OR EXISTS (SELECT 1 FROM public.blog_comments WHERE author_id = '00000000-0000-0000-0000-0000000000a3')
     OR EXISTS (SELECT 1 FROM public.reviews WHERE author_id = '00000000-0000-0000-0000-0000000000a3')
  THEN RAISE EXCEPTION 'identifiant encore présent dans les contributions'; END IF;
  -- Données privées supprimées.
  IF EXISTS (SELECT 1 FROM public.conversations WHERE id = '00000000-0000-0000-0000-0000000000c1') THEN RAISE EXCEPTION 'conversation conservée'; END IF;
  IF EXISTS (SELECT 1 FROM public.messages WHERE sender_id = '00000000-0000-0000-0000-0000000000a3') THEN RAISE EXCEPTION 'messages conservés'; END IF;
  IF EXISTS (SELECT 1 FROM public.marketplace_listings WHERE seller_id = '00000000-0000-0000-0000-0000000000a3') THEN RAISE EXCEPTION 'annonce conservée'; END IF;
  IF EXISTS (SELECT 1 FROM public.forum_likes WHERE user_id = '00000000-0000-0000-0000-0000000000a3')
     OR EXISTS (SELECT 1 FROM public.forum_follows WHERE user_id = '00000000-0000-0000-0000-0000000000a3') THEN RAISE EXCEPTION 'j''aime/suivis conservés'; END IF;
  IF EXISTS (SELECT 1 FROM public.crm_prospects WHERE owner_id = '00000000-0000-0000-0000-0000000000a3') THEN RAISE EXCEPTION 'CRM conservé'; END IF;
END $$;

-- Le dernier admin ne peut pas supprimer son compte.
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', 'admin@test.fr');
SELECT pg_temp.expect_error($$SELECT public.delete_my_account()$$, 'dernier admin supprime son compte');
RESET ROLE;
ROLLBACK;
