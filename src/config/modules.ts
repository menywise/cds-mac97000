/**
 * CDS — Liste des modules (V0.md §2 et §3), dépendances et état par défaut.
 * Fichier sans dépendance : partagé par le serveur, le navigateur et l'admin.
 * L'état par défaut est identique à `public.module_defaults()` en base.
 */
export const MODULES = [
  { key: "blog", label: "Blog, commentaires, RSS", requires: [], defaultOn: true },
  { key: "faq", label: "FAQ", requires: [], defaultOn: true },
  { key: "contact", label: "Contact et boîte de réception", requires: [], defaultOn: true },
  { key: "newsletter", label: "Lettre d'information", requires: [], defaultOn: true },
  { key: "forum", label: "Forum", requires: [], defaultOn: true },
  { key: "members", label: "Membres (annuaire des membres, profils publics)", requires: [], defaultOn: true },
  { key: "messaging", label: "Messagerie privée", requires: ["members"], defaultOn: true },
  { key: "testimonials", label: "Témoignages", requires: [], defaultOn: true },
  { key: "reviews", label: "Avis notés", requires: [], defaultOn: true },
  { key: "pricing", label: "Tarifs", requires: [], defaultOn: true },
  { key: "onboarding", label: "Parcours « Démarrer »", requires: [], defaultOn: true },
  { key: "directory", label: "Annuaire métier", requires: [], defaultOn: false },
  { key: "geo", label: "Géographie (départements, communes)", requires: ["directory"], defaultOn: false },
  { key: "crm", label: "Suivi de contacts (CRM)", requires: [], defaultOn: false },
  { key: "lms", label: "Formations", requires: [], defaultOn: false },
  { key: "marketplace", label: "Petites annonces", requires: ["messaging"], defaultOn: false },
  { key: "adNetwork", label: "Régie publicitaire", requires: [], defaultOn: false },
  { key: "studio", label: "Pilotage, conformité, MCP", requires: [], defaultOn: true },
  { key: "showcase", label: "Composants et guide", requires: [], defaultOn: true },
  { key: "media", label: "Médiathèque (envoi d'images et de fichiers)", requires: [], defaultOn: true },
  { key: "pages", label: "Pages libres par sections (dont l'accueil)", requires: [], defaultOn: false },
  { key: "payments", label: "Paiement en ligne (Stripe) des formations", requires: ["lms"], defaultOn: false },
  { key: "reports", label: "Signalements de contenus", requires: [], defaultOn: true },
] as const satisfies ReadonlyArray<{
  key: string;
  label: string;
  requires: readonly string[];
  defaultOn: boolean;
}>;

export type FeatureKey = (typeof MODULES)[number]["key"];
export type ModuleStates = Record<FeatureKey, boolean>;

export const defaultModuleStates = Object.fromEntries(
  MODULES.map((m) => [m.key, m.defaultOn]),
) as ModuleStates;

/** Modules dont `key` dépend directement. */
export function moduleRequires(key: FeatureKey): readonly FeatureKey[] {
  return MODULES.find((m) => m.key === key)?.requires ?? [];
}

/** Modules qui dépendent directement de `key`. */
export function moduleDependents(key: FeatureKey): FeatureKey[] {
  return MODULES.filter((m) => (m.requires as readonly FeatureKey[]).includes(key)).map(
    (m) => m.key,
  );
}

/** Complète un objet lu en base : clés inconnues ignorées, clés absentes à leur valeur par défaut. */
export function normalizeModules(value: unknown): ModuleStates {
  const raw = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const out = { ...defaultModuleStates };
  for (const m of MODULES) {
    if (typeof raw[m.key] === "boolean") out[m.key] = raw[m.key] as boolean;
  }
  return out;
}

/** Vrai si le module est allumé ET toutes ses dépendances aussi. */
export function isModuleOn(states: ModuleStates, key: FeatureKey): boolean {
  if (!states[key]) return false;
  return moduleRequires(key).every((dep) => isModuleOn(states, dep));
}

/** Étiquette de module posée sur un lien, une page ou un onglet. */
export type ModuleTag = { module?: FeatureKey; anyOf?: readonly FeatureKey[] };

/**
 * Garde les éléments sans module ou dont le module est actif (menus, plan du site, sitemap).
 * `anyOf` : l'élément reste visible si au moins un de ces modules est actif.
 */
export function onlyActive<T extends object>(states: ModuleStates, items: readonly T[]): T[] {
  return items.filter((item) => {
    const tag = item as ModuleTag;
    return (
      (!tag.module || isModuleOn(states, tag.module)) &&
      (!tag.anyOf || tag.anyOf.some((key) => isModuleOn(states, key)))
    );
  });
}

/**
 * Pages de l'espace connecté rattachées à un module. Ces pages sont rendues dans le navigateur
 * seulement : la route racine vérifie cette liste côté serveur pour renvoyer à l'accueil AVANT
 * l'affichage (une redirection pendant l'hydratation provoque une erreur React).
 * Chaque page garde aussi son `requireFeature` pour la navigation interne.
 * Toute nouvelle page d'un module sous /admin ou l'espace membre s'ajoute ici.
 */
export const PROTECTED_PATH_MODULES: ReadonlyArray<{ prefix: string; anyOf: readonly FeatureKey[] }> = [
  { prefix: "/admin/abonnes", anyOf: ["newsletter"] },
  { prefix: "/admin/annuaire", anyOf: ["directory"] },
  { prefix: "/admin/conformite", anyOf: ["studio"] },
  { prefix: "/admin/contenus", anyOf: ["faq", "pricing", "blog"] },
  { prefix: "/admin/crm", anyOf: ["crm"] },
  { prefix: "/admin/formations", anyOf: ["lms"] },
  { prefix: "/admin/forum", anyOf: ["forum"] },
  { prefix: "/admin/geographie", anyOf: ["geo"] },
  { prefix: "/admin/marketplace", anyOf: ["marketplace"] },
  { prefix: "/admin/mediatheque", anyOf: ["media"] },
  { prefix: "/admin/messages", anyOf: ["contact"] },
  { prefix: "/admin/moderation", anyOf: ["reviews", "blog", "forum"] },
  { prefix: "/admin/pages", anyOf: ["pages"] },
  { prefix: "/admin/paiements", anyOf: ["payments"] },
  { prefix: "/admin/pilotage", anyOf: ["studio"] },
  { prefix: "/admin/recettage", anyOf: ["studio"] },
  { prefix: "/admin/regie", anyOf: ["adNetwork"] },
  { prefix: "/admin/signalements", anyOf: ["reports"] },
  { prefix: "/admin/temoignages", anyOf: ["testimonials"] },
  { prefix: "/crm", anyOf: ["crm"] },
  { prefix: "/decouvrir", anyOf: ["onboarding"] },
  { prefix: "/mes-annonces", anyOf: ["marketplace"] },
  { prefix: "/mes-formations", anyOf: ["lms"] },
  { prefix: "/messagerie", anyOf: ["messaging"] },
];

/** Vrai si l'adresse appartient à un module entièrement éteint. */
export function isPathOff(states: ModuleStates, pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  const rule = PROTECTED_PATH_MODULES.find(
    (r) => path === r.prefix || path.startsWith(`${r.prefix}/`),
  );
  return rule ? !rule.anyOf.some((key) => isModuleOn(states, key)) : false;
}
