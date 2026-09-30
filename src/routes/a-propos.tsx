import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/cds/SiteHeader";
import { Button } from "@/components/ui/button";
import { seo } from "@/lib/seo";
import { isFeatureOn } from "@/config/features";
import { editorName } from "@/components/cds/LegalPage";
import { useBrandSettings } from "@/hooks/useSiteSettings";
import { getSiteConfig } from "@/lib/site-config";

export const Route = createFileRoute("/a-propos")({
  head: () =>
    seo({
      title: "À propos",
      description:
        `Qui édite ${getSiteConfig().brand.name}, pour qui il est conçu et selon quels engagements : clarté, accessibilité et propriété de vos données.`,
      path: "/a-propos",
      type: "article",
    }),
  component: AProposPage,
});

const engagements = [
  {
    title: "Vous restez propriétaire",
    body: "Vos contenus, vos membres et vos réglages vous appartiennent et restent chez vous, hors de toute régie publicitaire.",
  },
  {
    title: "Vous comprenez ce que vous utilisez",
    body: "Chaque écran est documenté en français, sans jargon. Vous savez où régler quoi, sans dépendre de quelqu'un d'autre.",
  },
  {
    title: "Vous êtes accessible à tous vos visiteurs",
    body: "Contrastes conformes au niveau AA, navigation au clavier, textes lisibles : votre site accueille chaque visiteur, handicap compris.",
  },
];

function AProposPage() {
  const { settings } = useBrandSettings();
  const { legal } = settings;
  const editorLine = [
    editorName(settings),
    legal.form ? legal.form : "",
    legal.address ? `siège : ${legal.address}` : "",
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <PageShell>
      <article className="mx-auto max-w-[760px]">
        <p className="text-xs font-medium uppercase tracking-wide text-primary-text">À propos</p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">
          Un socle solide pour artisans et indépendants
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {settings.name} est né d'un constat simple. Un artisan ou un indépendant manque de temps
          pour refaire, à chaque projet, un site sérieux, conforme et trouvable. Ce socle est
          assemblé une fois pour toutes : votre énergie va à votre métier.
        </p>

        <h2 className="mt-10 text-lg font-semibold text-foreground">Qui édite ce site</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {settings.name} est édité par {editorLine}
          {legal.publisher ? `, sous la direction de ${legal.publisher}` : ""}. Les informations
          complètes figurent dans les{" "}
          <Link
            to="/legal/mentions-legales"
            title="Consulter les mentions légales du site"
            className="font-medium text-primary-text hover:underline"
          >
            mentions légales
          </Link>
          .
        </p>

        <h2 className="mt-10 text-lg font-semibold text-foreground">Nos engagements</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {engagements.map((item) => (
            <section key={item.title} className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{item.body}</p>
            </section>
          ))}
        </div>

        <h2 className="mt-10 text-lg font-semibold text-foreground">Et concrètement ?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Vous obtenez un site complet : comptes, pages légales, blog, forum, avis, FAQ, offres et
          espace d'administration. Vous réglez tout depuis votre back-office, sans toucher à une
          seule ligne de code.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          {isFeatureOn("onboarding") ? (
            <Button asChild>
              <Link to="/demarrer" title="Découvrir le parcours en trois étapes">
                Voir comment démarrer
              </Link>
            </Button>
          ) : null}
          {isFeatureOn("contact") ? (
            <Button asChild variant="outline">
              <Link to="/contact" title="Poser une question via le formulaire de contact">
                Poser une question
              </Link>
            </Button>
          ) : null}
        </div>
      </article>
    </PageShell>
  );
}
