import { createFileRoute, Link, useNavigate, type LinkProps } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/cds/SiteHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireFeature } from "@/config/features";
import {
  cleanSearch,
  SEARCH_KINDS,
  SEARCH_MAX_LENGTH,
  searchKindLabel,
  type SearchResult,
} from "@/lib/search";
import { searchSite } from "@/lib/search.functions";
import { seo } from "@/lib/seo";

type SearchParams = { q?: string };
const EMPTY: { results: SearchResult[]; failed: boolean } = { results: [], failed: false };

export const Route = createFileRoute("/recherche")({
  validateSearch: (search: Record<string, unknown>): SearchParams => {
    const q = cleanSearch(search["q"]);
    return q ? { q } : {};
  },
  beforeLoad: () => requireFeature("search"),
  loaderDeps: ({ search }) => ({ q: search.q ?? "" }),
  loader: async ({ deps }) => (deps.q ? await searchSite({ data: { q: deps.q } }) : EMPTY),
  head: ({ match }) =>
    seo({
      title: match.search.q ? `Recherche : ${match.search.q}` : "Recherche",
      description:
        "Retrouver un article, une question, une discussion, une formation ou un professionnel sur tout le site.",
      path: "/recherche",
      noindex: true,
    }),
  component: SearchPage,
});

function SearchPage() {
  const { q = "" } = Route.useSearch();
  const { results, failed } = Route.useLoaderData();
  const navigate = useNavigate();
  const [value, setValue] = useState(q);
  const [kind, setKind] = useState<string>("tous");

  useEffect(() => {
    setValue(q);
    setKind("tous");
  }, [q]);

  // Filtres : seulement les types présents dans les résultats.
  const kinds = useMemo(
    () => Object.keys(SEARCH_KINDS).filter((k) => results.some((r) => r.kind === k)),
    [results],
  );
  const shown = kind === "tous" ? results : results.filter((r) => r.kind === kind);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next = cleanSearch(value);
    void navigate({ to: "/recherche", search: next ? { q: next } : {} });
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold text-foreground">Rechercher dans tout le site</h1>
        <p className="mt-2 text-muted-foreground">
          Articles, questions fréquentes, discussions, formations, annonces et professionnels.
        </p>

        <form action="/recherche" method="get" onSubmit={submit} role="search" className="mt-6">
          <Label htmlFor="q">Votre recherche</Label>
          <div className="mt-2 flex gap-2">
            <Input
              id="q"
              name="q"
              type="search"
              value={value}
              maxLength={SEARCH_MAX_LENGTH}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Ex. : électricien, devis, formation"
              autoComplete="off"
            />
            <Button type="submit" title="Lancer la recherche dans tout le site">
              <Search className="size-4" aria-hidden="true" />
              Lancer la recherche
            </Button>
          </div>
        </form>

        {failed ? (
          <p
            role="alert"
            className="mt-8 rounded-lg border border-destructive p-6 text-sm text-foreground"
          >
            La recherche est momentanément indisponible. Merci de réessayer dans un instant.
          </p>
        ) : !q ? (
          <p className="mt-8 text-sm text-muted-foreground">
            Saisissez au moins deux lettres. Les accents et les pluriels sont pris en compte.
          </p>
        ) : results.length === 0 ? (
          <p className="mt-8 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Aucun résultat pour « {q} ». Essayez un mot plus court ou plus courant.
          </p>
        ) : (
          <section aria-labelledby="resultats" className="mt-8">
            <h2 id="resultats" className="text-lg font-semibold text-foreground">
              {results.length} résultat{results.length > 1 ? "s" : ""} pour « {q} »
            </h2>
            {kinds.length > 1 ? (
              <div role="group" aria-label="Filtrer par type" className="mt-3 flex flex-wrap gap-2">
                {["tous", ...kinds].map((k) => (
                  <Button
                    key={k}
                    type="button"
                    size="sm"
                    aria-pressed={kind === k}
                    variant={kind === k ? "default" : "outline"}
                    onClick={() => setKind(k)}
                    title={`Afficher : ${k === "tous" ? "tous les résultats" : searchKindLabel(k).toLowerCase()}`}
                  >
                    {k === "tous" ? "Tous" : searchKindLabel(k)}
                  </Button>
                ))}
              </div>
            ) : null}
            <ul className="mt-4 space-y-3">
              {shown.map((r) => (
                <li
                  key={`${r.kind}-${r.url}-${r.title}`}
                  className="rounded-xl border border-border bg-card p-5"
                >
                  <Badge variant="secondary">{searchKindLabel(r.kind)}</Badge>
                  <Link
                    to={r.url as NonNullable<LinkProps["to"]>}
                    title={`Ouvrir : ${r.title}`}
                    className="mt-2 block text-base font-semibold text-foreground hover:underline"
                  >
                    {r.title}
                  </Link>
                  {r.excerpt ? (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.excerpt}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </PageShell>
  );
}
