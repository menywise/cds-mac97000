import { Link, useNavigate, type LinkProps } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useBrandSettings } from "@/hooks/useSiteSettings";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CookieBanner } from "@/components/cds/CookieBanner";
import { NewsletterForm } from "@/components/cds/NewsletterForm";
import { AdSlot } from "@/components/cds/AdSlot";
import { isFeatureOn } from "@/config/features";

type NavItem = { to: NonNullable<LinkProps["to"]>; label: string; title: string };

/** Menu des visiteurs : découvrir, comparer, échanger. */
function buildPublicNav(): NavItem[] {
  return [
    {
      to: "/demarrer",
      label: "Démarrer",
      title: "Le parcours en trois étapes jusqu'à votre compte",
    },
    {
      to: "/tarifs",
      label: "Tarifs",
      title: "Comparer les offres et choisir celle qui vous convient",
    },
    ...(isFeatureOn("directory")
      ? ([
          {
            to: "/annuaire",
            label: "Annuaire",
            title: "Trouver un professionnel près de chez vous",
          },
        ] as NavItem[])
      : []),
    ...(isFeatureOn("lms")
      ? ([
          {
            to: "/formations",
            label: "Formations",
            title: "Se former à son rythme, leçon par leçon",
          },
        ] as NavItem[])
      : []),
    ...(isFeatureOn("marketplace")
      ? ([
          {
            to: "/marketplace",
            label: "Annonces",
            title: "Voir les annonces publiées par les membres",
          },
        ] as NavItem[])
      : []),
    { to: "/blog", label: "Blog", title: "Articles et méthodes pour faire avancer votre projet" },
    { to: "/forum", label: "Forum", title: "Poser une question à la communauté" },
    { to: "/faq", label: "FAQ", title: "Réponses aux questions les plus fréquentes" },
    { to: "/contact", label: "Contact", title: "Écrire via le formulaire de contact protégé" },
  ];
}

/** Menu des membres connectés : agir dans son espace. */
function buildMemberNav(): NavItem[] {
  return [
    { to: "/tableau-de-bord", label: "Tableau de bord", title: "Vue d'ensemble de votre activité" },
    { to: "/forum", label: "Forum", title: "Participer aux discussions de la communauté" },
    { to: "/membres", label: "Annuaire des membres", title: "Découvrir les autres membres" },
    { to: "/messagerie", label: "Messagerie", title: "Consulter vos échanges privés" },
    ...(isFeatureOn("lms")
      ? ([
          {
            to: "/mes-formations",
            label: "Mes formations",
            title: "Reprendre vos formations en cours",
          },
        ] as NavItem[])
      : []),
    ...(isFeatureOn("marketplace")
      ? ([
          { to: "/mes-annonces", label: "Mes annonces", title: "Gérer vos annonces publiées" },
        ] as NavItem[])
      : []),
    ...(isFeatureOn("crm")
      ? ([
          { to: "/crm", label: "Mes contacts", title: "Suivre vos contacts et vos relances" },
        ] as NavItem[])
      : []),
    { to: "/blog", label: "Blog", title: "Lire les derniers articles" },
  ];
}

function buildFooterColumns(): Array<{ title: string; links: NavItem[] }> {
  return [
    {
      title: "Découvrir",
      links: [
        { to: "/", label: "Accueil", title: "Revenir à la page d'accueil" },
        { to: "/demarrer", label: "Démarrer", title: "Le parcours en trois étapes" },
        { to: "/tarifs", label: "Tarifs", title: "Comparer les offres" },
        ...(isFeatureOn("lms")
          ? ([
              { to: "/formations", label: "Formations", title: "Le catalogue des formations" },
            ] as NavItem[])
          : []),
        { to: "/composants", label: "Composants", title: "Bibliothèque de composants d'interface" },
        { to: "/guide", label: "Guide", title: "Comment réutiliser CDS sur un nouveau projet" },
      ],
    },
    {
      title: "Communauté",
      links: [
        { to: "/forum", label: "Forum", title: "Poser une question à la communauté" },
        { to: "/membres", label: "Annuaire des membres", title: "Découvrir les membres" },
        ...(isFeatureOn("directory")
          ? ([
              { to: "/annuaire", label: "Annuaire métier", title: "Trouver un professionnel" },
            ] as NavItem[])
          : []),
        ...(isFeatureOn("marketplace")
          ? ([
              { to: "/marketplace", label: "Annonces", title: "Les annonces des membres" },
            ] as NavItem[])
          : []),
        { to: "/temoignages", label: "Témoignages", title: "Lire les retours d'expérience" },
        { to: "/avis", label: "Avis", title: "Consulter les notes et avis" },
        { to: "/blog", label: "Blog", title: "Articles et méthodes" },
      ],
    },
    {
      title: "Aide",
      links: [
        { to: "/faq", label: "FAQ", title: "Réponses aux questions fréquentes" },
        { to: "/contact", label: "Contact", title: "Formulaire de contact protégé" },
        {
          to: "/a-propos",
          label: "À propos",
          title: "Qui édite le site et selon quels engagements",
        },
        ...(isFeatureOn("adNetwork")
          ? ([
              {
                to: "/publicite",
                label: "Annoncer",
                title: "Réserver un emplacement publicitaire",
              },
            ] as NavItem[])
          : []),
        {
          to: "/plan-du-site",
          label: "Plan du site",
          title: "Toutes les pages réunies sur une page",
        },
        { to: "/login", label: "Connexion", title: "Accéder à son espace personnel" },
      ],
    },
    {
      title: "Informations légales",
      links: [
        {
          to: "/legal/mentions-legales",
          label: "Mentions légales",
          title: "Éditeur, hébergeur et propriété intellectuelle",
        },
        {
          to: "/legal/confidentialite",
          label: "Confidentialité",
          title: "Données personnelles et droits RGPD",
        },
        { to: "/legal/cgu", label: "CGU", title: "Conditions générales d'utilisation" },
        { to: "/legal/cgv", label: "CGV", title: "Conditions générales de vente" },
        { to: "/legal/cookies", label: "Cookies", title: "Politique de gestion des cookies" },
      ],
    },
  ];
}

