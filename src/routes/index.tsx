import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/cds/SiteHeader";
import { cds } from "@/lib/cds-tokens";

import { seo } from "@/lib/seo";
import { getSiteConfig } from "@/lib/site-config";
import { useBrandSettings } from "@/hooks/useSiteSettings";
import { isFeatureOn, withActiveModules } from "@/config/features";
import { PageRender } from "@/components/cds/PageSections";
import { getHomePage } from "@/lib/content.functions";
import { pageExcerpt, pageFaqJsonLd, toPageRow } from "@/lib/pages";

export const Route = createFileRoute("/")({
  // Module « pages » allumé et page d'accueil publiée : elle remplace l'accueil de démonstration.
  loader: async () =>
    isFeatureOn("pages") ? toPageRow(await getHomePage().catch(() => null)) : null,
  head: ({ loaderData: page }) => {
    const brand = getSiteConfig().brand;
    if (page) {
      const faq = pageFaqJsonLd(page.data);
      return {
        ...seo({
          title: page.title || brand.name,
          description: page.description || pageExcerpt(page.data) || brand.tagline || page.title,
          path: "/",
          type: "website",
        }),
        ...(faq ? { scripts: [faq] } : {}),
      };
    }
    return seo({
      title: brand.accueil.titre || brand.name,
      description: brand.accueil.texte || brand.tagline || brand.name,
      path: "/",
      type: "website",
    });
  },
  component: Home,
});

function Home() {
  const page = Route.useLoaderData();
  if (!page) return <Index />;
  return (
    <PageShell>
      <PageRender data={page.data} titleFallback={page.title} />
    </PageShell>
  );
}

function Swatch({ name, value }: { name: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="h-12 w-full rounded" style={{ backgroundColor: value }} />
      <p className="mt-2 text-xs font-medium text-foreground">{name}</p>
      <p className="font-mono text-[11px] text-muted-foreground">{value}</p>
    </div>
  );
}

