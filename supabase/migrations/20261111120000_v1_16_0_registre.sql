-- Socle 1.16.0 — registre de l'application. Une ligne par élément construit (module, tâche
-- planifiée, script, automatisme, adresse publique, compte technique…) : à quoi il sert, qui s'en
-- sert, son état, la date à laquelle le revoir, la décision qui le justifie. Six mois plus tard, on
-- sait encore ce qu'un élément fait, fera ou devait faire, et jusqu'à quand.
-- Garde-fou : registre_manquants() liste les modules (module_defaults), les tâches planifiées
-- (cron.job) et les éléments d'une installation (greffe_registre_attendus, facultative) qui n'ont
-- pas leur ligne ; le test de base exige une liste vide après les migrations. Les scripts du dépôt
-- se contrôlent côté code (tests/unit/registre.test.ts) : chaque entrée de scripts/ a son appel
-- registre_inscrire dans le SQL versionné.
-- Listes, tri et contrôles purs : src/lib/registre.ts (copie exacte dans les installations).
-- Rejouable sans danger. Écrit pour l'éditeur SQL de Lovable : ni antislash ni point
-- d'interrogation, aucune ligne vide dans une instruction.

-- 1. Table ---------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.registre (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  identifiant text NOT NULL,
  usage text NOT NULL,
  utilisateur text NOT NULL,
  etat text NOT NULL DEFAULT 'a_confirmer',
  a_revoir_le date,
  decision text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid DEFAULT auth.uid(),
  CONSTRAINT registre_element_unique UNIQUE (type, identifiant),
  CONSTRAINT registre_type_check CHECK (type IN ('module', 'cle', 'tache', 'script', 'automatisme',
    'compte', 'adresse', 'integration', 'export', 'autre')),
  CONSTRAINT registre_etat_check CHECK (etat IN ('en_service', 'en_construction', 'prevu', 'en_pause',
    'a_confirmer', 'abandonne')),
  CONSTRAINT registre_fiche_check CHECK (btrim(identifiant) <> '' AND btrim(usage) <> ''
    AND btrim(utilisateur) <> ''),
  CONSTRAINT registre_date_check CHECK (etat = 'abandonne' OR a_revoir_le IS NOT NULL)
);
COMMENT ON TABLE public.registre IS
  'Registre de l''application (socle 1.16.0) : quoi, qui, jusqu''à quand. Les fiches de décision disent le pourquoi.';
