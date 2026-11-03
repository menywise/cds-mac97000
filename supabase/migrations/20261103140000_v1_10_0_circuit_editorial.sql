-- Socle 1.10.0 — circuit de rédaction des contenus éditoriaux.
-- Lot 2 du plan docs/plans/CONTENUS_EDITORIAUX.md, repris du premier clone (C1).
-- 1. Rôle « editor » (rédacteur) : écrit et propose ; l'admin relit, publie, programme, retire.
--    Bloc à part : une valeur ajoutée à app_role ne sert qu'une fois enregistrée.
-- 2. Réglages éditoriaux (site_settings, clé « editorial ») : circuit complet ou simple, délai de
--    relecture, exigences (sources, relecture, auteur, longueurs pour les moteurs), affichage de
--    l'auteur (fonction ou nom), avertissement sous les articles.
-- 3. Champs : statut, relu_par, auteur_nom, est_pilier, pilier_id, public_vise, requete_visee,
--    date_prevue. Reprise : publié → publie, le reste → redaction.
-- 4. Règles d'accès : un visiteur lit les contenus en ligne (programmés invisibles avant l'heure) ;
--    rédacteur et admin lisent tout ; le rédacteur écrit, l'admin seul supprime.
-- 5. Statut lu (programmé, à actualiser), manques avant publication, termes interdits.
-- 6. Journal des statuts, versions du texte.
-- 7. Passages imposés par la base. Articles, circuit complet :
--      idee ⇄ redaction ; redaction → a_relire (texte non vide) ; a_relire → redaction (motif) ;
--      a_relire → pret (admin, manques vides, la base pose relu_le et relu_par) ;
--      pret → publie ou programmé (admin, manques vides) ; programmé → pret (admin) ;
--      pret → redaction ; programmé → redaction (admin) ; publie → a_actualiser (motif) ;
--      a_actualiser → publie (admin, nouvelle relecture, manques vides) ;
--      publie, a_actualiser → redaction (admin, retrait du site).
--    Circuit simple (réglage) : en plus, redaction → publie ou programmé (admin, manques vides,
--    la publication vaut relecture). Pages : redaction ⇄ publie (ou programmé), par un admin.
--    Passages automatiques : texte modifié en pret ou programmé → a_relire ; texte modifié en ligne
--    → a_actualiser (l'article reste en ligne).
-- 8. Termes interdits : un contenu qui en contient un ne se publie pas. Une installation ajoute ses
--    noms (personnes…) par une fonction public.greffe_termes_nominatifs(text) returns text[].
-- 9. La vue de compatibilité blog_posts (1.9.0) est retirée.
-- 10. Grille de conformité et version 1.10.0.
-- Rejouable sans danger. Écrit pour l'éditeur SQL de Lovable : ni antislash ni point d'interrogation,
-- aucune ligne vide dans une instruction.

-- 1. Rôle rédacteur --------------------------------------------------------------------------------
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'editor';

-- 2. Réglages éditoriaux ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.editorial_defaults()
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT jsonb_build_object(
    'circuit', 'complet',
    'delai_relecture_mois', 12,
    'exiger_sources', true,
    'exiger_relecture', true,
    'exiger_auteur', true,
    'longueurs_seo', true,
    'auteur_mode', 'fonction',
    'avertissement', '')
$$;
GRANT EXECUTE ON FUNCTION public.editorial_defaults() TO anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.editorial_reglages()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.editorial_defaults()
    || coalesce((SELECT value FROM public.site_settings WHERE key = 'editorial'), '{}'::jsonb)
$$;
GRANT EXECUTE ON FUNCTION public.editorial_reglages() TO anon, authenticated, service_role;
INSERT INTO public.site_settings (key, value) VALUES ('editorial', public.editorial_defaults())
ON CONFLICT (key) DO NOTHING;
CREATE OR REPLACE FUNCTION public.can_write_content(_user_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN _user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text IN ('admin', 'editor'));
END;
$$;
REVOKE ALL ON FUNCTION public.can_write_content(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_write_content(uuid) TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.admin_set_editor(_user_id uuid, _editor boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Réservé aux administrateurs' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _user_id) THEN
    RAISE EXCEPTION 'Utilisateur introuvable' USING ERRCODE = 'P0002';
  END IF;
  IF _editor THEN
    EXECUTE 'INSERT INTO public.user_roles (user_id, role) VALUES ($1, $2::public.app_role) ON CONFLICT (user_id, role) DO NOTHING'
      USING _user_id, 'editor';
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role::text = 'editor';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_editor(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_editor(uuid, boolean) TO authenticated;

-- 3. Champs du circuit -----------------------------------------------------------------------------
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS statut text NOT NULL DEFAULT 'redaction';
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS relu_par uuid;
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS auteur_nom text NOT NULL DEFAULT '';
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS est_pilier boolean NOT NULL DEFAULT false;
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS pilier_id uuid
  REFERENCES public.contenus_publics (id) ON DELETE SET NULL;
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS public_vise text NOT NULL DEFAULT '';
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS requete_visee text NOT NULL DEFAULT '';
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS date_prevue date;
ALTER TABLE public.contenus_publics DROP CONSTRAINT IF EXISTS contenus_publics_statut_check;
ALTER TABLE public.contenus_publics ADD CONSTRAINT contenus_publics_statut_check
  CHECK (statut IN ('idee', 'redaction', 'a_relire', 'pret', 'publie', 'a_actualiser'));
ALTER TABLE public.contenus_publics DROP CONSTRAINT IF EXISTS contenus_publics_statut_page_check;
ALTER TABLE public.contenus_publics ADD CONSTRAINT contenus_publics_statut_page_check
  CHECK (type = 'article' OR statut IN ('redaction', 'publie'));
ALTER TABLE public.contenus_publics DROP CONSTRAINT IF EXISTS contenus_publics_editorial_check;
ALTER TABLE public.contenus_publics ADD CONSTRAINT contenus_publics_editorial_check
  CHECK (char_length(public_vise) <= 120 AND char_length(requete_visee) <= 120
         AND char_length(auteur_nom) <= 80
         AND (pilier_id IS NULL OR pilier_id <> id)
         AND NOT (est_pilier AND pilier_id IS NOT NULL));
UPDATE public.contenus_publics SET statut = CASE WHEN publie THEN 'publie' ELSE 'redaction' END
WHERE publie <> (statut IN ('publie', 'a_actualiser'));

-- 4. Règles d'accès --------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Contenus publies visibles par les visiteurs" ON public.contenus_publics;
CREATE POLICY "Contenus publies visibles par les visiteurs" ON public.contenus_publics FOR SELECT TO anon
  USING (publie AND (publie_le IS NULL OR publie_le <= now()));
DROP POLICY IF EXISTS "Contenus visibles par les membres" ON public.contenus_publics;
CREATE POLICY "Contenus visibles par les membres" ON public.contenus_publics FOR SELECT TO authenticated
  USING ((publie AND (publie_le IS NULL OR publie_le <= now())) OR public.can_write_content(auth.uid()));
DROP POLICY IF EXISTS "Redacteurs creent les contenus" ON public.contenus_publics;
CREATE POLICY "Redacteurs creent les contenus" ON public.contenus_publics FOR INSERT TO authenticated
  WITH CHECK (public.can_write_content(auth.uid()));
DROP POLICY IF EXISTS "Redacteurs modifient les contenus" ON public.contenus_publics;
CREATE POLICY "Redacteurs modifient les contenus" ON public.contenus_publics FOR UPDATE TO authenticated
  USING (public.can_write_content(auth.uid())) WITH CHECK (public.can_write_content(auth.uid()));

-- 5. Statut lu, manques, termes interdits ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.statut_effectif(_statut text, _type text, _publie_le timestamptz, _relu_le date)
RETURNS text LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE
  r jsonb := public.editorial_reglages();
BEGIN
  IF _statut = 'publie' AND _publie_le > now() THEN
    RETURN 'programme';
  END IF;
  IF _statut = 'publie' AND _type = 'article' AND coalesce((r ->> 'exiger_relecture')::boolean, true)
     AND (_relu_le IS NULL
          OR _relu_le + make_interval(months => coalesce((r ->> 'delai_relecture_mois')::int, 12)) < current_date) THEN
    RETURN 'a_actualiser';
  END IF;
  RETURN _statut;
END;
$$;
GRANT EXECUTE ON FUNCTION public.statut_effectif(text, text, timestamptz, date) TO authenticated, service_role;
-- Texte ramené à des mots minuscules sans accents, entourés d'espaces : un terme se cherche comme
-- mot entier par simple inclusion, sans expression régulière.
CREATE OR REPLACE FUNCTION public.texte_normalise(_t text)
RETURNS text LANGUAGE sql STABLE SET search_path = public, extensions AS $$
  SELECT ' ' || btrim(regexp_replace(lower(extensions.unaccent(coalesce(_t, ''))), '[^[:alnum:]]+', ' ', 'g')) || ' '
$$;
GRANT EXECUTE ON FUNCTION public.texte_normalise(text) TO authenticated, service_role;
CREATE TABLE IF NOT EXISTS public.termes_interdits_publics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  terme text NOT NULL CHECK (char_length(btrim(terme)) BETWEEN 3 AND 120),
  categorie text NOT NULL DEFAULT 'autre'
    CHECK (categorie IN ('etablissement', 'groupe', 'ville', 'marque', 'personne', 'autre')),
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS termes_interdits_publics_terme_idx
  ON public.termes_interdits_publics (lower(btrim(terme)));
ALTER TABLE public.termes_interdits_publics ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.termes_interdits_publics FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.termes_interdits_publics TO authenticated;
GRANT ALL ON public.termes_interdits_publics TO service_role;
DROP POLICY IF EXISTS "Admins gerent les termes interdits" ON public.termes_interdits_publics;
CREATE POLICY "Admins gerent les termes interdits" ON public.termes_interdits_publics FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE OR REPLACE FUNCTION public.termes_interdits_trouves(_texte text)
RETURNS text[] LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  n text := public.texte_normalise(_texte);
  trouves text[] := '{}';
  extra text[];
  r record;
BEGIN
  IF btrim(n) = '' THEN
    RETURN trouves;
  END IF;
  FOR r IN SELECT btrim(terme) AS terme FROM public.termes_interdits_publics LOOP
    IF btrim(public.texte_normalise(r.terme)) <> '' AND strpos(n, public.texte_normalise(r.terme)) > 0 THEN
      trouves := trouves || r.terme;
    END IF;
  END LOOP;
  IF to_regprocedure('public.greffe_termes_nominatifs(text)') IS NOT NULL THEN
    EXECUTE 'SELECT public.greffe_termes_nominatifs($1)' INTO extra USING _texte;
    trouves := trouves || coalesce(extra, '{}');
  END IF;
  RETURN (SELECT coalesce(array_agg(DISTINCT x ORDER BY x), '{}') FROM unnest(trouves) x);
END;
$$;
REVOKE ALL ON FUNCTION public.termes_interdits_trouves(text) FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.texte_contenu_public(_c public.contenus_publics)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT concat_ws(chr(10), _c.titre, _c.description, _c.chapo, _c.corps, replace(_c.slug, '-', ' '))
$$;
CREATE OR REPLACE FUNCTION public.manques_contenu(_c public.contenus_publics)
RETURNS TABLE (code text, message text) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r jsonb := public.editorial_reglages();
  trouves text[];
  lt integer := char_length(btrim(_c.titre));
  ld integer := char_length(btrim(_c.description));
BEGIN
  IF coalesce((r ->> 'longueurs_seo')::boolean, true) THEN
    IF lt < 10 OR lt > 70 THEN
      code := 'titre'; message := format('Titre : de 10 à 70 caractères (%s aujourd''hui).', lt); RETURN NEXT;
    END IF;
    IF ld < 70 OR ld > 160 THEN
      code := 'description'; message := format('Description : de 70 à 160 caractères (%s aujourd''hui).', ld); RETURN NEXT;
    END IF;
  END IF;
  IF btrim(_c.corps) = '' THEN
    code := 'corps'; message := 'Le texte est vide.'; RETURN NEXT;
  END IF;
  IF _c.type = 'article' THEN
    IF coalesce((r ->> 'exiger_auteur')::boolean, true) THEN
      IF r ->> 'auteur_mode' = 'nomme' AND btrim(_c.auteur_nom) = '' THEN
        code := 'auteur'; message := 'Nom de l''auteur manquant.'; RETURN NEXT;
      ELSIF coalesce(r ->> 'auteur_mode', 'fonction') <> 'nomme' AND btrim(_c.auteur_fonction) = '' THEN
        code := 'auteur'; message := 'Fonction de l''auteur manquante.'; RETURN NEXT;
      END IF;
    END IF;
    IF coalesce((r ->> 'exiger_sources')::boolean, true) AND strpos(_c.sources, 'https://') = 0 THEN
      code := 'sources'; message := 'Source manquante (adresse https://).'; RETURN NEXT;
    END IF;
    IF coalesce((r ->> 'exiger_relecture')::boolean, true) AND _c.relu_le IS NULL THEN
      code := 'relecture'; message := 'Relecture à valider.'; RETURN NEXT;
    END IF;
  END IF;
  trouves := public.termes_interdits_trouves(public.texte_contenu_public(_c));
  IF cardinality(trouves) > 0 THEN
    code := 'termes'; message := format('Termes interdits repérés : %s.', array_to_string(trouves, ', ')); RETURN NEXT;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.manques_contenu(public.contenus_publics) FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.manques_publication(_id uuid)
RETURNS TABLE (code text, message text) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.contenus_publics;
BEGIN
  IF NOT public.can_write_content(auth.uid()) THEN
    RAISE EXCEPTION 'Réservé aux rédacteurs et aux administrateurs.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO c FROM public.contenus_publics WHERE id = _id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contenu introuvable.' USING ERRCODE = 'P0002';
  END IF;
  RETURN QUERY SELECT m.code, m.message FROM public.manques_contenu(c) m;
END;
$$;
REVOKE ALL ON FUNCTION public.manques_publication(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manques_publication(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.editorial_etat()
RETURNS TABLE (id uuid, statut_lu text, codes text[], manques text[])
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_write_content(auth.uid()) THEN
    RAISE EXCEPTION 'Réservé aux rédacteurs et aux administrateurs.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT c.id, public.statut_effectif(c.statut, c.type, c.publie_le, c.relu_le),
           coalesce(array_agg(m.code) FILTER (WHERE m.code IS NOT NULL), '{}'),
           coalesce(array_agg(m.message) FILTER (WHERE m.code IS NOT NULL), '{}')
    FROM public.contenus_publics c
    LEFT JOIN LATERAL public.manques_contenu(c) m ON true
    GROUP BY c.id;
END;
$$;
REVOKE ALL ON FUNCTION public.editorial_etat() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.editorial_etat() TO authenticated;
CREATE OR REPLACE FUNCTION public.contenus_publics_a_revoir()
RETURNS TABLE (id uuid, type text, slug text, titre text, termes text[])
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Réservé aux administrateurs.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT c.id, c.type, c.slug, c.titre, t.termes
    FROM public.contenus_publics c
    CROSS JOIN LATERAL (SELECT public.termes_interdits_trouves(public.texte_contenu_public(c)) AS termes) t
    WHERE c.publie AND cardinality(t.termes) > 0
    ORDER BY c.type, c.slug;
END;
$$;
REVOKE ALL ON FUNCTION public.contenus_publics_a_revoir() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.contenus_publics_a_revoir() TO authenticated;

-- 6. Journal et versions ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contenus_publics_journal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contenu_id uuid NOT NULL REFERENCES public.contenus_publics (id) ON DELETE CASCADE,
  de text,
  vers text NOT NULL,
  par uuid,
  auto boolean NOT NULL DEFAULT false,
  motif text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contenus_publics_journal_contenu_idx
  ON public.contenus_publics_journal (contenu_id, created_at DESC);
CREATE TABLE IF NOT EXISTS public.contenus_publics_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contenu_id uuid NOT NULL REFERENCES public.contenus_publics (id) ON DELETE CASCADE,
  numero integer NOT NULL,
  titre text NOT NULL,
  description text NOT NULL,
  chapo text NOT NULL,
  corps text NOT NULL,
  sources text NOT NULL,
  par uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contenu_id, numero)
);
ALTER TABLE public.contenus_publics_journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contenus_publics_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.contenus_publics_journal, public.contenus_publics_versions FROM anon, authenticated;
GRANT SELECT ON public.contenus_publics_journal, public.contenus_publics_versions TO authenticated;
GRANT ALL ON public.contenus_publics_journal, public.contenus_publics_versions TO service_role;
DROP POLICY IF EXISTS "Redacteurs lisent le journal" ON public.contenus_publics_journal;
CREATE POLICY "Redacteurs lisent le journal" ON public.contenus_publics_journal FOR SELECT TO authenticated
  USING (public.can_write_content(auth.uid()));
DROP POLICY IF EXISTS "Redacteurs lisent les versions" ON public.contenus_publics_versions;
CREATE POLICY "Redacteurs lisent les versions" ON public.contenus_publics_versions FOR SELECT TO authenticated
  USING (public.can_write_content(auth.uid()));
CREATE OR REPLACE FUNCTION public.texte_editorial(_c public.contenus_publics)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT concat_ws(chr(31), _c.titre, _c.description, _c.chapo, _c.corps, _c.sources)
$$;
CREATE OR REPLACE FUNCTION public.libelle_statut(_s text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _s
    WHEN 'idee' THEN 'idée' WHEN 'redaction' THEN 'en rédaction' WHEN 'a_relire' THEN 'à relire'
    WHEN 'pret' THEN 'prêt' WHEN 'programme' THEN 'programmé' WHEN 'publie' THEN 'publié'
    WHEN 'a_actualiser' THEN 'à actualiser' ELSE coalesce(_s, '—') END
$$;

-- 7. Passages de statut ----------------------------------------------------------------------------
-- Demande de passage : statut écrit, cds.vers_statut posé par changer_statut_contenu(), ou écriture
-- directe de publie (vrai = « publié », faux = « en rédaction »), soumise aux mêmes règles.
-- Opération serveur (clé de service, éditeur SQL, migration : ni compte connecté ni visiteur) : le
-- statut suit la demande sans contrôle de chemin. Les termes interdits s'appliquent toujours.
CREATE OR REPLACE FUNCTION public.garde_statut_contenus()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  serveur boolean := uid IS NULL OR coalesce(current_setting('role', true), 'none') NOT IN ('authenticated', 'anon');
  admin boolean := serveur OR public.has_role(uid, 'admin');
  simple boolean := coalesce(public.editorial_reglages() ->> 'circuit', 'complet') = 'simple';
  motif text := btrim(coalesce(current_setting('cds.motif_statut', true), ''));
  demande text := nullif(btrim(coalesce(current_setting('cds.vers_statut', true), '')), '');
  de text;
  vers text;
  cible text;
  auto text := '';
  manques text;
BEGIN
  PERFORM set_config('cds.statut_auto', '', true);
  IF tg_op = 'INSERT' THEN
    IF serveur THEN
      IF new.publie THEN
        new.statut := 'publie';
      END IF;
    ELSIF new.statut NOT IN ('idee', 'redaction') OR new.publie OR new.publie_le IS NOT NULL THEN
      RAISE EXCEPTION 'Un contenu commence en « idée » ou « en rédaction » : la publication passe par le statut.'
        USING ERRCODE = '23514';
    END IF;
    new.publie := new.statut IN ('publie', 'a_actualiser');
    RETURN new;
  END IF;
  de := public.statut_effectif(old.statut, old.type, old.publie_le, old.relu_le);
  IF demande IS NOT NULL THEN
    vers := demande;
  ELSIF new.statut <> old.statut THEN
    vers := new.statut;
  ELSIF new.publie IS DISTINCT FROM old.publie THEN
    vers := CASE WHEN new.publie THEN 'publie' ELSE 'redaction' END;
  END IF;
  IF vers IS NULL THEN
    IF old.type = 'article' AND public.texte_editorial(new) <> public.texte_editorial(old) THEN
      IF de IN ('pret', 'programme') THEN
        new.statut := 'a_relire';
        new.publie_le := NULL;
        auto := 'Texte modifié après la relecture.';
      ELSIF de = 'publie' THEN
        new.statut := 'a_actualiser';
        auto := 'Texte modifié depuis la relecture.';
      END IF;
    END IF;
    IF NOT serveur AND auto = '' THEN
      IF new.relu_le IS DISTINCT FROM old.relu_le OR new.relu_par IS DISTINCT FROM old.relu_par THEN
        RAISE EXCEPTION 'La date de relecture se pose en validant la relecture.' USING ERRCODE = '23514';
      END IF;
      IF new.publie_le IS DISTINCT FROM old.publie_le THEN
        RAISE EXCEPTION 'La date de publication se pose en publiant ou en programmant.' USING ERRCODE = '23514';
      END IF;
    END IF;
    new.publie := new.statut IN ('publie', 'a_actualiser');
    PERFORM set_config('cds.statut_auto', auto, true);
    RETURN new;
  END IF;
  cible := CASE WHEN vers = 'programme' THEN 'publie' ELSE vers END;
  IF cible NOT IN ('idee', 'redaction', 'a_relire', 'pret', 'publie', 'a_actualiser') THEN
    RAISE EXCEPTION 'Statut inconnu : %.', vers USING ERRCODE = '23514';
  END IF;
  IF serveur THEN
    new.statut := cible;
    IF cible NOT IN ('publie', 'a_actualiser') THEN
      new.publie_le := NULL;
    END IF;
    new.publie := cible IN ('publie', 'a_actualiser');
    RETURN new;
  END IF;
  IF new.relu_le IS DISTINCT FROM old.relu_le OR new.relu_par IS DISTINCT FROM old.relu_par THEN
    RAISE EXCEPTION 'La date de relecture se pose en validant la relecture.' USING ERRCODE = '23514';
  END IF;
  IF NOT admin AND (old.type = 'page' OR cible IN ('pret', 'publie')
                    OR (de IN ('programme', 'publie', 'a_actualiser') AND cible = 'redaction')) THEN
    RAISE EXCEPTION 'Réservé aux administrateurs.' USING ERRCODE = '42501';
  END IF;
  IF old.type = 'page' THEN
    IF NOT ((de = 'redaction' AND cible = 'publie') OR (de IN ('publie', 'programme') AND cible = 'redaction')) THEN
      RAISE EXCEPTION 'Passage refusé : une page va de « en rédaction » à « publié », et retour.' USING ERRCODE = '23514';
    END IF;
  ELSIF NOT (
       (de = 'idee' AND cible = 'redaction')
    OR (de = 'redaction' AND cible IN ('idee', 'a_relire'))
    OR (de = 'redaction' AND cible = 'publie' AND simple)
    OR (de = 'a_relire' AND cible IN ('redaction', 'pret'))
    OR (de = 'pret' AND cible IN ('publie', 'redaction'))
    OR (de = 'programme' AND cible IN ('pret', 'redaction'))
    OR (de = 'publie' AND cible IN ('a_actualiser', 'redaction'))
    OR (de = 'a_actualiser' AND cible IN ('publie', 'redaction'))
  ) THEN
    RAISE EXCEPTION 'Passage refusé : de « % » à « % ».', public.libelle_statut(de), public.libelle_statut(vers)
      USING ERRCODE = '23514';
  END IF;
  IF vers = 'programme' THEN
    IF de NOT IN ('pret', 'redaction') OR (de = 'redaction' AND old.type = 'article' AND NOT simple) THEN
      RAISE EXCEPTION 'Passage refusé : seul un contenu prêt se programme.' USING ERRCODE = '23514';
    END IF;
    IF new.publie_le IS NULL OR new.publie_le <= now() THEN
      RAISE EXCEPTION 'Date et heure de publication à venir attendues.' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF de = 'redaction' AND cible = 'a_relire' AND btrim(new.corps) = '' THEN
    RAISE EXCEPTION 'Le texte est vide : rien à relire.' USING ERRCODE = '23514';
  END IF;
  IF ((de = 'a_relire' AND cible = 'redaction') OR (de = 'publie' AND cible = 'a_actualiser')) AND motif = '' THEN
    RAISE EXCEPTION 'Un motif est obligatoire.' USING ERRCODE = '23514';
  END IF;
  IF old.type = 'article' AND ((de = 'a_relire' AND cible = 'pret') OR (de = 'a_actualiser' AND cible = 'publie')
                               OR (de = 'redaction' AND cible = 'publie')) THEN
    new.relu_le := current_date;
    new.relu_par := uid;
  END IF;
  IF cible IN ('pret', 'publie') THEN
    SELECT string_agg(m.message, ' ') INTO manques FROM public.manques_contenu(new) m;
    IF manques IS NOT NULL THEN
      RAISE EXCEPTION 'Publication refusée : %', manques USING ERRCODE = '23514';
    END IF;
  END IF;
  IF cible = 'publie' AND de IN ('pret', 'redaction') THEN
    IF vers <> 'programme' THEN
      new.publie_le := now();
    END IF;
  ELSIF cible IN ('publie', 'a_actualiser') THEN
    new.publie_le := old.publie_le;
  ELSE
    new.publie_le := NULL;
  END IF;
  new.statut := cible;
  new.publie := cible IN ('publie', 'a_actualiser');
  RETURN new;
END;
$$;
REVOKE ALL ON FUNCTION public.garde_statut_contenus() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS contenus_publics_a_statut ON public.contenus_publics;
CREATE TRIGGER contenus_publics_a_statut BEFORE INSERT OR UPDATE ON public.contenus_publics
  FOR EACH ROW EXECUTE FUNCTION public.garde_statut_contenus();
-- Un contenu qui contient un terme interdit ne passe pas en ligne, même par le serveur.
CREATE OR REPLACE FUNCTION public.garde_termes_contenus()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  trouves text[];
BEGIN
  IF NOT new.publie THEN
    RETURN new;
  END IF;
  IF tg_op = 'UPDATE' AND old.publie AND public.texte_contenu_public(new) = public.texte_contenu_public(old) THEN
    RETURN new;
  END IF;
  trouves := public.termes_interdits_trouves(public.texte_contenu_public(new));
  IF cardinality(trouves) > 0 THEN
    RAISE EXCEPTION 'Publication refusée : le texte contient un terme interdit (%).', array_to_string(trouves, ', ')
      USING ERRCODE = '23514';
  END IF;
  RETURN new;
END;
$$;
REVOKE ALL ON FUNCTION public.garde_termes_contenus() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS contenus_publics_b_termes ON public.contenus_publics;
CREATE TRIGGER contenus_publics_b_termes BEFORE INSERT OR UPDATE ON public.contenus_publics
  FOR EACH ROW EXECUTE FUNCTION public.garde_termes_contenus();
CREATE OR REPLACE FUNCTION public.trace_contenus_publics()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  de text;
  vers text := public.statut_effectif(new.statut, new.type, new.publie_le, new.relu_le);
  auto text := coalesce(current_setting('cds.statut_auto', true), '');
BEGIN
  IF tg_op = 'UPDATE' THEN
    de := public.statut_effectif(old.statut, old.type, old.publie_le, old.relu_le);
  END IF;
  IF tg_op = 'INSERT' OR new.statut <> old.statut OR new.publie_le IS DISTINCT FROM old.publie_le THEN
    INSERT INTO public.contenus_publics_journal (contenu_id, de, vers, par, auto, motif)
    VALUES (new.id, de, vers, auth.uid(), auto <> '',
            CASE WHEN auto <> '' THEN auto ELSE btrim(coalesce(current_setting('cds.motif_statut', true), '')) END);
  END IF;
  IF tg_op = 'INSERT' OR public.texte_editorial(new) <> public.texte_editorial(old) THEN
    INSERT INTO public.contenus_publics_versions (contenu_id, numero, titre, description, chapo, corps, sources, par)
    VALUES (new.id,
            coalesce((SELECT max(numero) FROM public.contenus_publics_versions WHERE contenu_id = new.id), 0) + 1,
            new.titre, new.description, new.chapo, new.corps, new.sources, auth.uid());
  END IF;
  PERFORM set_config('cds.statut_auto', '', true);
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.trace_contenus_publics() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS contenus_publics_trace ON public.contenus_publics;
CREATE TRIGGER contenus_publics_trace AFTER INSERT OR UPDATE ON public.contenus_publics
  FOR EACH ROW EXECUTE FUNCTION public.trace_contenus_publics();
INSERT INTO public.contenus_publics_versions (contenu_id, numero, titre, description, chapo, corps, sources)
SELECT c.id, 1, c.titre, c.description, c.chapo, c.corps, c.sources
FROM public.contenus_publics c
WHERE NOT EXISTS (SELECT 1 FROM public.contenus_publics_versions v WHERE v.contenu_id = c.id);
CREATE OR REPLACE FUNCTION public.changer_statut_contenu(_id uuid, _vers text, _motif text DEFAULT '',
                                                         _publie_le timestamptz DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  n integer;
BEGIN
  PERFORM set_config('cds.motif_statut', left(coalesce(_motif, ''), 300), true);
  PERFORM set_config('cds.vers_statut', coalesce(_vers, ''), true);
  UPDATE public.contenus_publics
  SET statut = CASE WHEN _vers = 'programme' THEN 'publie' ELSE _vers END,
      publie_le = CASE WHEN _vers = 'programme' THEN _publie_le ELSE publie_le END
  WHERE id = _id;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM set_config('cds.motif_statut', '', true);
  PERFORM set_config('cds.vers_statut', '', true);
  IF n = 0 THEN
    RAISE EXCEPTION 'Réservé aux rédacteurs et aux administrateurs.' USING ERRCODE = '42501';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.changer_statut_contenu(uuid, text, text, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.changer_statut_contenu(uuid, text, text, timestamptz) TO authenticated;

-- 9. Fin de la vue de compatibilité ----------------------------------------------------------------
DROP VIEW IF EXISTS public.blog_posts;

-- 10. Grille de conformité et version --------------------------------------------------------------
INSERT INTO public.template_checks (code, area, label, requirement, status, severity, evidence, position, modules)
SELECT 'V1-CIRCUIT-EDITORIAL', 'Contenus', 'Circuit de rédaction',
  'Statuts et passages imposés par la base (rédacteur, administrateur), journal et versions ; publication refusée tant qu''il manque une exigence réglée (sources, relecture, auteur, longueurs) ou qu''un terme interdit figure dans le texte ; programmation invisible avant l''heure.',
  'conforme', 'majeur', 'tests/db/test_31',
  coalesce((SELECT max(position) FROM public.template_checks), 0) + 1, ARRAY['blog']
ON CONFLICT (code) DO NOTHING;
INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.10.0', 'brique', '2026-11-03',
  'Circuit de rédaction : rôle rédacteur, statuts, relecture, exigences réglables, termes interdits.',
  'Rôle editor ; réglage « editorial » (circuit complet ou simple, délai de relecture, exigences, affichage de l''auteur, avertissement) ; statut, journal et versions des contenus ; manques avant publication ; termes interdits et accroche greffe_termes_nominatifs ; programmation ; vue blog_posts retirée.',
  '20261103140000_v1_10_0_circuit_editorial')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.10.0', 'publie_le', '2026-11-03',
  'migration_reference', '20261103140000_v1_10_0_circuit_editorial'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.10.0', '.')::int[];
