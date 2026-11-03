import { createFileRoute } from "@tanstack/react-router";
import { listFeedPosts } from "@/lib/content.functions";
import { isModuleOn } from "@/config/modules";
import { fallbackSiteConfig } from "@/lib/site-config";
import { loadSiteConfig } from "@/lib/site-config.functions";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Flux de syndication des articles du blog. Filtres (socle 1.12.0) : `?rubrique=<adresse>` ou
 * `?etiquette=<adresse>` ; un filtre inconnu répond 404.
 */
export const Route = createFileRoute("/rss.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const site = await loadSiteConfig().catch(() => fallbackSiteConfig);
        if (!isModuleOn(site.modules, "blog")) {
          return new Response("Flux indisponible", { status: 404 });
        }
        // Adresses absolues exigées : sans URL réglée en admin, celle de la requête.
        const brand = {
          ...site.brand,
          url: /^https?:\/\//.test(site.brand.url) ? site.brand.url : new URL(request.url).origin,
        };
        const params = new URL(request.url).searchParams;
        const filtre = {
          rubrique: params.get("rubrique") ?? "",
          etiquette: params.get("etiquette") ?? "",
        };
        let items = "";
        let titre = "";
        try {
          const flux = await listFeedPosts({ data: filtre });
          if (!flux) return new Response("Flux inconnu", { status: 404 });
          titre = flux.titre;
          items = flux.posts
            .map((post) => {
              const url = `${brand.url}/blog/${post.slug}`;
              const date = post.published_at
                ? new Date(post.published_at).toUTCString()
                : new Date().toUTCString();
              return `    <item>\n      <title>${escapeXml(post.title)}</title>\n      <link>${url}</link>\n      <guid isPermaLink="true">${url}</guid>\n      <pubDate>${date}</pubDate>\n      <description>${escapeXml(post.excerpt)}</description>\n${(post.tags ?? []).map((t) => `      <category>${escapeXml(t)}</category>\n`).join("")}    </item>`;
            })
            .join("\n");
        } catch {
          /* le flux reste valide même sans article */
        }

        const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(brand.name)} — Blog${titre ? ` — ${escapeXml(titre)}` : ""}</title>
    <link>${brand.url}/blog</link>
    <atom:link href="${escapeXml(request.url.replace(/^https?:\/\/[^/]+/, brand.url))}" rel="self" type="application/rss+xml" />
    <description>${escapeXml(brand.tagline || `Les articles de ${brand.name}`)}</description>
    <language>fr-FR</language>
${items}
  </channel>
</rss>
`;

        return new Response(body, {
          headers: {
            "Content-Type": "application/rss+xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
