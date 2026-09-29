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
- Thème tactile léger : surfaces hiérarchisées, cartes mieux détachées, champs creusés et états actifs renforcés

## En pause (décision utilisateur)

- Paiement des offres de la page Tarifs (abonnements) — Stripe est branché pour les formations depuis le lot 7
- Envoi des e-mails — passera par le domaine des projets, configuration plus tard

## À venir

- Rôle Modérateur (distinct d'Admin) : reporté, décision du 29/09
- Pages libres : éditeur de menu, historique des versions, éditeur Puck glisser-déposer (quand la dépendance pourra être validée côté Lovable)
- V0 · lot 5 B : e-mails transactionnels (en pause, décision du 29/09)

- Vulnérabilités js-yaml héritées de @tanstack/react-start : aucun correctif amont, à re-vérifier
- Mesures non réalisées : poids des fichiers livrés, temps de réponse, test mobile réel, test lecteur d'écran
- [x] Audit de correction des bugs d'interface (recette robot 40+ pages, ordinateur et mobile, connecté/déconnecté : zéro page blanche, zéro erreur)
