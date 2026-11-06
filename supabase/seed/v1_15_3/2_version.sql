INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.15.3', 'correctif', '2026-11-06',
  'Bibliographie : deux appels collés « [1][2] » comptent tous les deux.',
  'manques_contenu : le manque references lisait les appels en consommant le caractère suivant, et ne voyait pas [2] dans « [1][2] ». Les liens [texte](adresse) sont retirés avant de compter les appels, comme appelsDuTexte de bibliographie.ts. Remontée d''une installation.',
  '20261106120000_v1_15_3_appels_colles')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.15.3', 'publie_le', '2026-11-06',
  'migration_reference', '20261106120000_v1_15_3_appels_colles'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.15.3', '.')::int[];
