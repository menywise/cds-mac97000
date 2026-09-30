/**
 * CDS — Recherche globale (module F, lot 10) : libellés des types de résultats.
 * La recherche elle-même est en base (`public.search_site`, français, sans accents).
 */
export const SEARCH_KINDS = {
  article: "Article",
  faq: "Question fréquente",
  sujet: "Discussion du forum",
  formation: "Formation",
  annonce: "Petite annonce",
  annuaire: "Fiche de l'annuaire",
  membre: "Membre",
  page: "Page",
} as const;

export type SearchKind = keyof typeof SEARCH_KINDS;

export type SearchResult = {
  kind: string;
  title: string;
  excerpt: string;
  url: string;
};

/** Longueur maximale d'une recherche (au-delà, la base coupe aussi). */
export const SEARCH_MAX_LENGTH = 200;

export function searchKindLabel(kind: string) {
  return SEARCH_KINDS[kind as SearchKind] ?? "Contenu";
}

/** Saisie nettoyée : espaces réduits, longueur bornée. */
export function cleanSearch(q: unknown) {
  return String(q ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, SEARCH_MAX_LENGTH);
}
