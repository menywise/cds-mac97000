import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PageShell } from "@/components/cds/SiteHeader";
import { NewsletterForm } from "@/components/cds/NewsletterForm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { listFaq } from "@/lib/content.functions";
import { breadcrumbJsonLd, seo } from "@/lib/seo";
import { requireFeature, isFeatureOn } from "@/config/features";

function anchorOf(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const Route = createFileRoute("/faq")({
  beforeLoad: () => requireFeature("faq"),
  loader: () => listFaq(),
  head: ({ loaderData }) => {
    const base = seo({
      title: "Questions fréquentes",
      description:
        "Délais, administration sans code, données, référencement : les réponses directes aux questions des indépendants, artisans et solopreneurs avant de démarrer.",
      path: "/faq",
      type: "website",
    });
    const items = loaderData ?? [];
    return {
      ...base,
      scripts: [
        breadcrumbJsonLd([
          { name: "Accueil", path: "/" },
          { name: "Questions fréquentes", path: "/faq" },
        ]),
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: items.map((item) => ({
              "@type": "Question",
              name: item.question,
              acceptedAnswer: { "@type": "Answer", text: item.answer },
            })),
          }),
        },
      ],
    };
  },
  errorComponent: () => (
    <PageShell>
      <p className="text-sm text-muted-foreground">
        Les questions n'ont pas pu être chargées. Rechargez la page dans un instant.
      </p>
    </PageShell>
  ),
  notFoundComponent: () => (
    <PageShell>
      <p className="text-sm text-muted-foreground">Cette page n'existe pas.</p>
    </PageShell>
  ),
  component: FaqPage,
});

function FaqPage() {
  const items = Route.useLoaderData();
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) =>
      `${item.question} ${item.answer} ${item.category}`.toLowerCase().includes(needle),
    );
  }, [items, query]);

  const categories = useMemo(() => [...new Set(visible.map((i) => i.category))], [visible]);

  return (
    <PageShell>
      <div className="mx-auto max-w-[760px]">
        <p className="text-xs font-medium uppercase tracking-wide text-primary-text">
          Questions fréquentes
        </p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">
          Ce que vous vous demandez avant de vous lancer
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Vous avez sans doute déjà une idée précise de ce que vous voulez construire. Voici les
          réponses aux questions qui reviennent le plus, pour que rien ne vous retienne.
        </p>

        <div className="mt-6 space-y-1.5">
          <Label htmlFor="faq-search">Rechercher une réponse</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="faq-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Délais, données, référencement, tarifs…"
              className="pl-9"
            />
          </div>
        </div>

        {categories.length > 1 ? (
          <nav aria-label="Sommaire des questions" className="mt-4 flex flex-wrap gap-2">
            {categories.map((category) => (
              <a
                key={category}
                href={`#${anchorOf(category)}`}
                title={`Aller à la section : ${category}`}
                className="inline-flex min-h-11 items-center rounded-md border border-border bg-card px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                {category}
              </a>
            ))}
          </nav>
        ) : null}

        {visible.length === 0 ? (
          <p className="mt-8 rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Aucune réponse ne correspond. Posez votre question directement, elle nourrira cette
            page.
          </p>
        ) : (
          categories.map((category) => (
            <section key={category} id={anchorOf(category)} className="mt-8 scroll-mt-20">
              <h2 className="text-base font-semibold text-foreground">{category}</h2>
              <Accordion type="single" collapsible className="mt-2">
                {visible
                  .filter((i) => i.category === category)
                  .map((item) => (
                    <AccordionItem key={item.id} value={item.id} id={anchorOf(item.question)}>
                      <AccordionTrigger className="text-left">{item.question}</AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
              </Accordion>
            </section>
          ))
        )}

        {isFeatureOn("contact") || isFeatureOn("forum") ? (
          <p className="mt-8 text-sm text-muted-foreground">
            Votre question n'y figure pas ?{" "}
            {isFeatureOn("contact") ? (
              <>
                <Link
                  to="/contact"
                  title="Poser votre question via le formulaire de contact"
                  className="text-primary-text hover:underline"
                >
                  Posez-la ici
                </Link>
                , vous aurez une réponse sous 48 heures ouvrées.{" "}
              </>
            ) : null}
            {isFeatureOn("forum") ? (
              <>
                Vous pouvez aussi la soumettre à la communauté sur le{" "}
                <Link
                  to="/forum"
                  title="Poser votre question au forum"
                  className="text-primary-text hover:underline"
                >
                  forum
                </Link>
                .
              </>
            ) : null}
          </p>
        ) : null}

        <div className="mt-10">
          <NewsletterForm source="faq" />
        </div>
      </div>
    </PageShell>
  );
}
