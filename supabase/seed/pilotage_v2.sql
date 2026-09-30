-- CDS — Plan directeur et feuille de route v2 (30/09/2026), affichés dans l'écran Pilotage.
-- À exécuter à la main dans l'éditeur SQL. Rejouable : remplace seulement les sections et les
-- lignes qu'il crée (repérées par leur titre), et retire les lignes initiales du 17/09.

-- 1. Plan directeur -----------------------------------------------------------------------------
DELETE FROM public.masterplan_sections WHERE title IN (
  'Vision', 'Pour qui', 'Promesse', 'Modules activés',
  'Principes', 'Architecture', 'Qualité', 'Premier projet', 'En attente');
INSERT INTO public.masterplan_sections (title, content, position) VALUES
  ('Vision', 'Le socle commun des projets propres du studio de création d''entreprises. Chaque nouveau projet part de fondations auditées, d''une recette automatique et de modules que l''on allume un à un. Chaque projet doit pouvoir être monétisé ou revendu.', 1),
  ('Pour qui', 'Le studio (Manu, AC), qui lance et exploite les projets. Leurs visiteurs : indépendants, artisans, solopreneurs (personas de contrôle Karim, Nadia, Pascal).', 2),
  ('Promesse', 'Un site qui ne casse pas : zéro page blanche, zéro erreur console, règles d''accès testées en base, textes conformes à la charte de rédaction, pages légales remplies depuis l''administration.', 3),
  ('Principes', 'L''existant d''abord, un module à la fois. SQL d''abord, test d''abord, migrations rejouables. Zéro valeur en dur. Licence libre d''abord (règle d''adoption). Chaque texte passe la charte. Rien en ligne sans robot vert.', 4),
  ('Architecture', 'Un socle et 23 modules à interrupteur, pilotés en base. Briques externes sur Coolify : Ghost (magazine, cohabite avec le blog), Revive (régie, exception GPL accordée), Umami (audience), Shlink (liens courts), Meilisearch (recherche, quand le volume l''exigera).', 5),
  ('Qualité', 'Intégration continue à chaque PR : types, tests unitaires, tests SQL, build, robot de recette (81 pages, visiteur, membre, admin, ordinateur et mobile). Contrôles d''audit r1, r3, p2, s1, s3, l3 et score des textes sur 100. Écran Recette.', 6),
  ('Premier projet', 'Annuaire des sites français (annuaire-mac97000) : dupliqué depuis le socle puis mis en conformité. Il fixe l''ordre des modules : recherche, géographie complète (régions, communes), veille de sites.', 7),
  ('En attente', 'Décision du 29/09 : paiement Stripe (code prêt, éteint ; lot 7 b à exécuter avant activation), e-mails transactionnels (module B), purge planifiée des messages de contact.', 8);

-- 2. Feuille de route ---------------------------------------------------------------------------
DELETE FROM public.roadmap_items WHERE title IN (
  -- lignes initiales du 17/09
  'Forum communautaire', 'Profils et messagerie', 'Témoignages', 'Navigation et mobile',
  'Tableau de bord de pilotage', 'Paiement des offres', 'Envoi e-mail du contact',
  -- lignes de cette version
  'V0 · lots 1 à 7', 'Lot 8 · Qualité premium', 'Lot 9 · Parcours réels', 'Lot 10 · Recherche globale',
  'Lot 11 · Géographie complète', 'Lot 12 · Veille de sites', 'Lot 13 · Duplication : annuaire',
  'Lot 14 · Briques externes', 'Lot 15 · Pages libres v2', 'Modules suivants',
  'Paiement Stripe', 'E-mails transactionnels', 'Purge planifiée');
INSERT INTO public.roadmap_items (title, description, lot, status, priority, position) VALUES
  ('V0 · lots 1 à 7', 'Base, socle, admin complet, failles 12 à 16, médiathèque, pages libres, modération, recette automatisée, paiement (éteint), signalements, purge.', 'Fait', 'fait', 'haute', 1),
  ('Lot 8 · Qualité premium', 'Robot : accessibilité, HTML valide, en-têtes de sécurité, SEO avancé, pages légales remplies, prix cohérents, bouton d''action visible, Firefox et Safari. Réécriture des textes signalés. Comptes de test membre et admin.', 'Lot 8', 'a_faire', 'haute', 2),
  ('Lot 9 · Parcours réels', 'Scénarios cliqués : inscription, contact, forum, signalement, formation gratuite. Décision préalable : données de test marquées ou base de recette séparée.', 'Lot 9', 'a_faire', 'haute', 3),
  ('Lot 10 · Recherche globale', 'Module F : recherche plein texte Postgres sur tous les contenus publics (fiches, articles, forum, formations). Meilisearch plus tard si le volume l''exige.', 'Lot 10', 'a_faire', 'haute', 4),
  ('Lot 11 · Géographie complète', 'Monter le module géographie au niveau de l''annuaire : régions, départements, communes, intercommunalités, codes postaux, coordonnées, voisinages (geo.api.gouv.fr).', 'Lot 11', 'a_faire', 'haute', 5),
  ('Lot 12 · Veille de sites', 'Module propre à l''annuaire : découverte de sites (Firecrawl, clé en secret), détection des technologies, contrôles réguliers d''état.', 'Lot 12', 'a_faire', 'normale', 6),
  ('Lot 13 · Duplication : annuaire', 'Kit de démarrage d''un projet (marque, réglages, modules, nettoyage de la démo), puis annuaire-mac97000 reconstruit sur le socle et ses données reprises.', 'Lot 13', 'a_faire', 'haute', 7),
  ('Lot 14 · Briques externes', 'Umami (mesure d''audience sans cookie), zone Revive dans l''emplacement Régie, Ghost en cohabitation.', 'Lot 14', 'a_faire', 'normale', 8),
  ('Lot 15 · Pages libres v2', 'Éditeur de menu, historique des versions ; Puck plus tard si Lovable accepte la dépendance.', 'Lot 15', 'a_faire', 'normale', 9),
  ('Modules suivants', 'E Notifications (sur le site d''abord), H Événements, I Réalisations, G Rendez-vous : dans l''ordre des besoins des projets.', 'Ensuite', 'a_faire', 'normale', 10),
  ('Paiement Stripe', 'Code prêt et éteint. Avant activation : SQL du lot 7 b, secrets, webhook, parcours test 4242.', 'En attente', 'a_faire', 'normale', 11),
  ('E-mails transactionnels', 'Module B : domaine d''envoi des projets à configurer.', 'En attente', 'a_faire', 'normale', 12),
  ('Purge planifiée', 'pg_cron absent : planifier /api/cron/purge-contact dans les tâches Lovable. En attendant : bouton « Purger maintenant ».', 'En attente', 'a_faire', 'normale', 13);
