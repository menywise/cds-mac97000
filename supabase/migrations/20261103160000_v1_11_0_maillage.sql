-- Socle 1.11.0 — taxonomie et maillage interne des contenus éditoriaux.
-- Lot 3 du plan docs/plans/CONTENUS_EDITORIAUX.md.
-- 1. Outils : adresse tirée d'un libellé ; liens internes extraits du texte ([texte](/adresse)).
--    Les liens se lisent dans le texte à chaque calcul : aucune table à tenir à jour.
-- 2. Rubriques : une par contenu, deux niveaux au plus, texte d'introduction (page de rubrique).
-- 3. Étiquettes contrôlées : un vocabulaire en base ; un contenu ne porte que des étiquettes connues,
--    écrites sous leur libellé de référence. Reprise des étiquettes existantes.
-- 4. Séries : suite ordonnée d'articles.
-- 5. Redirections : le changement d'adresse d'un article déjà publié crée une redirection
--    permanente, et les redirections qui visaient l'ancienne adresse suivent.
-- 6. Manques avant publication : lien interne cassé ou vers un contenu hors ligne ; satellite qui
--    ne renvoie pas vers son pilier.
-- 7. État du maillage (rédacteurs) : liens sortants et entrants, contenus orphelins, liens cassés
--    ou redirigés, ancres pauvres, satellites absents du pilier, requête visée en double.
-- 8. « À lire ensuite » : pilier et satellites frères, puis étiquettes communes, rubrique, série.
-- 9. Réglage : nombre d'articles à partir duquel une page d'étiquette est indexée (3 par défaut).
-- 10. Grille de conformité et version 1.11.0.
-- Rejouable sans danger. Écrit pour l'éditeur SQL de Lovable : ni antislash ni point d'interrogation,
-- aucune ligne vide dans une instruction.

