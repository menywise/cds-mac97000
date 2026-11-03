INSERT INTO public.socle_installation (version, niveau, installe_le, resume, detail, migration_reference)
VALUES ('1.12.0', 'mise_a_niveau', CURRENT_DATE,
  'Mise à niveau vers le socle 1.12.0.',
  'Référencement technique des articles : texte structuré, données structurées, flux, liens de sources.',
  '20261103180000_v1_12_0_seo_technique')
ON CONFLICT (version) DO NOTHING;
