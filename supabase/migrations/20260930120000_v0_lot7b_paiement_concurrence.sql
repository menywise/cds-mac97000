-- V0 · Lot 7 b — Paiement : jamais deux tentatives en attente pour la même formation.
-- Deux onglets (ou un nouvel essai avant le webhook) créaient deux sessions Stripe payables :
-- le membre pouvait payer deux fois. Désormais, une nouvelle tentative remplace la précédente
-- (statut « expired ») et rend au serveur les sessions Stripe à expirer avant d'en ouvrir une.
-- Rejouable sans danger.

DROP FUNCTION IF EXISTS public.payment_start_course(uuid, uuid, boolean);
CREATE FUNCTION public.payment_start_course(_user_id uuid, _course_id uuid, _waiver boolean)
RETURNS TABLE (id uuid, amount_cents integer, currency text, product_label text, course_slug text,
               superseded_sessions text[])
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _c record;
  _id uuid;
  _old text[];
BEGIN
  IF NOT public.module_enabled('payments') THEN
    RAISE EXCEPTION 'Le paiement en ligne est désactivé' USING ERRCODE = '42501';
  END IF;
  IF _waiver IS NOT TRUE THEN
    RAISE EXCEPTION 'Renonciation au droit de rétractation requise' USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = _user_id) THEN
    RAISE EXCEPTION 'Compte inconnu' USING ERRCODE = '42501';
  END IF;
  -- Une seule tentative à la fois par membre et formation (deux onglets = file d'attente).
  PERFORM pg_advisory_xact_lock(hashtextextended(_user_id::text || ':' || _course_id::text, 0));

  SELECT c.id, c.title, c.slug, c.price_cents, lower(c.currency) AS currency INTO _c
  FROM public.lms_courses c WHERE c.id = _course_id AND c.published;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Formation introuvable' USING ERRCODE = 'P0002';
  END IF;
  IF coalesce(_c.price_cents, 0) <= 0 THEN
    RAISE EXCEPTION 'Formation gratuite : inscription directe' USING ERRCODE = '23514';
  END IF;
  IF EXISTS (SELECT 1 FROM public.lms_enrollments e
             WHERE e.user_id = _user_id AND e.course_id = _course_id AND e.paid_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Formation déjà réglée' USING ERRCODE = '23505';
  END IF;

  -- Tentatives précédentes encore en attente : remplacées ; leurs sessions sont à expirer.
  WITH old AS (
    UPDATE public.payments p SET status = 'expired'
    WHERE p.user_id = _user_id AND p.course_id = _course_id AND p.status = 'pending'
    RETURNING p.stripe_session_id
  )
  SELECT coalesce(array_agg(stripe_session_id) FILTER (WHERE stripe_session_id IS NOT NULL), '{}')
  INTO _old FROM old;

  INSERT INTO public.payments (user_id, course_id, product_label, amount_cents, currency, waiver_accepted_at)
  VALUES (_user_id, _c.id, left(_c.title, 200), _c.price_cents, _c.currency, now())
  RETURNING payments.id INTO _id;
  RETURN QUERY SELECT _id, _c.price_cents, _c.currency::text, left(_c.title, 200), _c.slug::text, _old;
END;
$$;
REVOKE ALL ON FUNCTION public.payment_start_course(uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.payment_start_course(uuid, uuid, boolean) TO service_role;
