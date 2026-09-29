import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { PageShell } from "@/components/cds/SiteHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

/**
 * Espace connecté. La session vit dans le navigateur : le contrôle se fait après l'affichage
 * (et non dans `beforeLoad`), sinon la redirection vers la connexion intervient pendant
 * l'hydratation et React signale une page différente de celle envoyée par le serveur.
 */
function AuthenticatedLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const href = useLocation({ select: (l) => l.href });
  const sent = useRef(false);

  useEffect(() => {
    // Après connexion, le membre revient sur la page demandée.
    if (loading || user || sent.current) return;
    sent.current = true;
    void navigate({ to: "/login", search: { next: href }, replace: true });
  }, [loading, user, navigate, href]);

  if (!user) {
    return (
      <PageShell>
        <div className="mx-auto max-w-[900px] space-y-3" aria-busy="true" aria-live="polite">
          <span className="sr-only">Vérification de votre session…</span>
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-40 w-full" />
        </div>
      </PageShell>
    );
  }
  return <Outlet />;
}
