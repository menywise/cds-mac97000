CREATE OR REPLACE FUNCTION public.garde_statut_contenus()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  serveur boolean := uid IS NULL OR coalesce(current_setting('role', true), 'none') NOT IN ('authenticated', 'anon');
  admin boolean := serveur OR public.has_role(uid, 'admin');
  simple boolean := coalesce(public.editorial_reglages() ->> 'circuit', 'complet') = 'simple';
  motif text := btrim(coalesce(current_setting('cds.motif_statut', true), ''));
  demande text := nullif(btrim(coalesce(current_setting('cds.vers_statut', true), '')), '');
  refs boolean := coalesce(current_setting('cds.refs_modifiees', true), '') = '1';
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
    IF old.type = 'article' AND (public.texte_editorial(new) <> public.texte_editorial(old) OR refs) THEN
      IF de IN ('pret', 'programme') THEN
        new.statut := 'a_relire';
        new.publie_le := NULL;
        auto := CASE WHEN refs THEN 'Références modifiées après la relecture.' ELSE 'Texte modifié après la relecture.' END;
      ELSIF de = 'publie' THEN
        new.statut := 'a_actualiser';
        auto := CASE WHEN refs THEN 'Références modifiées depuis la relecture.' ELSE 'Texte modifié depuis la relecture.' END;
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
CREATE OR REPLACE FUNCTION public.references_touchent_contenu()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM set_config('cds.refs_modifiees', '1', true);
  UPDATE public.contenus_publics SET updated_at = now()
  WHERE id IN (SELECT x FROM unnest(ARRAY[CASE WHEN tg_op <> 'INSERT' THEN old.contenu_id END,
                                          CASE WHEN tg_op <> 'DELETE' THEN new.contenu_id END]) x
               WHERE x IS NOT NULL);
  PERFORM set_config('cds.refs_modifiees', '', true);
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.references_touchent_contenu() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS references_contenu_relecture ON public.references_contenu;
CREATE TRIGGER references_contenu_relecture AFTER INSERT OR DELETE ON public.references_contenu
  FOR EACH ROW EXECUTE FUNCTION public.references_touchent_contenu();
DROP TRIGGER IF EXISTS references_contenu_relecture_maj ON public.references_contenu;
CREATE TRIGGER references_contenu_relecture_maj AFTER UPDATE ON public.references_contenu
  FOR EACH ROW WHEN (old IS DISTINCT FROM new) EXECUTE FUNCTION public.references_touchent_contenu();
