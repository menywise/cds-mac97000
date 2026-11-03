/**
 * CDS — Liste des modules, dépendances et état par défaut.
 * Fichier sans dépendance : partagé par le serveur, le navigateur et l'admin.
 * L'état par défaut est identique à `public.module_defaults()` en base.
 * `socle: true` : outil d'administration (pilotage, médiathèque, recherche), toujours allumé.
 * Les autres sont des modules : briques facultatives, éteintes tant que l'admin ne les allume pas.
 * Un projet (clone du socle) ajoute ses propres modules `greffe_<nom>` dans `src/greffe/index.ts`,
 * sans toucher à ce fichier (socle 1.3.0, docs/CLONER.md « Écrire une greffe »).
 */
import { GREFFE } from "../greffe/index.ts";

export const MODULES = [
  { key: "blog", label: "Blog, commentaires, RSS", requires: [], defaultOn: false, socle: false },
  { key: "faq", label: "FAQ", requires: [], defaultOn: false, socle: false },
  {
    key: "contact",
    label: "Contact et boîte de réception",
    requires: [],
    defaultOn: false,
    socle: false,
  },
  {
    key: "newsletter",
    label: "Lettre d'information",
    requires: [],
    defaultOn: false,
    socle: false,
  },
  { key: "forum", label: "Forum", requires: [], defaultOn: false, socle: false },
  {
    key: "members",
    label: "Membres (annuaire des membres, profils publics)",
    requires: [],
    defaultOn: false,
    socle: false,
  },
  {
    key: "messaging",
    label: "Messagerie privée",
    requires: ["members"],
    defaultOn: false,
    socle: false,
  },
  { key: "testimonials", label: "Témoignages", requires: [], defaultOn: false, socle: false },
  { key: "reviews", label: "Avis notés", requires: [], defaultOn: false, socle: false },
  { key: "pricing", label: "Tarifs", requires: [], defaultOn: false, socle: false },
  {
    key: "onboarding",
    label: "Parcours « Démarrer »",
    requires: [],
    defaultOn: false,
    socle: false,
  },
  { key: "directory", label: "Annuaire métier", requires: [], defaultOn: false, socle: false },
  {
    key: "geo",
    label: "Géographie (régions, départements, intercommunalités, communes)",
    requires: ["directory"],
    defaultOn: false,
    socle: false,
  },
  { key: "crm", label: "Suivi de contacts (CRM)", requires: [], defaultOn: false, socle: false },
  { key: "lms", label: "Formations", requires: [], defaultOn: false, socle: false },
  {
    key: "marketplace",
    label: "Petites annonces",
    requires: ["messaging"],
    defaultOn: false,
    socle: false,
  },
  { key: "adNetwork", label: "Régie publicitaire", requires: [], defaultOn: false, socle: false },
  { key: "studio", label: "Pilotage, conformité, MCP", requires: [], defaultOn: true, socle: true },
  { key: "showcase", label: "Composants et guide", requires: [], defaultOn: false, socle: false },
  {
    key: "media",
    label: "Médiathèque (envoi d'images et de fichiers)",
    requires: [],
    defaultOn: true,
    socle: true,
  },
  {
    key: "pages",
    label: "Pages libres par sections (dont l'accueil)",
    requires: [],
    defaultOn: false,
    socle: false,
  },
  {
    key: "payments",
    label: "Paiement en ligne (Stripe) des formations",
    requires: ["lms"],
    defaultOn: false,
    socle: false,
  },
  {
    key: "reports",
    label: "Signalements de contenus",
    requires: [],
    defaultOn: false,
    socle: false,
  },
  { key: "search", label: "Recherche globale", requires: [], defaultOn: true, socle: true },
  {
    key: "shop",
    label: "Boutique (objets, PDF, e-books)",
    requires: [],
    defaultOn: false,
    socle: false,
  },
] as const satisfies ReadonlyArray<{
  key: string;
  label: string;
  requires: readonly string[];
  defaultOn: boolean;
  socle: boolean;
}>;

/** Module du socle. */
export type SocleKey = (typeof MODULES)[number]["key"];
/** Module propre à un projet, déclaré dans `src/greffe/index.ts`. */
export type GreffeKey = `greffe_${string}`;
export type FeatureKey = SocleKey | GreffeKey;
export type ModuleStates = Record<SocleKey, boolean> & { [key: GreffeKey]: boolean };

