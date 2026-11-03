import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PageShell } from "@/components/cds/SiteHeader";
import { erreurChargement } from "@/components/cds/ErreurChargement";
import { ListeArticles } from "@/components/cds/ListeArticles";
import { getRubrique } from "@/lib/content.functions";
import { clampText, breadcrumbJsonLd, seo } from "@/lib/seo";
import { requireFeature } from "@/config/features";

/** Page de rubrique (socle 1.11.0) : introduction, sous-rubriques, articles en ligne. */
export const Route = createFileRoute("/blog/rubrique/$slug")({
  beforeLoad: () => requireFeature("blog"),
  loader: async ({ params }) => {
    const data = await getRubrique({ data: { slug: params.slug } });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData, params }) => {
    const r = loaderData?.rubrique;
    const seoBase = seo({
      title: r ? `${r.libelle} — Blog` : "Rubrique",
      description: clampText(r?.intro || `Les articles de la rubrique ${r?.libelle ?? ""}.`, 160),
      path: `/blog/rubrique/${params.slug}`,
      type: "website",
      // Rubrique introuvable (404) ou sans article en ligne (page pauvre) : non indexée.
      ...(!loaderData || loaderData.posts.length === 0 ? { noindex: true } : {}),
    });
    return {
      ...seoBase,
      links: [
        ...seoBase.links,
        {
          rel: "alternate",
          type: "application/rss+xml",
          title: `Flux RSS : ${r?.libelle ?? ""}`,
          href: `/rss.xml?rubrique=${params.slug}`,
        },
      ],
      scripts: [
        breadcrumbJsonLd([
          { name: "Accueil", path: "/" },
          { name: "Blog", path: "/blog" },
          ...(loaderData?.parent
            ? [
                {
                  name: loaderData.parent.libelle,
                  path: `/blog/rubrique/${loaderData.parent.slug}`,
                },
              ]
            : []),
          { name: r?.libelle ?? "Rubrique", path: `/blog/rubrique/${params.slug}` },
        ]),
      ],
    };
  },
  errorComponent: erreurChargement("Cette rubrique n'a pas pu être chargée."),
  notFoundComponent: () => (
    <PageShell>
      <h1 className="text-2xl font-bold text-foreground">Rubrique introuvable</h1>
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
  component: RubriquePage,
});

function RubriquePage() {
  const { rubrique, parent, enfants, posts } = Route.useLoaderData();
  return (
    <PageShell>
      <div className="mx-auto max-w-[820px]">
        <nav aria-label="Fil d'Ariane" className="text-xs font-medium text-primary-text">
          <Link to="/blog" title="Revenir à la liste des articles" className="hover:underline">
            Blog
          </Link>
          {parent ? (
            <>
              {" › "}
              <Link
                to="/blog/rubrique/$slug"
                params={{ slug: parent.slug }}
                title={`Rubrique « ${parent.libelle} »`}
                className="hover:underline"
              >
                {parent.libelle}
              </Link>
            </>
          ) : null}
        </nav>
        <h1 className="mt-3 text-3xl font-bold text-foreground">{rubrique.libelle}</h1>
        {rubrique.intro ? <p className="mt-3 text-sm text-foreground">{rubrique.intro}</p> : null}
        {enfants.length > 0 ? (
          <ul className="mt-6 flex flex-wrap gap-2 rounded-xl border border-border bg-card p-3">
            {enfants.map((e) => (
              <li key={e.slug}>
                <Link
                  to="/blog/rubrique/$slug"
                  params={{ slug: e.slug }}
                  title={`Rubrique « ${e.libelle} »`}
                  className="inline-flex min-h-11 items-center rounded-md border border-border px-3 text-sm text-foreground hover:border-primary"
                >
                  {e.libelle}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        <ListeArticles
          posts={posts}
          vide="Les premiers articles de cette rubrique sont en préparation."
        />
      </div>
    </PageShell>
  );
}
