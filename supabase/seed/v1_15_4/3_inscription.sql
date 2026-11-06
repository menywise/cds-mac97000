INSERT INTO public.socle_installation (version, niveau, installe_le, resume, detail, migration_reference)
VALUES ('1.15.4', 'mise_a_niveau', CURRENT_DATE,
  'Mise à niveau vers le socle 1.15.4.',
  'Étiquettes : slug par défaut vide, calculé par la base ; grille DES-1 sur la police du système.',
  '20261107120000_v1_15_4_etiquette_slug')
ON CONFLICT (version) DO NOTHING;
