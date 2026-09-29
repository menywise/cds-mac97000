import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  redirect,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { siteLocale } from "@/config/brand";
import { getSiteConfig, setSiteConfig, siteConfigScript } from "@/lib/site-config";
import { loadSiteConfig } from "@/lib/site-config.functions";
import { isFeatureOn } from "@/config/features";
import { isPathOff } from "@/config/modules";

export function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="text-7xl font-bold text-primary-text">404</p>
        <h1 className="mt-4 text-xl font-semibold text-foreground">Page introuvable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          La page demandée n'existe pas ou a été déplacée.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            to="/"
            title="Revenir à la page d'accueil"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Retour à l'accueil
          </Link>
          {isFeatureOn("contact") ? (
            <Link
              to="/contact"
              title="Signaler un lien cassé via le formulaire de contact"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Nous signaler le problème
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Cette page n'a pas pu s'afficher
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Une erreur est survenue de notre côté. Réessayez ou revenez à l'accueil.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            title="Recharger la page"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Réessayer
          </button>
          <a
            href="/"
            title="Revenir à la page d'accueil"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Retour à l'accueil
          </a>
        </div>
      </div>
    </div>
  );
}

/** Données structurées de l'éditeur : uniquement les champs saisis en admin. */
function organizationJsonLd() {
  const { brand } = getSiteConfig();
  const name = brand.legal.company || brand.name;
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    ...(brand.legal.company && brand.legal.form
      ? { legalName: `${brand.legal.company} — ${brand.legal.form}` }
      : {}),
    ...(brand.url ? { url: brand.url } : {}),
    ...(brand.legal.address
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: brand.legal.address,
            ...(brand.legal.country ? { addressCountry: brand.legal.country } : {}),
          },
        }
      : {}),
    ...(brand.url
      ? {
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer support",
            url: `${brand.url}/contact`,
            availableLanguage: [siteLocale.lang],
          },
        }
      : {}),
  };
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  /**
   * Paramètres du site lus en base AVANT toute autre route : titres, canonical,
   * JSON-LD et interrupteurs des modules sont justes dans le HTML indexé.
   * En cas d'échec, la dernière configuration connue (ou le repli neutre) reste en place.
   */
  beforeLoad: async ({ location }) => {
    const onServer = typeof window === "undefined";
    if (onServer || !window.__CDS_SITE__) {
      try {
        setSiteConfig(await loadSiteConfig());
      } catch (error) {
        console.error(error);
      }
    }
    // Page de l'espace connecté d'un module éteint : retour à l'accueil dès le serveur.
    if (isPathOff(getSiteConfig().modules, location.pathname)) throw redirect({ to: "/" });
  },
  head: () => {
    const { brand } = getSiteConfig();
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
        { name: "theme-color", content: "#f8fafc" },
        { name: "mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-title", content: brand.shortName },
        { name: "apple-mobile-web-app-status-bar-style", content: "default" },
        ...(brand.legal.company ? [{ name: "author", content: brand.legal.company }] : []),
        { property: "og:site_name", content: brand.name },
        { property: "og:locale", content: siteLocale.og },
      ],
      links: [
        {
          rel: "stylesheet",
          href: appCss,
        },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
        },
        { rel: "icon", type: "image/png", href: "/favicon.png" },
        { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
        { rel: "manifest", href: "/manifest.webmanifest" },
      ],
      scripts: [
        // Doit précéder le code du navigateur : l'hydratation relit ces valeurs.
        { children: siteConfigScript() },
        {
          type: "application/ld+json",
          children: JSON.stringify(organizationJsonLd()),
        },
      ],
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang={siteLocale.lang}>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Toaster />
    </QueryClientProvider>
  );
}
