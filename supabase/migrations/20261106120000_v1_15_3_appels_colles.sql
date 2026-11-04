-- Socle 1.15.3 — correctif remonté d'une installation : dans « [1][2] », le manque « references »
-- ne voyait pas [2] (la lecture consommait le caractère qui suit l'appel). Les liens [texte](adresse)
-- sont retirés avant de compter les appels : même lecture que appelsDuTexte (src/lib/bibliographie.ts).
-- Le reste de manques_contenu est celui de la 1.14.0, inchangé.
-- Rejouable sans danger. Écrit pour l'éditeur SQL de Lovable : ni antislash ni point d'interrogation,
-- aucune ligne vide dans une instruction.

-- 1. Appels collés -------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.manques_contenu(_c public.contenus_publics)
 RETURNS TABLE(code text, message text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  r jsonb := public.editorial_reglages();
  trouves text[];
  casses text[];
  lt integer := char_length(btrim(_c.titre));
  ld integer := char_length(btrim(_c.description));
  pilier_slug text;
  appels integer[];
  manquants integer[];
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
  IF _c.type = 'article' THEN
    IF coalesce((r ->> 'exiger_liens_interets')::boolean, false) AND btrim(_c.liens_interets) = '' THEN
      code := 'liens_interets'; message := 'Déclaration de liens d''intérêts manquante (écrire « Aucun » s''il n''y en a pas).'; RETURN NEXT;
    END IF;
    IF _c.genre = 'compte_rendu' AND (btrim(_c.evenement) = '' OR _c.evenement_le IS NULL) THEN
      code := 'evenement'; message := 'Compte rendu : nom et date de l''événement attendus.'; RETURN NEXT;
    END IF;
    IF btrim(_c.niveau_preuve) <> '' AND NOT _c.niveau_preuve IN (
         SELECT jsonb_array_elements_text(coalesce(r -> 'niveaux_preuve', '[]'::jsonb))) THEN
      code := 'niveau_preuve'; message := format('Niveau de preuve inconnu : %s.', _c.niveau_preuve); RETURN NEXT;
    END IF;
  END IF;
  appels := ARRAY(SELECT DISTINCT (m[1])::integer
                  FROM regexp_matches(regexp_replace(_c.corps, '[[][^]]*[]][(]', '(', 'g'), '[[]([0-9]{1,3})[]]', 'g') m);
  manquants := ARRAY(SELECT a FROM unnest(appels) a
                     WHERE NOT EXISTS (SELECT 1 FROM public.references_contenu x WHERE x.contenu_id = _c.id AND x.rang = a)
                     ORDER BY a);
  IF cardinality(manquants) > 0 THEN
    code := 'references'; message := format('Appels sans référence : %s.', array_to_string(ARRAY(SELECT '[' || a || ']' FROM unnest(manquants) a), ', ')); RETURN NEXT;
  END IF;
  trouves := public.termes_interdits_trouves(public.texte_contenu_public(_c));
  IF cardinality(trouves) > 0 THEN
    code := 'termes'; message := format('Termes interdits repérés : %s.', array_to_string(trouves, ', ')); RETURN NEXT;
  END IF;
END;
$$;

-- 2. Version -------------------------------------------------------------------------------------
INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.15.3', 'correctif', '2026-11-06',
  'Bibliographie : deux appels collés « [1][2] » comptent tous les deux.',
  'manques_contenu : le manque references lisait les appels en consommant le caractère suivant, et ne voyait pas [2] dans « [1][2] ». Les liens [texte](adresse) sont retirés avant de compter les appels, comme appelsDuTexte de bibliographie.ts. Remontée d''une installation.',
  '20261106120000_v1_15_3_appels_colles')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.15.3', 'publie_le', '2026-11-06',
  'migration_reference', '20261106120000_v1_15_3_appels_colles'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.15.3', '.')::int[];
