/**
 * CDS — Plan de recette (inspiré de Goldwing : lib/qa-checklist.ts et admin.recettage.tsx).
 *
 * Fichier SANS dépendance ni alias « @/ » : il est lu à la fois par l'écran /admin/recettage
 * et par le robot `tests/e2e/recette.ts` (Node l'exécute directement).
 *
 * 1. QA_PAGES : toutes les pages publiques, membre et admin. Le robot les ouvre en visiteur,
 *    membre et admin, sur ordinateur et sur mobile, et vérifie : pas de page blanche, pas
 *    d'erreur console, pas d'erreur serveur, pas de débordement horizontal, un titre h1.
 *    Une page d'un module éteint doit renvoyer à l'accueil.
 * 2. QA_CHECKLIST : les contrôles que seul un humain peut faire (parcours complets, paiement).
 */

export type QaRole = "visiteur" | "membre" | "admin";

export type QaPage = {
  /** Adresse, ou modèle avec « : » pour une page dynamique (ex. /blog/:slug). */
  path: string;
  label: string;
  /** Rôle minimal pour voir la page (le robot la teste aussi avec les rôles supérieurs). */
  role: QaRole;
  /** Module requis : éteint, la page doit renvoyer à l'accueil. */
  module?: string;
  /** Page dynamique : le robot prend le premier lien de `from` qui correspond à `match`. */
  discover?: { from: string; match: string };
  /** Page sans h1 par nature (flux, fichiers techniques). */
  noH1?: boolean;
  /** Fichier non HTML : seul le code de réponse est vérifié. */
  raw?: boolean;
  /** Réponse attendue (404 pour la page introuvable). */
  expectStatus?: number;
  /** Page vitrine : contrôle des textes complet (h1 de 40 caractères au moins, cible nommée). */
  vitrine?: boolean;
  /** Page du studio (démonstration de composants) : textes non notés. */
  sansTexte?: boolean;
};