function Block({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

const templates = [
  {
    to: "/demarrer",
    label: "Tunnel de vente",
    desc: "Trois étapes, du besoin au compte créé",
    module: "onboarding",
  },
  { to: "/a-propos", label: "À propos", desc: "Qui édite le site et ses engagements" },
  { to: "/plan-du-site", label: "Plan du site", desc: "Toutes les pages sur une seule page" },
  {
    to: "/tarifs",
    label: "Tarifs",
    desc: "Offres, mise en avant, appels à l'action",
    module: "pricing",
  },

  { to: "/faq", label: "FAQ", desc: "Questions structurées et balisage FAQPage", module: "faq" },
  { to: "/blog", label: "Blog", desc: "Articles, commentaires modérés, partage", module: "blog" },
  { to: "/forum", label: "Forum", desc: "Sujets, réponses, modération", module: "forum" },
  {
    to: "/avis",
    label: "Avis et notations",
    desc: "Étoiles, moyenne, validation avant publication",
    module: "reviews",
  },
  { to: "/login", label: "Connexion", desc: "E-mail + mot de passe, lien d'inscription" },
  { to: "/signup", label: "Créer un compte", desc: "Inscription avec acceptation des CGU" },
  {
    to: "/verification-email",
    label: "Vérification e-mail",
    desc: "Renvoi du lien de confirmation",
  },
  {
    to: "/forgot-password",
    label: "Mot de passe oublié",
    desc: "Demande de lien de réinitialisation",
  },
  {
    to: "/reset-password",
    label: "Nouveau mot de passe",
    desc: "Définition du nouveau mot de passe",
  },
  { to: "/tableau-de-bord", label: "Tableau de bord", desc: "Chiffres clés et raccourcis" },
  { to: "/admin", label: "Administration", desc: "Paramètres, contenus, modération, abonnés" },
  {
    to: "/legal/mentions-legales",
    label: "Mentions légales",
    desc: "Éditeur, hébergeur, propriété",
  },
  { to: "/legal/confidentialite", label: "Confidentialité", desc: "RGPD, données, droits" },
  { to: "/legal/cgu", label: "CGU", desc: "Conditions générales d'utilisation" },
  { to: "/legal/cgv", label: "CGV", desc: "Offres payantes, paiement, rétractation" },
  { to: "/legal/cookies", label: "Cookies", desc: "Traceurs et consentement" },
  { to: "/contact", label: "Contact", desc: "Formulaire protégé anti-spam", module: "contact" },
  {
    to: "/guide",
    label: "Guide de réutilisation",
    desc: "Quoi copier, quoi modifier",
    module: "showcase",
  },
  {
    to: "/composants",
    label: "Composants",
    desc: "Tableaux, onglets, fenêtres, états",
    module: "showcase",
  },
  { to: "/maintenance", label: "Maintenance", desc: "Écran d'interruption de service" },
  { to: "/merci", label: "Confirmation", desc: "Page de remerciement après envoi" },
] as const;

/**
 * Accueil par défaut : titre et texte réglés en admin (Paramètres → Page d'accueil), sinon nom et
 * signature du site. Un projet le remplace par une page d'accueil du module « pages ».
 * La démonstration du socle (gabarits, couleurs, typographie) n'apparaît qu'avec le module
 * « Composants et guide ».
 */
function Index() {
  const { settings } = useBrandSettings();
  const texte = settings.accueil.texte || settings.tagline;
  return (
    <PageShell>
      <h1 className="text-3xl font-bold text-foreground">
        {settings.accueil.titre || settings.name}
      </h1>
      {texte ? (
        <p className="mt-3 max-w-[680px] whitespace-pre-line text-sm text-muted-foreground">
          {texte}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-2">
        {isFeatureOn("contact") ? (
          <Link
            to="/contact"
            title="Écrire au site"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Nous contacter
          </Link>
        ) : null}
        <Link
          to="/signup"
          title="Créer un compte sur le site"
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-input bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          Créer un compte
        </Link>
      </div>
      {isFeatureOn("showcase") ? <Demonstration /> : null}
    </PageShell>
  );
}

function Demonstration() {
  return (
    <>
      <Block
        title="Gabarits de pages"
        description="Cliquez pour voir chaque écran en taille réelle."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {withActiveModules(templates).map((t) => (
            <Link
              key={t.to}
              to={t.to}
              title={`${t.label} — ${t.desc}`}
              className="rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
            >
              <p className="text-sm font-semibold text-foreground">{t.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t.desc}</p>
            </Link>
          ))}
        </div>
      </Block>

      <Block title="Couleurs">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {Object.entries(cds.colors).map(([name, value]) => (
            <Swatch key={name} name={name} value={value} />
          ))}
        </div>
      </Block>

      <Block
        title="Couleurs d'état"
        description="Quatre usages par couleur : fond plein, fond pâle, texte, bordure."
      >
        <div className="flex flex-wrap gap-2">
          {Object.entries(cds.state).map(([name, v]) => (
            <span key={name} className="flex gap-1">
              <span
                className="rounded-full px-3 py-1 text-xs font-medium text-white"
                style={{ backgroundColor: v.solid }}
              >
                {name}
              </span>
              <span
                className="rounded-full border px-3 py-1 text-xs font-medium"
                style={{ backgroundColor: v.soft, color: v.text, borderColor: v.border }}
              >
                {name}
              </span>
            </span>
          ))}
        </div>
      </Block>

      <Block title="Typographie">
        <div className="space-y-2 rounded-xl border border-border bg-card p-6">
          <p className="text-[2rem] font-bold leading-tight text-foreground">Titre 2rem / 700</p>
          <p className="text-[1.5rem] font-semibold leading-tight text-foreground">
            Titre 1.5rem / 600
          </p>
          <p className="text-[1.15rem] font-semibold text-foreground">Sous-titre 1.15rem / 600</p>
          <p className="text-[0.88rem] text-foreground">
            Corps de texte 0.88rem — police du système
          </p>
          <p className="text-[0.78rem] text-muted-foreground">Texte secondaire 0.78rem</p>
        </div>
      </Block>

      <Block title="Rayons et ombres">
        <div className="grid gap-3 sm:grid-cols-4">
          {Object.entries(cds.shadow).map(([name, value]) => (
            <div key={name} className="rounded-xl bg-card p-5 text-xs" style={{ boxShadow: value }}>
              <p className="font-medium text-foreground">shadow {name}</p>
              <p className="mt-1 text-muted-foreground">
                radius {cds.radius[name as keyof typeof cds.radius] ?? "0.75rem"}
              </p>
            </div>
          ))}
        </div>
      </Block>
    </>
  );
}
