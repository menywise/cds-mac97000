// Chemins relatifs : le fichier est aussi chargé tel quel par les tests unitaires (node --test).
import { brandFallback } from "../config/brand.ts";
import { defaultModuleStates, normalizeModules, type ModuleStates } from "../config/modules.ts";
import { normaliserCouleur } from "./couleurs.ts";

/**
 * CDS — Configuration du site : source unique = table `site_settings`.
 *
 * Cycle de vie :
 * 1. Serveur : la route racine lit la base dans `beforeLoad` (avant toute autre
 *    route) et appelle `setSiteConfig`. Les `head()`, `seo()`, `isFeatureOn()`
 *    et le rendu HTML utilisent donc les valeurs saisies en admin. La lecture
 *    passe par un cache d'une minute par serveur (`site-config.cache.ts`).
 * 2. La route racine écrit la configuration dans la page (`window.__CDS_SITE__`),
 *    exécutée avant le code du navigateur : l'hydratation voit les mêmes valeurs.
 * 3. Après un enregistrement en admin, `setSiteConfig` : la session de
 *    l'administrateur voit le changement tout de suite, les autres visiteurs
 *    sous une minute.
 *
 * Toutes les requêtes d'un même serveur lisent la même ligne : la valeur partagée
 * entre requêtes simultanées est identique, sauf pendant une modification en admin.
 */

export type BrandSettings = {
  shortName: string;
  name: string;
  tagline: string;
  url: string;
  /** Site fermé aux moteurs de recherche : « noindex » sur chaque page, sitemap non annoncé. */
  horsIndex: boolean;
  legal: {
    company: string;
    form: string;
    capital: string;
    rcs: string;
    address: string;
    country: string;
    publisher: string;
  };
  host: {
    name: string;
    detail: string;
    address: string;
    phone: string;
  };
  email: {
    senderDomain: string;
    fromDomain: string;
  };
  apparence: {
    couleurPrincipale: string;
    couleurNavigateur: string;
    logo: string;
    favicon: string;
    icone: string;
    imagePartage: string;
  };
  accueil: {
    titre: string;
    texte: string;
  };
};

/** Type schema.org des fiches de l'annuaire (données structurées). */
export const ANNUAIRE_TYPES_FICHE = ["LocalBusiness", "Organization", "WebSite"] as const;
export type AnnuaireTypeFiche = (typeof ANNUAIRE_TYPES_FICHE)[number];

/** Réglages de l'annuaire (clé `annuaire`) : titre et description de la page d'accueil. */
export type AnnuaireSettings = {
  titre: string;
  description: string;
  type_fiche: AnnuaireTypeFiche;
};

export type SiteConfig = {
  brand: BrandSettings;
  modules: ModuleStates;
  annuaire: AnnuaireSettings;
};

export const BRAND_SETTINGS_KEY = "brand";
export const MODULES_SETTINGS_KEY = "modules";
export const ANNUAIRE_SETTINGS_KEY = "annuaire";

export const defaultAnnuaireSettings: AnnuaireSettings = {
  titre: "Annuaire",
  description:
    "Parcourez les fiches par activité, par lieu ou par mot-clé, puis prenez contact directement.",
  type_fiche: "LocalBusiness",
};

/** Fusionne la clé `annuaire` lue en base avec les valeurs par défaut (texte vide = défaut). */
export function normalizeAnnuaire(value: unknown): AnnuaireSettings {
  const v = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const text = (raw: unknown, fallback: string) =>
    typeof raw === "string" && raw.trim() ? raw.trim() : fallback;
  const type = v["type_fiche"];
  return {
    titre: text(v["titre"], defaultAnnuaireSettings.titre),
    description: text(v["description"], defaultAnnuaireSettings.description),
    type_fiche: ANNUAIRE_TYPES_FICHE.includes(type as AnnuaireTypeFiche)
      ? (type as AnnuaireTypeFiche)
      : defaultAnnuaireSettings.type_fiche,
  };
}

export const defaultBrandSettings: BrandSettings = {
  ...brandFallback,
  legal: { ...brandFallback.legal },
  host: { ...brandFallback.host },
  email: { ...brandFallback.email },
  apparence: { ...brandFallback.apparence },
  accueil: { ...brandFallback.accueil },
};

