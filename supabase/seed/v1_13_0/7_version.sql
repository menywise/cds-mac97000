INSERT INTO public.template_checks (code, area, label, requirement, status, severity, evidence, position, modules)
SELECT 'V1-RECHERCHE-ARTICLES', 'Contenus', 'Recherche avancée dans les articles',
  'Début de mot, phrase exacte, mot exclu, alternative, synonymes ; filtres et facettes (rubrique, étiquette, série, année) ; extrait surligné ; suggestion de mot proche ; visiteur limité aux articles en ligne ; recherches sans résultat notées sans compte ni adresse.',
  'conforme', 'mineur', 'tests/db/test_34',
  coalesce((SELECT max(position) FROM public.template_checks), 0) + 1, ARRAY['blog']
ON CONFLICT (code) DO NOTHING;
INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.13.0', 'brique', '2026-11-03',
  'Recherche avancée dans les articles : opérateurs, synonymes, facettes, extraits, suggestions, recherches sans résultat.',
  'pg_trgm ; table synonymes ; requete_articles ; recherche_articles (filtres, pagination, extrait surligné, pondération) ; recherche_articles_facettes ; suggestion_recherche ; table recherches_sans_resultat (anonyme, 1 000 termes au plus).',
  '20261103200000_v1_13_0_recherche')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.13.0', 'publie_le', '2026-11-03',
  'migration_reference', '20261103200000_v1_13_0_recherche'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.13.0', '.')::int[];
