CREATE OR REPLACE FUNCTION public.site_settings_cle_publique(_key text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _greffe text[];
BEGIN
  IF _key = ANY (ARRAY['brand', 'modules', 'annuaire', 'editorial', 'shop']) THEN
    RETURN true;
  END IF;
  IF to_regprocedure('public.greffe_site_settings_publiques()') IS NOT NULL THEN
    EXECUTE 'SELECT public.greffe_site_settings_publiques()' INTO _greffe;
    RETURN _key = ANY (coalesce(_greffe, ARRAY[]::text[]));
  END IF;
  RETURN false;
END;
$$;
REVOKE ALL ON FUNCTION public.site_settings_cle_publique(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.site_settings_cle_publique(text) TO anon, authenticated, service_role;
DROP POLICY IF EXISTS "Lecture publique des parametres" ON public.site_settings;
CREATE POLICY "Lecture publique des parametres" ON public.site_settings FOR SELECT TO anon, authenticated
  USING (public.site_settings_cle_publique(key));
DROP POLICY IF EXISTS "Les admins lisent tous les parametres" ON public.site_settings;
CREATE POLICY "Les admins lisent tous les parametres" ON public.site_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Sujets visibles" ON public.forum_topics;
CREATE POLICY "Sujets visibles" ON public.forum_topics FOR SELECT TO anon, authenticated
  USING (public.module_enabled('forum'));
DROP POLICY IF EXISTS "Reponses visibles" ON public.forum_replies;
CREATE POLICY "Reponses visibles" ON public.forum_replies FOR SELECT TO anon, authenticated
  USING (public.module_enabled('forum'));
DROP POLICY IF EXISTS "Thematiques visibles" ON public.forum_categories;
CREATE POLICY "Thematiques visibles" ON public.forum_categories FOR SELECT TO anon, authenticated
  USING (public.module_enabled('forum'));

DROP POLICY IF EXISTS "Jaime visibles" ON public.forum_likes;
REVOKE SELECT ON public.forum_likes FROM anon;
DROP POLICY IF EXISTS "Membre lit ses jaime" ON public.forum_likes;
CREATE POLICY "Membre lit ses jaime" ON public.forum_likes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins lisent les jaime" ON public.forum_likes;
CREATE POLICY "Admins lisent les jaime" ON public.forum_likes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE OR REPLACE FUNCTION public.forum_category_counts()
RETURNS TABLE (category_id uuid, topics bigint, replies bigint, likes bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH r AS (
    SELECT fr.topic_id, count(*) AS n FROM public.forum_replies fr GROUP BY fr.topic_id
  ), l AS (
    SELECT coalesce(fl.topic_id, fr.topic_id) AS topic_id, count(*) AS n
    FROM public.forum_likes fl
    LEFT JOIN public.forum_replies fr ON fr.id = fl.reply_id
    GROUP BY coalesce(fl.topic_id, fr.topic_id)
  )
  SELECT t.category_id,
         count(*) AS topics,
         coalesce(sum(r.n), 0)::bigint AS replies,
         coalesce(sum(l.n), 0)::bigint AS likes
  FROM public.forum_topics t
  LEFT JOIN r ON r.topic_id = t.id
  LEFT JOIN l ON l.topic_id = t.id
  WHERE public.module_enabled('forum')
  GROUP BY t.category_id
$$;
REVOKE ALL ON FUNCTION public.forum_category_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.forum_category_counts() TO anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.forum_topic_counts(_topic_ids uuid[])
RETURNS TABLE (topic_id uuid, replies bigint, likes bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _topic_ids IS NULL OR cardinality(_topic_ids) = 0 THEN
    RETURN;
  END IF;
  IF cardinality(_topic_ids) > 500 THEN
    RAISE EXCEPTION 'Cinq cents sujets au plus par appel' USING ERRCODE = '22023';
  END IF;
  RETURN QUERY
    SELECT t.id,
           (SELECT count(*) FROM public.forum_replies fr WHERE fr.topic_id = t.id),
           (SELECT count(*) FROM public.forum_likes fl WHERE fl.topic_id = t.id)
    FROM public.forum_topics t
    WHERE t.id = ANY (_topic_ids) AND public.module_enabled('forum');
END;
$$;
REVOKE ALL ON FUNCTION public.forum_topic_counts(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.forum_topic_counts(uuid[]) TO anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.forum_reply_like_counts(_topic_id uuid)
RETURNS TABLE (reply_id uuid, likes bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT fl.reply_id, count(*) AS likes
  FROM public.forum_likes fl
  JOIN public.forum_replies fr ON fr.id = fl.reply_id
  WHERE fr.topic_id = _topic_id AND public.module_enabled('forum')
  GROUP BY fl.reply_id
$$;
REVOKE ALL ON FUNCTION public.forum_reply_like_counts(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.forum_reply_like_counts(uuid) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "dir_cat_read_anon" ON public.directory_categories;
DROP POLICY IF EXISTS "dir_cat_read_auth" ON public.directory_categories;
DROP POLICY IF EXISTS "dir_cat_read" ON public.directory_categories;
CREATE POLICY "dir_cat_read" ON public.directory_categories FOR SELECT TO anon, authenticated
  USING (public.module_enabled('directory'));
DROP POLICY IF EXISTS "mkt_cat_read_anon" ON public.marketplace_categories;
DROP POLICY IF EXISTS "mkt_cat_read_auth" ON public.marketplace_categories;
DROP POLICY IF EXISTS "mkt_cat_read" ON public.marketplace_categories;
CREATE POLICY "mkt_cat_read" ON public.marketplace_categories FOR SELECT TO anon, authenticated
  USING (public.module_enabled('marketplace'));
DROP POLICY IF EXISTS "geo_dep_read_anon" ON public.geo_departements;
DROP POLICY IF EXISTS "geo_dep_read_auth" ON public.geo_departements;
DROP POLICY IF EXISTS "geo_dep_read" ON public.geo_departements;
CREATE POLICY "geo_dep_read" ON public.geo_departements FOR SELECT TO anon, authenticated
  USING (public.module_enabled('directory') OR public.module_enabled('geo'));
DROP POLICY IF EXISTS geo_adjacency_read ON public.geo_adjacency;
CREATE POLICY geo_adjacency_read ON public.geo_adjacency FOR SELECT TO anon, authenticated
  USING (public.module_enabled('geo'));

DROP POLICY IF EXISTS "Rubriques visibles de tous" ON public.rubriques;
DROP POLICY IF EXISTS "Rubriques visibles des visiteurs" ON public.rubriques;
CREATE POLICY "Rubriques visibles des visiteurs" ON public.rubriques FOR SELECT TO anon
  USING (public.module_enabled('blog'));
DROP POLICY IF EXISTS "Rubriques visibles des membres" ON public.rubriques;
CREATE POLICY "Rubriques visibles des membres" ON public.rubriques FOR SELECT TO authenticated
  USING (public.module_enabled('blog') OR public.can_write_content(auth.uid()));
DROP POLICY IF EXISTS "Etiquettes visibles de tous" ON public.etiquettes;
DROP POLICY IF EXISTS "Etiquettes visibles des visiteurs" ON public.etiquettes;
CREATE POLICY "Etiquettes visibles des visiteurs" ON public.etiquettes FOR SELECT TO anon
  USING (public.module_enabled('blog'));
DROP POLICY IF EXISTS "Etiquettes visibles des membres" ON public.etiquettes;
CREATE POLICY "Etiquettes visibles des membres" ON public.etiquettes FOR SELECT TO authenticated
  USING (public.module_enabled('blog') OR public.can_write_content(auth.uid()));
DROP POLICY IF EXISTS "Series visibles de tous" ON public.series;
DROP POLICY IF EXISTS "Series visibles des visiteurs" ON public.series;
CREATE POLICY "Series visibles des visiteurs" ON public.series FOR SELECT TO anon
  USING (public.module_enabled('blog'));
DROP POLICY IF EXISTS "Series visibles des membres" ON public.series;
CREATE POLICY "Series visibles des membres" ON public.series FOR SELECT TO authenticated
  USING (public.module_enabled('blog') OR public.can_write_content(auth.uid()));
DROP POLICY IF EXISTS "Redirections lisibles de tous" ON public.redirections;
DROP POLICY IF EXISTS "Redirections lisibles des visiteurs" ON public.redirections;
CREATE POLICY "Redirections lisibles des visiteurs" ON public.redirections FOR SELECT TO anon
  USING (public.module_enabled('blog'));
DROP POLICY IF EXISTS "Redirections lisibles des membres" ON public.redirections;
CREATE POLICY "Redirections lisibles des membres" ON public.redirections FOR SELECT TO authenticated
  USING (public.module_enabled('blog') OR public.can_write_content(auth.uid()));

DROP POLICY IF EXISTS "Synonymes lisibles de tous" ON public.synonymes;
REVOKE SELECT ON public.synonymes FROM anon;

DROP POLICY IF EXISTS socle_versions_lecture ON public.socle_versions;
REVOKE SELECT ON public.socle_versions FROM anon;
CREATE POLICY socle_versions_lecture ON public.socle_versions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS socle_installation_lecture ON public.socle_installation;
REVOKE SELECT ON public.socle_installation FROM anon;
CREATE POLICY socle_installation_lecture ON public.socle_installation FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

SELECT public.registre_inscrire('autre', 'public.site_settings_cle_publique(text)',
  'Liste des clés de site_settings lisibles de tous (marque, modules, annuaire, réglages éditoriaux, boutique) ; les autres clés sont réservées aux administrateurs. Prise de greffe : greffe_site_settings_publiques().',
  'Politique de lecture de site_settings ; une installation qui ajoute une clé publique', 'en_service', CURRENT_DATE + 182,
  'Socle 1.16.1, scanner Lovable LOV.DB.RLS_TAUTOLOGY_PERMISSIVE.V1');