export const QA_PAGES: QaPage[] = [
  // Socle public
  { path: "/", label: "Accueil", role: "visiteur", vitrine: true },
  { path: "/a-propos", label: "À propos", role: "visiteur", vitrine: true },
  { path: "/plan-du-site", label: "Plan du site", role: "visiteur" },
  { path: "/login", label: "Connexion", role: "visiteur" },
  { path: "/signup", label: "Inscription", role: "visiteur" },
  { path: "/forgot-password", label: "Mot de passe oublié", role: "visiteur" },
  { path: "/reset-password", label: "Nouveau mot de passe", role: "visiteur" },
  { path: "/verification-email", label: "Vérification de l'e-mail", role: "visiteur" },
  { path: "/merci", label: "Merci", role: "visiteur" },
  { path: "/maintenance", label: "Maintenance", role: "visiteur" },
  { path: "/legal/mentions-legales", label: "Mentions légales", role: "visiteur" },
  { path: "/legal/confidentialite", label: "Confidentialité", role: "visiteur" },
  { path: "/legal/cgu", label: "CGU", role: "visiteur" },
  { path: "/legal/cgv", label: "CGV", role: "visiteur" },
  { path: "/legal/cookies", label: "Cookies", role: "visiteur" },
  {
    path: "/page-qui-n-existe-pas-recette",
    label: "Page introuvable",
    role: "visiteur",
    expectStatus: 404,
  },
  { path: "/sitemap.xml", label: "Sitemap", role: "visiteur", raw: true },
  { path: "/robots.txt", label: "robots.txt", role: "visiteur", raw: true },
  { path: "/rss.xml", label: "Flux RSS", role: "visiteur", raw: true },
  { path: "/manifest.webmanifest", label: "Manifeste", role: "visiteur", raw: true },

  // Modules publics
  { path: "/blog", label: "Blog", role: "visiteur", module: "blog" },
  {
    path: "/blog/:slug",
    label: "Article",
    role: "visiteur",
    module: "blog",
    discover: { from: "/blog", match: "^/blog/[^/?#]+$" },
  },
  { path: "/faq", label: "FAQ", role: "visiteur", module: "faq" },
  { path: "/recherche", label: "Recherche", role: "visiteur", module: "search" },
  {
    path: "/recherche?q=exemple",
    label: "Recherche (résultats)",
    role: "visiteur",
    module: "search",
  },
  { path: "/contact", label: "Contact", role: "visiteur", module: "contact" },
  { path: "/forum", label: "Forum", role: "visiteur", module: "forum" },
  {
    path: "/forum/categorie/:slug",
    label: "Thématique du forum",
    role: "visiteur",
    module: "forum",
    discover: { from: "/forum", match: "^/forum/categorie/[^/?#]+$" },
  },
  {
    path: "/forum/:topicId",
    label: "Discussion",
    role: "visiteur",
    module: "forum",
    discover: { from: "/forum", match: "^/forum/(?!categorie/)[^/?#]+$" },
  },
  { path: "/membres", label: "Membres", role: "visiteur", module: "members" },
  {
    path: "/membres/:memberId",
    label: "Profil public",
    role: "visiteur",
    module: "members",
    discover: { from: "/membres", match: "^/membres/[^/?#]+$" },
  },
  { path: "/temoignages", label: "Témoignages", role: "visiteur", module: "testimonials" },
  { path: "/avis", label: "Avis", role: "visiteur", module: "reviews" },
  { path: "/tarifs", label: "Tarifs", role: "visiteur", module: "pricing", vitrine: true },
  { path: "/demarrer", label: "Démarrer", role: "visiteur", module: "onboarding", vitrine: true },
  { path: "/annuaire", label: "Annuaire", role: "visiteur", module: "directory" },
  {
    path: "/annuaire/:slug",
    label: "Fiche de l'annuaire",
    role: "visiteur",
    module: "directory",
    discover: {
      from: "/annuaire",
      match: "^/annuaire/(?!categorie/|departement|soumettre)[^/?#]+$",
    },
  },
  {
    path: "/annuaire/categorie/:slug",
    label: "Catégorie de l'annuaire",
    role: "visiteur",
    module: "directory",
    discover: { from: "/annuaire", match: "^/annuaire/categorie/[^/?#]+$" },
  },
  {
    path: "/annuaire/soumettre",
    label: "Proposer une fiche",
    role: "visiteur",
    module: "directory",
  },
  { path: "/annuaire/departements", label: "Départements", role: "visiteur", module: "geo" },
  {
    path: "/annuaire/departement/:slug",
    label: "Département",
    role: "visiteur",
    module: "geo",
    discover: { from: "/annuaire/departements", match: "^/annuaire/departement/[^/?#]+$" },
  },
  { path: "/formations", label: "Formations", role: "visiteur", module: "lms" },
  {
    path: "/formation/:slug",
    label: "Formation",
    role: "visiteur",
    module: "lms",
    discover: { from: "/formations", match: "^/formation/[^/?#]+$" },
  },
  {
    path: "/formation/:slug/lecon/:lessonId",
    label: "Leçon",
    role: "visiteur",
    module: "lms",
    discover: { from: "/formation/:slug", match: "^/formation/[^/?#]+/lecon/[^/?#]+$" },
  },
  { path: "/marketplace", label: "Petites annonces", role: "visiteur", module: "marketplace" },
  {
    path: "/marketplace/:slug",
    label: "Annonce",
    role: "visiteur",
    module: "marketplace",
    discover: { from: "/marketplace", match: "^/marketplace/(?!publier)[^/?#]+$" },
  },
  {
    path: "/marketplace/publier",
    label: "Publier une annonce",
    role: "visiteur",
    module: "marketplace",
  },
  { path: "/publicite", label: "Publicité", role: "visiteur", module: "adNetwork" },
  {
    path: "/pages/:slug",
    label: "Page libre",
    role: "visiteur",
    module: "pages",
    discover: { from: "/plan-du-site", match: "^/pages/[^/?#]+$" },
  },
  {
    path: "/composants",
    label: "Composants",
    role: "visiteur",
    module: "showcase",
    sansTexte: true,
  },
  { path: "/guide", label: "Guide", role: "visiteur", module: "showcase", sansTexte: true },

  // Espace membre
  { path: "/tableau-de-bord", label: "Tableau de bord", role: "membre" },
  { path: "/compte", label: "Mon compte", role: "membre" },
  { path: "/profil", label: "Mon profil public", role: "membre", module: "members" },
  { path: "/decouvrir", label: "Découvrir", role: "membre" },
  { path: "/messagerie", label: "Messagerie", role: "membre", module: "messaging" },
  { path: "/mes-annonces", label: "Mes annonces", role: "membre", module: "marketplace" },
  { path: "/mes-formations", label: "Mes formations", role: "membre", module: "lms" },
  { path: "/crm", label: "Suivi de contacts", role: "membre", module: "crm" },
  { path: "/crm/prospects", label: "Contacts", role: "membre", module: "crm" },
  { path: "/crm/actions", label: "Actions", role: "membre", module: "crm" },

  // Administration
  { path: "/admin", label: "Paramètres", role: "admin" },
  { path: "/admin/modules", label: "Modules", role: "admin" },
  { path: "/admin/utilisateurs", label: "Utilisateurs", role: "admin" },
  { path: "/admin/contenus", label: "Contenus", role: "admin" },
  { path: "/admin/pages", label: "Pages", role: "admin", module: "pages" },
  { path: "/admin/mediatheque", label: "Médiathèque", role: "admin", module: "media" },
  { path: "/admin/moderation", label: "Modération", role: "admin" },
  { path: "/admin/signalements", label: "Signalements", role: "admin", module: "reports" },
  { path: "/admin/forum", label: "Forum", role: "admin", module: "forum" },
  { path: "/admin/temoignages", label: "Témoignages", role: "admin", module: "testimonials" },
  { path: "/admin/annuaire", label: "Annuaire", role: "admin", module: "directory" },
  { path: "/admin/geographie", label: "Géographie", role: "admin", module: "geo" },
  { path: "/admin/crm", label: "Contacts (vue admin)", role: "admin", module: "crm" },
  { path: "/admin/formations", label: "Formations", role: "admin", module: "lms" },
  { path: "/admin/paiements", label: "Paiements", role: "admin", module: "payments" },
  { path: "/admin/marketplace", label: "Annonces", role: "admin", module: "marketplace" },
  { path: "/admin/regie", label: "Régie", role: "admin", module: "adNetwork" },
  { path: "/admin/pilotage", label: "Pilotage", role: "admin", module: "studio" },
  { path: "/admin/conformite", label: "Conformité", role: "admin", module: "studio" },
  { path: "/admin/recettage", label: "Recette", role: "admin", module: "studio" },
  { path: "/admin/abonnes", label: "Abonnés", role: "admin", module: "newsletter" },
  { path: "/admin/messages", label: "Messages", role: "admin", module: "contact" },
];

