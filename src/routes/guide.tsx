import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/cds/SiteHeader";
import { seo } from "@/lib/seo";
import { requireFeature } from "@/config/features";

export const Route = createFileRoute("/guide")({
  beforeLoad: () => requireFeature("showcase"),
  head: () =>
    seo({
      title: "Guide de réutilisation",
      description:
        "Réutiliser le Consensus Design System sur un nouveau site : fichiers à copier, marque à configurer, pages fournies (connexion, légal, contact).",
      path: "/guide",
      type: "article",
    }),
  component: GuidePage,
});

const steps = [
  {
    title: "1. Copier le socle",
    body: "Reprendre src/styles.css (tokens de couleur, typographie, rayons), src/lib/cds-tokens.ts, src/lib/seo.ts et le dossier src/components/cds.",
  },
  {
    title: "2. Régler la marque depuis l'administration",
    body: "Aucun fichier à modifier : l'espace Administration (réservé aux comptes administrateurs) permet de changer le nom du site, l'adresse publique, les coordonnées légales et l'hébergeur. Ces paramètres sont lus par le serveur : titres, adresse canonique, sitemap, flux RSS, pages légales et aperçus de partage les reprennent.",
  },
  {
    title: "3. Reprendre les pages fournies",
    body: "Connexion, création de compte, vérification de l'adresse e-mail, mot de passe oublié, nouveau mot de passe, profil, tableau de bord, contact protégé anti-spam, mentions légales, confidentialité, CGU, cookies, page introuvable et page de maintenance.",
  },
  {
    title: "4. Activer les modules utiles au projet",
    body: "Administration → Modules : chaque module s'allume ou s'éteint, dépendances comprises. Un module éteint ne laisse aucune trace (pages, menus, pied de page, sitemap, administration). Le contenu se remplit et se modère ensuite depuis Contenus, Modération, Abonnés.",
  },
  {
    title: "5. Vérifier le référencement",
    body: "Chaque page appelle seo() : titre unique, description, adresse canonique et aperçu de partage. Les articles et discussions entrent automatiquement dans le plan du site, et la FAQ est balisée pour les moteurs de recherche.",
  },
  {
    title: "6. Garder les règles CDS",
    body: "Thème clair uniquement, police Inter, fond #f8fafc, texte #1e293b, bleu #0d6efd, rayon 6 px pour les boutons et 12 px pour les cartes. Un ton orienté bénéfices, jamais générique.",
  },
];

const shipped = [
  { to: "/", label: "Tokens et fondations", title: "Couleurs, typographie, rayons et ombres" },
  {
    to: "/admin",
    label: "Espace d'administration",
    title: "Paramètres, contenus, modération, abonnés",
  },
  {
    to: "/composants",
    label: "Bibliothèque de composants",
    title: "Boutons, champs, tableaux, fenêtres, pagination",
  },
  {
    to: "/demarrer",
    label: "Tunnel de vente",
    title: "Parcours en trois étapes jusqu'à la création de compte",
  },
  {
    to: "/tarifs",
    label: "Offres tarifaires",
    title: "Grille d'offres pilotée depuis l'administration",
  },
  { to: "/faq", label: "Questions fréquentes", title: "FAQ balisée pour les moteurs de recherche" },
  { to: "/blog", label: "Blog et commentaires", title: "Articles publiés et commentaires modérés" },
  { to: "/forum", label: "Forum", title: "Sujets et réponses entre membres" },
  {
    to: "/avis",
    label: "Avis et notations",
    title: "Notes sur cinq étoiles validées avant publication",
  },
  {
    to: "/tableau-de-bord",
    label: "Tableau de bord",
    title: "Chiffres clés et raccourcis du compte",
  },
  {
    to: "/login",
    label: "Écrans de connexion",
    title: "Connexion, inscription, vérification et mot de passe",
  },
  { to: "/contact", label: "Formulaire de contact", title: "Formulaire protégé anti-spam" },
  {
    to: "/legal/mentions-legales",
    label: "Pages légales",
    title: "Mentions légales, confidentialité, CGU, cookies",
  },
  {
    to: "/maintenance",
    label: "Page de maintenance",
    title: "Écran affiché pendant une interruption de service",
  },
] as const;

function GuidePage() {
  return (
    <PageShell>
      <article className="mx-auto max-w-[760px]">
        <p className="text-xs font-medium uppercase tracking-wide text-primary-text">
          Documentation
        </p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">
          Réutiliser CDS sur un nouveau projet
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          CDS est un modèle complet : fondations visuelles, composants, pages de compte et pages
          légales prêtes à l'emploi. Voici la marche à suivre.
        </p>

        <div className="mt-8 space-y-4">
          {steps.map((step) => (
            <section key={step.title} className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-base font-semibold text-foreground">{step.title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{step.body}</p>
            </section>
          ))}
        </div>

        <h2 className="mt-12 text-lg font-semibold text-foreground">Ce qui est déjà livré</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {shipped.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              title={item.title}
              className="rounded-xl border border-border bg-card p-4 text-sm font-medium text-foreground transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
            >
              {item.label}
              <span className="mt-1 block text-xs font-normal text-muted-foreground">
                {item.title}
              </span>
            </Link>
          ))}
        </div>
      </article>
    </PageShell>
  );
}
