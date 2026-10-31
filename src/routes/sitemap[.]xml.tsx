import { createFileRoute } from "@tanstack/react-router";
import { listPublicPages, listSitemapPosts, listSitemapTopics } from "@/lib/content.functions";
import { isModuleOn, onlyActive, type FeatureKey } from "@/config/modules";
import { loadSiteConfig } from "@/lib/site-config.functions";
import { listSitemapProducts } from "@/lib/shop.functions";
import { listDirectorySitemap } from "@/lib/directory.functions";
import { fallbackSiteConfig } from "@/lib/site-config";
import { GREFFE } from "@/greffe";
import { lastmodLine, latestDay, toDay } from "@/lib/sitemap";

type SitemapPage = {
  path: string;
  priority: string;
  changefreq: string;
  module?: FeatureKey;
  /** Date réelle de dernière modification (AAAA-MM-JJ) ; absente quand le site ne la connaît pas. */
  lastmod?: string | undefined;
};

/** Pages publiques indexables, avec leur priorité et le module dont elles dépendent. */
const pages: SitemapPage[] = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/a-propos", priority: "0.8", changefreq: "monthly" },
  { path: "/demarrer", priority: "0.9", changefreq: "monthly", module: "onboarding" },
  { path: "/composants", priority: "0.9", changefreq: "weekly", module: "showcase" },
  { path: "/guide", priority: "0.9", changefreq: "monthly", module: "showcase" },
  { path: "/tarifs", priority: "0.9", changefreq: "monthly", module: "pricing" },
  { path: "/blog", priority: "0.9", changefreq: "weekly", module: "blog" },
  { path: "/faq", priority: "0.8", changefreq: "monthly", module: "faq" },
  { path: "/forum", priority: "0.8", changefreq: "daily", module: "forum" },
  { path: "/membres", priority: "0.7", changefreq: "weekly", module: "members" },
  { path: "/temoignages", priority: "0.8", changefreq: "weekly", module: "testimonials" },
  { path: "/avis", priority: "0.8", changefreq: "weekly", module: "reviews" },
  { path: "/ameliorations", priority: "0.5", changefreq: "weekly", module: "reports" },
  { path: "/plan-du-site", priority: "0.6", changefreq: "monthly" },
  { path: "/contact", priority: "0.7", changefreq: "yearly", module: "contact" },
  { path: "/login", priority: "0.5", changefreq: "yearly" },
  { path: "/signup", priority: "0.5", changefreq: "yearly" },
  { path: "/legal/mentions-legales", priority: "0.4", changefreq: "yearly" },
  { path: "/legal/confidentialite", priority: "0.4", changefreq: "yearly" },
  { path: "/legal/cgu", priority: "0.4", changefreq: "yearly" },
  { path: "/legal/cgv", priority: "0.4", changefreq: "yearly" },
  { path: "/legal/cookies", priority: "0.4", changefreq: "yearly" },
  { path: "/annuaire", priority: "0.9", changefreq: "daily", module: "directory" },
  { path: "/annuaire/soumettre", priority: "0.6", changefreq: "monthly", module: "directory" },
  { path: "/annuaire/departements", priority: "0.8", changefreq: "weekly", module: "geo" },
  { path: "/formations", priority: "0.9", changefreq: "weekly", module: "lms" },
  { path: "/boutique", priority: "0.9", changefreq: "weekly", module: "shop" },
  { path: "/marketplace", priority: "0.9", changefreq: "daily", module: "marketplace" },
  { path: "/marketplace/publier", priority: "0.6", changefreq: "monthly", module: "marketplace" },
  { path: "/publicite", priority: "0.6", changefreq: "monthly", module: "adNetwork" },
  // Pages publiques déclarées par le projet (prise de greffe).
  ...(GREFFE.pagesPubliques ?? [])
    .filter((p) => p.sitemap !== false)
    .map((p) => ({
      path: p.path,
      priority: "0.7",
      changefreq: "weekly",
      ...(p.module ? { module: p.module } : {}),
    })),
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const site = await loadSiteConfig().catch(() => fallbackSiteConfig);
        // Adresses absolues exigées : sans URL réglée en admin, celle de la requête.
        const base = /^https?:\/\//.test(site.brand.url)
          ? site.brand.url
          : new URL(request.url).origin;
        const dynamic: SitemapPage[] = [];
        // Date réelle des pages d'accueil de module : celle de leur contenu le plus récent.
        const indexDates = new Map<string, string | undefined>();
        try {
          const [posts, topics, freePages, products, directory] = await Promise.all([
            isModuleOn(site.modules, "blog") ? listSitemapPosts() : Promise.resolve([]),
            isModuleOn(site.modules, "forum") ? listSitemapTopics() : Promise.resolve([]),
            isModuleOn(site.modules, "pages") ? listPublicPages() : Promise.resolve([]),
            isModuleOn(site.modules, "shop") ? listSitemapProducts() : Promise.resolve([]),
            isModuleOn(site.modules, "directory")
              ? listDirectorySitemap({ data: { geo: isModuleOn(site.modules, "geo") } })
              : Promise.resolve(null),
          ]);
          // Annuaire : fiches publiées, catégories et départements ayant au moins une fiche.
          for (const entry of directory?.listings ?? []) {
            dynamic.push({
              path: `/annuaire/${entry.slug}`,
              priority: "0.7",
              changefreq: "weekly",
              lastmod: toDay(entry.updated_at),
            });
          }
          for (const entry of directory?.categories ?? []) {
            dynamic.push({
              path: `/annuaire/categorie/${entry.slug}`,
              priority: "0.7",
              changefreq: "weekly",
              lastmod: toDay(entry.updated_at),
            });
          }
          for (const entry of directory?.departements ?? []) {
            dynamic.push({
              path: `/annuaire/departement/${entry.slug}`,
              priority: "0.6",
              changefreq: "weekly",
              lastmod: toDay(entry.updated_at),
            });
          }
          if (directory) {
            const listingDays = latestDay(directory.listings.map((l) => l.updated_at));
            indexDates.set("/annuaire", listingDays);
            indexDates.set("/annuaire/departements", listingDays);
          }
          for (const product of products) {
            dynamic.push({
              path: `/boutique/${product.slug}`,
              priority: "0.7",
              changefreq: "weekly",
              lastmod: toDay(product.updated_at),
            });
          }
          indexDates.set("/boutique", latestDay(products.map((p) => p.updated_at)));
          for (const page of freePages) {
            if (page.is_home) {
              indexDates.set("/", toDay(page.updated_at)); // l'accueil est déjà « / »
              continue;
            }
            dynamic.push({
              path: `/pages/${page.slug}`,
              priority: "0.7",
              changefreq: "monthly",
              lastmod: toDay(page.updated_at),
            });
          }
          for (const post of posts) {
            dynamic.push({
              path: `/blog/${post.slug}`,
              priority: "0.8",
              changefreq: "monthly",
              lastmod: toDay(post.updated_at ?? post.published_at),
            });
          }
          indexDates.set("/blog", latestDay(posts.map((p) => p.updated_at ?? p.published_at)));
          for (const topic of topics) {
            dynamic.push({
              path: `/forum/${topic.id}`,
              priority: "0.6",
              changefreq: "weekly",
              lastmod: toDay(topic.last_activity_at ?? topic.updated_at ?? topic.created_at),
            });
          }
          indexDates.set(
            "/forum",
            latestDay(topics.map((t) => t.last_activity_at ?? t.updated_at ?? t.created_at)),
          );
        } catch {
          /* le plan du site reste valide avec les pages statiques */
        }
        const statics = onlyActive(site.modules, pages).map((page) => {
          const lastmod = indexDates.get(page.path);
          return lastmod ? { ...page, lastmod } : page;
        });
        const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...statics, ...dynamic]
  .map(
    (page) =>
      `  <url>\n    <loc>${base}${page.path === "/" ? "/" : page.path}</loc>\n${lastmodLine(page.lastmod)}    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>\n  </url>`,
  )
  .join("\n")}
</urlset>
`;

        return new Response(body, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
