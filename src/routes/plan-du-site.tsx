import { createFileRoute, Link, type LinkProps } from "@tanstack/react-router";
import { PageShell } from "@/components/cds/SiteHeader";
import { seo } from "@/lib/seo";
import { isFeatureOn, withActiveModules, type FeatureKey } from "@/config/features";
import { listPublicPages } from "@/lib/content.functions";
import { getSiteConfig } from "@/lib/site-config";

export const Route = createFileRoute("/plan-du-site")({
  head: () =>
    seo({
      title: "Plan du site",
      description:
        `Toutes les pages de ${getSiteConfig().brand.name} réunies : découverte, offres, contenus, compte et documents légaux.`,
      path: "/plan-du-site",
      type: "website",
    }),
  loader: async () =>
    isFeatureOn("pages") ? await listPublicPages().catch(() => []) : [],
  component: PlanDuSitePage,
});

type PlanLink = {
  to: NonNullable<LinkProps["to"]>;
  label: string;
  title: string;
  module?: FeatureKey;
};

const groupes: Array<{ title: string; links: PlanLink[] }> = [
  {
    title: "Découvrir",
    links: [
      { to: "/", label: "Accueil", title: "Revenir à la page d'accueil" },
      { to: "/a-propos", label: "À propos", title: "Qui édite le site et selon quels engagements" },
      { to: "/recherche", label: "Recherche", title: "Rechercher dans tout le site", module: "search" },
      {
        to: "/demarrer",
        label: "Démarrer",
        title: "Parcours en trois étapes jusqu'à la création de compte",
        module: "onboarding",
      },
      { to: "/tarifs", label: "Tarifs", title: "Comparer les offres et leurs contenus", module: "pricing" },
      { to: "/composants", label: "Composants", title: "Bibliothèque de composants d'interface", module: "showcase" },
      {
        to: "/guide",
        label: "Guide de réutilisation",
        title: "Réutiliser le modèle sur un nouveau projet",
        module: "showcase",
      },
    ],
  },
  {
    title: "Échanger",
    links: [
      { to: "/blog", label: "Blog", title: "Articles et méthodes", module: "blog" },
      { to: "/faq", label: "Questions fréquentes", title: "Réponses aux questions courantes", module: "faq" },
      { to: "/forum", label: "Forum", title: "Poser une question à la communauté", module: "forum" },
      {
        to: "/membres",
        label: "Annuaire des membres",
        title: "Découvrir les membres de la communauté",
        module: "members",
      },
      { to: "/temoignages", label: "Témoignages", title: "Lire ce que la communauté a obtenu", module: "testimonials" },
      { to: "/avis", label: "Avis", title: "Retours d'expérience des utilisateurs", module: "reviews" },
      { to: "/contact", label: "Contact", title: "Formulaire de contact protégé", module: "contact" },
    ],
  },
  {
    title: "Mon compte",
    links: [
      { to: "/login", label: "Connexion", title: "Accéder à son espace personnel" },
      { to: "/signup", label: "Créer un compte", title: "Ouvrir un compte en une minute" },
      {
        to: "/verification-email",
        label: "Vérification de l'adresse e-mail",
        title: "Renvoyer le lien de confirmation",
      },
      {
        to: "/forgot-password",
        label: "Mot de passe oublié",
        title: "Recevoir un lien de réinitialisation",
      },
      { to: "/tableau-de-bord", label: "Tableau de bord", title: "Chiffres clés et raccourcis" },
      {
        to: "/decouvrir",
        label: "Découvrir",
        title: "Faire le tour des fonctionnalités actives de votre espace",
        module: "onboarding",
      },
      { to: "/messagerie", label: "Messagerie", title: "Vos échanges privés entre membres", module: "messaging" },
      { to: "/profil", label: "Mon profil", title: "Nom affiché, profil public et mot de passe" },
      { to: "/compte", label: "Mon compte", title: "Rôle, session et messages reçus" },
    ],
  },
  {
    title: "Documents légaux",
    links: [
      {
        to: "/legal/mentions-legales",
        label: "Mentions légales",
        title: "Éditeur, hébergeur et propriété intellectuelle",
      },
      {
        to: "/legal/confidentialite",
        label: "Politique de confidentialité",
        title: "Données personnelles et droits RGPD",
      },
      {
        to: "/legal/cgu",
        label: "Conditions générales d'utilisation",
        title: "Règles d'usage du service",
      },
      {
        to: "/legal/cgv",
        label: "Conditions générales de vente",
        title: "Offres payantes, paiement et rétractation",
      },
      { to: "/legal/cookies", label: "Politique de cookies", title: "Traceurs et consentement" },
    ],
  },
];


/** Liens des briques optionnelles : présents seulement si la brique est active. */
const modulesLinks: PlanLink[] = [
  {
    to: "/annuaire",
    label: "Annuaire métier",
    title: "Trouver un professionnel près de chez vous",
    module: "directory",
  },
  {
    to: "/annuaire/soumettre",
    label: "Proposer une fiche",
    title: "Ajouter un professionnel à l'annuaire",
    module: "directory",
  },
  {
    to: "/annuaire/departements",
    label: "Départements",
    title: "Parcourir l'annuaire département par département",
    module: "geo",
  },
  { to: "/formations", label: "Formations", title: "Catalogue des formations en ligne", module: "lms" },
  {
    to: "/mes-formations",
    label: "Mes formations",
    title: "Reprendre vos formations en cours",
    module: "lms",
  },
  {
    to: "/marketplace",
    label: "Annonces",
    title: "Petites annonces entre membres",
    module: "marketplace",
  },
  {
    to: "/marketplace/publier",
    label: "Publier une annonce",
    title: "Mettre en vente un article",
    module: "marketplace",
  },
  {
    to: "/mes-annonces",
    label: "Mes annonces",
    title: "Gérer vos annonces publiées",
    module: "marketplace",
  },
  { to: "/crm", label: "Mes contacts", title: "Suivre vos prospects et vos relances", module: "crm" },
  {
    to: "/publicite",
    label: "Annoncer sur le site",
    title: "Formats publicitaires et contact régie",
    module: "adNetwork",
  },
];

/** Groupes visibles : liens des modules éteints retirés, groupes vides masqués. */
function visibleGroups() {
  return [...groupes, { title: "Modules", links: modulesLinks }]
    .map((groupe) => ({ ...groupe, links: withActiveModules(groupe.links) }))
    .filter((groupe) => groupe.links.length > 0);
}

function PlanDuSitePage() {
  const freePages = Route.useLoaderData().filter((page) => !page.is_home);
  return (
    <PageShell>
      <div className="mx-auto max-w-[900px]">
        <p className="text-xs font-medium uppercase tracking-wide text-primary-text">Navigation</p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">Plan du site</h1>
        <p className="mt-2 max-w-[620px] text-sm text-muted-foreground">
          Toutes les pages, réunies au même endroit. Vous trouvez en un coup d'œil ce que vous
          cherchez, sans passer par le menu.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {visibleGroups().map((groupe) => (
            <section key={groupe.title} className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-base font-semibold text-foreground">{groupe.title}</h2>
              <ul className="mt-3 space-y-1.5 text-sm">
                {groupe.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      title={link.title}
                      className="text-primary-text hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {freePages.length ? (
            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-base font-semibold text-foreground">Pages</h2>
              <ul className="mt-3 space-y-1.5 text-sm">
                {freePages.map((page) => (
                  <li key={page.slug}>
                    <Link
                      to="/pages/$slug"
                      params={{ slug: page.slug }}
                      title={page.title}
                      className="text-primary-text hover:underline"
                    >
                      {page.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </PageShell>
  );
}