/** Écrans (largeur × hauteur) sur lesquels le robot ouvre chaque page. */
export const QA_VIEWPORTS = {
  ordinateur: { width: 1366, height: 900 },
  mobile: { width: 360, height: 780 },
} as const;

export type QaViewport = keyof typeof QA_VIEWPORTS;

/** Résultat d'une page, tel qu'écrit par le robot dans son rapport JSON. */
export type QaResult = {
  path: string;
  url: string;
  label: string;
  role: QaRole;
  viewport: QaViewport;
  status: "ok" | "echec" | "ignore";
  /** Motifs d'échec (page blanche, erreur console…). */
  problems: string[];
  /** Remarques non bloquantes (plusieurs h1, requête en échec…). */
  warnings: string[];
  /** Qualité des textes (pages publiques, visiteur, ordinateur) : charte docs/redaction. */
  texte?: {
    score: number;
    anomalies: Array<{ texte: string; regle: string; gravite: string; proposition: string }>;
    nonEvalue: string[];
  };
  ms: number;
};

export type QaReport = {
  version: 1;
  startedAt: string;
  baseUrl: string;
  /** « réel » : vrais comptes ; « simulé » : session et données simulées dans le navigateur. */
  auth: Record<"membre" | "admin", "réel" | "simulé" | "absent">;
  results: QaResult[];
};

