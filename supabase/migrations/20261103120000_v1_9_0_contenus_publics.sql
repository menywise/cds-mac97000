-- Socle 1.9.0 — contenus éditoriaux : la table des articles devient contenus_publics.
-- Lot 1 du plan docs/plans/CONTENUS_EDITORIAUX.md. Aucun changement visible : mêmes articles,
-- mêmes adresses /blog/<slug>, mêmes commentaires, mêmes droits.
-- 1. blog_posts est renommée contenus_publics, ses colonnes prennent les noms du modèle commun
--    (titre, chapo, corps, image_url, auteur_id, publie, publie_le, etiquettes). Les identifiants
--    ne changent pas : la clé des commentaires (blog_comments.post_id) suit le renommage.
-- 2. Colonnes du modèle commun : type (article ou page), description, libelle_menu, ordre,
--    updated_by, sources, relu_le, auteur_fonction, image_alt. La description reprend le résumé,
--    coupé à 160 caractères sur un mot entier.
-- 3. Une adresse unique par type (type, slug), et les longueurs du modèle commun. Une installation
--    dont un article dépasse une longueur garde l'article : la règle vaut pour les écritures
--    suivantes, et un avis nomme la règle à rendre valide (bloc de contrôle).
-- 4. Règles d'accès inchangées : un visiteur lit les publiés, un membre aussi, un admin tout.
-- 5. Vue de compatibilité blog_posts (anciens noms de colonnes, articles seulement), le temps qu'une
--    installation fusionne le code 1.9.0. Elle applique les règles d'accès de la table
--    (security_invoker). Retirée en 1.10.0.
-- 6. Fonctions qui lisaient blog_posts : recherche, suppression de compte, démarrage.
-- 7. Grille de conformité et version 1.9.0.
-- Rejouable sans danger.

-- 1. Renommage -------------------------------------------------------------------------------------
DO $$ BEGIN
  IF to_regclass('public.contenus_publics') IS NULL THEN
    ALTER TABLE public.blog_posts RENAME TO contenus_publics;
    ALTER TABLE public.contenus_publics RENAME COLUMN title TO titre;
    ALTER TABLE public.contenus_publics RENAME COLUMN excerpt TO chapo;
    ALTER TABLE public.contenus_publics RENAME COLUMN content TO corps;
    ALTER TABLE public.contenus_publics RENAME COLUMN cover_url TO image_url;
    ALTER TABLE public.contenus_publics RENAME COLUMN author_id TO auteur_id;
    ALTER TABLE public.contenus_publics RENAME COLUMN published TO publie;
    ALTER TABLE public.contenus_publics RENAME COLUMN published_at TO publie_le;
    ALTER TABLE public.contenus_publics RENAME COLUMN tags TO etiquettes;
    ALTER TABLE public.contenus_publics RENAME CONSTRAINT blog_posts_pkey TO contenus_publics_pkey;
    ALTER INDEX public.blog_posts_search_idx RENAME TO contenus_publics_search_idx;
    ALTER TRIGGER blog_posts_updated_at ON public.contenus_publics RENAME TO contenus_publics_updated_at;
  END IF;
END $$;

-- 2. Colonnes du modèle commun ---------------------------------------------------------------------
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'article';
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS libelle_menu text NOT NULL DEFAULT '';
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS ordre integer NOT NULL DEFAULT 0;
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS sources text NOT NULL DEFAULT '';
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS relu_le date;
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS auteur_fonction text NOT NULL DEFAULT '';
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS image_alt text NOT NULL DEFAULT '';
UPDATE public.contenus_publics
SET description = CASE
  WHEN char_length(btrim(chapo)) <= 160 THEN btrim(chapo)
  ELSE regexp_replace(left(btrim(chapo), 159), '[[:space:]]+[^[:space:]]*$', '') || '…'
END
WHERE description = '' AND btrim(chapo) <> '';

