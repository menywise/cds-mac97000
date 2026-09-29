import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PageShell } from "@/components/cds/SiteHeader";
import { NewsletterForm } from "@/components/cds/NewsletterForm";
import { AdSlot } from "@/components/cds/AdSlot";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listPosts } from "@/lib/content.functions";
import { readingMinutes } from "@/lib/reading";
import { seo } from "@/lib/seo";
import { requireFeature } from "@/config/features";

export const Route = createFileRoute("/blog/")({
  beforeLoad: () => requireFeature("blog"),
  loader: () => listPosts(),
  head: () =>
    seo({
      title: "Blog",
      description:
        "Méthodes concrètes pour indépendants, artisans et solopreneurs : socle réutilisable, conformité, référencement, conversion. Du vécu, pas des généralités.",
      path: "/blog",
      type: "website",
    }),
  errorComponent: () => (
    <PageShell>
      <p className="text-sm text-muted-foreground">Les articles n'ont pas pu être chargés.</p>
    </PageShell>
  ),
  notFoundComponent: () => (
    <PageShell>
      <p className="text-sm text-muted-foreground">Cette page n'existe pas.</p>
    </PageShell>
  ),
  component: BlogIndex,
});

function BlogIndex() {
  const posts = Route.useLoaderData();
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);

  const tags = useMemo(
    () =>
      [...new Set(posts.flatMap((post) => post.tags ?? []))].sort((a, b) =>
        a.localeCompare(b, "fr"),
      ),
    [posts],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return posts.filter((post) => {
      const matchTag = !tag || (post.tags ?? []).includes(tag);
      const matchQuery =
        needle.length === 0 ||
        `${post.title} ${post.excerpt} ${post.content}`.toLowerCase().includes(needle);
      return matchTag && matchQuery;
    });
  }, [posts, query, tag]);

  return (
    <PageShell>
      <div className="mx-auto max-w-[820px]">
        <p className="text-xs font-medium uppercase tracking-wide text-primary-text">Blog</p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">
          Ce qui fait vraiment avancer un projet web
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Vous cherchez des repères fiables plutôt que des avis tranchés. Chaque article part d'une
          situation réelle et se termine par ce que vous pouvez appliquer aujourd'hui.
        </p>

        <div className="mt-6 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="blog-search">Rechercher un article</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="blog-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Un mot suffit : référencement, conformité, tarifs…"
                className="pl-9"
              />
            </div>
          </div>

          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTag(null)}
                title="Afficher tous les articles"
                className={`min-h-11 rounded-md border px-3 text-xs font-medium transition-colors ${
                  tag === null
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                Tous les sujets
              </button>
              {tags.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTag(item === tag ? null : item)}
                  title={`Afficher les articles sur : ${item}`}
                  className={`min-h-11 rounded-md border px-3 text-xs font-medium transition-colors ${
                    tag === item
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {visible.length === 0 ? (
          <p className="mt-10 rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Aucun article ne correspond à votre recherche. Essayez un mot plus large.
          </p>
        ) : (
          <div className="mt-8 space-y-4">
            {visible.map((post) => (
              <article key={post.id} className="rounded-xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold text-foreground">
                  <Link
                    to="/blog/$slug"
                    params={{ slug: post.slug }}
                    title={`Lire l'article : ${post.title}`}
                    className="hover:text-primary-text"
                  >
                    {post.title}
                  </Link>
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {post.published_at
                    ? new Date(post.published_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "À paraître"}{" "}
                  — {readingMinutes(post.content)} min de lecture
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{post.excerpt}</p>
                {(post.tags ?? []).length > 0 ? (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {(post.tags ?? []).map((item) => (
                      <li
                        key={item}
                        className="rounded border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <Link
                  to="/blog/$slug"
                  params={{ slug: post.slug }}
                  title={`Lire l'article : ${post.title}`}
                  className="mt-3 inline-block text-sm font-medium text-primary-text hover:underline"
                >
                  Lire la suite
                </Link>
              </article>
            ))}
          </div>
        )}

        <p className="mt-6 text-xs text-muted-foreground">
          Vous préférez suivre les nouveautés depuis votre lecteur ?{" "}
          <a
            href="/rss.xml"
            title="Ouvrir le flux de syndication des articles"
            className="text-primary-text hover:underline"
          >
            Flux RSS des articles
          </a>
          .
        </p>

        <AdSlot placement="blog-liste" className="mt-10" />

        <div className="mt-10">
          <NewsletterForm source="blog" />
        </div>
      </div>
    </PageShell>
  );
}