-- 1. Outils ----------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.slug_depuis(_t text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT trim(both '-' from left(trim(both '-' from
    regexp_replace(lower(extensions.unaccent(coalesce(_t, ''))), '[^a-z0-9]+', '-', 'g')), 80))
$$;
GRANT EXECUTE ON FUNCTION public.slug_depuis(text) TO anon, authenticated, service_role;
-- Liens internes du texte, dans l'ordre : ancre et adresse sans ancre de page ni paramètres.
CREATE OR REPLACE FUNCTION public.extraire_liens(_corps text)
RETURNS TABLE (rang integer, ancre text, chemin text) LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT m.n::integer, btrim(m.r[1]),
         rtrim(split_part(split_part(m.r[2], '#', 1), chr(63), 1), '/')
  FROM regexp_matches(coalesce(_corps, ''), '[[]([^]]+)[]][(](/[^)[:space:]]*)[)]', 'g')
       WITH ORDINALITY AS m(r, n)
$$;
GRANT EXECUTE ON FUNCTION public.extraire_liens(text) TO anon, authenticated, service_role;
-- Adresse d'article visée par un chemin /blog/<adresse> (une seule partie après /blog/), sinon null.
CREATE OR REPLACE FUNCTION public.slug_article_du_chemin(_chemin text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN _chemin ~ '^/blog/[a-z0-9]+(-[a-z0-9]+)*$' THEN substr(_chemin, 7) END
$$;
GRANT EXECUTE ON FUNCTION public.slug_article_du_chemin(text) TO anon, authenticated, service_role;
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
    'avertissement', '',
    'seuil_etiquette', 3)
$$;

-- 2. Rubriques -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rubriques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (char_length(slug) <= 80 AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  libelle text NOT NULL CHECK (char_length(btrim(libelle)) BETWEEN 2 AND 60),
  intro text NOT NULL DEFAULT '' CHECK (char_length(intro) <= 2000),
  parent_id uuid REFERENCES public.rubriques (id) ON DELETE RESTRICT,
  ordre integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (parent_id IS NULL OR parent_id <> id)
);
ALTER TABLE public.rubriques ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.rubriques TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rubriques TO authenticated;
GRANT ALL ON public.rubriques TO service_role;
DROP POLICY IF EXISTS "Rubriques visibles de tous" ON public.rubriques;
CREATE POLICY "Rubriques visibles de tous" ON public.rubriques FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admins gerent les rubriques" ON public.rubriques;
CREATE POLICY "Admins gerent les rubriques" ON public.rubriques FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
-- Deux niveaux au plus : une sous-rubrique n'a pas d'enfant, une rubrique mère n'a pas de parent.
CREATE OR REPLACE FUNCTION public.garde_rubriques()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF new.parent_id IS NOT NULL THEN
    IF (SELECT parent_id FROM public.rubriques WHERE id = new.parent_id) IS NOT NULL THEN
      RAISE EXCEPTION 'Deux niveaux de rubriques au plus.' USING ERRCODE = '23514';
    END IF;
    IF tg_op = 'UPDATE' AND EXISTS (SELECT 1 FROM public.rubriques WHERE parent_id = new.id) THEN
      RAISE EXCEPTION 'Deux niveaux de rubriques au plus : cette rubrique a déjà des sous-rubriques.' USING ERRCODE = '23514';
    END IF;
  END IF;
  new.updated_at := now();
  RETURN new;
END;
$$;
REVOKE ALL ON FUNCTION public.garde_rubriques() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS rubriques_garde ON public.rubriques;
CREATE TRIGGER rubriques_garde BEFORE INSERT OR UPDATE ON public.rubriques
  FOR EACH ROW EXECUTE FUNCTION public.garde_rubriques();
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS rubrique_id uuid
  REFERENCES public.rubriques (id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS contenus_publics_rubrique_idx ON public.contenus_publics (rubrique_id);

-- 3. Étiquettes contrôlées -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.etiquettes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (char_length(slug) <= 80 AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  libelle text NOT NULL CHECK (char_length(btrim(libelle)) BETWEEN 2 AND 60),
  definition text NOT NULL DEFAULT '' CHECK (char_length(definition) <= 300),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.etiquettes ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.etiquettes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.etiquettes TO authenticated;
GRANT ALL ON public.etiquettes TO service_role;
DROP POLICY IF EXISTS "Etiquettes visibles de tous" ON public.etiquettes;
CREATE POLICY "Etiquettes visibles de tous" ON public.etiquettes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Redacteurs creent les etiquettes" ON public.etiquettes;
CREATE POLICY "Redacteurs creent les etiquettes" ON public.etiquettes FOR INSERT TO authenticated
  WITH CHECK (public.can_write_content(auth.uid()));
DROP POLICY IF EXISTS "Redacteurs modifient les etiquettes" ON public.etiquettes;
CREATE POLICY "Redacteurs modifient les etiquettes" ON public.etiquettes FOR UPDATE TO authenticated
  USING (public.can_write_content(auth.uid())) WITH CHECK (public.can_write_content(auth.uid()));
DROP POLICY IF EXISTS "Admins suppriment les etiquettes" ON public.etiquettes;
CREATE POLICY "Admins suppriment les etiquettes" ON public.etiquettes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
-- L'adresse d'une étiquette suit son libellé.
CREATE OR REPLACE FUNCTION public.garde_etiquettes_ref()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  new.libelle := btrim(new.libelle);
  new.slug := public.slug_depuis(new.libelle);
  RETURN new;
END;
$$;
DROP TRIGGER IF EXISTS etiquettes_garde ON public.etiquettes;
CREATE TRIGGER etiquettes_garde BEFORE INSERT OR UPDATE ON public.etiquettes
  FOR EACH ROW EXECUTE FUNCTION public.garde_etiquettes_ref();
INSERT INTO public.etiquettes (slug, libelle)
SELECT DISTINCT ON (public.slug_depuis(e)) public.slug_depuis(e), btrim(e)
FROM public.contenus_publics c, unnest(c.etiquettes) e
WHERE char_length(btrim(e)) BETWEEN 2 AND 60 AND public.slug_depuis(e) <> ''
ORDER BY public.slug_depuis(e), btrim(e)
ON CONFLICT (slug) DO NOTHING;
-- Un contenu ne porte que des étiquettes connues, sous leur libellé de référence, sans doublon.
-- Opération serveur : une étiquette inconnue est créée.
CREATE OR REPLACE FUNCTION public.garde_etiquettes_contenus()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  serveur boolean := auth.uid() IS NULL OR coalesce(current_setting('role', true), 'none') NOT IN ('authenticated', 'anon');
  e text;
  ref text;
  sortie text[] := '{}';
BEGIN
  IF tg_op = 'UPDATE' AND new.etiquettes IS NOT DISTINCT FROM old.etiquettes THEN
    RETURN new;
  END IF;
  FOREACH e IN ARRAY coalesce(new.etiquettes, '{}') LOOP
    CONTINUE WHEN public.slug_depuis(e) = '';
    SELECT libelle INTO ref FROM public.etiquettes WHERE slug = public.slug_depuis(e);
    IF ref IS NULL THEN
      IF NOT serveur OR char_length(btrim(e)) NOT BETWEEN 2 AND 60 THEN
        RAISE EXCEPTION 'Étiquette inconnue : %. La créer d''abord dans la taxonomie.', btrim(e) USING ERRCODE = '23514';
      END IF;
      INSERT INTO public.etiquettes (slug, libelle) VALUES (public.slug_depuis(e), btrim(e)) RETURNING libelle INTO ref;
    END IF;
    IF NOT ref = ANY (sortie) THEN
      sortie := sortie || ref;
    END IF;
  END LOOP;
  new.etiquettes := sortie;
  RETURN new;
END;
$$;
REVOKE ALL ON FUNCTION public.garde_etiquettes_contenus() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS contenus_publics_c_etiquettes ON public.contenus_publics;
CREATE TRIGGER contenus_publics_c_etiquettes BEFORE INSERT OR UPDATE ON public.contenus_publics
  FOR EACH ROW EXECUTE FUNCTION public.garde_etiquettes_contenus();

-- 4. Séries ----------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (char_length(slug) <= 80 AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  titre text NOT NULL CHECK (char_length(btrim(titre)) BETWEEN 3 AND 120),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 600),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.series TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.series TO authenticated;
GRANT ALL ON public.series TO service_role;
DROP POLICY IF EXISTS "Series visibles de tous" ON public.series;
CREATE POLICY "Series visibles de tous" ON public.series FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Redacteurs creent les series" ON public.series;
CREATE POLICY "Redacteurs creent les series" ON public.series FOR INSERT TO authenticated
  WITH CHECK (public.can_write_content(auth.uid()));
DROP POLICY IF EXISTS "Redacteurs modifient les series" ON public.series;
CREATE POLICY "Redacteurs modifient les series" ON public.series FOR UPDATE TO authenticated
  USING (public.can_write_content(auth.uid())) WITH CHECK (public.can_write_content(auth.uid()));
DROP POLICY IF EXISTS "Admins suppriment les series" ON public.series;
CREATE POLICY "Admins suppriment les series" ON public.series FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS serie_id uuid
  REFERENCES public.series (id) ON DELETE SET NULL;
ALTER TABLE public.contenus_publics ADD COLUMN IF NOT EXISTS serie_ordre integer;
ALTER TABLE public.contenus_publics DROP CONSTRAINT IF EXISTS contenus_publics_serie_check;
ALTER TABLE public.contenus_publics ADD CONSTRAINT contenus_publics_serie_check
  CHECK (serie_ordre IS NULL OR (serie_ordre BETWEEN 1 AND 999 AND serie_id IS NOT NULL));

-- 5. Redirections ----------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.redirections (
  de text PRIMARY KEY CHECK (de ~ '^/[a-z0-9/-]*$' AND char_length(de) <= 200),
  vers text NOT NULL CHECK (vers ~ '^/[a-z0-9/-]*$' AND char_length(vers) <= 200 AND vers <> de),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.redirections ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.redirections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.redirections TO authenticated;
GRANT ALL ON public.redirections TO service_role;
DROP POLICY IF EXISTS "Redirections lisibles de tous" ON public.redirections;
CREATE POLICY "Redirections lisibles de tous" ON public.redirections FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admins gerent les redirections" ON public.redirections;
CREATE POLICY "Admins gerent les redirections" ON public.redirections FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
-- Article déjà publié qui change d'adresse : l'ancienne adresse renvoie vers la nouvelle, les
-- redirections plus anciennes aussi (pas de chaîne), et la nouvelle adresse n'est plus redirigée.
CREATE OR REPLACE FUNCTION public.redirection_contenus()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ancien text := '/blog/' || old.slug;
  nouveau text := '/blog/' || new.slug;
BEGIN
  IF new.type <> 'article' OR old.type <> 'article' OR new.slug = old.slug OR old.publie_le IS NULL THEN
    RETURN NULL;
  END IF;
  DELETE FROM public.redirections WHERE de = nouveau;
  UPDATE public.redirections SET vers = nouveau WHERE vers = ancien;
  INSERT INTO public.redirections (de, vers) VALUES (ancien, nouveau)
  ON CONFLICT (de) DO UPDATE SET vers = EXCLUDED.vers;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.redirection_contenus() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS contenus_publics_redirection ON public.contenus_publics;
CREATE TRIGGER contenus_publics_redirection AFTER UPDATE OF slug ON public.contenus_publics
  FOR EACH ROW EXECUTE FUNCTION public.redirection_contenus();

-- 6. Manques avant publication : maillage ----------------------------------------------------------
-- Liens internes vers le blog d'un texte : article visé, publié ou non, redirection éventuelle.
CREATE OR REPLACE FUNCTION public.liens_du_texte(_corps text)
RETURNS TABLE (rang integer, ancre text, chemin text, cible_id uuid, cible_publiee boolean, redirige_vers text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.rang, l.ancre, l.chemin, c.id,
         coalesce(c.publie AND (c.publie_le IS NULL OR c.publie_le <= now()), false),
         r.vers
  FROM public.extraire_liens(_corps) l
  LEFT JOIN public.redirections r ON r.de = l.chemin
  LEFT JOIN public.contenus_publics c
    ON c.type = 'article' AND c.slug = public.slug_article_du_chemin(coalesce(r.vers, l.chemin))
  WHERE public.slug_article_du_chemin(l.chemin) IS NOT NULL
$$;
REVOKE ALL ON FUNCTION public.liens_du_texte(text) FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.manques_contenu(_c public.contenus_publics)
RETURNS TABLE (code text, message text) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r jsonb := public.editorial_reglages();
  trouves text[];
  casses text[];
  lt integer := char_length(btrim(_c.titre));
  ld integer := char_length(btrim(_c.description));
  pilier_slug text;
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
  SELECT array_agg(DISTINCT l.chemin ORDER BY l.chemin) INTO casses
  FROM public.liens_du_texte(_c.corps) l
  WHERE (l.cible_id IS NULL OR NOT l.cible_publiee) AND l.cible_id IS DISTINCT FROM _c.id;
  IF cardinality(casses) > 0 THEN
    code := 'liens'; message := format('Liens internes cassés ou vers un contenu hors ligne : %s.', array_to_string(casses, ', ')); RETURN NEXT;
  END IF;
  IF _c.pilier_id IS NOT NULL THEN
    SELECT slug INTO pilier_slug FROM public.contenus_publics WHERE id = _c.pilier_id;
    IF pilier_slug IS NOT NULL AND NOT EXISTS (
         SELECT 1 FROM public.liens_du_texte(_c.corps) l WHERE l.cible_id = _c.pilier_id) THEN
      code := 'pilier'; message := format('Lien vers le pilier manquant : [texte](/blog/%s).', pilier_slug); RETURN NEXT;
    END IF;
  END IF;
  trouves := public.termes_interdits_trouves(public.texte_contenu_public(_c));
  IF cardinality(trouves) > 0 THEN
    code := 'termes'; message := format('Termes interdits repérés : %s.', array_to_string(trouves, ', ')); RETURN NEXT;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.manques_contenu(public.contenus_publics) FROM PUBLIC, anon, authenticated;

-- 7. État du maillage ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ancre_pauvre(_ancre text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT lower(btrim(_ancre)) IN ('ici', 'cliquez ici', 'cliquer ici', 'ce lien', 'lien', 'cet article',
    'cette page', 'en savoir plus', 'lire la suite', 'la suite', 'voir', 'voir plus', 'plus', 'là', 'article')
$$;
GRANT EXECUTE ON FUNCTION public.ancre_pauvre(text) TO anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.maillage_etat()
RETURNS TABLE (id uuid, sortants integer, entrants integer, orphelin boolean, liens_casses text[],
               liens_rediriges text[], ancres_pauvres text[], satellites_absents text[], requete_en_double text[])
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
BEGIN
  IF NOT public.can_write_content(auth.uid()) THEN
    RAISE EXCEPTION 'Réservé aux rédacteurs et aux administrateurs.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  WITH arts AS (
    SELECT c.* FROM public.contenus_publics c WHERE c.type = 'article'
  ), liens AS (
    SELECT a.id AS source_id, a.publie AS source_en_ligne, l.*
    FROM arts a CROSS JOIN LATERAL public.liens_du_texte(a.corps) l
  )
  SELECT a.id,
    (SELECT count(*)::integer FROM liens WHERE source_id = a.id),
    (SELECT count(DISTINCT source_id)::integer FROM liens WHERE cible_id = a.id AND source_id <> a.id AND source_en_ligne),
    a.publie AND NOT EXISTS (SELECT 1 FROM liens WHERE cible_id = a.id AND source_id <> a.id AND source_en_ligne),
    coalesce((SELECT array_agg(DISTINCT chemin ORDER BY chemin) FROM liens
              WHERE source_id = a.id AND (cible_id IS NULL OR NOT cible_publiee)), '{}'),
    coalesce((SELECT array_agg(DISTINCT chemin ORDER BY chemin) FROM liens
              WHERE source_id = a.id AND redirige_vers IS NOT NULL), '{}'),
    coalesce((SELECT array_agg(DISTINCT ancre ORDER BY ancre) FROM liens
              WHERE source_id = a.id AND public.ancre_pauvre(ancre)), '{}'),
    CASE WHEN a.est_pilier THEN coalesce((
      SELECT array_agg(s.titre ORDER BY s.titre) FROM arts s
      WHERE s.pilier_id = a.id AND s.publie
        AND NOT EXISTS (SELECT 1 FROM liens WHERE source_id = a.id AND cible_id = s.id)), '{}')
    ELSE '{}'::text[] END,
    CASE WHEN btrim(a.requete_visee) = '' THEN '{}'::text[] ELSE coalesce((
      SELECT array_agg(o.titre ORDER BY o.titre) FROM arts o
      WHERE o.id <> a.id AND lower(btrim(o.requete_visee)) = lower(btrim(a.requete_visee))), '{}') END
  FROM arts a;
END;
$$;
REVOKE ALL ON FUNCTION public.maillage_etat() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.maillage_etat() TO authenticated;

-- 8. À lire ensuite --------------------------------------------------------------------------------
-- Droits du lecteur (règles d'accès de la table) : un visiteur ne reçoit que des articles en ligne.
CREATE OR REPLACE FUNCTION public.lire_ensuite(_id uuid, _n integer DEFAULT 3)
RETURNS TABLE (id uuid, slug text, titre text, chapo text, publie_le timestamptz)
LANGUAGE sql STABLE SET search_path = public AS $$
  WITH s AS (SELECT * FROM public.contenus_publics WHERE id = _id)
  SELECT c.id, c.slug, c.titre, c.chapo, c.publie_le
  FROM public.contenus_publics c, s
  WHERE c.type = 'article' AND c.publie AND (c.publie_le IS NULL OR c.publie_le <= now()) AND c.id <> s.id
  ORDER BY
    (CASE WHEN c.id = s.pilier_id OR c.pilier_id = s.id
               OR (s.pilier_id IS NOT NULL AND c.pilier_id = s.pilier_id) THEN 100 ELSE 0 END
     + 10 * (SELECT count(*) FROM unnest(c.etiquettes) e WHERE e = ANY (s.etiquettes))
     + CASE WHEN s.rubrique_id IS NOT NULL AND c.rubrique_id = s.rubrique_id THEN 5 ELSE 0 END
     + CASE WHEN s.serie_id IS NOT NULL AND c.serie_id = s.serie_id THEN 3 ELSE 0 END) DESC,
    c.publie_le DESC NULLS LAST
  LIMIT least(greatest(coalesce(_n, 3), 1), 12)
$$;
GRANT EXECUTE ON FUNCTION public.lire_ensuite(uuid, integer) TO anon, authenticated, service_role;

-- 10. Grille de conformité et version --------------------------------------------------------------
INSERT INTO public.template_checks (code, area, label, requirement, status, severity, evidence, position, modules)
SELECT 'V1-MAILLAGE', 'Contenus', 'Taxonomie et maillage interne',
  'Rubriques sur deux niveaux, étiquettes contrôlées, séries ; publication refusée si un lien interne est cassé ou si un satellite ne renvoie pas vers son pilier ; état du maillage (orphelins, ancres pauvres, requête en double) ; redirection permanente au changement d''adresse d''un article publié.',
  'conforme', 'majeur', 'tests/db/test_32',
  coalesce((SELECT max(position) FROM public.template_checks), 0) + 1, ARRAY['blog']
ON CONFLICT (code) DO NOTHING;
INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.11.0', 'brique', '2026-11-03',
  'Taxonomie et maillage interne : rubriques, étiquettes contrôlées, séries, contrôles de liens, redirections.',
  'Tables rubriques, etiquettes, series, redirections ; liens internes lus dans le texte (extraire_liens) ; manques « liens » et « pilier » ; maillage_etat ; lire_ensuite ; réglage seuil_etiquette ; redirection automatique au changement d''adresse.',
  '20261103160000_v1_11_0_maillage')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.11.0', 'publie_le', '2026-11-03',
  'migration_reference', '20261103160000_v1_11_0_maillage'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.11.0', '.')::int[];
