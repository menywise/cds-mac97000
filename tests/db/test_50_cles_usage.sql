-- Socle 1.21.0 : clé d'usage. Preuves, chacune avec sa contre-épreuve :
--   1. une clé de niveau « usage » porte le nom de son usage, au bon format ; une clé de l'échelle
--      n'en porte pas ; un niveau inconnu reste refusé ;
--   2. agent_identifier rend la clé et son usage, rien pour une clé coupée ou expirée, et note le
--      dernier usage ; agent_authentifier (ancienne entrée) refuse une clé d'usage mais sert encore
--      une clé de l'échelle ;
--   3. agent_identifier n'est pas appelable par un membre ni un visiteur.
\set ON_ERROR_STOP 1
\i tests/db/_helpers.sql
BEGIN;
-- 1. Forme d'une clé d'usage.
INSERT INTO public.agent_cles (nom, cle_hash, niveau, usage_code, usage, utilisateur, expire_le)
VALUES ('Script du poste', 'u1', 'usage', 'recette', 'Essai du test 50.', 'Test de base', CURRENT_DATE);
INSERT INTO public.agent_cles (nom, cle_hash, niveau, usage, utilisateur, expire_le)
VALUES ('Session échelle', 'u2', 'completer', 'Essai du test 50.', 'Test de base', CURRENT_DATE);
SELECT pg_temp.expect_error($$INSERT INTO public.agent_cles (nom, cle_hash, niveau, usage, utilisateur, expire_le)
  VALUES ('Usage sans nom', 'u3', 'usage', 'Essai.', 'Test', CURRENT_DATE)$$, 'clé d''usage sans usage');
SELECT pg_temp.expect_error($$INSERT INTO public.agent_cles (nom, cle_hash, niveau, usage_code, usage, utilisateur, expire_le)
  VALUES ('Usage mal nommé', 'u4', 'usage', 'Recette-Poste', 'Essai.', 'Test', CURRENT_DATE)$$, 'nom d''usage hors format');
SELECT pg_temp.expect_error($$INSERT INTO public.agent_cles (nom, cle_hash, niveau, usage_code, usage, utilisateur, expire_le)
  VALUES ('Échelle avec usage', 'u5', 'corriger', 'recette', 'Essai.', 'Test', CURRENT_DATE)$$, 'clé de l''échelle avec un usage');
SELECT pg_temp.expect_error($$INSERT INTO public.agent_cles (nom, cle_hash, niveau, usage, utilisateur, expire_le)
  VALUES ('Niveau inconnu', 'u6', 'recette', 'Essai.', 'Test', CURRENT_DATE)$$, 'niveau inconnu');
-- 2. Identifier : la clé et son usage ; l'ancienne entrée refuse une clé d'usage.
DO $$
DECLARE _r record;
BEGIN
  SELECT * INTO _r FROM public.agent_identifier('u1');
  IF _r.nom IS DISTINCT FROM 'Script du poste' OR _r.niveau <> 'usage' OR _r.usage_code <> 'recette' THEN
    RAISE EXCEPTION 'agent_identifier doit rendre la clé d''usage et son usage : %', _r;
  END IF;
  IF (SELECT last_used_at FROM public.agent_cles WHERE nom = 'Script du poste') IS NULL THEN
    RAISE EXCEPTION 'agent_identifier doit noter le dernier usage';
  END IF;
  SELECT * INTO _r FROM public.agent_identifier('u2');
  IF _r.niveau IS DISTINCT FROM 'completer' OR _r.usage_code IS NOT NULL THEN
    RAISE EXCEPTION 'Une clé de l''échelle sort sans usage : %', _r;
  END IF;
  IF EXISTS (SELECT 1 FROM public.agent_authentifier('u1')) THEN
    RAISE EXCEPTION 'L''ancienne entrée ne doit pas servir une clé d''usage';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.agent_authentifier('u2')) THEN
    RAISE EXCEPTION 'L''ancienne entrée doit encore servir une clé de l''échelle';
  END IF;
  UPDATE public.agent_cles SET actif = false WHERE nom = 'Script du poste';
  IF EXISTS (SELECT 1 FROM public.agent_identifier('u1')) THEN
    RAISE EXCEPTION 'Une clé d''usage coupée ne doit pas être identifiée';
  END IF;
  UPDATE public.agent_cles SET actif = true, expire_le = CURRENT_DATE - 2 WHERE nom = 'Script du poste';
  IF EXISTS (SELECT 1 FROM public.agent_identifier('u1')) THEN
    RAISE EXCEPTION 'Une clé d''usage expirée ne doit pas être identifiée';
  END IF;
  IF EXISTS (SELECT 1 FROM public.agent_identifier('inconnue')) THEN
    RAISE EXCEPTION 'Une clé inconnue ne doit pas être identifiée';
  END IF;
END $$;
-- 3. Réservée au serveur.
DO $$ BEGIN
  IF has_function_privilege('authenticated', 'public.agent_identifier(text)', 'execute')
    OR has_function_privilege('anon', 'public.agent_identifier(text)', 'execute') THEN
    RAISE EXCEPTION 'agent_identifier ne doit pas être appelable par un membre ou un visiteur';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.agent_identifier(text)', 'execute') THEN
    RAISE EXCEPTION 'agent_identifier doit être appelable par le serveur';
  END IF;
END $$;
ROLLBACK;
