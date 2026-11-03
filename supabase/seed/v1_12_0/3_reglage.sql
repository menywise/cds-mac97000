CREATE OR REPLACE FUNCTION public.editorial_defaults()
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT jsonb_build_object(
    'circuit', 'complet',
    'delai_relecture_mois', 12,
    'exiger_sources', true,
    'exiger_relecture', true,
    'exiger_auteur', true,
    'longueurs_seo', true,
    'auteur_mode', 'fonction',
    'avertissement', '',
    'seuil_etiquette', 3,
    'type_page', 'WebPage')
$$;
