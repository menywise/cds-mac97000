/**
 * CDS — Liste des articles (/blog) : taille de page et nettoyage des paramètres d'adresse.
 * Fichier sans dépendance serveur : partagé par la route (navigateur et serveur) et par
 * `src/lib/content.functions.ts`, où la liste est filtrée et paginée en base.
 */

/** Articles par page sur /blog. */
export const BLOG_PAGE_SIZE = 12;

/** Longueur maximale d'une recherche sur /blog (au-delà, coupée). */
export const BLOG_SEARCH_MAX_LENGTH = 100;

/** Longueur maximale d'une étiquette dans l'adresse. */
const TAG_MAX_LENGTH = 60;

/** Plafond du numéro de page accepté dans l'adresse. */
const PAGE_MAX = 100000;

/**
 * Saisie de recherche nettoyée. Depuis le socle 1.13.0, la recherche passe par recherche_articles
 * (paramètre de fonction, jamais un filtre de PostgREST) : les guillemets (phrase exacte) et le
 * tiret (mot exclu) sont gardés. Jokers, virgules, parenthèses et barre oblique inverse deviennent
 * des espaces ; les espaces sont réduits, la longueur bornée.
 */
export function cleanBlogSearch(q: unknown) {
  return String(q ?? "")
    .replace(/[%_*,()\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, BLOG_SEARCH_MAX_LENGTH);
}

/** Étiquette nettoyée : une ligne, sans virgule, accolade ni guillemet (filtre `cs` de PostgREST). */
export function cleanBlogTag(tag: unknown) {
  return String(tag ?? "")
    .replace(/[",{}\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, TAG_MAX_LENGTH);
}

/** Numéro de page borné : entier, 1 au minimum. */
export function cleanBlogPage(page: unknown) {
  const n = Math.floor(Number(page));
  return Number.isFinite(n) && n >= 1 ? Math.min(n, PAGE_MAX) : 1;
}

/** Paramètres de la liste, tels que la base les reçoit. */
export type BlogListInput = {
  page: number;
  q: string;
  tag: string;
  /** Filtres de la recherche (socle 1.13.0), pris en compte avec une recherche seulement. */
  rubrique: string;
  serie: string;
};

/** Article tel qu'il est envoyé à la liste /blog : sans le texte, avec la durée de lecture. */
export type BlogListPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  cover_url: string | null;
  published_at: string | null;
  tags: string[] | null;
  /** Durée de lecture en minutes, calculée sur le serveur à partir du texte (0 : inconnue). */
  reading_minutes: number;
  /** Extrait surligné d'un résultat de recherche (mots trouvés entre ⟦ et ⟧). */
  extrait?: string;
};

/**
 * Longueurs des articles (contenus_publics, socle 1.9.0) : mêmes bornes que la base, pour borner
 * la saisie avant l'envoi. La base reste juge.
 */
export const ARTICLE_LONGUEURS = {
  titre: { min: 3, max: 120 },
  slug: 80,
  description: 160,
  chapo: 600,
  corps: 100000,
} as const;

/**
 * Description pour les moteurs de recherche et les partages, tirée du résumé : 160 caractères au
 * plus, coupée sur un mot entier avec « … ». Même règle que la reprise de la migration 1.9.0.
 */
export function descriptionDepuis(chapo: string) {
  const texte = chapo.trim();
  const max = ARTICLE_LONGUEURS.description;
  if (texte.length <= max) return texte;
  return `${texte.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

/** Adresse d'un article : celle de `slugify`, bornée à la longueur permise par la base. */
export function borneSlug(slug: string) {
  return slug.slice(0, ARTICLE_LONGUEURS.slug).replace(/-+$/, "");
}

/** Morceau d'extrait de recherche : texte simple ou mot trouvé, à mettre en valeur (socle 1.13.0). */
export type MorceauExtrait = { texte: string; trouve: boolean };

/** Extrait renvoyé par recherche_articles : les mots trouvés sont entre ⟦ et ⟧. */
export function decouperExtrait(extrait: string): MorceauExtrait[] {
  return extrait
    .split(/(⟦[^⟧]*⟧)/)
    .filter(Boolean)
    .map((m) =>
      m.startsWith("⟦") && m.endsWith("⟧")
        ? { texte: m.slice(1, -1), trouve: true }
        : { texte: m.replace(/[⟦⟧]/g, ""), trouve: false },
    );
}

/** Adresse de rubrique ou de série dans l'adresse de /blog : même forme que la base. */
export function cleanBlogSlug(value: unknown) {
  const v = String(value ?? "")
    .trim()
    .toLowerCase();
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v) && v.length <= 80 ? v : "";
}
