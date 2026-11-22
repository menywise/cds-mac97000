SELECT public.registre_inscrire('automatisme', 'radar-installations-hebdomadaire',
  'Chaque semaine : une session neuve recense les installations du socle, les mesure, publie le rapport et notifie le propriétaire seulement s''il y a un écart. Ne corrige rien.',
  'Tâche planifiée du propriétaire du socle (dimanche 19 h 40), sur la plateforme des sessions d''agent', 'en_service', CURRENT_DATE + 182, 'Socle 1.20.0, docs/RADAR.md');
