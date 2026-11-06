ALTER TABLE public.etiquettes ALTER COLUMN slug SET DEFAULT '';
UPDATE public.template_checks
SET label = 'Police du système uniquement',
  requirement = 'Aucune police téléchargée : pile system-ui de la charte 2.0',
  updated_at = now()
WHERE code = 'DES-1' AND label = 'Police Inter uniquement';
