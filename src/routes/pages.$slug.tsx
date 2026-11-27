import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { PageShell } from "@/components/cds/SiteHeader";
import { erreurChargement } from "@/components/cds/ErreurChargement";
import { PageRender } from "@/components/cds/PageSections";
import { requireFeature } from "@/config/features";
import { getPublicPage } from "@/lib/content.functions";
import { pageExcerpt, pageFaqJsonLd, toPageRow } from "@/lib/pages";
import { breadcrumbJsonLd, seo } from "@/lib/seo";

export const Route = createFileRoute("/pages/$slug")({
  beforeLoad: () => requireFeature("pages"),
  loader: async ({ params }) => {
    const page = toPageRow(await getPublicPage({ data: { slug: params.slug } }));
    if (!page) throw notFound();
    // La page d'accueil n'a qu'une adresse : « / ».
    if (page.is_home) throw redirect({ to: "/" });
    return page;
  },
  head: ({ loaderData: page, params }) => {
    const path = `/pages/${params.slug}`;
    const base = seo({
      title: page?.title ?? "Page",
      description:
        page?.description || (page ? pageExcerpt(page.data) : "") || page?.title || "Page",
      path,
      // Page satellite d'une campagne (socle 1.22.0) : en ligne pour qui a le lien, hors des moteurs.
      noindex: page?.hors_index ?? false,
    });
    const faq = page ? pageFaqJsonLd(page.data) : null;
    return {
      ...base,
      scripts: [
        breadcrumbJsonLd([
          { name: "Accueil", path: "/" },
          { name: page?.title ?? "Page", path },
        ]),
        ...(faq ? [faq] : []),
      ],
    };
  },
  errorComponent: erreurChargement("Cette page n'a pas pu être chargée."),
  notFoundComponent: () => (
    <PageShell>
      <h1 className="text-2xl font-bold text-foreground">Page introuvable</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Cette page n'existe plus ou n'est pas encore publiée.{" "}
        <Link to="/" title="Revenir à l'accueil" className="text-primary-text hover:underline">
          Revenir à l'accueil
        </Link>
      </p>
    </PageShell>
  ),
  component: FreePage,
});

function FreePage() {
  const page = Route.useLoaderData();
  return (
    <PageShell>
      <PageRender data={page.data} titleFallback={page.title} />
    </PageShell>
  );
}
