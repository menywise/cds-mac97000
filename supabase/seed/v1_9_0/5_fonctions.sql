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
