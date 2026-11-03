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
