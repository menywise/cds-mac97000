SELECT public.registre_inscrire('module', m.cle, m.usage,
  CASE WHEN m.outil THEN 'Administrateurs' ELSE 'Visiteurs et membres, quand un administrateur l''allume (Admin, Modules)' END,
  CASE WHEN coalesce((s.value ->> m.cle)::boolean, m.outil) THEN 'en_service' ELSE 'en_pause' END,
  CURRENT_DATE + 182, 'Socle CDS, src/config/modules.ts')
FROM (VALUES
  ('blog', 'Blog, commentaires, flux RSS.', false),
  ('faq', 'Foire aux questions.', false),
  ('contact', 'Formulaire de contact et boîte de réception.', false),
  ('newsletter', 'Lettre d''information : inscriptions et abonnés.', false),
  ('forum', 'Forum de discussion.', false),
  ('members', 'Annuaire des membres et profils publics.', false),
  ('messaging', 'Messagerie privée entre membres.', false),
  ('testimonials', 'Témoignages.', false),
  ('reviews', 'Avis notés.', false),
  ('pricing', 'Page des tarifs.', false),
  ('onboarding', 'Parcours « Démarrer ».', false),
  ('directory', 'Annuaire métier.', false),
  ('geo', 'Géographie : régions, départements, intercommunalités, communes.', false),
  ('crm', 'Suivi de contacts (CRM).', false),
  ('lms', 'Formations en ligne.', false),
  ('marketplace', 'Petites annonces.', false),
  ('adNetwork', 'Régie publicitaire.', false),
  ('studio', 'Outil d''administration : pilotage, conformité, MCP. Toujours allumé.', true),
  ('showcase', 'Composants et guide de l''interface.', false),
  ('media', 'Outil d''administration : médiathèque, envoi d''images et de fichiers. Toujours allumé.', true),
  ('pages', 'Pages libres par sections, dont l''accueil.', false),
  ('payments', 'Paiement en ligne (Stripe) des formations.', false),
  ('reports', 'Signalements de contenus.', false),
  ('search', 'Outil d''administration : recherche globale. Toujours allumé.', true),
  ('shop', 'Boutique : objets, PDF, livres numériques.', false)
) AS m (cle, usage, outil)
LEFT JOIN public.site_settings s ON s.key = 'modules';
SELECT public.registre_inscrire('tache', 'cds_purge_contact_messages',
  'Chaque nuit à 3 h 17 : efface les messages de contact 3 ans après le dernier échange (politique de confidentialité).',
  'pg_cron, sans session ; un administrateur peut lancer la purge depuis la boîte de réception',
  'en_service', CURRENT_DATE + 182, 'Socle 1.0, politique de confidentialité');
SELECT public.registre_inscrire('tache', 'cds_purge_report_contacts',
  'Chaque nuit à 3 h 27 : efface l''adresse e-mail d''un signalement 3 mois après son traitement, 12 mois après son envoi s''il n''est jamais traité.',
  'pg_cron, sans session',
  'en_service', CURRENT_DATE + 182, 'Socle 1.7.0, politique de confidentialité');
SELECT public.registre_inscrire('script', 'scripts/charte-apres-pull.sh',
  'Après un git pull : contrôle la charte de style sur ce que le pull a ramené. Signale, ne bloque pas.',
  'Hooks git post-merge et post-rewrite du poste', 'en_service', CURRENT_DATE + 182, 'docs/CHARTE_STYLE_CDS.md');
SELECT public.registre_inscrire('script', 'scripts/cliquet-charte.mjs',
  'Cliquet de la charte : texte gris, opacité, listes sans carte, couleurs en dur ne montent dans aucun fichier.',
  'Hook pre-commit et npm run verifier', 'en_service', CURRENT_DATE + 182, 'docs/CHARTE_STYLE_CDS.md (verrou B)');
