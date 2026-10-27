import { createFileRoute } from "@tanstack/react-router";
import { fallbackSiteConfig } from "@/lib/site-config";
import { loadSiteConfig } from "@/lib/site-config.functions";
import { siteLocale } from "@/config/brand";

/** Manifeste d'installation sur l'écran d'accueil : nom repris des paramètres du site. */
export const Route = createFileRoute("/manifest.webmanifest")({
  server: {
    handlers: {
      GET: async () => {
        const { brand } = await loadSiteConfig().catch(() => fallbackSiteConfig);
        const manifest = {
          name: brand.name,
          short_name: brand.shortName,
          ...(brand.tagline ? { description: brand.tagline } : {}),
          lang: siteLocale.lang,
          start_url: "/",
          scope: "/",
          display: "standalone",
          orientation: "portrait",
          background_color: "#eaeff5",
          theme_color: brand.apparence.couleurNavigateur || "#eaeff5",
          // Icône d'application réglée en admin (Paramètres → Apparence), sinon icônes neutres.
          icons: brand.apparence.icone
            ? [
                { src: brand.apparence.icone, sizes: "512x512", purpose: "any" },
                { src: brand.apparence.icone, sizes: "512x512", purpose: "maskable" },
              ]
            : [
                { src: "/favicon.png", sizes: "64x64", type: "image/png" },
                { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
                { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
                { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
              ],
        };
        return new Response(JSON.stringify(manifest, null, 2), {
          headers: {
            "Content-Type": "application/manifest+json; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