export type QaItem = {
  id: string;
  label: string;
  path?: string;
  role: QaRole;
  severity: "bloquant" | "majeur" | "mineur";
};

export type QaSection = { id: string; zone: string; objectif: string; items: QaItem[] };

/** Contrôles manuels : ce que le robot ne sait pas juger. */
export const QA_CHECKLIST: QaSection[] = [
  {
    id: "socle",
    zone: "Socle",
    objectif: "Navigation, pages légales et SEO fondés sur les paramètres saisis en admin.",
    items: [
      {
        id: "nav-menus",
        label: "Menus et pied de page : chaque lien répond, rien ne mène à un module éteint",
        path: "/",
        role: "visiteur",
        severity: "majeur",
      },
      {
        id: "legal-valeurs",
        label: "Pages légales : raison sociale, adresse et hébergeur viennent des paramètres",
        path: "/legal/mentions-legales",
        role: "visiteur",
        severity: "bloquant",
      },
      {
        id: "seo-partage",
        label: "Partage d'une page sur un réseau social : titre, description et image corrects",
        role: "visiteur",
        severity: "mineur",
      },
      {
        id: "lecteur-ecran",
        label:
          "Lecteur d'écran (NVDA ou VoiceOver) : accueil, inscription et contact se parcourent au clavier, chaque bouton est annoncé",
        path: "/signup",
        role: "visiteur",
        severity: "majeur",
      },
      {
        id: "modules-eteints",
        label: "Éteindre un module : ses pages renvoient à l'accueil, ses liens disparaissent",
        path: "/admin/modules",
        role: "admin",
        severity: "bloquant",
      },
    ],
  },
  {
    id: "comptes",
    zone: "Comptes",
    objectif: "Parcours complet d'un membre, de l'inscription à la suppression du compte.",
    items: [
      {
        id: "wf-inscription",
        label: "Inscription par e-mail puis Google, retour sur la page demandée après connexion",
        path: "/signup",
        role: "visiteur",
        severity: "bloquant",
      },
      {
        id: "wf-mdp",
        label: "Mot de passe oublié : e-mail reçu, nouveau mot de passe accepté",
        path: "/forgot-password",
        role: "visiteur",
        severity: "bloquant",
      },
      {
        id: "wf-suppression",
        label: "Suppression du compte : contributions signées « Ancien membre »",
        path: "/compte",
        role: "membre",
        severity: "majeur",
      },
    ],
  },
  {
    id: "paiement",
    zone: "Paiement (Stripe, mode test)",
    objectif: "Une formation payante s'ouvre au paiement, et se referme au remboursement.",
    items: [
      {
        id: "pay-config",
        label: "Écran Paiements : clé et secret du webhook indiqués « configurés »",
        path: "/admin/paiements",
        role: "admin",
        severity: "bloquant",
      },
      {
        id: "pay-case",
        label: "Bouton de paiement inactif tant que la case de renonciation n'est pas cochée",
        role: "membre",
        severity: "bloquant",
      },
      {
        id: "pay-carte",
        label:
          "Carte de test 4242 4242 4242 4242 : retour sur la formation, accès ouvert en quelques secondes",
        role: "membre",
        severity: "bloquant",
      },
      {
        id: "pay-annule",
        label: "Paiement abandonné : message « aucun montant débité », accès toujours fermé",
        role: "membre",
        severity: "majeur",
      },
      {
        id: "pay-rembourse",
        label: "Remboursement total dans Stripe : accès refermé, statut « Remboursé »",
        path: "/admin/paiements",
        role: "admin",
        severity: "majeur",
      },
    ],
  },
  {
    id: "moderation",
    zone: "Modération et signalements",
    objectif: "Un contenu signalé arrive chez l'admin, qui le modère avec une note visible.",
    items: [
      {
        id: "sig-envoi",
        label: "Signaler un sujet du forum : confirmation, puis doublon refusé",
        role: "membre",
        severity: "majeur",
      },
      {
        id: "sig-visiteur",
        label: "Visiteur : « Signaler » renvoie à la connexion",
        role: "visiteur",
        severity: "mineur",
      },
      {
        id: "sig-admin",
        label: "Écran Signalements : traiter, écarter, rouvrir, note interne",
        path: "/admin/signalements",
        role: "admin",
        severity: "majeur",
      },
      {
        id: "mod-note",
        label: "Modérer avec une note : « Modéré par l'équipe » visible sous le contenu",
        path: "/admin/moderation",
        role: "admin",
        severity: "majeur",
      },
    ],
  },
  {
    id: "donnees",
    zone: "Données personnelles",
    objectif: "Les durées annoncées dans la politique de confidentialité sont tenues.",
    items: [
      {
        id: "purge-contact",
        label:
          "Boîte de réception : « Purger maintenant » n'efface que les messages de plus de 3 ans",
        path: "/admin/messages",
        role: "admin",
        severity: "majeur",
      },
      {
        id: "rls-visiteur",
        label: "Navigation privée : aucune adresse e-mail ni donnée privée visible",
        role: "visiteur",
        severity: "bloquant",
      },
    ],
  },
];

