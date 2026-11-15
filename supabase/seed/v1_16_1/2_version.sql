INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.16.1', 'correctif', '2026-11-15',
  'Lecture durcie sur seize tables : chaque politique dit ce qu''elle laisse lire, plus aucune politique « USING (true) ».',
  'Paramètres du site : clés publiques nommées (prise de greffe greffe_site_settings_publiques), le reste aux administrateurs. Forum, thématiques, catégories de l''annuaire et des annonces, départements, voisinages : lisibles quand leur module est allumé. Rubriques, étiquettes, séries, redirections : module blog allumé, ou rédacteur. J''aime : chacun les siens, l''administrateur tous ; compteurs avec les droits du propriétaire. Synonymes : rédacteurs. Versions du socle et de l''installation : administrateurs. Signalé par le scanner de Lovable (règle LOV.DB.RLS_TAUTOLOGY_PERMISSIVE.V1).',
  '20261115120000_v1_16_1_durcissement_rls')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.16.1', 'publie_le', '2026-11-15',
  'migration_reference', '20261115120000_v1_16_1_durcissement_rls'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.16.1', '.')::int[];
