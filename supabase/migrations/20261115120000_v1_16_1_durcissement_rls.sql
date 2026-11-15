-- Socle 1.16.1 (correctif) : durcissement des règles de lecture (RLS) signalées par le scanner de
-- Lovable (règle LOV.DB.RLS_TAUTOLOGY_PERMISSIVE.V1) : seize tables lisibles de tous par une
-- politique « USING (true) », sans condition. Chaque politique dit désormais ce qu'elle laisse lire :
--   - site_settings : les clés publiques nommées (marque, modules, annuaire, réglages éditoriaux,
--     boutique) ; les autres clés, dont « socle » et « demarrage », sont réservées aux administrateurs ;
--     une installation ajoute ses clés publiques par public.greffe_site_settings_publiques() ;
--   - forum (sujets, réponses, thématiques) : lisibles quand le module « forum » est allumé ; aucune
--     colonne de masquage n'existe, la modération reformule et l'administrateur supprime ;
--   - j'aime du forum : un membre lit les siens, un administrateur les lit tous ; les compteurs
--     (forum_category_counts, forum_topic_counts, forum_reply_like_counts) comptent avec les droits du
--     propriétaire et ne renvoient que des nombres ;
--   - référentiels d'un module (thématiques, catégories de l'annuaire et des annonces, départements,
--     voisinages) : lisibles quand leur module est allumé ;
--   - taxonomies du blog (rubriques, étiquettes, séries, redirections) : lisibles quand le module
--     « blog » est allumé ; les rédacteurs les lisent toujours ;
--   - synonymes : réservés aux rédacteurs (la recherche publique passe par des fonctions qui comptent
--     avec les droits du propriétaire) ;
--   - socle_versions, socle_installation : réservés aux administrateurs (aucun écran public ne les lit).
-- Rejouable sans danger. Écrit pour l'éditeur SQL de Lovable : ni antislash ni point d'interrogation,
-- aucune ligne vide dans une fonction.

-- 1. Paramètres du site : clés publiques nommées ---------------------------------------------------
-- Vrai pour une clé lisible de tous. Une installation déclare ses propres clés publiques dans
-- public.greffe_site_settings_publiques() returns text[] (supabase/greffe/), lue si elle existe.
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

-- 2. Forum : lisible quand le module est allumé -----------------------------------------------------
DROP POLICY IF EXISTS "Sujets visibles" ON public.forum_topics;
CREATE POLICY "Sujets visibles" ON public.forum_topics FOR SELECT TO anon, authenticated
  USING (public.module_enabled('forum'));
DROP POLICY IF EXISTS "Reponses visibles" ON public.forum_replies;
CREATE POLICY "Reponses visibles" ON public.forum_replies FOR SELECT TO anon, authenticated
  USING (public.module_enabled('forum'));
DROP POLICY IF EXISTS "Thematiques visibles" ON public.forum_categories;
CREATE POLICY "Thematiques visibles" ON public.forum_categories FOR SELECT TO anon, authenticated
  USING (public.module_enabled('forum'));

-- 3. J'aime du forum : chacun les siens, l'administrateur tous ; compteurs côté base -----------------
DROP POLICY IF EXISTS "Jaime visibles" ON public.forum_likes;
REVOKE SELECT ON public.forum_likes FROM anon;
DROP POLICY IF EXISTS "Membre lit ses jaime" ON public.forum_likes;
CREATE POLICY "Membre lit ses jaime" ON public.forum_likes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins lisent les jaime" ON public.forum_likes;
CREATE POLICY "Admins lisent les jaime" ON public.forum_likes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
-- Les trois fonctions de comptage comptent avec les droits du propriétaire : aucun identifiant de
-- membre ne sort, seulement des nombres, module allumé.
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

-- 4. Référentiels d'un module : lisibles quand le module est allumé ---------------------------------
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
-- Les départements servent l'annuaire (filtre par département) et la géographie.
DROP POLICY IF EXISTS "geo_dep_read_anon" ON public.geo_departements;
DROP POLICY IF EXISTS "geo_dep_read_auth" ON public.geo_departements;
DROP POLICY IF EXISTS "geo_dep_read" ON public.geo_departements;
CREATE POLICY "geo_dep_read" ON public.geo_departements FOR SELECT TO anon, authenticated
  USING (public.module_enabled('directory') OR public.module_enabled('geo'));
DROP POLICY IF EXISTS geo_adjacency_read ON public.geo_adjacency;
CREATE POLICY geo_adjacency_read ON public.geo_adjacency FOR SELECT TO anon, authenticated
  USING (public.module_enabled('geo'));

-- 5. Taxonomies du blog : module allumé, ou rédacteur -----------------------------------------------
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

-- 6. Synonymes : réservés aux rédacteurs (politique « Redacteurs gerent les synonymes ») -------------
DROP POLICY IF EXISTS "Synonymes lisibles de tous" ON public.synonymes;
REVOKE SELECT ON public.synonymes FROM anon;

-- 7. Versions du socle et de l'installation : réservées aux administrateurs ------------------------
DROP POLICY IF EXISTS socle_versions_lecture ON public.socle_versions;
REVOKE SELECT ON public.socle_versions FROM anon;
CREATE POLICY socle_versions_lecture ON public.socle_versions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS socle_installation_lecture ON public.socle_installation;
REVOKE SELECT ON public.socle_installation FROM anon;
CREATE POLICY socle_installation_lecture ON public.socle_installation FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 8. Registre -------------------------------------------------------------------------------------
SELECT public.registre_inscrire('autre', 'public.site_settings_cle_publique(text)',
  'Liste des clés de site_settings lisibles de tous (marque, modules, annuaire, réglages éditoriaux, boutique) ; les autres clés sont réservées aux administrateurs. Prise de greffe : greffe_site_settings_publiques().',
  'Politique de lecture de site_settings ; une installation qui ajoute une clé publique', 'en_service', CURRENT_DATE + 182,
  'Socle 1.16.1, scanner Lovable LOV.DB.RLS_TAUTOLOGY_PERMISSIVE.V1');

-- 9. Version -------------------------------------------------------------------------------------
INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.16.1', 'correctif', '2026-11-15',
  'Lecture durcie sur seize tables : chaque politique dit ce qu''elle laisse lire, plus aucune politique « USING (true) ».',
  'Paramètres du site : clés publiques nommées (prise de greffe greffe_site_settings_publiques), le reste aux administrateurs. Forum, thématiques, catégories de l''annuaire et des annonces, départements, voisinages : lisibles quand leur module est allumé. Rubriques, étiquettes, séries, redirections : module blog allumé, ou rédacteur. J''aime : chacun les siens, l''administrateur tous ; compteurs avec les droits du propriétaire. Synonymes : rédacteurs. Versions du socle et de l''installation : administrateurs. Signalé par le scanner de Lovable (règle LOV.DB.RLS_TAUTOLOGY_PERMISSIVE.V1).',
  '20261115120000_v1_16_1_durcissement_rls')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.16.1', 'publie_le', '2026-11-15',
  'migration_reference', '20261115120000_v1_16_1_durcissement_rls'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.16.1', '.')::int[];
