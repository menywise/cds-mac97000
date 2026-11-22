ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_reason_check;
ALTER TABLE public.reports ADD CONSTRAINT reports_reason_check CHECK (reason IN (
  'spam', 'contenu_inapproprie', 'harcelement', 'fraude', 'information_erronee', 'doublon',
  'droit_auteur', 'contenu_illegal', 'oubli', 'correction', 'affichage', 'autre'));
