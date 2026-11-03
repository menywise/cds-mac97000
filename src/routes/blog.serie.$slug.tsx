import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PageShell } from "@/components/cds/SiteHeader";
import { erreurChargement } from "@/components/cds/ErreurChargement";
import { ListeArticles } from "@/components/cds/ListeArticles";
import { getSerie } from "@/lib/content.functions";
import { clampText, breadcrumbJsonLd, seo } from "@/lib/seo";
import { requireFeature } from "@/config/features";

/** Page de série (socle 1.11.0) : présentation et articles dans l'ordre de lecture. */
export const Route = createFileRoute("/blog/serie/$slug")({
  beforeLoad: () => requireFeature("blog"),
  loader: async ({ params }) => {
    const data = await getSerie({ data: { slug: params.slug } });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData, params }) => {
    const s = loaderData?.serie;
    return {
      ...seo({
        title: s ? `${s.titre} — Série` : "Série",
        description: clampText(
          s?.description || `Les articles de la série ${s?.titre ?? ""}.`,
          160,
        ),
        path: `/blog/serie/${params.slug}`,
        type: "website",
        ...(loaderData && loaderData.posts.length === 0 ? { noindex: true } : {}),
      }),
      scripts: [
        breadcrumbJsonLd([
          { name: "Accueil", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: s?.titre ?? "Série", path: `/blog/serie/${params.slug}` },
        ]),
      ],
    };
  },
  errorComponent: erreurChargement("Cette série n'a pas pu être chargée."),
  notFoundComponent: () => (
    <PageShell>
      <h1 className="text-2xl font-bold text-foreground">Série introuvable</h1>
      <p className="mt-2 text-sm text-foreground">
        <Link
          to="/blog"
          title="Revenir à la liste des articles"
          className="text-primary-text hover:underline"
        >
          Revenir au blog
        </Link>
      </p>
    </PageShell>
  ),
  component: SeriePage,
});

function SeriePage() {
  const { serie, posts } = Route.useLoaderData();
  return (
    <PageShell>
      <div className="mx-auto max-w-[820px]">
        <nav aria-label="Fil d'Ariane" className="text-xs font-medium text-primary-text">
          <Link to="/blog" title="Revenir à la liste des articles" className="hover:underline">
            Blog
          </Link>
        </nav>
        <p className="mt-3 text-xs font-medium uppercase tracking-wide text-primary-text">Série</p>
        <h1 className="mt-1 text-3xl font-bold text-foreground">{serie.titre}</h1>
        {serie.description ? (
          <p className="mt-3 text-sm text-foreground">{serie.description}</p>
        ) : null}
        <ListeArticles
          posts={posts}
          numeros
          vide="Les articles de cette série sont en préparation."
        />
      </div>
    </PageShell>
  );
}