const linkClass =
  "inline-flex min-h-11 items-center rounded px-3 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:min-h-9";

function UnreadMessagesBadge() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    if (!user) return;
    let active = true;

    async function checkUnread() {
      const { data: conversations } = await supabase
        .from("conversations")
        .select("id")
        .or(`user_a.eq.${user!.id},user_b.eq.${user!.id}`);

      if (!conversations || conversations.length === 0) {
        if (active) setUnreadCount(0);
        return;
      }

      const conversationIds = conversations.map((c) => c.id);
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .in("conversation_id", conversationIds)
        .neq("sender_id", user!.id)
        .is("read_at", null);

      if (active) setUnreadCount(count ?? 0);
    }

    void checkUnread();

    const channel = supabase
      .channel("unread_messages_count")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          void checkUnread();
        },
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [user]);

  if (!unreadCount) return null;

  return (
    <span className="ml-1.5 inline-flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
      {unreadCount > 9 ? "9+" : unreadCount}
    </span>
  );
}

function AccountLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return null;

  async function signOut() {
    onNavigate?.();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  if (!user) {
    return (
      <>
        <Link
          to="/login"
          title="Se connecter à son espace personnel"
          onClick={onNavigate}
          className={`flex w-full lg:w-auto ${linkClass}`}
        >
          Connexion
        </Link>
        <Link
          to="/signup"
          title="Créer un compte gratuitement"
          onClick={onNavigate}
          className="inline-flex min-h-11 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:min-h-9"
        >
          Créer un compte
        </Link>
      </>
    );
  }

  return (
    <>
      <Link
        to="/profil"
        title="Modifier mon profil"
        onClick={onNavigate}
        className={`flex w-full lg:w-auto ${linkClass}`}
      >
        Mon profil
      </Link>
      <button
        type="button"
        onClick={signOut}
        title="Fermer la session en cours"
        className={`w-full text-left lg:w-auto ${linkClass}`}
      >
        Se déconnecter
      </button>
    </>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { settings } = useBrandSettings();
  const { user } = useAuth();
  const nav = user ? buildMemberNav() : buildPublicNav();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-4 px-6">
        <Link
          to="/"
          title={`${settings.name} — accueil`}
          className="flex items-center gap-2 font-semibold text-foreground"
        >
          <span className="grid size-7 place-items-center rounded bg-primary text-xs font-bold text-primary-foreground">
            {settings.shortName.slice(0, 1).toUpperCase()}
          </span>
          {settings.shortName}
        </Link>

        <nav
          aria-label="Navigation principale"
          className="hidden items-center gap-0.5 text-sm lg:flex"
        >
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              title={item.title}
              className={linkClass}
              activeProps={{ className: "bg-accent text-foreground" }}
            >
              {item.label}
              {item.to === "/messagerie" && <UnreadMessagesBadge />}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 text-sm lg:flex">
          <AccountLinks />
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="cds-mobile-nav"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          title={open ? "Fermer le menu de navigation" : "Ouvrir le menu de navigation"}
          className="ml-auto grid size-11 place-items-center rounded-md border border-border text-foreground lg:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <nav
          id="cds-mobile-nav"
          aria-label="Navigation mobile"
          className="max-h-[70vh] overflow-y-auto border-t border-border bg-card px-6 py-3 lg:hidden"
        >
          <ul className="flex flex-col gap-1 text-sm">
            {nav.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  title={item.title}
                  onClick={() => setOpen(false)}
                  className={`flex w-full ${linkClass}`}
                  activeProps={{ className: "bg-accent text-foreground" }}
                >
                  {item.label}
                  {item.to === "/messagerie" && <UnreadMessagesBadge />}
                </Link>
              </li>
            ))}
            <li className="mt-1 flex flex-col gap-1 border-t border-border pt-2">
              <AccountLinks onNavigate={() => setOpen(false)} />
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  const { settings } = useBrandSettings();
  const footerColumns = buildFooterColumns();

  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-[1200px] px-6 py-10">
        <AdSlot placement="pied-de-page" className="mb-8" />
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {footerColumns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="text-sm font-semibold text-foreground">{column.title}</h2>
              <ul className="mt-3 space-y-1.5 text-sm">
                {column.links.map((link) => (
                  <li key={link.to + link.label}>
                    <Link
                      to={link.to}
                      title={link.title}
                      className="inline-flex min-h-11 items-center rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-8"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10">
          <NewsletterForm source="pied-de-page" />
        </div>

        <p className="mt-8 border-t border-border pt-6 text-xs text-muted-foreground">
          {settings.tagline} — © {new Date().getFullYear()} {settings.name}
        </p>
      </div>
    </footer>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Aller au contenu principal
      </a>
      <SiteHeader />
      <main id="contenu" className="mx-auto w-full max-w-[1200px] flex-1 px-6 py-10">
        {children}
      </main>
      <SiteFooter />
      <CookieBanner />
    </div>
  );
}
