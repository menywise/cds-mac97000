INSERT INTO public.socle_installation (version, niveau, installe_le, resume, detail, migration_reference)
VALUES ('1.8.0', 'mise_a_niveau', CURRENT_DATE,
  'Mise à niveau vers le socle 1.8.0.',
  'Messagerie en direct : messages et accusés de lecture sans recharger la page, non lus dans l''en-tête.',
  '20261018120000_v1_8_0_messagerie_direct')
ON CONFLICT (version) DO NOTHING;
