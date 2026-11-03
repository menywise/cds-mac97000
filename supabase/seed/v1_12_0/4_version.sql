INSERT INTO public.template_checks (code, area, label, requirement, status, severity, evidence, position, modules)
SELECT 'V1-SEO-ARTICLES', 'Contenus', 'Référencement technique des articles',
  'Intertitres ancrés et sommaire, données structurées (dates, relecture, auteur, rubrique, étiquettes, série, sources, questions-réponses), balises d''article, plan du site des images, flux RSS par rubrique et par étiquette, état des liens de sources vérifié à la demande.',
  'conforme', 'mineur', 'tests/db/test_33',
  coalesce((SELECT max(position) FROM public.template_checks), 0) + 1, ARRAY['blog']
ON CONFLICT (code) DO NOTHING;
INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.12.0', 'brique', '2026-11-03',
  'Référencement technique des articles : texte structuré, données structurées, flux, liens de sources.',
  'Table liens_sources_etat et enregistrer_liens_sources (droit revérifié par la base) ; sources_a_verifier ; réglage type_page. Côté code : moteur de texte des articles, données structurées, balises d''article, plan du site des images, flux RSS par rubrique et par étiquette.',
  '20261103180000_v1_12_0_seo_technique')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.12.0', 'publie_le', '2026-11-03',
  'migration_reference', '20261103180000_v1_12_0_seo_technique'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.12.0', '.')::int[];
