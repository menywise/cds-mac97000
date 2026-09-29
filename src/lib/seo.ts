import { absoluteUrl, getSiteConfig } from "@/lib/site-config";
import { siteLocale } from "@/config/brand";

type SeoInput = {
  /** Titre de la page, sans le suffixe de marque. */
  title: string;
  description: string;
  /** Chemin interne de la page ("/contact"). */
  path: string;
  type?: "website" | "article";
  /** Empêcher l'indexation (pages utilitaires, espace connecté). */
  noindex?: boolean;
  /** Image de partage absolue 1200x630. */
  image?: string;
};

/**
 * Métadonnées SEO cohérentes pour toutes les routes :
 * title, description, canonical auto-référent, Open Graph et Twitter.
 * Nom et URL viennent des paramètres saisis en admin (`site_settings`).
 */
export function seo({
  title,
  description,
  path,
  type = "website",
  noindex,
  image = absoluteUrl("/og-cds.jpg"),
}: SeoInput) {
  const { brand } = getSiteConfig();
  // Garde-fou pour les textes saisis en admin (devise, extrait d'article) : 160 caractères au plus.
  description = clampText(description, 160);
  const fullTitle = !brand.shortName || title.includes(brand.shortName) ? title : `${title} — ${brand.shortName}`;
  const url = absoluteUrl(path);

  const meta: Array<Record<string, string>> = [
    { title: fullTitle },
    { name: "description", content: description },
    { property: "og:title", content: fullTitle },
    { property: "og:description", content: description },
    { property: "og:type", content: type },
    { property: "og:url", content: url },
    { property: "og:locale", content: siteLocale.og },
    { property: "og:site_name", content: brand.name },
    { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
    { name: "twitter:title", content: fullTitle },
    { name: "twitter:description", content: description },
  ];

  if (image) {
    meta.push({ property: "og:image", content: image });
    meta.push({ name: "twitter:image", content: image });
  }

  meta.push({
    name: "robots",
    content: noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large",
  });

  return {
    meta,
    links: noindex ? [] : [{ rel: "canonical", href: url }],
  };
}

/** Fil d'Ariane structuré (JSON-LD) pour les pages profondes. */
export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    type: "application/ld+json",
    children: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: absoluteUrl(item.path),
      })),
    }),
  };
}

/** Coupe un texte au dernier mot entier avant `max` caractères, avec « … ». */
export function clampText(text: string, max: number) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.–—-]+$/, "")}…`;
}
