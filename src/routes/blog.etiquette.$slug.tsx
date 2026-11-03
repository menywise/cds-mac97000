import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PageShell } from "@/components/cds/SiteHeader";
import { erreurChargement } from "@/components/cds/ErreurChargement";
import { ListeArticles } from "@/components/cds/ListeArticles";
import { getEtiquette } from "@/lib/content.functions";
import { clampText, breadcrumbJsonLd, seo } from "@/lib/seo";
import { requireFeature } from "@/config/features";

/**
 * Page d'étiquette (socle 1.11.0) : définition et articles en ligne. Indexée seulement à partir du
 * seuil d'articles réglé dans le poste Éditorial : pas de pages pauvres dans les moteurs.
 */
export const Route = createFileRoute("/blog/etiquette/$slug")({
  beforeLoad: () => requireFeature("blog"),
  loader: async ({ params }) => {
    const data = await getEtiquette({ data: { slug: params.slug } });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData, params }) => {
    const e = loaderData?.etiquette;
    return {
      ...seo({
        title: e ? `${e.libelle} — Blog` : "Étiquette",
        description: clampText(e?.definition || `Les articles sur : ${e?.libelle ?? ""}.`, 160),
        path: `/blog/etiquette/${params.slug}`,
        type: "website",
        ...(loaderData && !loaderData.indexable ? { noindex: true } : {}),
      }),
      scripts: [
        breadcrumbJsonLd([
          { name: "Accueil", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: e?.libelle ?? "Étiquette", path: `/blog/etiquette/${params.slug}` },
        ]),
      ],
    };
  },
  errorComponent: erreurChargement("Cette étiquette n'a pas pu être chargée."),
  notFoundComponent: () => (
    <PageShell>
      <h1 className="text-2xl font-bold text-foreground">Étiquette introuvable</h1>
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
  component: EtiquettePage,
});

function EtiquettePage() {
  const { etiquette, posts } = Route.useLoaderData();
  return (
    <PageShell>
      <div className="mx-auto max-w-[820px]">
        <nav aria-label="Fil d'Ariane" className="text-xs font-medium text-primary-text">
          <Link to="/blog" title="Revenir à la liste des articles" className="hover:underline">
            Blog
          </Link>
        </nav>
        <h1 className="mt-3 text-3xl font-bold text-foreground">{etiquette.libelle}</h1>
        {etiquette.definition ? (
          <p className="mt-3 text-sm text-foreground">{etiquette.definition}</p>
        ) : null}
        <ListeArticles
          posts={posts}
          vide="Aucun article en ligne ne porte encore cette étiquette."
        />
      </div>
    </PageShell>
  );
}