-- 3. Adresse unique par type, longueurs ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sources_valides(_sources text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT coalesce(bool_and(btrim(l) = '' OR l ~ 'https://[^[:space:]]+'), true)
  FROM regexp_split_to_table(coalesce(_sources, ''), chr(10)) l
$$;
ALTER TABLE public.contenus_publics DROP CONSTRAINT IF EXISTS blog_posts_slug_key;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contenus_publics_type_slug_key'
                 AND conrelid = 'public.contenus_publics'::regclass) THEN
    ALTER TABLE public.contenus_publics ADD CONSTRAINT contenus_publics_type_slug_key UNIQUE (type, slug);
  END IF;
END $$;
ALTER TABLE public.contenus_publics DROP CONSTRAINT IF EXISTS contenus_publics_type_check;
ALTER TABLE public.contenus_publics ADD CONSTRAINT contenus_publics_type_check
  CHECK (type IN ('page', 'article')) NOT VALID;
ALTER TABLE public.contenus_publics DROP CONSTRAINT IF EXISTS contenus_publics_slug_check;
ALTER TABLE public.contenus_publics ADD CONSTRAINT contenus_publics_slug_check
  CHECK (char_length(slug) <= 80 AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$') NOT VALID;
ALTER TABLE public.contenus_publics DROP CONSTRAINT IF EXISTS contenus_publics_titre_check;
ALTER TABLE public.contenus_publics ADD CONSTRAINT contenus_publics_titre_check
  CHECK (char_length(btrim(titre)) BETWEEN 3 AND 120) NOT VALID;
ALTER TABLE public.contenus_publics DROP CONSTRAINT IF EXISTS contenus_publics_description_check;
ALTER TABLE public.contenus_publics ADD CONSTRAINT contenus_publics_description_check
  CHECK (char_length(description) <= 160) NOT VALID;
ALTER TABLE public.contenus_publics DROP CONSTRAINT IF EXISTS contenus_publics_chapo_check;
ALTER TABLE public.contenus_publics ADD CONSTRAINT contenus_publics_chapo_check
  CHECK (char_length(chapo) <= 600) NOT VALID;
ALTER TABLE public.contenus_publics DROP CONSTRAINT IF EXISTS contenus_publics_corps_check;
ALTER TABLE public.contenus_publics ADD CONSTRAINT contenus_publics_corps_check
  CHECK (char_length(corps) <= 100000) NOT VALID;
ALTER TABLE public.contenus_publics DROP CONSTRAINT IF EXISTS contenus_publics_libelle_menu_check;
ALTER TABLE public.contenus_publics ADD CONSTRAINT contenus_publics_libelle_menu_check
  CHECK (char_length(libelle_menu) <= 30) NOT VALID;
ALTER TABLE public.contenus_publics DROP CONSTRAINT IF EXISTS contenus_publics_sources_check;
ALTER TABLE public.contenus_publics ADD CONSTRAINT contenus_publics_sources_check
  CHECK (char_length(sources) <= 4000 AND public.sources_valides(sources)) NOT VALID;
ALTER TABLE public.contenus_publics DROP CONSTRAINT IF EXISTS contenus_publics_auteur_fonction_check;
ALTER TABLE public.contenus_publics ADD CONSTRAINT contenus_publics_auteur_fonction_check
  CHECK (char_length(auteur_fonction) <= 80) NOT VALID;
ALTER TABLE public.contenus_publics DROP CONSTRAINT IF EXISTS contenus_publics_image_alt_check;
ALTER TABLE public.contenus_publics ADD CONSTRAINT contenus_publics_image_alt_check
  CHECK (char_length(image_alt) <= 200) NOT VALID;
DO $$
DECLARE _c record;
BEGIN
  FOR _c IN SELECT conname FROM pg_constraint
            WHERE conrelid = 'public.contenus_publics'::regclass AND contype = 'c' AND NOT convalidated LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.contenus_publics VALIDATE CONSTRAINT %I', _c.conname);
    EXCEPTION WHEN check_violation THEN
      RAISE NOTICE 'Règle % non validée : un contenu existant la dépasse (voir le bloc de contrôle)', _c.conname;
    END;
  END LOOP;
END $$;

-- 4. Règles d'accès --------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins gerent le blog" ON public.contenus_publics;
DROP POLICY IF EXISTS "Articles publies visibles par les visiteurs" ON public.contenus_publics;
DROP POLICY IF EXISTS "Articles visibles par les membres" ON public.contenus_publics;
DROP POLICY IF EXISTS "Admins gerent les contenus" ON public.contenus_publics;
CREATE POLICY "Admins gerent les contenus" ON public.contenus_publics FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Contenus publies visibles par les visiteurs" ON public.contenus_publics;
CREATE POLICY "Contenus publies visibles par les visiteurs" ON public.contenus_publics FOR SELECT TO anon
  USING (publie);
DROP POLICY IF EXISTS "Contenus visibles par les membres" ON public.contenus_publics;
CREATE POLICY "Contenus visibles par les membres" ON public.contenus_publics FOR SELECT TO authenticated
  USING (publie OR public.has_role(auth.uid(), 'admin'::app_role));

-- 5. Vue de compatibilité --------------------------------------------------------------------------
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

-- 6. Fonctions -------------------------------------------------------------------------------------
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
    WHERE public.module_enabled('pages') AND g.published AND NOT g.is_home AND g.search_doc @@ _tsq
  ) AS r(kind, title, excerpt, url, rank, updated_at)
  ORDER BY r.rank DESC, r.updated_at DESC NULLS LAST
  LIMIT _n;
