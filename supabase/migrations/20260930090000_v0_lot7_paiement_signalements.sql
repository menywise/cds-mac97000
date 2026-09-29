-- V0 · Lot 7 — Module D « Paiement » (Stripe), signalements, purge des messages de contact.
-- Rejouable sans danger : fonctions, contraintes, déclencheurs et politiques recréés, tables créées si absentes.
-- Les clés Stripe ne sont JAMAIS en base : elles vivent dans les secrets d'environnement du serveur.

-- 1. Modules « payments » (éteint, exige les formations) et « reports » (allumé) ---------------
-- Même liste que src/config/modules.ts (23 modules).
CREATE OR REPLACE FUNCTION public.module_defaults()
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT '{
    "blog": true, "faq": true, "contact": true, "newsletter": true, "forum": true,
    "members": true, "messaging": true, "testimonials": true, "reviews": true, "pricing": true,
    "onboarding": true, "directory": false, "geo": false, "crm": false, "lms": false,
    "marketplace": false, "adNetwork": false, "studio": true, "showcase": true,
    "media": true, "pages": false, "payments": false, "reports": true
  }'::jsonb
$$;
GRANT EXECUTE ON FUNCTION public.module_defaults() TO anon, authenticated, service_role;

-- Dépendances : celles des lots précédents + le paiement exige les formations.
CREATE OR REPLACE FUNCTION public.validate_modules_setting()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  _k text;
  _v jsonb;
  _m jsonb;
BEGIN
  IF NEW.key <> 'modules' THEN
    RETURN NEW;
  END IF;
  IF jsonb_typeof(NEW.value) <> 'object' THEN
    RAISE EXCEPTION 'Modules : objet attendu' USING ERRCODE = '22023';
  END IF;
  FOR _k, _v IN SELECT * FROM jsonb_each(NEW.value) LOOP
    IF NOT public.module_defaults() ? _k THEN
      RAISE EXCEPTION 'Module inconnu : %', _k USING ERRCODE = '22023';
    END IF;
    IF jsonb_typeof(_v) <> 'boolean' THEN
      RAISE EXCEPTION 'Module % : vrai ou faux attendu', _k USING ERRCODE = '22023';
    END IF;
  END LOOP;
  _m := public.module_defaults() || NEW.value;
  IF (_m ->> 'geo')::boolean AND NOT (_m ->> 'directory')::boolean THEN
    RAISE EXCEPTION 'La géographie exige l''annuaire métier' USING ERRCODE = '23514';
  END IF;
  IF (_m ->> 'messaging')::boolean AND NOT (_m ->> 'members')::boolean THEN
    RAISE EXCEPTION 'La messagerie exige les membres' USING ERRCODE = '23514';
  END IF;
  IF (_m ->> 'marketplace')::boolean AND NOT (_m ->> 'messaging')::boolean THEN
    RAISE EXCEPTION 'Les petites annonces exigent la messagerie' USING ERRCODE = '23514';
  END IF;
  IF (_m ->> 'payments')::boolean AND NOT (_m ->> 'lms')::boolean THEN
    RAISE EXCEPTION 'Le paiement en ligne exige les formations' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

INSERT INTO public.site_settings (key, value) VALUES ('modules', public.module_defaults())
  ON CONFLICT (key) DO UPDATE
  SET value = public.module_defaults() || (
    SELECT coalesce(jsonb_object_agg(k, v), '{}'::jsonb)
    FROM jsonb_each(public.site_settings.value) AS e(k, v)
    WHERE public.module_defaults() ? k
  );

