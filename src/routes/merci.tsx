import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/cds/SiteHeader";
import { seo } from "@/lib/seo";
import { isFeatureOn } from "@/config/features";

export const Route = createFileRoute("/merci")({
  head: () =>
    seo({
      title: "Merci",
      description: "Confirmation : votre demande a bien été prise en compte.",
      path: "/merci",
      noindex: true,
    }),
  component: MerciPage,
});

function MerciPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-[560px] rounded-xl border border-border bg-card p-8 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-[#dcfce7] text-xl font-bold text-[#008229]">
          ✓
        </div>
        <h1 className="mt-4 text-2xl font-bold text-foreground">Merci !</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Votre demande a bien été enregistrée. Nous revenons vers vous sous 48 heures ouvrées.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            to="/"
            title="Revenir à la page d'accueil"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Revenir à l'accueil
          </Link>
          {isFeatureOn("contact") ? (
            <Link
              to="/contact"
              title="Envoyer un nouveau message via le formulaire de contact"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Envoyer un autre message
            </Link>
          ) : null}
        </div>
      </div>
    </PageShell>
  );
}
