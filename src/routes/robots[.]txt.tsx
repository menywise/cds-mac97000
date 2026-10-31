import { createFileRoute } from "@tanstack/react-router";
import { fallbackSiteConfig } from "@/lib/site-config";
import { loadSiteConfig } from "@/lib/site-config.functions";
import { texteRobots } from "@/lib/robots";

/** robots.txt : l'adresse du sitemap suit l'URL saisie en admin ; texte dans `src/lib/robots.ts`. */
export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () => {
        const site = await loadSiteConfig().catch(() => fallbackSiteConfig);
        const texte = texteRobots({ url: site.brand.url, horsIndex: site.brand.horsIndex });
        return new Response(texte, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