SELECT public.registre_inscrire('script', 'scripts/jetons.mjs',
  'Fabrique le bloc :root et les couleurs Tailwind de src/styles.css depuis tokens/*.tokens.json.',
  'npm run jetons, à la main ; npm run verifier pour le contrôle', 'en_service', CURRENT_DATE + 182, 'docs/CHARTE_STYLE_CDS.md (verrou A)');
SELECT public.registre_inscrire('script', 'scripts/mutations-charte.sh',
  'Test par mutation des garde-fous de la charte : plante une faute à la fois, chacune doit être refusée.',
  'Agent ou développeur, à la main, après un changement des garde-fous', 'en_service', CURRENT_DATE + 182, 'docs/audits/2026-10-28-charte.md');
SELECT public.registre_inscrire('script', 'scripts/recette-locale.ps1',
  'Recette du site dans trois navigateurs sur le poste, sans quota GitHub Actions. Lecture seule.',
  'Propriétaire du dépôt, sur son poste Windows', 'en_service', CURRENT_DATE + 182, 'CLAUDE.md, sobriété GitHub Actions');
SELECT public.registre_inscrire('script', 'scripts/verifier-contrastes.mjs',
  'Contrôle les contrastes AA des paires de couleurs de la charte.',
  'Hook pre-commit et npm run verifier', 'en_service', CURRENT_DATE + 182, 'CDS_TOKENS.md');
SELECT public.registre_inscrire('script', 'scripts/verifier-couleurs.mjs',
  'Refuse dans src/ toute variante dark: et toute couleur de la palette Tailwind écrite en dur.',
  'Hook pre-commit et npm run verifier', 'en_service', CURRENT_DATE + 182, 'docs/CHARTE_STYLE_CDS.md');
SELECT public.registre_inscrire('automatisme', '.githooks/pre-commit',
  'Avant chaque commit : charte, lint des fichiers du commit, types. Refuse et dit pourquoi.',
  'Chaque poste (git config core.hooksPath .githooks) et chaque session Claude Code', 'en_service', CURRENT_DATE + 182, 'AGENTS.md, charte de style');
SELECT public.registre_inscrire('automatisme', '.githooks/post-merge',
  'Après un git pull : lance scripts/charte-apres-pull.sh.', 'Chaque poste', 'en_service', CURRENT_DATE + 182, 'AGENTS.md, charte de style');
SELECT public.registre_inscrire('automatisme', '.githooks/post-rewrite',
  'Après un git pull --rebase : même rôle que post-merge.', 'Chaque poste', 'en_service', CURRENT_DATE + 182, 'AGENTS.md, charte de style');
SELECT public.registre_inscrire('automatisme', '.github/workflows/qualite.yml',
  'Contrôles de chaque demande de fusion : types, style, tests, base, build ; recettes navigateur hors brouillon.',
  'GitHub Actions, à chaque demande de fusion et sur main', 'en_service', CURRENT_DATE + 182, 'CLAUDE.md, sobriété GitHub Actions');
SELECT public.registre_inscrire('automatisme', '.github/workflows/recette-publique.yml',
  'Recette du site public. Ne tourne plus le lundi, seulement à la main.',
  'GitHub Actions, déclenchement manuel', 'en_service', CURRENT_DATE + 182, 'CLAUDE.md, sobriété GitHub Actions');
SELECT public.registre_inscrire('adresse', '/api/cron/purge-contact',
  'Lance la purge des messages de contact, pour une plateforme qui planifie par appel web.',
  'Tâches planifiées de la plateforme', 'en_service', CURRENT_DATE + 182, 'Socle 1.0, politique de confidentialité');
SELECT public.registre_inscrire('adresse', '/api/stripe-webhook',
  'Reçoit les événements de paiement de Stripe ; signature vérifiée avant tout traitement.',
  'Stripe, quand le module Paiement est allumé', 'en_service', CURRENT_DATE + 182, 'Module payments');
SELECT public.registre_inscrire('adresse', '/mcp',
  'Serveur MCP de l''application, fabriqué par le greffon Lovable.',
  'Agents connectés par MCP (outils d''administration)', 'en_service', CURRENT_DATE + 182, 'Module studio');
