import { Link, type LinkProps } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/cds/SiteHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { withActiveModules, type FeatureKey } from "@/config/features";

type AdminNavItem = {
  to: NonNullable<LinkProps["to"]>;
  label: string;
  title: string;
  module?: FeatureKey;
  anyOf?: readonly FeatureKey[];
};

function buildAdminNav(): AdminNavItem[] {
  return withActiveModules<AdminNavItem>([
    { to: "/admin", label: "Paramètres", title: "Identité du site, mentions légales et hébergeur" },
    { to: "/admin/modules", label: "Modules", title: "Allumer ou éteindre les modules du site" },
    {
      to: "/admin/utilisateurs",
      label: "Utilisateurs",
      title: "Comptes, rôles et admins du studio",
    },
    {
      to: "/admin/contenus",
      label: "Contenus",
      title: "Gérer la FAQ, les offres et les articles",
      anyOf: ["faq", "pricing", "blog"],
    },
    {
      to: "/admin/pages",
      label: "Pages",
      title: "Composer les pages du site, accueil compris",
      module: "pages",
    },
    {
      to: "/admin/mediatheque",
      label: "Médiathèque",
      title: "Envoyer et gérer les images et fichiers",
      module: "media",
    },
    {
      to: "/admin/moderation",
      label: "Modération",
      title: "Valider les avis, commentaires et discussions",
      anyOf: ["reviews", "blog", "forum"],
    },
    {
      to: "/admin/signalements",
      label: "Signalements",
      title: "Contenus signalés par les membres",
      module: "reports",
    },
    { to: "/admin/forum", label: "Forum", title: "Gérer les thématiques du forum", module: "forum" },
    {
      to: "/admin/temoignages",
      label: "Témoignages",
      title: "Valider et mettre en avant les témoignages",
      module: "testimonials",
    },
    {
      to: "/admin/annuaire",
      label: "Annuaire",
      title: "Fiches, catégories, avis et revendications",
      module: "directory",
    },
    {
      to: "/admin/geographie",
      label: "Géographie",
      title: "Départements couverts et fiches rattachées",
      module: "geo",
    },
    { to: "/admin/crm", label: "Contacts", title: "Vue consolidée du suivi des contacts", module: "crm" },
    {
      to: "/admin/formations",
      label: "Formations",
      title: "Catalogue, modules et leçons",
      module: "lms",
    },
    {
      to: "/admin/paiements",
      label: "Paiements",
      title: "Paiements Stripe des formations",
      module: "payments",
    },
    {
      to: "/admin/marketplace",
      label: "Annonces",
      title: "Modérer les annonces et les catégories",
      module: "marketplace",
    },
    {
      to: "/admin/regie",
      label: "Régie",
      title: "Emplacements, campagnes et statistiques",
      module: "adNetwork",
    },
    {
      to: "/admin/pilotage",
      label: "Pilotage",
      title: "Feuille de route, plan directeur et audits",
      module: "studio",
    },
    {
      to: "/admin/conformite",
      label: "Conformité",
      title: "Grille de recettage du modèle et score de complétude",
      module: "studio",
    },
    {
      to: "/admin/recettage",
      label: "Recette",
      title: "Plan de recette du site et résultats de la recette automatisée",
      module: "studio",
    },
    {
      to: "/admin/abonnes",
      label: "Abonnés",
      title: "Consulter et exporter la liste d'abonnés",
      module: "newsletter",
    },
    {
      to: "/admin/messages",
      label: "Messages",
      title: "Boîte de réception du formulaire de contact",
      module: "contact",
    },
  ]);
}

/** Vérifie le rôle administrateur et affiche la navigation de l'espace d'administration. */
export function useIsAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => {
      if (!cancelled) setIsAdmin(Boolean(data));
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return isAdmin;
}

export function AdminShell({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  const isAdmin = useIsAdmin();

  if (isAdmin === false) {
    return (
      <PageShell>
        <Alert variant="destructive" className="mx-auto max-w-[640px]">
          <AlertTitle>Accès réservé</AlertTitle>
          <AlertDescription>
            Cet espace est réservé aux administrateurs.{" "}
            <Link to="/tableau-de-bord" title="Revenir à mon tableau de bord" className="underline">
              Revenir à mon tableau de bord
            </Link>
          </AlertDescription>
        </Alert>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-[900px]">
        <p className="text-xs font-medium uppercase tracking-wide text-primary-text">
          Administration
        </p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{intro}</p>

        <nav aria-label="Sections d'administration" className="mt-6 flex flex-wrap gap-2 rounded-xl border border-border bg-card p-2 shadow-[var(--shadow-card-tactile)]">
          {buildAdminNav().map((item) => (
            <Link
              key={item.to}
              to={item.to}
              title={item.title}
              className="min-h-9 rounded-md border border-transparent px-3 py-1.5 text-sm text-muted-foreground transition-[background-color,border-color,color,box-shadow] hover:bg-accent hover:text-foreground"
              activeProps={{ className: "border-primary bg-card text-foreground shadow-sm" }}
              activeOptions={{ exact: true }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {isAdmin === null ? (
          <div className="mt-8 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <div className="mt-8">{children}</div>
        )}
      </div>
    </PageShell>
  );
}
