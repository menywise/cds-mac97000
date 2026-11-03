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
import { listBlogPage, listRubriquesBlog } from "@/lib/content.functions";
import {
  BLOG_SEARCH_MAX_LENGTH,
  cleanBlogPage,
  cleanBlogSearch,
  cleanBlogSlug,
  cleanBlogTag,
  decouperExtrait,
} from "@/lib/blog";
import { seo } from "@/lib/seo";
import { requireFeature } from "@/config/features";

/** Paramètres d'adresse de la liste : page, recherche, étiquette. Absents quand neutres. */
type BlogSearch = { page?: number; q?: string; tag?: string; rubrique?: string; serie?: string };

/** Délai avant de relancer la liste pendant la saisie d'une recherche. */
const SEARCH_DELAY_MS = 300;

export const Route = createFileRoute("/blog/")({
  validateSearch: (search: Record<string, unknown>): BlogSearch => {
    const page = cleanBlogPage(search["page"]);
    const q = cleanBlogSearch(search["q"]);
    const tag = cleanBlogTag(search["tag"]);
    // Rubrique et série filtrent une recherche (socle 1.13.0) : sans recherche, ignorées.
    const rubrique = q ? cleanBlogSlug(search["rubrique"]) : "";
    const serie = q ? cleanBlogSlug(search["serie"]) : "";
    return {
      ...(page > 1 ? { page } : {}),
      ...(q ? { q } : {}),
      ...(tag ? { tag } : {}),
      ...(rubrique ? { rubrique } : {}),
      ...(serie ? { serie } : {}),
    };
  },
  beforeLoad: () => requireFeature("blog"),
  loaderDeps: ({ search }) => ({
    page: search.page ?? 1,
    q: search.q ?? "",
    tag: search.tag ?? "",
    rubrique: search.rubrique ?? "",
    serie: search.serie ?? "",
  }),
  // Liste filtrée et paginée en base (12 par page), sans le texte des articles.
  loader: async ({ deps }) => {
    const [data, rubriques] = await Promise.all([
      listBlogPage({ data: deps }),
      // Navigation par rubrique : un repli silencieux, la liste reste lisible sans elle.
      listRubriquesBlog().catch(() => [] as Array<{ slug: string; libelle: string }>),
    ]);
    // Numéro de page au-delà de la dernière : renvoi vers la dernière page.
    if (deps.page > data.pageCount) {
      throw redirect({
        to: "/blog",
        search: {
          ...(data.pageCount > 1 ? { page: data.pageCount } : {}),
          ...(deps.q ? { q: deps.q } : {}),
          ...(deps.tag ? { tag: deps.tag } : {}),
          ...(deps.rubrique ? { rubrique: deps.rubrique } : {}),
          ...(deps.serie ? { serie: deps.serie } : {}),
        },
        replace: true,
      });
    }
    return { ...data, rubriques };
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
  const { posts, page, pageCount, tags, rubriques, facettes, suggestion, total } =
    Route.useLoaderData();
  const {
    q = "",
    tag = null,
    rubrique: rubriqueChoisie = "",
    serie: serieChoisie = "",
  } = Route.useSearch();
  const facettesRubrique = facettes.filter((f) => f.facette === "rubrique");
  const facettesSerie = facettes.filter((f) => f.facette === "serie");
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
    ...(rubriqueChoisie ? { rubrique: rubriqueChoisie } : {}),
    ...(serieChoisie ? { serie: serieChoisie } : {}),
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

        {rubriques.length > 0 ? (
          <nav aria-label="Rubriques" className="mt-6">
            <ul className="flex flex-wrap gap-2 rounded-xl border border-border bg-card p-3">
              {rubriques.map((r) => (
                <li key={r.slug}>
                  <Link
                    to="/blog/rubrique/$slug"
                    params={{ slug: r.slug }}
                    title={`Tous les articles de la rubrique « ${r.libelle} »`}
                    className="inline-flex min-h-11 items-center rounded-md border border-border px-3 text-sm font-medium text-foreground hover:border-primary"
                  >
                    {r.libelle}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

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

        {q ? (
          <div className="mt-6 space-y-3 text-sm text-foreground">
            <p>
              {total} article{total > 1 ? "s" : ""} pour « {q} ».
              {suggestion ? (
                <>
                  {" "}
                  Vouliez-vous dire{" "}
                  <Link
                    to="/blog"
                    search={{ q: suggestion }}
                    title={`Chercher « ${suggestion} »`}
                    className="font-medium text-primary-text underline underline-offset-2"
                  >
                    {suggestion}
                  </Link>{" "}
                  ?
                </>
              ) : null}
            </p>
            {facettesRubrique.length > 0 || facettesSerie.length > 0 ? (
              <ul
                aria-label="Affiner la recherche"
                className="flex flex-wrap gap-2 rounded-xl border border-border bg-card p-3"
              >
                {rubriqueChoisie || serieChoisie ? (
                  <li>
                    <Link
                      to="/blog"
                      search={{ q, ...(tag ? { tag } : {}) }}
                      title="Retirer le filtre"
                      className="inline-flex min-h-11 items-center rounded-md border border-primary bg-primary px-3 text-xs font-medium text-primary-foreground"
                    >
                      Tout voir
                    </Link>
                  </li>
                ) : null}
                {[...facettesRubrique, ...facettesSerie].map((f) => {
                  const actif =
                    f.facette === "rubrique" ? f.cle === rubriqueChoisie : f.cle === serieChoisie;
                  return (
                    <li key={`${f.facette}-${f.cle}`}>
                      <Link
                        to="/blog"
                        search={{
                          q,
                          ...(tag ? { tag } : {}),
                          ...(f.facette === "rubrique" ? { rubrique: f.cle } : { serie: f.cle }),
                        }}
                        title={`Limiter à : ${f.libelle}`}
                        className={`inline-flex min-h-11 items-center rounded-md border px-3 text-xs font-medium ${
                          actif
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-foreground"
                        }`}
                      >
                        {f.facette === "serie" ? "Série : " : ""}
                        {f.libelle} ({f.nombre})
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        ) : null}

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
                  {post.reading_minutes > 0 ? ` — ${post.reading_minutes} min de lecture` : ""}
                </p>
                {post.extrait ? (
                  <p className="mt-2 text-sm text-foreground">
                    {decouperExtrait(post.extrait).map((m, i) =>
                      m.trouve ? (
                        <mark key={i} className="rounded bg-warning-soft px-0.5 text-warning-text">
                          {m.texte}
                        </mark>
                      ) : (
                        <span key={i}>{m.texte}</span>
                      ),
                    )}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-foreground">{post.excerpt}</p>
                )}
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
