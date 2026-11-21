INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.17.0', 'brique', '2026-11-21',
  'Co-intervenant IA : une clé avec sa fiche, un niveau, et la trace de tout ce qu''elle écrit.',
  'Tables agent_cles (fiche obligatoire pour une clé active, empreinte seule, niveau lecture, compléter ou corriger) et agent_journal (qui, action, table, ligne, avant, après), réservées aux administrateurs. agent_authentifier() et agent_journaliser() pour le serveur seul ; entrée /api/agent, actions déclarées par la greffe. La ligne au registre suit la fiche de la clé. Écran Admin, Co-intervenants IA. Remontée du premier clone.',
  '20261119120000_v1_17_0_agents')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.17.0', 'publie_le', '2026-11-21',
  'migration_reference', '20261119120000_v1_17_0_agents'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.17.0', '.')::int[];
