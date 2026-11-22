import { createFileRoute, Link } from "@tanstack/react-router";
import { seo } from "@/lib/seo";
import { useBrandSettings } from "@/hooks/useSiteSettings";
import { isFeatureOn } from "@/config/features";
import { PiedDePageReduit } from "@/components/cds/PiedDePageReduit";

export const Route = createFileRoute("/maintenance")({
  head: () =>
    seo({
      title: "Maintenance en cours",
      description: "Le site est momentanément indisponible pour une opération de maintenance.",
      path: "/maintenance",
      noindex: true,
    }),
  component: MaintenancePage,
});

function MaintenancePage() {
  const { settings: brand } = useBrandSettings();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <span className="grid size-10 place-items-center rounded bg-primary text-sm font-bold text-primary-foreground">
        {brand.shortName.slice(0, 1).toUpperCase()}
      </span>
      <h1 className="mt-6 text-2xl font-bold text-foreground">Maintenance en cours</h1>
      <p className="mt-2 max-w-[480px] text-sm text-muted-foreground">
        {brand.name} est momentanément indisponible le temps d'une mise à jour. Le service revient
        dans quelques minutes. Merci de votre patience.
      </p>
      {isFeatureOn("contact") ? (
        <Link
          to="/contact"
          title="Nous écrire via le formulaire de contact protégé"
          className="mt-6 inline-flex items-center justify-center rounded-md border border-input bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          Nous contacter
        </Link>
      ) : null}
      <PiedDePageReduit signaler={false} className="mt-12" />
    </div>
  );
}