COMMENT ON COLUMN public.registre.usage IS 'À quoi sert l''élément, ce qu''il fait ou devait faire.';
COMMENT ON COLUMN public.registre.utilisateur IS 'Qui s''en sert : public, rôle, script, outil, session.';
COMMENT ON COLUMN public.registre.a_revoir_le IS 'Date à laquelle revoir l''élément ; obligatoire sauf abandonné.';
COMMENT ON COLUMN public.registre.decision IS 'Fiche de décision ou document qui le justifie.';
DROP TRIGGER IF EXISTS registre_updated_at ON public.registre;
CREATE TRIGGER registre_updated_at BEFORE UPDATE ON public.registre
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.registre ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.registre FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registre TO authenticated;
GRANT ALL ON public.registre TO service_role;
DROP POLICY IF EXISTS "Registre : administrateurs" ON public.registre;
CREATE POLICY "Registre : administrateurs" ON public.registre FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Inscription par le SQL versionné (n'écrase jamais une ligne existante) --------------------
CREATE OR REPLACE FUNCTION public.registre_inscrire(_type text, _identifiant text, _usage text,
  _utilisateur text, _etat text, _a_revoir_le date, _decision text DEFAULT NULL)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.registre (type, identifiant, usage, utilisateur, etat, a_revoir_le, decision)
  VALUES (_type, _identifiant, _usage, _utilisateur, _etat, _a_revoir_le, _decision)
  ON CONFLICT (type, identifiant) DO NOTHING
$$;
REVOKE ALL ON FUNCTION public.registre_inscrire(text, text, text, text, text, date, text)
  FROM PUBLIC, anon, authenticated;

-- 3. Éléments attendus et éléments hors registre ------------------------------------------------
CREATE OR REPLACE FUNCTION public.registre_attendus()
RETURNS TABLE (type text, identifiant text) LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Réservé aux administrateurs.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT 'module'::text, k::text FROM jsonb_object_keys(public.module_defaults()) AS k;
  IF to_regclass('cron.job') IS NOT NULL THEN
    RETURN QUERY EXECUTE 'SELECT ''tache''::text, jobname::text FROM cron.job WHERE jobname IS NOT NULL';
  END IF;
  IF to_regprocedure('public.greffe_registre_attendus()') IS NOT NULL THEN
    RETURN QUERY EXECUTE 'SELECT g.type::text, g.identifiant::text FROM public.greffe_registre_attendus() AS g';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.registre_attendus() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registre_attendus() TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.registre_manquants()
RETURNS TABLE (type text, identifiant text) LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT DISTINCT a.type, a.identifiant FROM public.registre_attendus() AS a
  WHERE NOT EXISTS (SELECT 1 FROM public.registre r WHERE r.type = a.type AND r.identifiant = a.identifiant)
  ORDER BY 1, 2
$$;
REVOKE ALL ON FUNCTION public.registre_manquants() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registre_manquants() TO authenticated, service_role;

-- 4. Éléments du socle --------------------------------------------------------------------------
-- Modules : état lu dans le réglage « modules » (allumé : en service ; éteint : en pause).
SELECT public.registre_inscrire('module', m.cle, m.usage,
  CASE WHEN m.outil THEN 'Administrateurs' ELSE 'Visiteurs et membres, quand un administrateur l''allume (Admin, Modules)' END,
  CASE WHEN coalesce((s.value ->> m.cle)::boolean, m.outil) THEN 'en_service' ELSE 'en_pause' END,
  CURRENT_DATE + 182, 'Socle CDS, src/config/modules.ts')
FROM (VALUES
  ('blog', 'Blog, commentaires, flux RSS.', false),
  ('faq', 'Foire aux questions.', false),
  ('contact', 'Formulaire de contact et boîte de réception.', false),
  ('newsletter', 'Lettre d''information : inscriptions et abonnés.', false),
  ('forum', 'Forum de discussion.', false),
  ('members', 'Annuaire des membres et profils publics.', false),
  ('messaging', 'Messagerie privée entre membres.', false),
  ('testimonials', 'Témoignages.', false),
  ('reviews', 'Avis notés.', false),
  ('pricing', 'Page des tarifs.', false),
  ('onboarding', 'Parcours « Démarrer ».', false),
  ('directory', 'Annuaire métier.', false),
  ('geo', 'Géographie : régions, départements, intercommunalités, communes.', false),
  ('crm', 'Suivi de contacts (CRM).', false),
  ('lms', 'Formations en ligne.', false),
  ('marketplace', 'Petites annonces.', false),
  ('adNetwork', 'Régie publicitaire.', false),
  ('studio', 'Outil d''administration : pilotage, conformité, MCP. Toujours allumé.', true),
  ('showcase', 'Composants et guide de l''interface.', false),
  ('media', 'Outil d''administration : médiathèque, envoi d''images et de fichiers. Toujours allumé.', true),
  ('pages', 'Pages libres par sections, dont l''accueil.', false),
  ('payments', 'Paiement en ligne (Stripe) des formations.', false),
  ('reports', 'Signalements de contenus.', false),
  ('search', 'Outil d''administration : recherche globale. Toujours allumé.', true),
  ('shop', 'Boutique : objets, PDF, livres numériques.', false)
) AS m (cle, usage, outil)
LEFT JOIN public.site_settings s ON s.key = 'modules';
-- Tâches planifiées (pg_cron), inscrites même si la plateforme n'a pas pg_cron.
SELECT public.registre_inscrire('tache', 'cds_purge_contact_messages',
  'Chaque nuit à 3 h 17 : efface les messages de contact 3 ans après le dernier échange (politique de confidentialité).',
  'pg_cron, sans session ; un administrateur peut lancer la purge depuis la boîte de réception',
  'en_service', CURRENT_DATE + 182, 'Socle 1.0, politique de confidentialité');
SELECT public.registre_inscrire('tache', 'cds_purge_report_contacts',
  'Chaque nuit à 3 h 27 : efface l''adresse e-mail d''un signalement 3 mois après son traitement, 12 mois après son envoi s''il n''est jamais traité.',
  'pg_cron, sans session',
  'en_service', CURRENT_DATE + 182, 'Socle 1.7.0, politique de confidentialité');
-- Scripts du dépôt (contrôle : tests/unit/registre.test.ts).
SELECT public.registre_inscrire('script', 'scripts/charte-apres-pull.sh',
  'Après un git pull : contrôle la charte de style sur ce que le pull a ramené. Signale, ne bloque pas.',
  'Hooks git post-merge et post-rewrite du poste', 'en_service', CURRENT_DATE + 182, 'docs/CHARTE_STYLE_CDS.md');
SELECT public.registre_inscrire('script', 'scripts/cliquet-charte.mjs',
  'Cliquet de la charte : texte gris, opacité, listes sans carte, couleurs en dur ne montent dans aucun fichier.',
  'Hook pre-commit et npm run verifier', 'en_service', CURRENT_DATE + 182, 'docs/CHARTE_STYLE_CDS.md (verrou B)');
SELECT public.registre_inscrire('script', 'scripts/jetons.mjs',
  'Fabrique le bloc :root et les couleurs Tailwind de src/styles.css depuis tokens/*.tokens.json.',
  'npm run jetons, à la main ; npm run verifier pour le contrôle', 'en_service', CURRENT_DATE + 182, 'docs/CHARTE_STYLE_CDS.md (verrou A)');
SELECT public.registre_inscrire('script', 'scripts/mutations-charte.sh',
  'Test par mutation des garde-fous de la charte : plante une faute à la fois, chacune doit être refusée.',
  'Agent ou développeur, à la main, après un changement des garde-fous', 'en_service', CURRENT_DATE + 182, 'docs/audits/2026-10-28-charte.md');
SELECT public.registre_inscrire('script', 'scripts/recette-locale.ps1',
  'Recette du site dans trois navigateurs sur le poste, sans quota GitHub Actions. Lecture seule.',
  'Propriétaire du dépôt, sur son poste Windows', 'en_service', CURRENT_DATE + 182, 'CLAUDE.md, sobriété GitHub Actions');
SELECT public.registre_inscrire('script', 'scripts/verifier-contrastes.mjs',
  'Contrôle les contrastes AA des paires de couleurs de la charte.',
  'Hook pre-commit et npm run verifier', 'en_service', CURRENT_DATE + 182, 'CDS_TOKENS.md');
SELECT public.registre_inscrire('script', 'scripts/verifier-couleurs.mjs',
  'Refuse dans src/ toute variante dark: et toute couleur de la palette Tailwind écrite en dur.',
  'Hook pre-commit et npm run verifier', 'en_service', CURRENT_DATE + 182, 'docs/CHARTE_STYLE_CDS.md');
-- Automatismes (hooks git, actions GitHub).
SELECT public.registre_inscrire('automatisme', '.githooks/pre-commit',
  'Avant chaque commit : charte, lint des fichiers du commit, types. Refuse et dit pourquoi.',
  'Chaque poste (git config core.hooksPath .githooks) et chaque session Claude Code', 'en_service', CURRENT_DATE + 182, 'AGENTS.md, charte de style');
SELECT public.registre_inscrire('automatisme', '.githooks/post-merge',
  'Après un git pull : lance scripts/charte-apres-pull.sh.', 'Chaque poste', 'en_service', CURRENT_DATE + 182, 'AGENTS.md, charte de style');
SELECT public.registre_inscrire('automatisme', '.githooks/post-rewrite',
  'Après un git pull --rebase : même rôle que post-merge.', 'Chaque poste', 'en_service', CURRENT_DATE + 182, 'AGENTS.md, charte de style');
SELECT public.registre_inscrire('automatisme', '.github/workflows/qualite.yml',
  'Contrôles de chaque demande de fusion : types, style, tests, base, build ; recettes navigateur hors brouillon.',
  'GitHub Actions, à chaque demande de fusion et sur main', 'en_service', CURRENT_DATE + 182, 'CLAUDE.md, sobriété GitHub Actions');
SELECT public.registre_inscrire('automatisme', '.github/workflows/recette-publique.yml',
  'Recette du site public. Ne tourne plus le lundi, seulement à la main.',
  'GitHub Actions, déclenchement manuel', 'en_service', CURRENT_DATE + 182, 'CLAUDE.md, sobriété GitHub Actions');
-- Adresses publiques.
SELECT public.registre_inscrire('adresse', '/api/cron/purge-contact',
  'Lance la purge des messages de contact, pour une plateforme qui planifie par appel web.',
  'Tâches planifiées de la plateforme', 'en_service', CURRENT_DATE + 182, 'Socle 1.0, politique de confidentialité');
SELECT public.registre_inscrire('adresse', '/api/stripe-webhook',
  'Reçoit les événements de paiement de Stripe ; signature vérifiée avant tout traitement.',
  'Stripe, quand le module Paiement est allumé', 'en_service', CURRENT_DATE + 182, 'Module payments');
SELECT public.registre_inscrire('adresse', '/mcp',
  'Serveur MCP de l''application, fabriqué par le greffon Lovable.',
  'Agents connectés par MCP (outils d''administration)', 'en_service', CURRENT_DATE + 182, 'Module studio');

-- 5. Version -------------------------------------------------------------------------------------
INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.16.0', 'brique', '2026-11-11',
  'Registre de l''application : à quoi sert chaque élément, qui s''en sert, jusqu''à quand.',
  'Table registre (type, identifiant, usage, utilisateur, état, date à revoir, décision), réservée aux administrateurs ; écran Admin, Registre, éléments à revoir en tête. registre_manquants() liste les modules et tâches planifiées sans ligne (et ceux d''une installation par greffe_registre_attendus) ; les scripts du dépôt sont contrôlés par un test unitaire. Remontée d''une installation.',
  '20261111120000_v1_16_0_registre')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.16.0', 'publie_le', '2026-11-11',
  'migration_reference', '20261111120000_v1_16_0_registre'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.16.0', '.')::int[];
