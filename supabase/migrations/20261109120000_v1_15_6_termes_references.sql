-- Socle 1.15.6 — correctif remonté d'une installation : les termes interdits sont aussi cherchés
-- dans la bibliographie. Les auteurs, titre et revue des références (references_contenu) entrent dans
-- texte_contenu_public : manque « termes » avant publication, contenus publiés à revoir, refus à la
-- publication. Les noms d'une installation (greffe_termes_nominatifs) suivent le même chemin.
-- Sur un contenu en ligne, une référence modifiée (drapeau cds.refs_modifiees de la 1.15.5) est
-- contrôlée même si le reste du texte n'a pas changé ; un terme trouvé la refuse.
-- texte_contenu_public lit une table : IMMUTABLE devient STABLE (aucun index ne l'utilise).
-- Rejouable sans danger. Écrit pour l'éditeur SQL de Lovable : ni antislash ni point d'interrogation,
-- aucune ligne vide dans une instruction.

-- 1. Texte contrôlé et garde des termes ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.texte_contenu_public(_c public.contenus_publics)
RETURNS text LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT concat_ws(chr(10), _c.titre, _c.description, _c.chapo, _c.corps, replace(_c.slug, '-', ' '),
    (SELECT string_agg(concat_ws(' ', r.auteurs, r.titre, r.revue), chr(10) ORDER BY r.rang)
     FROM public.references_contenu r WHERE r.contenu_id = _c.id))
$$;
CREATE OR REPLACE FUNCTION public.garde_termes_contenus()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  trouves text[];
  refs boolean := coalesce(current_setting('cds.refs_modifiees', true), '') = '1';
BEGIN
  IF NOT new.publie THEN
    RETURN new;
  END IF;
  IF tg_op = 'UPDATE' AND old.publie AND NOT refs AND public.texte_contenu_public(new) = public.texte_contenu_public(old) THEN
    RETURN new;
  END IF;
  trouves := public.termes_interdits_trouves(public.texte_contenu_public(new));
  IF cardinality(trouves) > 0 AND refs THEN
    RAISE EXCEPTION 'Référence refusée : elle contient un terme interdit (%).', array_to_string(trouves, ', ')
      USING ERRCODE = '23514';
  END IF;
  IF cardinality(trouves) > 0 THEN
    RAISE EXCEPTION 'Publication refusée : le texte contient un terme interdit (%).', array_to_string(trouves, ', ')
      USING ERRCODE = '23514';
  END IF;
  RETURN new;
END;
$$;
REVOKE ALL ON FUNCTION public.garde_termes_contenus() FROM PUBLIC, anon, authenticated;

-- 2. Version -------------------------------------------------------------------------------------
INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.15.6', 'correctif', '2026-11-09',
  'Bibliographie : les termes interdits sont aussi cherchés dans les références.',
  'texte_contenu_public lit auteurs, titre et revue des références ; garde_termes_contenus contrôle aussi une référence modifiée d''un contenu en ligne (drapeau cds.refs_modifiees de la 1.15.5) et la refuse si elle contient un terme interdit ou un nom de greffe_termes_nominatifs. Remontée d''une installation.',
  '20261109120000_v1_15_6_termes_references')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.15.6', 'publie_le', '2026-11-09',
  'migration_reference', '20261109120000_v1_15_6_termes_references'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.15.6', '.')::int[];