/** Fiche d'un module, du socle ou du projet. */
export type ModuleInfo = {
  key: FeatureKey;
  label: string;
  requires: readonly FeatureKey[];
  defaultOn: boolean;
  /** Outil d'administration du socle, toujours allumé. */
  socle: boolean;
  /** Module propre au projet (greffe). */
  greffe: boolean;
  /** Ce que le module fait pour le visiteur ou le client (obligatoire pour une greffe). */
  definition?: string;
};

/** Valeurs par défaut des modules du socle : identiques à `public.module_defaults()` en base. */
export const defaultModuleStates = Object.fromEntries(
  MODULES.map((m) => [m.key, m.defaultOn]),
) as ModuleStates;

/** Clé réservée aux modules d'un projet (même règle que `public.module_is_greffe()` en base). */
export function isGreffeKey(key: string): key is GreffeKey {
  return /^greffe_[a-z0-9_]{1,40}$/.test(key);
}

/** Tous les modules : ceux du socle, puis ceux du projet, éteints par défaut. */
export const ALL_MODULES: readonly ModuleInfo[] = [
  ...MODULES.map((m) => ({ ...m, greffe: false })),
  ...(GREFFE.modules ?? [])
    .filter((m) => isGreffeKey(m.key))
    .map((m) => ({
      key: m.key,
      label: m.label,
      requires: m.requires ?? [],
      defaultOn: false,
      socle: false,
      greffe: true,
      definition: m.definition,
    })),
];

/** Modules dont `key` dépend directement. */
export function moduleRequires(key: FeatureKey): readonly FeatureKey[] {
  return ALL_MODULES.find((m) => m.key === key)?.requires ?? [];
}

/** Modules qui dépendent directement de `key`. */
export function moduleDependents(key: FeatureKey): FeatureKey[] {
  return ALL_MODULES.filter((m) => m.requires.includes(key)).map((m) => m.key);
}

/**
 * Complète un objet lu en base : clés inconnues ignorées, clés absentes à leur valeur par défaut,
 * outils d'administration toujours allumés, modules du projet éteints sauf réglage contraire.
 */
export function normalizeModules(value: unknown): ModuleStates {
  const raw = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const out: ModuleStates = { ...defaultModuleStates };
  for (const m of ALL_MODULES) {
    if (m.socle) continue;
    if (m.greffe) out[m.key as GreffeKey] = raw[m.key] === true;
    else if (typeof raw[m.key] === "boolean") out[m.key as SocleKey] = raw[m.key] as boolean;
  }
  return out;
}

/** Vrai si le module est allumé ET toutes ses dépendances aussi. */
export function isModuleOn(states: ModuleStates, key: FeatureKey): boolean {
  if (states[key] !== true) return false;
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
const SOCLE_PROTECTED_PATHS: ReadonlyArray<{ prefix: string; anyOf: readonly FeatureKey[] }> = [
  { prefix: "/admin/abonnes", anyOf: ["newsletter"] },
  { prefix: "/admin/annuaire", anyOf: ["directory"] },
  { prefix: "/admin/boutique", anyOf: ["shop"] },
  { prefix: "/admin/conformite", anyOf: ["studio"] },
  { prefix: "/admin/contenus", anyOf: ["faq", "pricing", "blog"] },
  { prefix: "/editorial", anyOf: ["blog"] },
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
  { prefix: "/mes-achats", anyOf: ["shop"] },
  { prefix: "/mes-annonces", anyOf: ["marketplace"] },
  { prefix: "/mes-fiches", anyOf: ["directory"] },
  { prefix: "/mes-formations", anyOf: ["lms"] },
  { prefix: "/messagerie", anyOf: ["messaging"] },
];

/** Pages du socle, puis celles que le projet déclare dans `src/greffe/index.ts`. */
export const PROTECTED_PATH_MODULES: ReadonlyArray<{
  prefix: string;
  anyOf: readonly FeatureKey[];
}> = [...SOCLE_PROTECTED_PATHS, ...(GREFFE.pagesProtegees ?? [])];

/** Vrai si l'adresse appartient à un module entièrement éteint. */
export function isPathOff(states: ModuleStates, pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  const rule = PROTECTED_PATH_MODULES.find(
    (r) => path === r.prefix || path.startsWith(`${r.prefix}/`),
  );
  return rule ? !rule.anyOf.some((key) => isModuleOn(states, key)) : false;
}
