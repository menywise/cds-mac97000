-- Socle 1.20.0 — radar des installations (docs/RADAR.md). Code seul pour l'essentiel :
-- scripts/radar-socle.mjs lit, compare et propose ; il n'écrit dans aucune base. Cette migration
-- inscrit le script et la tâche hebdomadaire au registre, puis publie la version.
-- Rejouable sans danger. Écrit pour l'éditeur SQL de Lovable : ni antislash ni point d'interrogation.

-- 1. Registre : le script (socle et installations) ----------------------------------------------
SELECT public.registre_inscrire('script', 'scripts/radar-socle.mjs',
  'Radar des installations : versions du code et de la base de chaque installation comparées au socle, ajouts hors greffe, copies exactes à reprendre. Lecture seule, une action proposée par écart.',
  'Session d''agent qui passe le radar (docs/RADAR.md) ; une installation peut se mesurer elle-même', 'en_service', CURRENT_DATE + 182, 'Socle 1.20.0, docs/RADAR.md');

-- 2. Registre : la tâche hebdomadaire (socle seul ; « prévu » jusqu'à sa création) ----------------
SELECT public.registre_inscrire('automatisme', 'radar-installations-hebdomadaire',
  'Chaque semaine : une session neuve recense les installations du socle, les mesure, publie le rapport et notifie le propriétaire seulement s''il y a un écart. Ne corrige rien.',
  'Tâche planifiée du propriétaire du socle, sur la plateforme des sessions d''agent', 'prevu', CURRENT_DATE, 'Socle 1.20.0, docs/RADAR.md');

-- 3. Version -------------------------------------------------------------------------------------
INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.20.0', 'brique', '2026-11-22',
  'Radar des installations : où chaque installation en est par rapport au socle, dans les deux sens.',
  'Code seul : scripts/radar-socle.mjs (lecture seule). Version du code et de la base de chaque installation, versions à porter, base en retard sur le code (réglage « socle », socle_installation, objets témoins de chaque version), ajouts hors greffe, copies exactes à reprendre, remontées ouvertes au registre de synchronisation. Rapport hebdomadaire, une action proposée par écart. Méthode : docs/RADAR.md.',
  '20261122120000_v1_20_0_radar_installations')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.20.0', 'publie_le', '2026-11-22',
  'migration_reference', '20261122120000_v1_20_0_radar_installations'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.20.0', '.')::int[];
