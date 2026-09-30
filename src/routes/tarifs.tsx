import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { PageShell } from "@/components/cds/SiteHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listPlans } from "@/lib/content.functions";
import { seo } from "@/lib/seo";
import { requireFeature, isFeatureOn } from "@/config/features";

export const Route = createFileRoute("/tarifs")({
  beforeLoad: () => requireFeature("pricing"),
  loader: () => listPlans(),
  head: () =>
    seo({
      title: "Tarifs",
      description:
        "Trois offres résiliables à tout moment : démarrez gratuitement, passez Pro quand votre site doit convertir, choisissez Expert pour plusieurs projets.",
      path: "/tarifs",
      type: "website",
    }),
  errorComponent: () => (
    <PageShell>
      <p className="text-sm text-muted-foreground">Les offres n'ont pas pu être chargées.</p>
    </PageShell>
  ),
  notFoundComponent: () => (
    <PageShell>
      <p className="text-sm text-muted-foreground">Cette page n'existe pas.</p>
    </PageShell>
  ),
  component: TarifsPage,
});

function formatPrice(cents: number, currency: string) {
  if (cents === 0) return "Gratuit";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

function TarifsPage() {
  const plans = Route.useLoaderData();

  return (
    <PageShell>
      <div className="mx-auto max-w-[1000px]">
        <div className="mx-auto max-w-[680px] text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-primary-text">Tarifs</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">
            Des tarifs clairs pour artisans et indépendants
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Démarrez gratuitement. Le jour où votre site doit convaincre et encaisser, vous montez
            d'un cran, et vous redescendez quand vous voulez.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {plans.map((plan) => {
            const features = Array.isArray(plan.features) ? (plan.features as string[]) : [];
            return (
              <article
                key={plan.id}
                className={`flex flex-col rounded-xl border bg-card p-6 ${
                  plan.highlighted
                    ? "border-primary shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
                    : "border-border"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-semibold text-foreground">{plan.name}</h2>
                  {plan.highlighted ? <Badge>Le plus choisi</Badge> : null}
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">{plan.tagline}</p>
                <p className="mt-4 text-3xl font-bold text-foreground">
                  {formatPrice(plan.price_cents, plan.currency)}
                  {plan.price_cents > 0 ? (
                    <span className="text-sm font-normal text-muted-foreground">
                      {" "}
                      / {plan.period}
                    </span>
                  ) : null}
                </p>
                <ul className="mt-5 flex-1 space-y-2 text-sm text-muted-foreground">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check
                        className="mt-0.5 size-4 shrink-0 text-success-text"
                        aria-hidden="true"
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild className="mt-6" variant={plan.highlighted ? "default" : "outline"}>
                  <Link to="/signup" title={`Choisir l'offre ${plan.name}`}>
                    {plan.cta_label}
                  </Link>
                </Button>
              </article>
            );
          })}
        </div>

        <section className="mt-12 rounded-xl border border-border bg-card p-6 text-center">
          <h2 className="text-base font-semibold text-foreground">Une hésitation légitime ?</h2>
          <p className="mx-auto mt-1.5 max-w-[560px] text-sm text-muted-foreground">
            Décrivez votre projet en deux lignes : nous vous recommandons l'offre adaptée, y compris
            quand l'offre gratuite suffit.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {isFeatureOn("contact") ? (
              <Button asChild variant="outline">
                <Link to="/contact" title="Décrire votre projet et recevoir une recommandation">
                  Décrire mon projet
                </Link>
              </Button>
            ) : null}
            {isFeatureOn("faq") ? (
              <Button asChild variant="outline">
                <Link to="/faq" title="Consulter les questions fréquentes">
                  Lire les questions fréquentes
                </Link>
              </Button>
            ) : null}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
