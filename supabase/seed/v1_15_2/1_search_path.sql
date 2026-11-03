ALTER FUNCTION public.search_tags(text[]) SET search_path = public;
ALTER FUNCTION public.search_excerpt(text) SET search_path = public;
ALTER FUNCTION public.geo_distance_km(double precision, double precision, double precision, double precision)
  SET search_path = public;