END;
$function$;
CREATE OR REPLACE FUNCTION public.delete_my_account()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _ghost constant uuid := '00000000-0000-0000-0000-000000000000';
  _name constant text := 'Ancien membre';
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifié' USING ERRCODE = '42501';
  END IF;
  IF public.has_role(_uid, 'admin')
     AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin' AND user_id <> _uid) THEN
    RAISE EXCEPTION 'Vous êtes le dernier administrateur : nommez-en un autre avant de partir' USING ERRCODE = '42501';
  END IF;
  UPDATE public.forum_topics SET author_id = _ghost, author_name = _name WHERE author_id = _uid;
  UPDATE public.forum_replies SET author_id = _ghost, author_name = _name WHERE author_id = _uid;
  UPDATE public.blog_comments SET author_id = _ghost, author_name = _name WHERE author_id = _uid;
  UPDATE public.reviews SET author_id = _ghost, author_name = _name WHERE author_id = _uid;
  UPDATE public.directory_reviews SET author_id = _ghost, author_name = _name WHERE author_id = _uid;
  UPDATE public.testimonials SET author_id = NULL, author_name = _name WHERE author_id = _uid;
  UPDATE public.contenus_publics SET auteur_id = NULL WHERE auteur_id = _uid;
  UPDATE public.directory_listings SET created_by = NULL WHERE created_by = _uid;
  UPDATE public.directory_listings SET claimed_by = NULL WHERE claimed_by = _uid;
  UPDATE public.directory_listings SET claim_requested_by = NULL WHERE claim_requested_by = _uid;
  UPDATE public.site_settings SET updated_by = NULL WHERE updated_by = _uid;
  UPDATE public.payments SET user_id = _ghost WHERE user_id = _uid;
  UPDATE public.shop_orders SET user_id = _ghost WHERE user_id = _uid;
  UPDATE public.reports SET reporter_id = _ghost WHERE reporter_id = _uid;
  UPDATE public.reports SET handled_by = NULL WHERE handled_by = _uid;
  DELETE FROM public.forum_likes WHERE user_id = _uid;
  DELETE FROM public.forum_follows WHERE user_id = _uid;
  DELETE FROM public.conversations WHERE user_a = _uid OR user_b = _uid;
  DELETE FROM public.messages WHERE sender_id = _uid;
  DELETE FROM public.marketplace_listings WHERE seller_id = _uid;
  DELETE FROM public.crm_interactions WHERE owner_id = _uid;
  DELETE FROM public.crm_actions WHERE owner_id = _uid;
  DELETE FROM public.crm_prospects WHERE owner_id = _uid;
  DELETE FROM public.lms_progress WHERE user_id = _uid;
  DELETE FROM public.lms_enrollments WHERE user_id = _uid;
  DELETE FROM public.member_profiles WHERE user_id = _uid;
  DELETE FROM public.user_roles WHERE user_id = _uid;
  DELETE FROM public.profiles WHERE id = _uid;
  DELETE FROM auth.users WHERE id = _uid;
