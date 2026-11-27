INSERT INTO public.socle_installation (version, niveau, installe_le, resume, detail, migration_reference)
VALUES ('1.22.0', 'mise_a_niveau', CURRENT_DATE,
  'Mise à niveau vers le socle 1.22.0.',
  'Page hors index : une page libre satellite d''une campagne, en ligne pour qui a le lien, hors des moteurs.',
  '20261124120000_v1_22_0_pages_hors_index')
ON CONFLICT (version) DO NOTHING;