-- 2. Paiements ----------------------------------------------------------------------------------
-- Une ligne par tentative de paiement. Écrite UNIQUEMENT par le serveur (clé de service) :
-- création avant Stripe Checkout, confirmation par le webhook signé. Montant lu en base.
-- Conservée 10 ans (pièce comptable) : jamais supprimée avec le compte, seulement anonymisée.
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid REFERENCES public.lms_courses(id) ON DELETE SET NULL,
  product_label text NOT NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  waiver_accepted_at timestamptz NOT NULL,
  stripe_session_id text,
  stripe_payment_intent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  refunded_at timestamptz
);
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending', 'paid', 'failed', 'expired', 'refunded'));
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_amount_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_amount_check CHECK (amount_cents > 0);
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_currency_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_currency_check CHECK (currency ~ '^[a-z]{3}$');
CREATE UNIQUE INDEX IF NOT EXISTS payments_stripe_session_key ON public.payments (stripe_session_id);
CREATE INDEX IF NOT EXISTS payments_intent_idx ON public.payments (stripe_payment_intent);
CREATE INDEX IF NOT EXISTS payments_user_idx ON public.payments (user_id, created_at DESC);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payments FROM anon, authenticated;
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
DROP POLICY IF EXISTS payments_read ON public.payments;
CREATE POLICY payments_read ON public.payments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Démarrer un paiement : contrôles métier, montant et devise lus sur la formation.
DROP FUNCTION IF EXISTS public.payment_start_course(uuid, uuid, boolean);
CREATE FUNCTION public.payment_start_course(_user_id uuid, _course_id uuid, _waiver boolean)
RETURNS TABLE (id uuid, amount_cents integer, currency text, product_label text, course_slug text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _c record;
  _id uuid;
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
  INSERT INTO public.payments (user_id, course_id, product_label, amount_cents, currency, waiver_accepted_at)
  VALUES (_user_id, _c.id, left(_c.title, 200), _c.price_cents, _c.currency, now())
  RETURNING payments.id INTO _id;
  RETURN QUERY SELECT _id, _c.price_cents, _c.currency::text, left(_c.title, 200), _c.slug::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.payment_attach_session(_payment_id uuid, _session_id text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.payments SET stripe_session_id = _session_id
  WHERE id = _payment_id AND status = 'pending' AND stripe_session_id IS NULL
$$;

-- Confirmation (webhook signé) : idempotente, montant et devise vérifiés, inscription réglée.
CREATE OR REPLACE FUNCTION public.payment_mark_paid(_session_id text, _intent text, _amount integer, _currency text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _p record;
BEGIN
  UPDATE public.payments p
  SET status = 'paid', paid_at = now(), stripe_payment_intent = coalesce(nullif(_intent, ''), p.stripe_payment_intent)
  WHERE p.stripe_session_id = _session_id
    AND p.status IN ('pending', 'expired', 'failed')
    AND p.amount_cents = _amount
    AND p.currency = lower(_currency)
  RETURNING p.user_id, p.course_id INTO _p;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  IF _p.course_id IS NOT NULL THEN
    INSERT INTO public.lms_enrollments (user_id, course_id, paid_at)
    VALUES (_p.user_id, _p.course_id, now())
    ON CONFLICT (user_id, course_id) DO UPDATE SET paid_at = now();
  END IF;
  RETURN true;
END;
$$;

-- Échec ou expiration d'une session encore en attente.
CREATE OR REPLACE FUNCTION public.payment_mark_status(_session_id text, _status text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _status NOT IN ('failed', 'expired') THEN
    RAISE EXCEPTION 'Statut non autorisé : %', _status USING ERRCODE = '22023';
  END IF;
  UPDATE public.payments SET status = _status
  WHERE stripe_session_id = _session_id AND status = 'pending';
  RETURN FOUND;
END;
$$;

-- Remboursement (décidé dans le tableau de bord Stripe) : l'accès se ferme.
CREATE OR REPLACE FUNCTION public.payment_mark_refunded(_intent text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _p record;
BEGIN
  UPDATE public.payments p SET status = 'refunded', refunded_at = now()
  WHERE p.stripe_payment_intent = _intent AND p.status = 'paid'
  RETURNING p.user_id, p.course_id INTO _p;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  IF _p.course_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.payments o
    WHERE o.user_id = _p.user_id AND o.course_id = _p.course_id AND o.status = 'paid'
  ) THEN
    UPDATE public.lms_enrollments SET paid_at = NULL
    WHERE user_id = _p.user_id AND course_id = _p.course_id;
  END IF;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.payment_start_course(uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.payment_attach_session(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.payment_mark_paid(text, text, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.payment_mark_status(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.payment_mark_refunded(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.payment_start_course(uuid, uuid, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.payment_attach_session(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.payment_mark_paid(text, text, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.payment_mark_status(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.payment_mark_refunded(text) TO service_role;

-- 3. Signalements -------------------------------------------------------------------------------
-- Un membre signale un contenu ; seul l'admin voit qui a signalé. 10 signalements par 24 h au plus.
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  content_type text NOT NULL,
  content_id uuid,
  reason text NOT NULL,
  details text,
  reported_url text,
  status text NOT NULL DEFAULT 'en_attente',
  admin_note text,
  handled_at timestamptz,
  handled_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_content_type_check;
ALTER TABLE public.reports ADD CONSTRAINT reports_content_type_check CHECK (content_type IN (
  'article', 'commentaire', 'sujet', 'reponse', 'avis', 'fiche', 'avis_fiche', 'annonce',
  'temoignage', 'membre', 'formation', 'autre'));
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_reason_check;
ALTER TABLE public.reports ADD CONSTRAINT reports_reason_check CHECK (reason IN (
  'spam', 'contenu_inapproprie', 'harcelement', 'fraude', 'information_erronee', 'doublon',
  'droit_auteur', 'contenu_illegal', 'autre'));
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_status_check;
ALTER TABLE public.reports ADD CONSTRAINT reports_status_check
  CHECK (status IN ('en_attente', 'examine', 'action_prise', 'classe'));
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_details_length;
ALTER TABLE public.reports ADD CONSTRAINT reports_details_length CHECK (char_length(details) <= 2000);
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_note_length;
ALTER TABLE public.reports ADD CONSTRAINT reports_note_length CHECK (char_length(admin_note) <= 2000);
-- Adresse interne seulement (chemin du site), jamais « javascript: » ni site extérieur.
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_url_check;
ALTER TABLE public.reports ADD CONSTRAINT reports_url_check
  CHECK (reported_url IS NULL OR (reported_url ~ '^/[^/\\]' AND char_length(reported_url) <= 500) OR reported_url = '/');
CREATE UNIQUE INDEX IF NOT EXISTS reports_pending_unique
  ON public.reports (reporter_id, content_type, content_id)
  WHERE status = 'en_attente' AND content_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS reports_status_idx ON public.reports (status, created_at DESC);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.reports FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
DROP POLICY IF EXISTS reports_insert ON public.reports;
CREATE POLICY reports_insert ON public.reports FOR INSERT TO authenticated
  WITH CHECK (
    reporter_id = auth.uid() AND status = 'en_attente' AND admin_note IS NULL
    AND handled_at IS NULL AND handled_by IS NULL AND public.module_enabled('reports')
  );
DROP POLICY IF EXISTS reports_read ON public.reports;
CREATE POLICY reports_read ON public.reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS reports_admin_update ON public.reports;
CREATE POLICY reports_admin_update ON public.reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS reports_admin_delete ON public.reports;
CREATE POLICY reports_admin_delete ON public.reports FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Limite anti-abus au dépôt ; au traitement, date et auteur tenus par la base, dépôt figé.
CREATE OR REPLACE FUNCTION public.guard_report()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := now();
    IF NOT public.has_role(NEW.reporter_id, 'admin') AND (
      SELECT count(*) FROM public.reports r
      WHERE r.reporter_id = NEW.reporter_id AND r.created_at > now() - interval '24 hours'
    ) >= 10 THEN
      RAISE EXCEPTION 'Trop de signalements aujourd''hui : réessayez demain' USING ERRCODE = '54000';
    END IF;
    RETURN NEW;
  END IF;
  -- Seule anonymisation permise : identifiant neutre (suppression de compte).
  NEW.reporter_id := CASE WHEN NEW.reporter_id = '00000000-0000-0000-0000-000000000000'::uuid
                          THEN NEW.reporter_id ELSE OLD.reporter_id END;
  NEW.content_type := OLD.content_type;
  NEW.content_id := OLD.content_id;
  NEW.reason := OLD.reason;
  NEW.details := OLD.details;
  NEW.reported_url := OLD.reported_url;
  NEW.created_at := OLD.created_at;
  IF NEW.status IS DISTINCT FROM OLD.status OR NEW.admin_note IS DISTINCT FROM OLD.admin_note THEN
    NEW.handled_at := CASE WHEN NEW.status = 'en_attente' THEN NULL ELSE now() END;
    NEW.handled_by := CASE WHEN NEW.status = 'en_attente' THEN NULL ELSE auth.uid() END;
  ELSE
    NEW.handled_at := OLD.handled_at;
    NEW.handled_by := CASE WHEN NEW.handled_by IS NULL THEN NULL ELSE OLD.handled_by END;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS reports_guard ON public.reports;
CREATE TRIGGER reports_guard BEFORE INSERT OR UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.guard_report();

-- 4. Purge des messages de contact (politique de confidentialité : 3 ans après le dernier échange)
-- Appelée chaque nuit par pg_cron (sans session) ou à la main par un admin.
CREATE OR REPLACE FUNCTION public.purge_contact_messages()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _n integer;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Réservé aux administrateurs' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.contact_messages
  WHERE greatest(created_at, coalesce(handled_at, created_at)) < now() - interval '3 years';
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END;
$$;
REVOKE ALL ON FUNCTION public.purge_contact_messages() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purge_contact_messages() TO authenticated, service_role;

-- Planification nocturne (03:17) si pg_cron est disponible (Supabase : oui ; base de test : non).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    EXECUTE $cron$SELECT cron.schedule('cds_purge_contact_messages', '17 3 * * *',
      'SELECT public.purge_contact_messages()')$cron$;
  ELSE
    RAISE NOTICE 'pg_cron absent : purge à lancer depuis la boîte de réception';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Planification de la purge impossible (%) : purge à lancer depuis la boîte de réception', SQLERRM;
END $$;

-- 5. Suppression de son compte : paiements anonymisés (pièces comptables), signalements aussi --
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  UPDATE public.blog_posts SET author_id = NULL WHERE author_id = _uid;
  UPDATE public.directory_listings SET created_by = NULL WHERE created_by = _uid;
  UPDATE public.directory_listings SET claimed_by = NULL WHERE claimed_by = _uid;
  UPDATE public.directory_listings SET claim_requested_by = NULL WHERE claim_requested_by = _uid;
  UPDATE public.site_settings SET updated_by = NULL WHERE updated_by = _uid;
  UPDATE public.payments SET user_id = _ghost WHERE user_id = _uid;
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
$$;
REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

-- 6. Grille de conformité : lignes du lot 7 (ajoutées si absentes, statut existant conservé) -----
INSERT INTO public.template_checks (code, area, label, requirement, status, severity, evidence, position)
SELECT v.code, v.area, v.label, v.requirement, v.status, v.severity, v.evidence,
       coalesce((SELECT max(position) FROM public.template_checks), 0) + v.n
FROM (VALUES
  (1, 'V0-D-PAIEMENT', 'Modules', 'Paiement Stripe des formations',
   'Formation payante : accès ouvert au paiement confirmé par le webhook signé, fermé au remboursement. Clés en secrets d''environnement.',
   'a_verifier', 'bloquant', 'tests/db/test_11 ; à dérouler en mode test Stripe (carte 4242…)'),
  (2, 'V0-SIGNALEMENTS', 'Modération', 'Signalements de contenus',
   'Bouton « Signaler » sur les contenus publics, 10 par jour au plus, écran admin, signaleur confidentiel.',
   'conforme', 'majeur', 'tests/db/test_11'),
  (3, 'V0-PURGE-CONTACT', 'RGPD', 'Purge des messages de contact après 3 ans',
   'Effacement nocturne (pg_cron) et bouton « Purger maintenant » dans la boîte de réception.',
   'conforme', 'majeur', 'tests/db/test_11'),
  (4, 'V0-RECETTE-AUTO', 'Qualité', 'Recette automatisée de toutes les pages',
   'Robot tests/e2e/recette.ts : visiteur, membre, admin, ordinateur et mobile ; zéro page blanche, zéro erreur console.',
   'conforme', 'majeur', 'Rapport importé dans /admin/recettage')
) AS v(n, code, area, label, requirement, status, severity, evidence)
ON CONFLICT (code) DO NOTHING;