END;
$function$;
CREATE OR REPLACE FUNCTION public.starter_reset_demo(_scope text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _n integer;
  _out jsonb := '{}'::jsonb;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Réservé aux administrateurs' USING ERRCODE = '42501';
  END IF;
  IF _scope NOT IN ('exemples', 'demarrage') THEN
    RAISE EXCEPTION 'Lot inconnu : %', _scope USING ERRCODE = '22023';
  END IF;
  IF _scope = 'exemples' THEN
    DELETE FROM public.blog_comments WHERE id::text LIKE 'e7000000-%';
    GET DIAGNOSTICS _n = ROW_COUNT;
    _out := _out || jsonb_build_object('commentaires', _n);
    DELETE FROM public.testimonials WHERE id::text LIKE 'e7000000-%';
    GET DIAGNOSTICS _n = ROW_COUNT;
    _out := _out || jsonb_build_object('temoignages', _n);
    DELETE FROM public.reviews WHERE id::text LIKE 'e7000000-%';
    GET DIAGNOSTICS _n = ROW_COUNT;
    _out := _out || jsonb_build_object('avis', _n);
    DELETE FROM public.marketplace_listings WHERE id::text LIKE 'e7000000-%';
    GET DIAGNOSTICS _n = ROW_COUNT;
    _out := _out || jsonb_build_object('annonces', _n);
    DELETE FROM public.lms_progress WHERE lesson_id::text LIKE 'e7000000-%';
    DELETE FROM public.lms_enrollments WHERE course_id::text LIKE 'e7000000-%';
    DELETE FROM public.lms_courses WHERE id::text LIKE 'e7000000-%';
    GET DIAGNOSTICS _n = ROW_COUNT;
    _out := _out || jsonb_build_object('formations', _n);
    DELETE FROM public.forum_replies WHERE topic_id::text LIKE 'e7000000-%' OR id::text LIKE 'e7000000-%';
    DELETE FROM public.forum_topics WHERE id::text LIKE 'e7000000-%';
    GET DIAGNOSTICS _n = ROW_COUNT;
    _out := _out || jsonb_build_object('discussions', _n);
    DELETE FROM public.reports WHERE content_id::text LIKE 'e7000000-%';
    DELETE FROM public.member_profiles WHERE user_id::text LIKE 'e7000000-%';
    DELETE FROM public.profiles WHERE id::text LIKE 'e7000000-%';
    DELETE FROM auth.users WHERE id::text LIKE 'e7000000-%';
    GET DIAGNOSTICS _n = ROW_COUNT;
    _out := _out || jsonb_build_object('membres_fictifs', _n);
  ELSE
    DELETE FROM public.faq_items WHERE question IN (
      'Combien de temps faut-il pour lancer un site avec ce modèle ' || chr(63),
      'Dois-je toucher au code pour changer mes informations ' || chr(63),
      'Mes données et celles de mes visiteurs sont-elles protégées ' || chr(63),
      'Le référencement est-il vraiment prêt ' || chr(63));
    GET DIAGNOSTICS _n = ROW_COUNT;
    _out := _out || jsonb_build_object('faq', _n);
    DELETE FROM public.pricing_plans WHERE (name, tagline) IN (
      ('Découverte', 'Pour valider votre idée sans rien avancer.'),
      ('Professionnel', 'Pour le site qui doit convaincre et convertir.'),
      ('Expert', 'Pour les équipes qui pilotent plusieurs projets.'));
    GET DIAGNOSTICS _n = ROW_COUNT;
    _out := _out || jsonb_build_object('offres', _n);
    DELETE FROM public.contenus_publics
    WHERE type = 'article' AND slug = 'pourquoi-un-socle-commun-fait-gagner-des-semaines'
      AND titre = 'Pourquoi un socle commun vous fait gagner des semaines sur chaque projet';
    GET DIAGNOSTICS _n = ROW_COUNT;
    _out := _out || jsonb_build_object('articles', _n);
  END IF;
  RETURN _out;
END;
$function$;
CREATE OR REPLACE FUNCTION public.starter_status()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _brand jsonb := coalesce((SELECT value FROM public.site_settings WHERE key = 'brand'), '{}'::jsonb);
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Réservé aux administrateurs' USING ERRCODE = '42501';
  END IF;
  RETURN jsonb_build_object(
    'marque_reglee', (SELECT count(*) FROM public.site_settings WHERE key = 'brand') > 0,
    'modules_choisis', EXISTS (SELECT 1 FROM public.site_settings
                               WHERE key = 'demarrage' AND (value -> 'modules_choisis_le') IS NOT NULL),
    'exemples', (SELECT count(*) FROM public.forum_topics WHERE id::text LIKE 'e7000000-%')
              + (SELECT count(*) FROM public.lms_courses WHERE id::text LIKE 'e7000000-%')
              + (SELECT count(*) FROM public.marketplace_listings WHERE id::text LIKE 'e7000000-%')
              + (SELECT count(*) FROM public.reviews WHERE id::text LIKE 'e7000000-%')
              + (SELECT count(*) FROM public.testimonials WHERE id::text LIKE 'e7000000-%')
              + (SELECT count(*) FROM public.blog_comments WHERE id::text LIKE 'e7000000-%'),
    'demarrage', (SELECT count(*) FROM public.faq_items WHERE question IN (
                    'Combien de temps faut-il pour lancer un site avec ce modèle ' || chr(63),
                    'Dois-je toucher au code pour changer mes informations ' || chr(63),
                    'Mes données et celles de mes visiteurs sont-elles protégées ' || chr(63),
                    'Le référencement est-il vraiment prêt ' || chr(63)))
               + (SELECT count(*) FROM public.pricing_plans WHERE (name, tagline) IN (
                    ('Découverte', 'Pour valider votre idée sans rien avancer.'),
                    ('Professionnel', 'Pour le site qui doit convaincre et convertir.'),
                    ('Expert', 'Pour les équipes qui pilotent plusieurs projets.')))
               + (SELECT count(*) FROM public.contenus_publics
                  WHERE type = 'article' AND slug = 'pourquoi-un-socle-commun-fait-gagner-des-semaines'
                    AND titre = 'Pourquoi un socle commun vous fait gagner des semaines sur chaque projet'),
    'administrateurs', (SELECT count(*) FROM public.user_roles WHERE role = 'admin'),
    'membres', (SELECT count(*) FROM public.profiles WHERE id::text NOT LIKE 'e7000000-%'),
    'domaine_envoi', coalesce(_brand -> 'email' ->> 'senderDomain', '')
  );
END;
$function$;

-- 7. Grille de conformité et version ---------------------------------------------------------------
INSERT INTO public.template_checks (code, area, label, requirement, status, severity, evidence, position, modules)
SELECT 'V1-CONTENUS-PUBLICS', 'Contenus', 'Modèle commun des contenus éditoriaux',
  'Articles dans contenus_publics (modèle commun avec les installations) : mêmes adresses /blog/<slug>, commentaires rattachés par le même identifiant, une adresse unique par type, longueurs bornées, règles d''accès inchangées.',
  'conforme', 'mineur', 'tests/db/test_30',
  coalesce((SELECT max(position) FROM public.template_checks), 0) + 1, ARRAY['blog']
ON CONFLICT (code) DO NOTHING;
INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.9.0', 'brique', '2026-11-03',
  'Contenus éditoriaux : les articles passent dans le modèle commun contenus_publics, sans changement visible.',
  'blog_posts renommée contenus_publics (identifiants, adresses et commentaires conservés) ; colonnes du modèle commun (type, description, sources, relecture, fonction de l''auteur, texte alternatif de l''image) ; adresse unique par type ; longueurs bornées ; vue de compatibilité blog_posts jusqu''à la 1.10.0 ; recherche, suppression de compte et démarrage lisent la nouvelle table.',
  '20261103120000_v1_9_0_contenus_publics')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.9.0', 'publie_le', '2026-11-03',
  'migration_reference', '20261103120000_v1_9_0_contenus_publics'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.9.0', '.')::int[];
