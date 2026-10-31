import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { PageShell } from "@/components/cds/SiteHeader";
import { erreurChargement } from "@/components/cds/ErreurChargement";
import { NewsletterForm } from "@/components/cds/NewsletterForm";
import { AdSlot } from "@/components/cds/AdSlot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listBlogPage } from "@/lib/content.functions";
import { BLOG_SEARCH_MAX_LENGTH, cleanBlogPage, cleanBlogSearch, cleanBlogTag } from "@/lib/blog";
import { seo } from "@/lib/seo";
import { requireFeature } from "@/config/features";

/** Paramètres d'adresse de la liste : page, recherche, étiquette. Absents quand neutres. */
type BlogSearch = { page?: number; q?: string; tag?: string };

/** Délai avant de relancer la liste pendant la saisie d'une recherche. */
const SEARCH_DELAY_MS = 300;

export const Route = createFileRoute("/blog/")({
  validateSearch: (search: Record<string, unknown>): BlogSearch => {
    const page = cleanBlogPage(search["page"]);
    const q = cleanBlogSearch(search["q"]);
    const tag = cleanBlogTag(search["tag"]);
    return {
      ...(page > 1 ? { page } : {}),
      ...(q ? { q } : {}),
      ...(tag ? { tag } : {}),
    };
  },
  beforeLoad: () => requireFeature("blog"),
  loaderDeps: ({ search }) => ({
    page: search.page ?? 1,
    q: search.q ?? "",
    tag: search.tag ?? "",
  }),
  // Liste filtrée et paginée en base (12 par page), sans le texte des articles.
  loader: async ({ deps }) => {
    const data = await listBlogPage({ data: deps });
    // Numéro de page au-delà de la dernière : renvoi vers la dernière page.
    if (deps.page > data.pageCount) {
      throw redirect({
        to: "/blog",
        search: {
          ...(data.pageCount > 1 ? { page: data.pageCount } : {}),
          ...(deps.q ? { q: deps.q } : {}),
          ...(deps.tag ? { tag: deps.tag } : {}),
        },
        replace: true,
      });
    }
    return data;
  },
  head: ({ match }) =>
    seo({
      title:
        match.search.page && match.search.page > 1 ? `Blog — page ${match.search.page}` : "Blog",
      description:
        "Méthodes concrètes pour indépendants, artisans et solopreneurs : socle réutilisable, conformité, référencement, conversion. Du vécu, pas des généralités.",
      path: "/blog",
      type: "website",
      // Les résultats d'une recherche ou d'un filtre ne sont pas des pages à indexer.
      ...(match.search.q || match.search.tag ? { noindex: true } : {}),
    }),
  errorComponent: erreurChargement("Les articles n'ont pas pu être chargés."),
  notFoundComponent: () => (
    <PageShell>
      <p className="text-sm text-foreground">Cette page n'existe pas.</p>
    </PageShell>
  ),
  component: BlogIndex,
});

function BlogIndex() {
  const { posts, page, pageCount, tags } = Route.useLoaderData();
  const { q = "", tag = null } = Route.useSearch();
  const navigate = useNavigate();
  const [query, setQuery] = useState(q);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Retour arrière ou adresse partagée : le champ reflète l'adresse. Pendant la saisie, la
  // valeur tapée est conservée (l'adresse en porte la forme nettoyée, sans espace final).
  useEffect(() => {
    setQuery((current) => (cleanBlogSearch(current) === q ? current : q));
  }, [q]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  /** Applique une recherche ou une étiquette : retour à la première page, adresse remplacée. */
  function apply(next: { q?: string; tag?: string | null }) {
    const nextQ = cleanBlogSearch(next.q ?? q);
    const nextTag = next.tag === undefined ? tag : next.tag;
    void navigate({
      to: "/blog",
      search: { ...(nextQ ? { q: nextQ } : {}), ...(nextTag ? { tag: nextTag } : {}) },
      replace: true,
    });
  }

  function onQueryChange(value: string) {
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => apply({ q: value }), SEARCH_DELAY_MS);
  }

  const pageSearch = (n: number) => ({
    ...(n > 1 ? { page: n } : {}),
    ...(q ? { q } : {}),
    ...(tag ? { tag } : {}),
  });

  return (
    <PageShell>
      <div className="mx-auto max-w-[820px]">
        <p className="text-xs font-medium uppercase tracking-wide text-primary-text">Blog</p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">
          Ce qui fait vraiment avancer un projet web
        </h1>
        <p className="mt-2 text-sm text-foreground">
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
                type="search"
                value={query}
                maxLength={BLOG_SEARCH_MAX_LENGTH}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Un mot suffit : référencement, conformité, tarifs…"
                className="pl-9"
              />
            </div>
          </div>

          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => apply({ tag: null })}
                title="Afficher tous les articles"
                className={`min-h-11 rounded-md border px-3 text-xs font-medium transition-colors ${
                  tag === null
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground"
                }`}
              >
                Tous les sujets
              </button>
              {tags.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => apply({ tag: item === tag ? null : item })}
                  title={`Afficher les articles sur : ${item}`}
                  className={`min-h-11 rounded-md border px-3 text-xs font-medium transition-colors ${
                    tag === item
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {posts.length === 0 ? (
          <p className="mt-10 rounded-lg border border-dashed border-border p-10 text-center text-sm text-foreground">
            Aucun article ne correspond à votre recherche. Essayez un mot plus large.
          </p>
        ) : (
          <div className="mt-8 space-y-4">
            {posts.map((post) => (
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
                  — {post.reading_minutes} min de lecture
                </p>
                <p className="mt-2 text-sm text-foreground">{post.excerpt}</p>
                {(post.tags ?? []).length > 0 ? (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {(post.tags ?? []).map((item) => (
                      <li
                        key={item}
                        className="rounded border border-neutral-border bg-neutral-soft px-2 py-0.5 text-[11px] text-neutral-text"
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

        {pageCount > 1 ? (
          <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-3">
            {page > 1 ? (
              <Button asChild variant="outline">
                <Link to="/blog" search={pageSearch(page - 1)} title="Page précédente">
                  Précédent
                </Link>
              </Button>
            ) : (
              <Button variant="outline" disabled title="Page précédente">
                Précédent
              </Button>
            )}
            <span className="text-sm text-muted-foreground">
              Page {page} sur {pageCount}
            </span>
            {page < pageCount ? (
              <Button asChild variant="outline">
                <Link to="/blog" search={pageSearch(page + 1)} title="Page suivante">
                  Suivant
                </Link>
              </Button>
            ) : (
              <Button variant="outline" disabled title="Page suivante">
                Suivant
              </Button>
            )}
          </nav>
        ) : null}

        <p className="mt-6 text-xs text-foreground">
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
