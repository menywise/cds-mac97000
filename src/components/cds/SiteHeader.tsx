import { Link, useNavigate, type LinkProps } from "@tanstack/react-router";
import { Menu, Search, ShoppingBag, X } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useEffect, useRef, useState } from "react";
import { useBrandSettings } from "@/hooks/useSiteSettings";
import { useAuth } from "@/hooks/useAuth";
import { useHauteurReservee } from "@/hooks/useHauteurReservee";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { supabase } from "@/integrations/supabase/client";
import { CookieBanner, openCookieBanner } from "@/components/cds/CookieBanner";
import { NewsletterForm } from "@/components/cds/NewsletterForm";
import { AdSlot } from "@/components/cds/AdSlot";
import { ReportButton } from "@/components/cds/ReportButton";
import { isFeatureOn, withActiveModules, type FeatureKey } from "@/config/features";
import { GREFFE } from "@/greffe";

type NavItem = {
  to: NonNullable<LinkProps["to"]>;
  label: string;
  title: string;
  /** Module dont dépend le lien : masqué quand le module est éteint. */
  module?: FeatureKey;
  /** Lien partagé par plusieurs modules : masqué quand tous sont éteints. */
  anyOf?: readonly FeatureKey[];
};

/** Liens déclarés par le projet dans sa prise de greffe (adresses connues du projet seulement). */
function greffeLinks(links: readonly { to: string }[] | undefined): NavItem[] {
  return (links ?? []) as unknown as NavItem[];
}

/** Menu des visiteurs : découvrir, comparer, échanger. */
function buildPublicNav(): NavItem[] {
  return withActiveModules<NavItem>([
    {
      to: "/demarrer",
      label: "Démarrer",
      title: "Le parcours en trois étapes jusqu'à votre compte",
      module: "onboarding",
    },
    {
      to: "/tarifs",
      label: "Tarifs",
      title: "Comparer les offres et choisir celle qui vous convient",
      module: "pricing",
    },
    {
      to: "/annuaire",
      label: "Annuaire",
      title: "Trouver un professionnel près de chez vous",
      module: "directory",
    },
    {
      to: "/formations",
      label: "Formations",
      title: "Se former à son rythme, leçon par leçon",
      module: "lms",
    },
    {
      to: "/boutique",
      label: "Boutique",
      title: "Objets, guides PDF et livres numériques",
      module: "shop",
    },
    {
      to: "/marketplace",
      label: "Annonces",
      title: "Voir les annonces publiées par les membres",
      module: "marketplace",
    },
    {
      to: "/blog",
      label: "Blog",
      title: "Articles et méthodes pour faire avancer votre projet",
      module: "blog",
    },
    {
      to: "/forum",
      label: "Forum",
      title: "Poser une question à la communauté",
      module: "forum",
    },
    {
      to: "/faq",
      label: "FAQ",
      title: "Réponses aux questions les plus fréquentes",
      module: "faq",
    },
    {
      to: "/contact",
      label: "Contact",
      title: "Écrire via le formulaire de contact protégé",
      module: "contact",
    },
    ...greffeLinks(GREFFE.menuPublic),
  ]);
}

/** Menu des membres connectés : agir dans son espace. */
function buildMemberNav(): NavItem[] {
  return withActiveModules<NavItem>([
    { to: "/tableau-de-bord", label: "Tableau de bord", title: "Vue d'ensemble de votre activité" },
    {
      to: "/forum",
      label: "Forum",
      title: "Participer aux discussions de la communauté",
      module: "forum",
    },
    {
      to: "/membres",
      label: "Annuaire des membres",
      title: "Découvrir les autres membres",
      module: "members",
    },
    {
      to: "/annuaire",
      label: "Annuaire",
      title: "Trouver un professionnel près de chez vous",
      module: "directory",
    },
    {
      to: "/messagerie",
      label: "Messagerie",
      title: "Consulter vos échanges privés",
      module: "messaging",
    },
    {
      to: "/mes-formations",
      label: "Mes formations",
      title: "Reprendre vos formations en cours",
      module: "lms",
    },
    {
      to: "/mes-achats",
      label: "Mes achats",
      title: "Vos commandes et vos fichiers à télécharger",
      module: "shop",
    },
    {
      to: "/mes-fiches",
      label: "Mes fiches",
      title: "Suivre et mettre à jour vos fiches de l'annuaire",
      module: "directory",
    },
    {
      to: "/mes-annonces",
      label: "Mes annonces",
      title: "Gérer vos annonces publiées",
      module: "marketplace",
    },
    {
      to: "/crm",
      label: "Mes contacts",
      title: "Suivre vos contacts et vos relances",
      module: "crm",
    },
    { to: "/blog", label: "Blog", title: "Lire les derniers articles", module: "blog" },
    ...greffeLinks(GREFFE.menuMembre),
  ]);
}

