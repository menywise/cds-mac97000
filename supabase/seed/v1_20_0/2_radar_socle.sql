SELECT public.registre_inscrire('automatisme', 'radar-installations-hebdomadaire',
  'Chaque semaine : une session neuve recense les installations du socle, les mesure, publie le rapport et notifie le propriétaire seulement s''il y a un écart. Ne corrige rien.',
  'Tâche planifiée du propriétaire du socle, sur la plateforme des sessions d''agent', 'prevu', CURRENT_DATE, 'Socle 1.20.0, docs/RADAR.md');
