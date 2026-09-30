import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check } from "lucide-react";
import { PageShell } from "@/components/cds/SiteHeader";
import { NewsletterForm } from "@/components/cds/NewsletterForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listPlans } from "@/lib/content.functions";
import { seo } from "@/lib/seo";
import { requireFeature, isFeatureOn } from "@/config/features";

export const Route = createFileRoute("/demarrer")({
  beforeLoad: () => requireFeature("onboarding"),
  loader: () => listPlans(),
  head: () =>
    seo({
      title: "Démarrer",
      description:
        "Trois étapes pour lancer votre site : clarifier vos attentes, choisir l'offre adaptée, créer votre compte. Résiliable à tout moment.",
      path: "/demarrer",
      type: "website",
    }),
  errorComponent: () => (
    <PageShell>
      <p className="text-sm text-muted-foreground">Cette page n'a pas pu être chargée.</p>
    </PageShell>
  ),
  notFoundComponent: () => (
    <PageShell>
      <p className="text-sm text-muted-foreground">Cette page n'existe pas.</p>
    </PageShell>
  ),
  component: DemarrerPage,
});

const benefices = [
  {
    title: "Vous gagnez des semaines",
    body: "Comptes, pages légales, formulaire protégé, référencement : tout est déjà en place et testé. Vous démarrez sur le contenu, pas sur la plomberie.",
  },
  {
    title: "Vous restez maître du site",
    body: "Le nom, les mentions légales, les offres, les articles et la modération se règlent depuis votre espace d'administration. Aucun fichier à toucher.",
  },
  {
    title: "Vous êtes trouvable",
    body: "Titres uniques, descriptions, adresses canoniques, plan du site et données structurées sont posés dès le premier jour.",
  },
];

const etapes = [
  { label: "Votre besoin", desc: "Ce que votre site doit accomplir" },
  { label: "Votre offre", desc: "Le niveau qui correspond à votre étape" },
  { label: "Votre compte", desc: "Créé en une minute, confirmé par e-mail" },
];

function DemarrerPage() {
  const plans = Route.useLoaderData();
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <PageShell>
      <div className="mx-auto max-w-[880px]">
        <p className="text-xs font-medium uppercase tracking-wide text-primary-text">Démarrer</p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">
          Artisans, indépendants : votre site en trois étapes
        </h1>
        <p className="mt-2 max-w-[640px] text-sm text-muted-foreground">
          Avancez pas à pas. À chaque étape, vous voyez ce que vous obtenez, et vous revenez en
          arrière quand vous voulez.
        </p>

        <ol className="mt-8 grid gap-3 sm:grid-cols-3">
          {etapes.map((etape, index) => (
            <li
              key={etape.label}
              className={`rounded-xl border p-4 ${
                index === step ? "border-primary bg-card" : "border-border bg-card"
              }`}
            >
              <p className="text-xs font-medium text-primary-text">Étape {index + 1}</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{etape.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{etape.desc}</p>
            </li>
          ))}
        </ol>

        {step === 0 && (
          <section className="mt-8 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Ce que vous y gagnez</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {benefices.map((item) => (
                <article key={item.title} className="rounded-xl border border-border bg-card p-5">
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="mt-1.5 text-sm text-muted-foreground">{item.body}</p>
                </article>
              ))}
            </div>
            <Button onClick={() => setStep(1)} title="Passer au choix de l'offre">
              Voir les offres
            </Button>
          </section>
        )}

        {step === 1 && (
          <section className="mt-8 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              L'offre qui correspond à votre étape
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              {plans.map((plan) => {
                const features = Array.isArray(plan.features) ? (plan.features as string[]) : [];
                const active = selected === plan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelected(plan.id)}
                    title={`Choisir l'offre ${plan.name}`}
                    className={`rounded-xl border p-5 text-left transition-colors ${
                      active
                        ? "border-primary bg-accent"
                        : "border-border bg-card hover:border-primary"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-foreground">{plan.name}</span>
                      {plan.highlighted ? <Badge>Le plus choisi</Badge> : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
                    <p className="mt-3 text-2xl font-bold text-foreground">
                      {plan.price_cents === 0
                        ? "Gratuit"
                        : `${(plan.price_cents / 100).toFixed(0)} ${plan.currency === "EUR" ? "€" : plan.currency}`}
                    </p>
                    <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                      {features.slice(0, 4).map((feature) => (
                        <li key={feature} className="flex gap-1.5">
                          <Check
                            className="mt-0.5 size-3.5 shrink-0 text-success-text"
                            aria-hidden="true"
                          />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => setStep(0)} title="Revenir aux bénéfices">
                Revenir
              </Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!selected}
                title="Passer à la création du compte"
              >
                Continuer
              </Button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="mt-8 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              Il ne reste qu'à créer votre compte
            </h2>
            <p className="max-w-[620px] text-sm text-muted-foreground">
              Votre choix est enregistré pour cette visite. Créez votre compte : vous recevrez un
              e-mail de confirmation, et votre espace sera immédiatement disponible.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/signup" title="Créer mon compte maintenant">
                  Créer mon compte
                </Link>
              </Button>
              {isFeatureOn("contact") ? (
                <Button asChild variant="outline">
                  <Link to="/contact" title="Poser une question avant de créer un compte">
                    J'ai encore une question
                  </Link>
                </Button>
              ) : null}
              <Button
                variant="ghost"
                onClick={() => setStep(1)}
                title="Revenir au choix de l'offre"
              >
                Revenir aux offres
              </Button>
            </div>
          </section>
        )}

        <div className="mt-12">
          <NewsletterForm source="demarrer" />
        </div>
      </div>
    </PageShell>
  );
}
