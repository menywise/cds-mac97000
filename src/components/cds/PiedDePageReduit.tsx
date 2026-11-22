import { Link } from "@tanstack/react-router";
import { ReportButton } from "@/components/cds/ReportButton";
import { isFeatureOn } from "@/config/features";
import { SOCLE_VERSION } from "@/config/socle";
import { useBrandSettings } from "@/hooks/useSiteSettings";

const LIEN =
  "inline-flex min-h-11 items-center rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-8";

/**
 * Ligne de copyright commune aux deux pieds de page (socle 1.19.0) : accroche, année, éditeur et
 * version du socle livrée par ce code (`src/config/socle.ts`).
 */
export function MentionDuSite({ accroche = true }: { accroche?: boolean }) {
  const { settings } = useBrandSettings();
  return (
    <p className="text-xs text-muted-foreground">
      {accroche && settings.tagline ? `${settings.tagline} — ` : ""}© {new Date().getFullYear()}{" "}
      {settings.legal.company || settings.name}
      <span aria-hidden="true"> · </span>
      <span title="Version du socle sur lequel ce site est construit">Socle {SOCLE_VERSION}</span>
    </p>
  );
}

/**
 * Pied de page réduit (socle 1.19.0), pour les pages plein écran sans en-tête : connexion,
 * inscription, mot de passe, maintenance, page introuvable, erreur. Liens rapides, signalement
 * (facultatif) et mention du site, pour que ces pages ne soient plus des impasses.
 * `signaler` : faux sur une page d'erreur, où la base peut être injoignable.
 */
export function PiedDePageReduit({
  signaler = true,
  className = "",
}: {
  signaler?: boolean;
  className?: string;
}) {
  const liens: Array<{ to: string; label: string; title: string; visible: boolean }> = [
    { to: "/", label: "Accueil", title: "Revenir à la page d'accueil", visible: true },
    {
      to: "/plan-du-site",
      label: "Plan du site",
      title: "Toutes les pages du site",
      visible: true,
    },
    {
      to: "/contact",
      label: "Contact",
      title: "Formulaire de contact protégé",
      visible: isFeatureOn("contact"),
    },
    {
      to: "/legal/mentions-legales",
      label: "Mentions légales",
      title: "Lire les mentions légales",
      visible: true,
    },
    {
      to: "/legal/confidentialite",
      label: "Confidentialité",
      title: "Lire la politique de confidentialité",
      visible: true,
    },
  ];

  return (
    <footer className={`w-full print:hidden ${className}`}>
      <nav aria-label="Liens rapides" className="flex justify-center">
        <ul className="flex flex-wrap justify-center gap-x-4 text-xs">
          {liens
            .filter((lien) => lien.visible)
            .map((lien) => (
              <li key={lien.to}>
                <Link to={lien.to} title={lien.title} className={LIEN}>
                  {lien.label}
                </Link>
              </li>
            ))}
          {signaler && isFeatureOn("reports") ? (
            <li>
              <ReportButton contentType="page" label="Signaler une erreur" className="sm:min-h-8" />
            </li>
          ) : null}
        </ul>
      </nav>
      <div className="mt-2 text-center">
        <MentionDuSite accroche={false} />
      </div>
    </footer>
  );
}