/**
 * Budgets de performance (seuils « bons » de web.dev pour LCP, CLS et TTFB). Mesurés sur le site
 * publié seulement : le serveur de développement ne compresse ni ne regroupe les fichiers.
 */
export const QA_BUDGETS = {
  lcpMs: 2500,
  cls: 0.1,
  ttfbMs: 800,
  pageKo: 1500,
};

export const QA_CHECKLIST_TOTAL = QA_CHECKLIST.reduce((n, s) => n + s.items.length, 0);

/**
 * Contrôles du catalogue d'audit (dépôt agents-mac97000, src/lib/audit-offer.ts) que le robot
 * mesure automatiquement. Les remarques du rapport commencent par leur code, ex. « [s1] … ».
 */
export const QA_AUDIT_CODES: Record<string, { label: string; agent: string }> = {
  r1: { label: "Liens morts et erreurs 404", agent: "Kestrel" },
  r3: { label: "Affichage mobile (cibles de 44 px)", agent: "Kestrel" },
  p1: { label: "Vitesse de chargement (LCP, CLS)", agent: "Atlas" },
  p2: { label: "Poids des images et de la page", agent: "Atlas" },
  p5: { label: "Temps de réponse serveur (TTFB)", agent: "Atlas" },
  s1: { label: "Titres et méta-descriptions", agent: "Sonar" },
  s3: { label: "Structure des titres (H1)", agent: "Sonar" },
  l3: { label: "Alternatives textuelles", agent: "Bay" },
  l2: { label: "Contrastes et lisibilité", agent: "Bay" },
  a11y: { label: "Accessibilité (axe-core, WCAG 2.1 AA)", agent: "Bay" },
  w3c: { label: "HTML valide (norme W3C)", agent: "Atlas" },
  s2: { label: "Indexation (canonique, plan du site)", agent: "Sonar" },
  c2: { label: "Appel à l'action visible", agent: "Kestrel" },
  secu: { label: "En-têtes de sécurité", agent: "Atlas" },
  l1: { label: "Mentions légales et RGPD", agent: "Bay" },
  prix: { label: "Prix affichés = prix en base", agent: "Kestrel" },
};
