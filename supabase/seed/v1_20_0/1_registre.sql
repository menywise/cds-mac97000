SELECT public.registre_inscrire('script', 'scripts/radar-socle.mjs',
  'Radar des installations : versions du code et de la base de chaque installation comparées au socle, ajouts hors greffe, copies exactes à reprendre. Lecture seule, une action proposée par écart.',
  'Session d''agent qui passe le radar (docs/RADAR.md) ; une installation peut se mesurer elle-même', 'en_service', CURRENT_DATE + 182, 'Socle 1.20.0, docs/RADAR.md');