function buildFooterColumns(): Array<{ title: string; links: NavItem[] }> {
  const columns: Array<{ title: string; links: NavItem[] }> = [
    {
      title: "Découvrir",
      links: [
        { to: "/", label: "Accueil", title: "Revenir à la page d'accueil" },
        {
          to: "/demarrer",
          label: "Démarrer",
          title: "Le parcours en trois étapes",
          module: "onboarding",
        },
        { to: "/tarifs", label: "Tarifs", title: "Comparer les offres", module: "pricing" },
        {
          to: "/formations",
          label: "Formations",
          title: "Le catalogue des formations",
          module: "lms",
        },
        {
          to: "/boutique",
          label: "Boutique",
          title: "Objets, guides PDF et livres numériques",
          module: "shop",
        },
        {
          to: "/composants",
          label: "Composants",
          title: "Bibliothèque de composants d'interface",
          module: "showcase",
        },
        {
          to: "/guide",
          label: "Guide",
          title: "Comment réutiliser le modèle sur un nouveau projet",
          module: "showcase",
        },
      ],
    },
    {
      title: "Communauté",
      links: [
        {
          to: "/forum",
          label: "Forum",
          title: "Poser une question à la communauté",
          module: "forum",
        },
        {
          to: "/membres",
          label: "Annuaire des membres",
          title: "Découvrir les membres",
          module: "members",
        },
        {
          to: "/annuaire",
          label: "Annuaire métier",
          title: "Trouver un professionnel",
          module: "directory",
        },
        {
          to: "/marketplace",
          label: "Annonces",
          title: "Les annonces des membres",
          module: "marketplace",
        },
        {
          to: "/temoignages",
          label: "Témoignages",
          title: "Lire les retours d'expérience",
          module: "testimonials",
        },
        { to: "/avis", label: "Avis", title: "Consulter les notes et avis", module: "reviews" },
        { to: "/blog", label: "Blog", title: "Articles et méthodes", module: "blog" },
      ],
    },
    {
      title: "Aide",
      links: [
        { to: "/faq", label: "FAQ", title: "Réponses aux questions fréquentes", module: "faq" },
        {
          to: "/contact",
          label: "Contact",
          title: "Formulaire de contact protégé",
          module: "contact",
        },
        {
          to: "/a-propos",
          label: "À propos",
          title: "Qui édite le site et selon quels engagements",
        },
        {
          to: "/publicite",
          label: "Annoncer",
          title: "Réserver un emplacement publicitaire",
          module: "adNetwork",
        },
        {
          to: "/ameliorations",
          label: "Le site s'améliore grâce à vous",
          title: "Les corrections apportées grâce aux signalements des lecteurs",
          module: "reports",
        },
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
  for (const link of GREFFE.piedDePage ?? []) {
    columns.find((c) => c.title === link.colonne)?.links.push(...greffeLinks([link]));
  }
  return columns
    .map((column) => ({ ...column, links: withActiveModules(column.links) }))
    .filter((column) => column.links.length > 0);
}

const linkClass =
  "inline-flex min-h-11 items-center whitespace-nowrap rounded px-3 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:min-h-9";

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
          className="inline-flex min-h-11 items-center whitespace-nowrap rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:min-h-9"
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

/** Pastille des messages non lus, à côté du lien « Messagerie » (socle 1.8.0). */
function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = count > 1 ? `${count} messages non lus` : "1 message non lu";
  return (
    <span
      title={label}
      className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold leading-5 text-primary-foreground"
    >
      <span aria-hidden="true">{count > 9 ? "9+" : count}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { settings } = useBrandSettings();
  const { user } = useAuth();
  const nav = user ? buildMemberNav() : buildPublicNav();
  const unread = useUnreadMessages();
  const entete = useRef<HTMLElement>(null);
  useHauteurReservee(entete, "--hauteur-entete");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      ref={entete}
      className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur"
    >
      {/* La navigation passe à la ligne plutôt que de déborder : sa largeur dépend du nombre de
          modules allumés et de la police du système (bien plus large sous Linux). */}
      <div className="mx-auto flex min-h-16 max-w-[1200px] items-center gap-4 px-6 py-2">
        <Link
          to="/"
          title={`${settings.name} — accueil`}
          className="flex shrink-0 items-center gap-2 font-semibold text-foreground"
        >
          {settings.apparence.logo ? (
            <img
              src={settings.apparence.logo}
              alt=""
              className="h-7 w-auto max-w-32 object-contain"
            />
          ) : (
            <span className="grid size-7 place-items-center rounded bg-primary text-xs font-bold text-primary-foreground">
              {settings.shortName.slice(0, 1).toUpperCase()}
            </span>
          )}
          {settings.shortName}
        </Link>

        <nav
          aria-label="Navigation principale"
          className="hidden min-w-0 flex-1 flex-wrap items-center gap-0.5 text-sm lg:flex"
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
              {item.to === "/messagerie" ? <UnreadBadge count={unread} /> : null}
            </Link>
          ))}
        </nav>

        {isFeatureOn("search") || isFeatureOn("shop") ? (
          <div className="ml-auto flex shrink-0 items-center">
            {isFeatureOn("search") ? (
              <Link
                to="/recherche"
                title="Rechercher dans tout le site"
                aria-label="Rechercher"
                className="grid size-11 place-items-center rounded-md text-foreground hover:bg-accent"
                activeProps={{ className: "bg-accent" }}
              >
                <Search className="size-5" aria-hidden="true" />
              </Link>
            ) : null}
            {isFeatureOn("shop") ? <CartLink /> : null}
          </div>
        ) : null}

        <div className="ml-auto hidden shrink-0 items-center gap-2 text-sm lg:flex">
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
                  {item.to === "/messagerie" ? <UnreadBadge count={unread} /> : null}
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
                {column.title === "Aide" && isFeatureOn("reports") ? (
                  <li>
                    <ReportButton
                      contentType="page"
                      label="Signaler une erreur sur cette page"
                      className="text-sm font-normal sm:min-h-8"
                    />
                  </li>
                ) : null}
                {column.title === "Informations légales" ? (
                  <li>
                    <button
                      type="button"
                      onClick={openCookieBanner}
                      title="Rouvrir le bandeau pour modifier vos choix de cookies"
                      className="inline-flex min-h-11 cursor-pointer items-center rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-8"
                    >
                      Gérer les cookies
                    </button>
                  </li>
                ) : null}
              </ul>
            </nav>
          ))}
        </div>

        {isFeatureOn("newsletter") ? (
          <div className="mt-10">
            <NewsletterForm source="pied-de-page" />
          </div>
        ) : null}

        <p className="mt-8 border-t border-border pt-6 text-xs text-muted-foreground">
          {settings.tagline ? `${settings.tagline} — ` : ""}© {new Date().getFullYear()}{" "}
          {settings.legal.company || settings.name}
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
        title="Passer directement au contenu principal de la page"
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

/** Panier de la boutique dans l'en-tête, avec le nombre d'articles. */
function CartLink() {
  const { count } = useCart();
  const label = count ? `Mon panier (${count} article${count > 1 ? "s" : ""})` : "Mon panier";
  return (
    <Link
      to="/boutique/panier"
      title={label}
      aria-label={label}
      className="relative grid size-11 place-items-center rounded-md text-foreground hover:bg-accent"
      activeProps={{ className: "bg-accent" }}
    >
      <ShoppingBag className="size-5" aria-hidden="true" />
      {count ? (
        <span
          aria-hidden="true"
          className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground"
        >
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </Link>
  );
}
