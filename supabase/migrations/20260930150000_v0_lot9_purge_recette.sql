-- Lot 9 « Parcours réels » : purge des données écrites par les parcours cliqués du robot.
-- Décision du 30/09 : données de test marquées puis nettoyées (pas de base de recette séparée).
-- Marquage : texte commençant par « [recette] » ; message de contact en @example.invalid.
-- Rejouable (CREATE OR REPLACE).

CREATE OR REPLACE FUNCTION public.recette_purge(_membre uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _contact integer;
  _sujets integer;
  _reponses integer;
  _signalements integer;
  _progression integer := 0;
  _inscriptions integer := 0;
BEGIN
  -- Admin connecté, ou serveur (clé de service, sans session) ; le visiteur n'a pas le droit
  -- d'exécution (REVOKE plus bas), le membre est refusé ici.
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Réservé aux administrateurs' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.contact_messages
  WHERE subject LIKE '[recette]%' AND email LIKE '%@example.invalid';
  GET DIAGNOSTICS _contact = ROW_COUNT;

  DELETE FROM public.reports WHERE details LIKE '[recette]%';
  GET DIAGNOSTICS _signalements = ROW_COUNT;

  DELETE FROM public.forum_replies WHERE content LIKE '[recette]%';
  GET DIAGNOSTICS _reponses = ROW_COUNT;

  -- Les réponses d'un sujet de recette partent avec lui (clé étrangère en cascade).
  DELETE FROM public.forum_topics WHERE title LIKE '[recette]%';
  GET DIAGNOSTICS _sujets = ROW_COUNT;

  -- Inscription et progression du membre de test : formations d'exemple du seed seulement.
  IF _membre IS NOT NULL THEN
    DELETE FROM public.lms_progress p
    USING public.lms_lessons l, public.lms_modules m
    WHERE p.user_id = _membre AND p.lesson_id = l.id AND l.module_id = m.id
      AND m.course_id::text LIKE 'e7000000-%';
    GET DIAGNOSTICS _progression = ROW_COUNT;
    DELETE FROM public.lms_enrollments
    WHERE user_id = _membre AND course_id::text LIKE 'e7000000-%';
    GET DIAGNOSTICS _inscriptions = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'contact', _contact, 'sujets', _sujets, 'reponses', _reponses,
    'signalements', _signalements, 'progression', _progression, 'inscriptions', _inscriptions);
END;
$$;
REVOKE ALL ON FUNCTION public.recette_purge(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recette_purge(uuid) TO authenticated, service_role;
