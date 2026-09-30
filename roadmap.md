# CDS — Feuille de route

## Fait

- Tokens CDS (thème clair uniquement), typographie Inter, rayons et ombres, source de vérité `CDS_TOKENS.md`
- Bibliothèque de composants (`/composants`)
- Comptes réels : inscription, connexion Google et e-mail, vérification, mot de passe oublié
- Espace connecté : tableau de bord, mon compte, mon profil public, messagerie
- Back-office `/admin` : paramètres, contenus, modération, forum, témoignages, pilotage, conformité, abonnés
- Communauté : forum enrichi (thématiques, j'aime, suivi, réponse retenue, membres actifs), annuaire, messagerie privée, témoignages
- Blog de niveau communauté : recherche, étiquettes, temps de lecture, texte enrichi, articles liés, commentaires modérés, partage, flux RSS
- FAQ : recherche, sommaire par catégorie, ancres, données structurées FAQPage
- SEO : `seo()` partout, canonical, Open Graph/Twitter, JSON-LD, sitemap dynamique, robots.txt, flux RSS
- Installation sur l'écran d'accueil (manifeste + icônes)
- Pilotage : plan directeur, feuille de route, audits avec mémoire, **grille de conformité du modèle** avec score et audits datés
- MCP d'audit (`/mcp`) : 9 outils pour Claude et Letta, connexion par compte administrateur
- 6 briques optionnelles livrées et éteintes par défaut : annuaire métier, géographie, suivi de contacts, formations, petites annonces, régie publicitaire — base de données, pages publiques, pages d'administration, liens de menus, pied de page, plan du site et sitemap conditionnels
- V0 · lot 1 « Base » : règles d'accès visiteur, forum, messagerie, lettre d'information, admins du studio en base
- V0 · lot 2 « Socle » : paramètres du site lus côté serveur (source unique `site_settings`), zéro valeur en dur, 19 modules pilotés en base (écran « Modules »), écran « Utilisateurs et rôles », suppression de son compte avec anonymisation, annuaire des membres sur inscription volontaire
- V0 · lot 3 « Admin complet » : boîte de réception, contenus entièrement modifiables, offres créées et supprimées, modération verrouillée en base, confirmation avant toute suppression
- V0 · lot 4 : failles des briques 12 à 16 fermées en base (annonces, annuaire, formations) ; contenu des leçons protégé, règlements des formations payantes saisis en admin
- V0 · lot 5 A « Médiathèque » : envoi d'images et de PDF dans Supabase Storage (l'admin dépose, le public lit), écran d'administration, sélecteur d'image dans les formulaires (articles, formations, fiches, annonces, régie)
- V0 · lot 5 C « Pages libres » : pages par sections modifiables sans code, accueil compris (format de données Puck, éditeur maison)
- V0 · lot 6 : CRUD complet dans toute l'administration (annuaire, annonces, formations, régie, témoignages, thématiques du forum) et modération avec note visible (« Modéré par l'équipe : lien retiré »)
- V0 · lot 7 : recette automatisée (robot Playwright, 81 pages, visiteur/membre/admin, ordinateur et mobile, écran « Recette »), module D « Paiement » Stripe pour les formations, signalements de contenus, purge automatique des messages de contact après 3 ans
- V0 · lot 8 : qualité premium (accessibilité, HTML valide, SEO, sécurité, Firefox et Safari, vitesse et poids des pages, textes selon la charte)
- V0 · lot 9 : parcours cliqués (inscription, contact, forum, signalement, formation offerte) avec données « [recette] » purgées ; actifs en écriture réelle dès que les comptes de test sont fournis
- V0 · lot 10 : recherche globale (module F) en français sans accents sur tous les contenus publics, règles de visibilité du site respectées, loupe dans l'en-tête
- Thème tactile léger : surfaces hiérarchisées, cartes mieux détachées, champs creusés et états actifs renforcés

## En attente (décision du 29/09 : « beaucoup à faire avant de lancer les paiements »)

- Paiement Stripe : code prêt et éteint. Avant activation : SQL du lot 7 b (double paiement), secrets `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET`, webhook, parcours test 4242
- E-mails transactionnels (module B) : domaine d'envoi des projets à configurer
- Purge planifiée des messages de contact : pg_cron absent, planifier `/api/cron/purge-contact` dans les tâches Lovable ; en attendant, bouton « Purger maintenant »
- Paiement des offres de la page Tarifs (abonnements)

## À venir (validé le 30/09)

Premier projet à dupliquer et mettre en conformité : **l'annuaire des sites français** (`annuaire-mac97000`). Il fixe l'ordre des lots 10 à 13.

1. **Lot 11 · Géographie complète** — le module géographie monte au niveau de l'annuaire : régions, départements, communes, intercommunalités, codes postaux, coordonnées, voisinages (geo.api.gouv.fr).
2. **Lot 12 · Veille de sites** — module propre à l'annuaire : découverte de sites (Firecrawl, clé en secret), détection des technologies, contrôles réguliers d'état.
3. **Lot 13 · Duplication : annuaire** — kit de démarrage d'un projet (marque, réglages, modules, nettoyage de la démo), annuaire reconstruit sur le socle, données reprises. Sortie de la V0 : grille de conformité à 100 %, robot vert, chaque module « fini » (8 critères de V0.md).
4. **Lot 14 · Briques externes** — Umami (audience sans cookie), zone Revive dans l'emplacement Régie, Ghost en cohabitation.
5. **Lot 15 · Pages libres v2** — éditeur de menu, historique des versions ; Puck quand la dépendance pourra être validée côté Lovable.
6. **Ensuite** — E Notifications (sur le site d'abord), H Événements, I Réalisations, G Rendez-vous, dans l'ordre des besoins des projets. Rôle Modérateur (reporté le 29/09).

## Points de vigilance

- `/tarifs` sur mobile : bouton principal sous la ligne de flottaison (remarque c2 du robot, antérieure au lot 10)

- Comptes de test membre et admin à fournir (secrets GitHub `CDS_RECETTE_*`) : sans eux, recette membre/admin simulée et parcours sans écriture réelle

- Vulnérabilités js-yaml héritées de @tanstack/react-start : aucun correctif amont, à re-vérifier
- Test au lecteur d'écran : manuel, reste à faire (lot 8)
- Temps de réponse serveur du blog entre 800 et 1 400 ms (30/09) : à surveiller avec le robot (p5)
