-- Socle 1.23.0 — redirection de toute adresse. Une installation qui remplace un ancien site garde
-- ses anciennes adresses : liens envoyés par e-mail, positions dans les moteurs de recherche. Jusqu'ici
-- la table redirections ne servait qu'aux articles renommés (/blog/...), lisible seulement module
-- blog allumé, et refusait les fichiers (.pdf, majuscules). Désormais toute adresse inconnue du site
-- consulte redirection_pour() avant la page introuvable : une adresse à la fois, avec ou sans barre
-- oblique finale, quel que soit le module blog. La table reste fermée à la lecture en masse. La
-- destination peut être une adresse complète en https (fichier déplacé dans la médiathèque). Née d'un
-- besoin du deuxième clone (reprise d'un ancien site WordPress). Rejouable sans danger. Écrit pour
-- l'éditeur SQL de Lovable : ni antislash ni point d'interrogation, aucune ligne vide dans une
-- instruction.

-- 1. Adresses acceptées : fichiers d'un ancien site, destination complète en https. La contrainte de
--    « vers » créée en 1.11.0 porte le nom redirections_check (elle lit aussi « de »).
ALTER TABLE public.redirections DROP CONSTRAINT IF EXISTS redirections_de_check;
ALTER TABLE public.redirections ADD CONSTRAINT redirections_de_check
  CHECK (de ~ '^/[A-Za-z0-9/._~%-]*$' AND char_length(de) <= 300);
ALTER TABLE public.redirections DROP CONSTRAINT IF EXISTS redirections_check;
ALTER TABLE public.redirections DROP CONSTRAINT IF EXISTS redirections_vers_check;
ALTER TABLE public.redirections ADD CONSTRAINT redirections_vers_check
  CHECK ((vers ~ '^/[A-Za-z0-9/._~%-]*$' OR vers ~ '^https://[^ ]+$') AND char_length(vers) <= 500 AND vers <> de);
COMMENT ON TABLE public.redirections IS
  'Anciennes adresses du site et leur nouvelle adresse (redirection permanente). Lue une adresse à la fois par redirection_pour().';

-- 2. Une adresse à la fois, pour tous les visiteurs ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.redirection_pour(_chemin text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.vers FROM public.redirections r
  WHERE char_length(_chemin) <= 300
    AND r.de IN (_chemin, rtrim(_chemin, '/'), rtrim(_chemin, '/') || '/')
  ORDER BY (r.de = _chemin) DESC
  LIMIT 1;
$$;
COMMENT ON FUNCTION public.redirection_pour(text) IS
  'Nouvelle adresse d''une ancienne adresse du site (avec ou sans barre oblique finale), ou rien. Une adresse à la fois : la table n''est pas lisible en masse.';
REVOKE ALL ON FUNCTION public.redirection_pour(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redirection_pour(text) TO anon, authenticated, service_role;

-- 3. Version -------------------------------------------------------------------------------------
INSERT INTO public.socle_versions (version, niveau, publie_le, resume, detail, migration_reference)
VALUES ('1.23.0', 'brique', '2026-11-27',
  'Redirection de toute adresse : un ancien site garde ses anciennes adresses, fichiers compris.',
  'Toute adresse inconnue du site consulte redirection_pour() avant la page introuvable et répond par une redirection permanente. La table redirections accepte les fichiers (point, majuscules, tiret bas) et une destination complète en https ; elle reste fermée à la lecture en masse. Import en masse par Admin, Tables (CSV). Remontée du deuxième clone.',
  '20261125120000_v1_23_0_redirections_toute_adresse')
ON CONFLICT (version) DO NOTHING;
INSERT INTO public.site_settings (key, value)
VALUES ('socle', jsonb_build_object('version', '1.23.0', 'publie_le', '2026-11-27',
  'migration_reference', '20261125120000_v1_23_0_redirections_toute_adresse'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
WHERE string_to_array(coalesce(public.site_settings.value ->> 'version', '0.0.0'), '.')::int[]
      < string_to_array('1.23.0', '.')::int[];
