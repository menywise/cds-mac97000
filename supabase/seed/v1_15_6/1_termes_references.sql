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
