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
        "Réutiliser le socle sur un nouveau site : fichiers à copier, marque à configurer, pages fournies (connexion, légal, contact).",
      path: "/guide",
      type: "article",
    }),
  component: GuidePage,
});

const steps = [
  {
    title: "1. Cloner le socle",
    body: "Chaque projet est un clone du socle : dans Lovable, « Remix » du projet socle, puis connexion à un dépôt GitHub qui lui est propre. Le socle ne contient jamais rien de propre à un projet.",
  },
  {
    title: "2. Passer le SQL et les secrets",
    body: "Les migrations du socle se passent dans l'éditeur SQL du clone, dans l'ordre. Les clés (paiement, tâches planifiées) se rangent dans les secrets du projet, jamais dans le code ni en base.",
  },
  {
    title: "3. Régler l'identité depuis l'administration",
    body: "Aucun fichier à modifier : nom du site, adresse publique, mentions légales, hébergeur et domaine d'envoi des e-mails se règlent dans Administration → Paramètres. Titres, adresse canonique, plan du site, flux RSS, pages légales, aperçus de partage et e-mails les reprennent.",
  },
  {
    title: "4. Allumer les modules utiles au projet",
    body: "Administration → Modules : chaque module s'allume ou s'éteint, dépendances comprises. Un module éteint ne laisse aucune trace (pages, menus, pied de page, plan du site, administration).",
  },
  {
    title: "5. Retirer la démonstration",
    body: "Administration → Démarrage liste ce qui reste à régler et retire en deux gestes les exemples de la recette et les contenus de démarrage, sans toucher à ce que le projet a déjà modifié.",
  },
  {
    title: "6. Garder les règles du socle",
    body: "Thème clair uniquement, police du système, fond #eaeff5 sous des cartes blanches, texte #131922, couleur principale réglée dans les paramètres, rayon 6 px pour les boutons et 12 px pour les cartes. Un ton orienté bénéfices, jamais générique.",
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
          Réutiliser le socle sur un nouveau projet
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Le socle est un modèle complet : fondations visuelles, composants, pages de compte et
          pages légales prêtes à l'emploi. Voici la marche à suivre.
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