/** Fusionne une valeur lue en base avec les valeurs de repli (champs manquants ou mal typés ignorés). */
export function normalizeBrand(value: unknown): BrandSettings {
  const v = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const pick = <T extends Record<string, string>>(base: T, raw: unknown): T => {
    const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const out = { ...base };
    for (const k of Object.keys(base) as Array<keyof T>) {
      if (typeof r[k as string] === "string") out[k] = r[k as string] as T[keyof T];
    }
    return out;
  };
  const top = pick(
    {
      shortName: defaultBrandSettings.shortName,
      name: defaultBrandSettings.name,
      tagline: defaultBrandSettings.tagline,
      url: defaultBrandSettings.url,
    },
    v,
  );
  return {
    ...top,
    url: top.url.trim().replace(/\/+$/, ""),
    // Seul un « true » explicite ferme le site : valeur absente ou mal typée = indexable.
    horsIndex: v["horsIndex"] === true,
    legal: pick(defaultBrandSettings.legal, v["legal"]),
    host: pick(defaultBrandSettings.host, v["host"]),
    email: cleanEmailDomains(pick(defaultBrandSettings.email, v["email"])),
    apparence: nettoyerApparence(pick(defaultBrandSettings.apparence, v["apparence"])),
    accueil: pick(defaultBrandSettings.accueil, v["accueil"]),
  };
}

/** Image réglée en admin : adresse https ou chemin du site (« /… »), sinon vide. */
export function adresseImage(valeur: string) {
  const v = valeur.trim();
  if (/^https:\/\/[^\s"'<>()]+$/.test(v)) return v;
  if (/^\/[^/\s"'<>()][^\s"'<>()]*$/.test(v)) return v;
  return "";
}

function nettoyerApparence(a: BrandSettings["apparence"]): BrandSettings["apparence"] {
  return {
    couleurPrincipale: normaliserCouleur(a.couleurPrincipale),
    couleurNavigateur: normaliserCouleur(a.couleurNavigateur),
    logo: adresseImage(a.logo),
    favicon: adresseImage(a.favicon),
    icone: adresseImage(a.icone),
    imagePartage: adresseImage(a.imagePartage),
  };
}

/** Nom de domaine simple (« notify.exemple.fr ») : minuscules, au moins un point, sans schéma. */
export function isDomainName(value: string) {
  return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/.test(value);
}

function cleanEmailDomains(email: BrandSettings["email"]): BrandSettings["email"] {
  const clean = (d: string) => {
    const v = d
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "");
    return isDomainName(v) ? v : "";
  };
  return { senderDomain: clean(email.senderDomain), fromDomain: clean(email.fromDomain) };
}

export function buildSiteConfig(rows: Array<{ key: string; value: unknown }>): SiteConfig {
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  return {
    brand: normalizeBrand(byKey.get(BRAND_SETTINGS_KEY)),
    modules: normalizeModules(byKey.get(MODULES_SETTINGS_KEY)),
    annuaire: normalizeAnnuaire(byKey.get(ANNUAIRE_SETTINGS_KEY)),
  };
}

export const fallbackSiteConfig: SiteConfig = {
  brand: defaultBrandSettings,
  modules: { ...defaultModuleStates },
  annuaire: { ...defaultAnnuaireSettings },
};

declare global {
  interface Window {
    __CDS_SITE__?: SiteConfig;
  }
}

function initialConfig(): SiteConfig {
  if (typeof window !== "undefined" && window.__CDS_SITE__) {
    const c = window.__CDS_SITE__;
    return {
      brand: normalizeBrand(c.brand),
      modules: normalizeModules(c.modules),
      annuaire: normalizeAnnuaire(c.annuaire),
    };
  }
  return fallbackSiteConfig;
}

let current: SiteConfig = initialConfig();

export function getSiteConfig(): SiteConfig {
  return current;
}

export function setSiteConfig(next: SiteConfig) {
  current = next;
  if (typeof window !== "undefined") window.__CDS_SITE__ = next;
}

/** Script à placer dans la page : transmet la configuration au navigateur avant l'hydratation. */
export function siteConfigScript(config: SiteConfig = current) {
  return `window.__CDS_SITE__=${jsonPourScript(config)};`;
}

/**
 * JSON sûr dans une balise script : un texte contenant `</script>` ne la ferme jamais.
 * « < », « > », « & », U+2028 et U+2029 deviennent des séquences \uXXXX.
 * Le JSON relu reste identique.
 * Seule sérialisation des balises script du dépôt (configuration du site, données structurées).
 */
export function jsonPourScript(data: unknown) {
  return JSON.stringify(data).replace(
    /[<>&\u2028\u2029]/g,
    (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}

/** Construit une URL absolue à partir d'un chemin interne (relative tant que l'URL n'est pas saisie). */
export function absoluteUrl(path: string) {
  if (/^https:\/\//.test(path)) return path;
  return `${current.brand.url}${path.startsWith("/") ? path : `/${path}`}`;
}
