INSERT INTO public.socle_installation (version, niveau, installe_le, resume, detail, migration_reference)
VALUES ('1.19.0', 'mise_a_niveau', CURRENT_DATE,
  'Mise à niveau vers le socle 1.19.0.',
  'Signalements : capture d''écran facultative, motif « La page s''affiche mal », pied de page partout avec la version du socle.',
  '20261121120000_v1_19_0_captures_signalements')
ON CONFLICT (version) DO NOTHING;
