import { createFileRoute, Link } from "@tanstack/react-router";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/cds/SiteHeader";
import { ConfirmButton } from "@/components/cds/ConfirmButton";
import { ImageField } from "@/components/cds/MediaPicker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { requireFeature } from "@/config/features";
import { ARTICLE_LONGUEURS, borneSlug } from "@/lib/blog";
import {
  CATEGORIES_TERMES,
  ajouterSynonyme,
  ajouterTerme,
  changerStatut,
  creerArticle,
  effacerRechercheSansResultat,
  enregistrerContenu,
  enregistrerReglages,
  enregistrerEtiquette,
  enregistrerRubrique,
  enregistrerSerie,
  fetchARevoir,
  fetchEditorial,
  fetchEtatSources,
  fetchMaillage,
  fetchRecherche,
  fetchTaxonomie,
  fetchJournal,
  fetchReglages,
  fetchTermes,
  supprimerContenu,
  supprimerEtiquette,
  supprimerRubrique,
  supprimerSerie,
  supprimerSynonyme,
  supprimerTerme,
  useDroitsEditorial,
  type ContenuARevoir,
  type ContenuEditorial,
  type EtatMaillage,
  type EtatSource,
  type RechercheSansResultat,
  type Synonyme,
  type Taxonomie,
  type LigneJournal,
  type TermeInterdit,
} from "@/lib/editorial";
import {
  LONGUEURS,
  REGLAGES_PAR_DEFAUT,
  STATUTS,
  actionsPossibles,
  dateSimple,
  lireSources,
  manquesSaisie,
  prochaineAction,
  statutInfo,
  type Action,
  type ReglagesEditoriaux,
  type Statut,
} from "@/lib/editorial-regles";
import { slugify } from "@/lib/format";
import { lienMarkdown, suggestionsDeLiens } from "@/lib/maillage";
import { lienSearchConsole } from "@/lib/article-donnees";
import { verifierLiensSources } from "@/lib/editorial.functions";
import { absoluteUrl } from "@/lib/site-config";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/editorial")({
  beforeLoad: () => requireFeature("blog"),
  head: () =>
    seo({
      title: "Éditorial",
      description: "Écrire, relire et publier les articles du blog.",
      path: "/editorial",
      noindex: true,
    }),
  component: EditorialPage,
});

const cardClass =
  "rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card-tactile)] sm:p-6";

/** Couleur d'état par statut : couleurs nommées de la charte, fond pâle et texte foncé. */
const TON: Record<Statut, string> = {
  idee: "border-neutral-border bg-neutral-soft text-neutral-text",
  redaction: "border-info-border bg-info-soft text-info-text",
  a_relire: "border-violet-border bg-violet-soft text-violet-text",
  pret: "border-success-border bg-success-soft text-success-text",
  programme: "border-info-border bg-info-soft text-info-text",
  publie: "border-success-border bg-success-soft text-success-text",
  a_actualiser: "border-warning-border bg-warning-soft text-warning-text",
};

/** Données partagées du poste : tous les contenus, taxonomie, état du maillage. */
type PosteCtx = {
  contenus: ContenuEditorial[];
  taxo: Taxonomie;
  maillage: Map<string, EtatMaillage>;
  sources: Map<string, EtatSource>;
  admin: boolean;
};
const Contexte = createContext<PosteCtx>({
  contenus: [],
  taxo: { rubriques: [], etiquettes: [], series: [] },
  maillage: new Map(),
  sources: new Map(),
  admin: false,
});

function Pastille({ statut }: { statut: Statut }) {
  const info = statutInfo(statut);
  return (
    <span
      title={info.aide}
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${TON[statut]}`}
    >
      {info.label}
    </span>
  );
}

function EditorialPage() {
  const droits = useDroitsEditorial();

  if (droits && !droits.ecrit) {
    return (
      <PageShell>
        <Alert variant="destructive" className="mx-auto max-w-[640px]">
          <AlertTitle>Accès réservé</AlertTitle>
          <AlertDescription>
            Cet espace est réservé aux rédacteurs et aux administrateurs.{" "}
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
        <p className="text-xs font-medium uppercase tracking-wide text-primary-text">Éditorial</p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">Écrire, relire, publier</h1>
        <p className="mt-2 text-sm text-foreground">
          Chaque article passe par la relecture avant d'aller en ligne. La base vérifie ce qui
          manque à chaque étape : rien ne part incomplet.
        </p>
        {droits === null ? (
          <div className="mt-8 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <Poste admin={droits.admin} />
        )}
      </div>
    </PageShell>
  );
}

function Poste({ admin }: { admin: boolean }) {
  const [contenus, setContenus] = useState<ContenuEditorial[] | null>(null);
  const [reglages, setReglages] = useState<ReglagesEditoriaux>(REGLAGES_PAR_DEFAUT);
  const [taxo, setTaxo] = useState<Taxonomie>({ rubriques: [], etiquettes: [], series: [] });
  const [maillage, setMaillage] = useState<Map<string, EtatMaillage>>(new Map());
  const [sources, setSources] = useState<Map<string, EtatSource>>(new Map());
  const [echec, setEchec] = useState(false);

  const recharger = useCallback(async () => {
    try {
      const [c, r, t, m, so] = await Promise.all([
        fetchEditorial(),
        fetchReglages(),
        fetchTaxonomie(),
        fetchMaillage(),
        fetchEtatSources(),
      ]);
      setContenus(c);
      setReglages(r);
      setTaxo(t);
      setMaillage(m);
      setSources(so);
      setEchec(false);
    } catch {
      setEchec(true);
    }
  }, []);

  useEffect(() => {
    void recharger();
  }, [recharger]);

  return (
    <Contexte.Provider value={{ contenus: contenus ?? [], taxo, maillage, sources, admin }}>
      <Tabs defaultValue="articles" className="mt-8">
        <TabsList>
          <TabsTrigger value="articles">Articles</TabsTrigger>
          <TabsTrigger value="taxonomie">Taxonomie</TabsTrigger>
          {admin ? <TabsTrigger value="reglages">Réglages</TabsTrigger> : null}
        </TabsList>
        <TabsContent value="articles" className="mt-6 space-y-4">
          {echec ? (
            <Alert variant="destructive">
              <AlertTitle>Chargement impossible</AlertTitle>
              <AlertDescription>
                Les articles n'ont pas pu être chargés.{" "}
                <button type="button" className="underline" onClick={() => void recharger()}>
                  Réessayer
                </button>
              </AlertDescription>
            </Alert>
          ) : null}
          <NouvelArticle recharger={recharger} />
          {contenus === null ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <ListeParStatut
              contenus={contenus.filter((c) => c.type === "article")}
              admin={admin}
              reglages={reglages}
              recharger={recharger}
            />
          )}
        </TabsContent>
        <TabsContent value="taxonomie" className="mt-6 space-y-4">
          <TaxonomiePanneau recharger={recharger} />
          <RecherchePanneau recharger={recharger} />
        </TabsContent>
        {admin ? (
          <TabsContent value="reglages" className="mt-6 space-y-4">
            <Reglages initial={reglages} recharger={recharger} />
            <Termes />
            <SourcesPanneau recharger={recharger} />
          </TabsContent>
        ) : null}
      </Tabs>
    </Contexte.Provider>
  );
}

function NouvelArticle({ recharger }: { recharger: () => Promise<void> }) {
  const [titre, setTitre] = useState("");
  const [envoi, setEnvoi] = useState(false);

  async function creer(e: React.FormEvent) {
    e.preventDefault();
    const slug = borneSlug(slugify(titre));
    if (!slug) {
      toast.error("Titre trop court pour faire une adresse.");
      return;
    }
    setEnvoi(true);
    const erreur = await creerArticle(titre.trim(), slug);
    setEnvoi(false);
    if (erreur) {
      toast.error("Article non créé.", { description: erreur });
      return;
    }
    setTitre("");
    toast.success("Article créé en rédaction.");
    await recharger();
  }

  return (
    <form onSubmit={creer} className={`flex flex-col gap-3 sm:flex-row sm:items-end ${cardClass}`}>
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="nouvel-article">Nouvel article</Label>
        <Input
          id="nouvel-article"
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          placeholder="Titre de travail"
          required
          minLength={ARTICLE_LONGUEURS.titre.min}
          maxLength={ARTICLE_LONGUEURS.titre.max}
        />
      </div>
      <Button type="submit" disabled={envoi} title="Créer cet article en rédaction">
        Créer
      </Button>
    </form>
  );
}

function ListeParStatut({
  contenus,
  admin,
  reglages,
  recharger,
}: {
  contenus: ContenuEditorial[];
  admin: boolean;
  reglages: ReglagesEditoriaux;
  recharger: () => Promise<void>;
}) {
  if (contenus.length === 0) {
    return (
      <p className={`text-sm text-foreground ${cardClass}`}>
        Aucun article pour l'instant : donnez un titre de travail ci-dessus pour commencer.
      </p>
    );
  }
  return (
    <>
      {STATUTS.map((s) => {
        const liste = contenus.filter((c) => c.statut_lu === s.value);
        if (liste.length === 0) return null;
        return (
          <section key={s.value} aria-labelledby={`statut-${s.value}`} className="space-y-3">
            <h2 id={`statut-${s.value}`} className="text-base font-semibold text-foreground">
              {s.label} ({liste.length})
            </h2>
            {liste.map((c) => (
              <Fiche
                key={c.id}
                contenu={c}
                admin={admin}
                reglages={reglages}
                recharger={recharger}
              />
            ))}
          </section>
        );
      })}
    </>
  );
}

function Fiche({
  contenu,
  admin,
  reglages,
  recharger,
}: {
  contenu: ContenuEditorial;
  admin: boolean;
  reglages: ReglagesEditoriaux;
  recharger: () => Promise<void>;
}) {
  const [edition, setEdition] = useState(false);
  const [journal, setJournal] = useState<LigneJournal[] | null>(null);
  const actions = actionsPossibles(contenu, reglages.circuit).filter((a) => admin || !a.admin);

  async function voirJournal() {
    if (journal) {
      setJournal(null);
      return;
    }
    try {
      setJournal(await fetchJournal(contenu.id));
    } catch {
      toast.error("Journal indisponible.");
    }
  }

  return (
    <article className={cardClass}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{contenu.titre}</h3>
          <p className="mt-1 text-xs text-foreground">
            /blog/{contenu.slug}
            {contenu.relu_le ? ` · relu le ${dateSimple(contenu.relu_le)}` : ""}
            {contenu.date_prevue ? ` · prévu le ${dateSimple(contenu.date_prevue)}` : ""}
          </p>
        </div>
        <Pastille statut={contenu.statut_lu} />
      </div>
      <p className="mt-3 text-sm text-foreground">{prochaineAction(contenu.statut_lu)}</p>
      {contenu.manques.length > 0 ? (
        <ul className="mt-3 space-y-1 rounded-md border border-warning-border bg-warning-soft p-3 text-sm text-warning-text">
          {contenu.manques.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      ) : null}
      <SourcesArticle contenu={contenu} />
      <MaillagePanneau contenu={contenu} />
      <div className="mt-4 flex flex-wrap gap-2">
        {actions.map((a) => (
          <Passage key={a.vers + a.label} contenu={contenu} action={a} recharger={recharger} />
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setEdition((v) => !v)}
          title="Modifier le texte et les champs de cet article"
        >
          {edition ? "Fermer" : "Modifier"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void voirJournal()}
          title="Voir les derniers changements de statut"
        >
          {journal ? "Masquer le journal" : "Journal"}
        </Button>
        {admin ? (
          <ConfirmButton
            title="Supprimer cet article"
            question={`Supprimer « ${contenu.titre} » ?`}
            onConfirm={async () => {
              const erreur = await supprimerContenu(contenu.id);
              if (erreur) toast.error("Suppression impossible.", { description: erreur });
              else {
                toast.success("Article supprimé.");
                await recharger();
              }
            }}
          />
        ) : null}
      </div>
      {journal ? <Journal lignes={journal} /> : null}
      {edition ? (
        <Edition
          contenu={contenu}
          reglages={reglages}
          fermer={() => setEdition(false)}
          recharger={recharger}
        />
      ) : null}
    </article>
  );
}

function Passage({
  contenu,
  action,
  recharger,
}: {
  contenu: ContenuEditorial;
  action: Action;
  recharger: () => Promise<void>;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [motif, setMotif] = useState("");
  const [quand, setQuand] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const besoin = action.motif || action.date;

  async function lancer() {
    setEnvoi(true);
    const erreur = await changerStatut(
      contenu.id,
      action.vers,
      motif.trim(),
      action.date && quand ? new Date(quand).toISOString() : null,
    );
    setEnvoi(false);
    if (erreur) {
      toast.error("Passage refusé.", { description: erreur });
      return;
    }
    toast.success(`${action.label} : fait.`);
    setOuvert(false);
    await recharger();
  }

  if (!besoin) {
    return (
      <Button
        type="button"
        size="sm"
        variant={action.principal ? "default" : "outline"}
        disabled={envoi}
        onClick={() => void lancer()}
        title={action.label}
      >
        {action.label}
      </Button>
    );
  }
  if (!ouvert) {
    return (
      <Button
        type="button"
        size="sm"
        variant={action.principal ? "default" : "outline"}
        onClick={() => setOuvert(true)}
        title={action.label}
      >
        {action.label}…
      </Button>
    );
  }
  const id = `${action.vers}-${contenu.id}`;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void lancer();
      }}
      className="flex w-full flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-end"
    >
      {action.motif ? (
        <div className="flex-1 space-y-1.5">
          <Label htmlFor={`motif-${id}`}>Motif</Label>
          <Input
            id={`motif-${id}`}
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            maxLength={300}
            required
          />
        </div>
      ) : null}
      {action.date ? (
        <div className="flex-1 space-y-1.5">
          <Label htmlFor={`date-${id}`}>Date et heure de publication</Label>
          <Input
            id={`date-${id}`}
            type="datetime-local"
            value={quand}
            onChange={(e) => setQuand(e.target.value)}
            required
          />
        </div>
      ) : null}
      <Button type="submit" size="sm" disabled={envoi} title={action.label}>
        {action.label}
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={() => setOuvert(false)}>
        Annuler
      </Button>
    </form>
  );
}

function Journal({ lignes }: { lignes: LigneJournal[] }) {
  if (lignes.length === 0) return <p className="mt-4 text-sm text-foreground">Journal vide.</p>;
  return (
    <ol className="mt-4 space-y-2 border-l-2 border-border pl-4 text-sm text-foreground">
      {lignes.map((l) => (
        <li key={l.id}>
          <span className="font-medium">
            {new Date(l.created_at).toLocaleString("fr-FR", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </span>{" "}
          — {l.de ? `${statutInfo(l.de as Statut).label} → ` : ""}
          {statutInfo(l.vers as Statut).label}
          {l.auto ? " (par la base)" : ""}
          {l.motif ? ` : ${l.motif}` : ""}
        </li>
      ))}
    </ol>
  );
}

function Compteur({ n, min, max }: { n: number; min?: number; max: number }) {
  const ok = n <= max && (min === undefined || n >= min);
  return (
    <span className={`text-xs ${ok ? "text-foreground" : "text-warning-text"}`}>
      {n} caractères{min !== undefined ? ` (de ${min} à ${max})` : ` (${max} au plus)`}
    </span>
  );
}

function Edition({
  contenu,
  reglages,
  fermer,
  recharger,
}: {
  contenu: ContenuEditorial;
  reglages: ReglagesEditoriaux;
  fermer: () => void;
  recharger: () => Promise<void>;
}) {
  const [v, setV] = useState({
    titre: contenu.titre,
    slug: contenu.slug,
    description: contenu.description,
    chapo: contenu.chapo,
    corps: contenu.corps,
    sources: contenu.sources,
    auteur_fonction: contenu.auteur_fonction,
    auteur_nom: contenu.auteur_nom,
    image_url: contenu.image_url ?? "",
    image_alt: contenu.image_alt,
    date_prevue: contenu.date_prevue ?? "",
    public_vise: contenu.public_vise,
    requete_visee: contenu.requete_visee,
    rubrique_id: contenu.rubrique_id ?? "",
    serie_id: contenu.serie_id ?? "",
    serie_ordre: contenu.serie_ordre ? String(contenu.serie_ordre) : "",
    pilier_id: contenu.pilier_id ?? "",
  });
  const [estPilier, setEstPilier] = useState(contenu.est_pilier);
  const [etiq, setEtiq] = useState<string[]>(contenu.etiquettes);
  const { taxo, contenus } = useContext(Contexte);
  const piliers = contenus.filter(
    (c) => c.est_pilier && c.id !== contenu.id && c.type === "article",
  );
  const [envoi, setEnvoi] = useState(false);
  const id = (champ: string) => `ed-${champ}-${contenu.id}`;
  const enLigneOuRelu = ["pret", "programme", "publie", "a_actualiser"].includes(contenu.statut_lu);
  const manques = useMemo(
    () =>
      manquesSaisie({ type: contenu.type, relu_le: contenu.relu_le, ...v }, reglages).filter(
        (m) => m.code !== "relecture",
      ),
    [contenu.type, contenu.relu_le, v, reglages],
  );

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    const slug = borneSlug(slugify(v.slug || v.titre));
    if (!slug) {
      toast.error("Adresse invalide.", { description: "Donnez un titre ou une adresse." });
      return;
    }
    setEnvoi(true);
    const erreur = await enregistrerContenu(contenu.id, {
      titre: v.titre.trim(),
      slug,
      description: v.description.trim(),
      chapo: v.chapo.trim(),
      corps: v.corps.trim(),
      sources: v.sources.trim(),
      auteur_fonction: v.auteur_fonction.trim(),
      auteur_nom: v.auteur_nom.trim(),
      etiquettes: etiq,
      rubrique_id: v.rubrique_id || null,
      serie_id: v.serie_id || null,
      serie_ordre: v.serie_id && v.serie_ordre ? Number(v.serie_ordre) : null,
      est_pilier: estPilier,
      pilier_id: estPilier ? null : v.pilier_id || null,
      image_url: v.image_url.trim() || null,
      image_alt: v.image_alt.trim(),
      date_prevue: v.date_prevue || null,
      public_vise: v.public_vise.trim(),
      requete_visee: v.requete_visee.trim(),
    });
    setEnvoi(false);
    if (erreur) {
      toast.error("Enregistrement impossible.", { description: erreur });
      return;
    }
    toast.success("Article enregistré.");
    fermer();
    await recharger();
  }

  const champ = (k: keyof typeof v) => ({
    id: id(k),
    value: v[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setV({ ...v, [k]: e.target.value }),
  });

  return (
    <form onSubmit={enregistrer} className="mt-5 space-y-4 border-t border-border pt-5">
      {enLigneOuRelu ? (
        <p className="rounded-md border border-info-border bg-info-soft p-3 text-sm text-info-text">
          Ce texte a déjà été relu. Le modifier le renvoie en relecture ; un article en ligne y
          reste, marqué « à actualiser ».
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={id("titre")}>Titre</Label>
          <Input {...champ("titre")} required maxLength={ARTICLE_LONGUEURS.titre.max} />
          <Compteur n={v.titre.trim().length} min={LONGUEURS.titre.min} max={LONGUEURS.titre.max} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("slug")}>Adresse (/blog/…)</Label>
          <Input {...champ("slug")} maxLength={ARTICLE_LONGUEURS.slug} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={id("description")}>Description pour les moteurs de recherche</Label>
        <Textarea {...champ("description")} rows={2} maxLength={ARTICLE_LONGUEURS.description} />
        <Compteur
          n={v.description.trim().length}
          min={LONGUEURS.description.min}
          max={LONGUEURS.description.max}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={id("chapo")}>Chapô</Label>
        <Textarea {...champ("chapo")} rows={3} maxLength={ARTICLE_LONGUEURS.chapo} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={id("corps")}>Texte</Label>
        <Textarea {...champ("corps")} rows={14} maxLength={ARTICLE_LONGUEURS.corps} />
        <p className="text-xs text-foreground">
          Mise en forme : ## intertitre, ### sous-intertitre (sommaire dès trois intertitres), -
          liste, 1. liste numérotée, &gt; citation, :::retenir … ::: encadré, :::faq … ::: questions
          (lignes « Q : » puis « R : »), **gras**, *italique*, [texte](/adresse).
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={id("sources")}>
          Sources (une par ligne : « Libellé — https://adresse »)
        </Label>
        <Textarea {...champ("sources")} rows={3} maxLength={4000} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={id("auteur_fonction")}>Fonction de l'auteur</Label>
          <Input {...champ("auteur_fonction")} maxLength={80} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("auteur_nom")}>Nom de l'auteur</Label>
          <Input {...champ("auteur_nom")} maxLength={80} />
          <p className="text-xs text-foreground">
            Affiché seulement si le site montre le nom des auteurs (réglage).
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={id("rubrique_id")}>Rubrique</Label>
          <select
            id={id("rubrique_id")}
            value={v.rubrique_id}
            onChange={(e) => setV({ ...v, rubrique_id: e.target.value })}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Aucune</option>
            {taxo.rubriques.map((r) => (
              <option key={r.id} value={r.id}>
                {r.parent_id ? "— " : ""}
                {r.libelle}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("pilier_id")}>Place dans le maillage</Label>
          <select
            id={id("pilier_id")}
            value={estPilier ? "__pilier" : v.pilier_id}
            onChange={(e) => {
              setEstPilier(e.target.value === "__pilier");
              setV({ ...v, pilier_id: e.target.value === "__pilier" ? "" : e.target.value });
            }}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Article indépendant</option>
            <option value="__pilier">Pilier : guide de fond d'un sujet</option>
            {piliers.map((p) => (
              <option key={p.id} value={p.id}>
                Satellite de : {p.titre}
              </option>
            ))}
          </select>
        </div>
      </div>
      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium text-foreground">Étiquettes</legend>
        {taxo.etiquettes.length === 0 ? (
          <p className="text-xs text-foreground">
            Aucune étiquette : les créer dans l'onglet Taxonomie.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {taxo.etiquettes.map((e) => {
              const coche = etiq.includes(e.libelle);
              return (
                <label
                  key={e.id}
                  title={e.definition || e.libelle}
                  className={`flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-xs ${
                    coche
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={coche}
                    onChange={() =>
                      setEtiq(coche ? etiq.filter((x) => x !== e.libelle) : [...etiq, e.libelle])
                    }
                  />
                  {e.libelle}
                </label>
              );
            })}
          </div>
        )}
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={id("serie_id")}>Série</Label>
          <select
            id={id("serie_id")}
            value={v.serie_id}
            onChange={(e) => setV({ ...v, serie_id: e.target.value })}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Aucune</option>
            {taxo.series.map((se) => (
              <option key={se.id} value={se.id}>
                {se.titre}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("serie_ordre")}>Place dans la série</Label>
          <Input {...champ("serie_ordre")} type="number" min={1} max={999} disabled={!v.serie_id} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <ImageField
          id={id("image")}
          label="Image de couverture"
          value={v.image_url}
          onChange={(image_url) => setV({ ...v, image_url })}
        />
        <div className="space-y-1.5">
          <Label htmlFor={id("image_alt")}>Texte alternatif de l'image</Label>
          <Input {...champ("image_alt")} maxLength={200} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor={id("date_prevue")}>Date prévue</Label>
          <Input {...champ("date_prevue")} type="date" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("public_vise")}>Public visé</Label>
          <Input {...champ("public_vise")} maxLength={120} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("requete_visee")}>Requête visée</Label>
          <Input {...champ("requete_visee")} maxLength={120} />
        </div>
      </div>
      {manques.length > 0 ? (
        <div className="rounded-md border border-warning-border bg-warning-soft p-3 text-sm text-warning-text">
          <p className="font-medium">Avant publication :</p>
          <ul className="mt-1 list-disc pl-5">
            {manques.map((m) => (
              <li key={m.code}>{m.message}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={envoi} title="Enregistrer cet article">
          Enregistrer
        </Button>
        <Button type="button" variant="outline" onClick={fermer}>
          Annuler
        </Button>
      </div>
    </form>
  );
}

function Reglages({
  initial,
  recharger,
}: {
  initial: ReglagesEditoriaux;
  recharger: () => Promise<void>;
}) {
  const [r, setR] = useState(initial);
  const [envoi, setEnvoi] = useState(false);
  useEffect(() => setR(initial), [initial]);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    const erreur = await enregistrerReglages(r);
    setEnvoi(false);
    if (erreur) {
      toast.error("Réglages non enregistrés.", { description: erreur });
      return;
    }
    toast.success("Réglages enregistrés.");
    await recharger();
  }

  const interrupteur = (
    k: "exiger_sources" | "exiger_relecture" | "exiger_auteur" | "longueurs_seo",
    libelle: string,
    aide: string,
  ) => (
    <div className="flex items-start justify-between gap-4">
      <div>
        <Label htmlFor={`reglage-${k}`}>{libelle}</Label>
        <p className="text-xs text-foreground">{aide}</p>
      </div>
      <Switch
        id={`reglage-${k}`}
        checked={r[k]}
        onCheckedChange={(checked) => setR({ ...r, [k]: checked })}
      />
    </div>
  );

  return (
    <form onSubmit={enregistrer} className={`space-y-5 ${cardClass}`}>
      <h2 className="text-base font-semibold text-foreground">Règles de publication</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="reglage-circuit">Circuit</Label>
          <select
            id="reglage-circuit"
            value={r.circuit}
            onChange={(e) =>
              setR({ ...r, circuit: e.target.value === "simple" ? "simple" : "complet" })
            }
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="complet">Complet : relecture avant publication</option>
            <option value="simple">Simple : un administrateur publie directement</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reglage-delai">Relecture à refaire après (mois)</Label>
          <Input
            id="reglage-delai"
            type="number"
            min={1}
            max={60}
            value={r.delai_relecture_mois}
            onChange={(e) =>
              setR({
                ...r,
                delai_relecture_mois: Math.min(60, Math.max(1, Number(e.target.value) || 12)),
              })
            }
          />
        </div>
      </div>
      {interrupteur(
        "exiger_relecture",
        "Relecture exigée",
        "Un article se publie relu ; il redevient « à actualiser » après le délai.",
      )}
      {interrupteur(
        "exiger_sources",
        "Source exigée",
        "Au moins une adresse https:// dans les sources d'un article.",
      )}
      {interrupteur(
        "exiger_auteur",
        "Auteur exigé",
        "Fonction ou nom de l'auteur, selon l'affichage choisi.",
      )}
      {interrupteur(
        "longueurs_seo",
        "Longueurs pour les moteurs de recherche",
        "Titre de 10 à 70 caractères, description de 70 à 160.",
      )}
      <div className="space-y-1.5">
        <Label htmlFor="reglage-auteur">Auteur affiché sous les articles</Label>
        <select
          id="reglage-auteur"
          value={r.auteur_mode}
          onChange={(e) =>
            setR({ ...r, auteur_mode: e.target.value === "nomme" ? "nomme" : "fonction" })
          }
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="fonction">Sa fonction (par exemple « Rédactrice spécialisée »)</option>
          <option value="nomme">Son nom</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reglage-type-page">Nature des articles pour les moteurs de recherche</Label>
        <select
          id="reglage-type-page"
          value={r.type_page}
          onChange={(e) =>
            setR({
              ...r,
              type_page: e.target.value === "MedicalWebPage" ? "MedicalWebPage" : "WebPage",
            })
          }
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="WebPage">Page d'information générale</option>
          <option value="MedicalWebPage">Page d'information médicale ou de santé</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reglage-avertissement">Avertissement sous chaque article</Label>
        <Textarea
          id="reglage-avertissement"
          rows={3}
          maxLength={400}
          value={r.avertissement}
          onChange={(e) => setR({ ...r, avertissement: e.target.value })}
          placeholder="Par exemple : ces articles informent, ils ne remplacent pas l'avis d'un professionnel."
        />
      </div>
      <Button type="submit" disabled={envoi} title="Enregistrer les règles de publication">
        Enregistrer
      </Button>
    </form>
  );
}

function Termes() {
  const [termes, setTermes] = useState<TermeInterdit[] | null>(null);
  const [aRevoir, setARevoir] = useState<ContenuARevoir[]>([]);
  const [terme, setTerme] = useState("");
  const [categorie, setCategorie] = useState<string>("marque");

  const charger = useCallback(async () => {
    try {
      const [t, a] = await Promise.all([fetchTermes(), fetchARevoir()]);
      setTermes(t);
      setARevoir(a);
    } catch {
      toast.error("Termes interdits indisponibles.");
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    const erreur = await ajouterTerme(terme, categorie);
    if (erreur) {
      toast.error("Terme non ajouté.", { description: erreur });
      return;
    }
    setTerme("");
    await charger();
  }

  return (
    <section className={`space-y-4 ${cardClass}`} aria-labelledby="termes-titre">
      <h2 id="termes-titre" className="text-base font-semibold text-foreground">
        Termes interdits
      </h2>
      <p className="text-sm text-foreground">
        Un contenu qui contient un de ces termes ne se publie pas. La liste vit en base, jamais dans
        le code du site.
      </p>
      <form onSubmit={ajouter} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="terme">Terme</Label>
          <Input
            id="terme"
            value={terme}
            onChange={(e) => setTerme(e.target.value)}
            minLength={3}
            maxLength={120}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="terme-categorie">Catégorie</Label>
          <select
            id="terme-categorie"
            value={categorie}
            onChange={(e) => setCategorie(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {CATEGORIES_TERMES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" title="Ajouter ce terme à la liste">
          Ajouter
        </Button>
      </form>
      {termes === null ? (
        <Skeleton className="h-16 w-full" />
      ) : termes.length === 0 ? (
        <p className="text-sm text-foreground">Aucun terme pour l'instant.</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {termes.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="text-foreground">
                {t.terme} ·{" "}
                {CATEGORIES_TERMES.find((c) => c.value === t.categorie)?.label ?? t.categorie}
              </span>
              <ConfirmButton
                title={`Retirer « ${t.terme} »`}
                question={`Retirer « ${t.terme} » de la liste ?`}
                label="Retirer"
                confirmLabel="Retirer"
                onConfirm={async () => {
                  const erreur = await supprimerTerme(t.id);
                  if (erreur) toast.error("Terme non retiré.", { description: erreur });
                  else await charger();
                }}
              />
            </li>
          ))}
        </ul>
      )}
      {aRevoir.length > 0 ? (
        <div className="rounded-md border border-warning-border bg-warning-soft p-3 text-sm text-warning-text">
          <p className="font-medium">Contenus en ligne à revoir :</p>
          <ul className="mt-1 list-disc pl-5">
            {aRevoir.map((c) => (
              <li key={c.id}>
                {c.titre} : {c.termes.join(", ")}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function MaillagePanneau({ contenu }: { contenu: ContenuEditorial }) {
  const { contenus, maillage } = useContext(Contexte);
  const etat = maillage.get(contenu.id);
  const [ouvert, setOuvert] = useState(false);
  const suggestions = useMemo(
    () =>
      ouvert
        ? suggestionsDeLiens(
            { ...contenu, en_ligne: false },
            contenus
              .filter((c) => c.type === "article")
              .map((c) => ({
                ...c,
                en_ligne: c.statut_lu === "publie" || c.statut_lu === "a_actualiser",
              })),
          )
        : [],
    [ouvert, contenu, contenus],
  );
  if (!etat) return null;
  const alertes = [
    ...(etat.orphelin ? ["Aucun article en ligne ne renvoie vers celui-ci."] : []),
    ...(etat.liens_casses.length ? [`Liens cassés : ${etat.liens_casses.join(", ")}.`] : []),
    ...(etat.liens_rediriges.length
      ? [`Liens vers une ancienne adresse, à mettre à jour : ${etat.liens_rediriges.join(", ")}.`]
      : []),
    ...(etat.ancres_pauvres.length
      ? [`Ancres qui ne disent rien de la page visée : ${etat.ancres_pauvres.join(", ")}.`]
      : []),
    ...(etat.satellites_absents.length
      ? [`Satellites en ligne non cités par ce pilier : ${etat.satellites_absents.join(", ")}.`]
      : []),
    ...(etat.requete_en_double.length
      ? [`Même requête visée que : ${etat.requete_en_double.join(", ")}.`]
      : []),
  ];
  return (
    <div className="mt-4 rounded-md border border-border p-3 text-sm text-foreground">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p>
          Maillage : {etat.sortants} lien{etat.sortants > 1 ? "s" : ""} vers le blog,{" "}
          {etat.entrants} article{etat.entrants > 1 ? "s" : ""} en ligne qui y renvoie
          {etat.entrants > 1 ? "nt" : ""}.
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setOuvert((o) => !o)}
          title="Proposer des articles à citer dans ce texte"
        >
          {ouvert ? "Masquer les suggestions" : "Suggérer des liens"}
        </Button>
      </div>
      {alertes.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 rounded-md border border-warning-border bg-warning-soft py-2 pl-7 pr-3 text-warning-text">
          {alertes.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      ) : null}
      {ouvert ? (
        suggestions.length === 0 ? (
          <p className="mt-2">Aucun article en ligne proche pour l'instant.</p>
        ) : (
          <ul className="mt-2 divide-y divide-border rounded-md border border-border">
            {suggestions.map((sg) => (
              <li
                key={sg.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
              >
                <span>
                  <span className="font-medium">{sg.titre}</span> · {sg.raison}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  title="Copier le lien à coller dans le texte"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(lienMarkdown(sg.titre, sg.slug))
                      .then(() => toast.success("Lien copié : à coller dans le texte."));
                  }}
                >
                  Copier le lien
                </Button>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}

function TaxonomiePanneau({ recharger }: { recharger: () => Promise<void> }) {
  const { taxo, admin } = useContext(Contexte);
  const [rub, setRub] = useState({ libelle: "", intro: "", parent_id: "" });
  const [eti, setEti] = useState({ libelle: "", definition: "" });
  const [ser, setSer] = useState({ titre: "", description: "" });
  const meres = taxo.rubriques.filter((r) => !r.parent_id);

  async function apres(erreur: string, ok: string) {
    if (erreur) {
      toast.error("Enregistrement impossible.", { description: erreur });
      return false;
    }
    toast.success(ok);
    await recharger();
    return true;
  }

  return (
    <>
      <section className={`space-y-4 ${cardClass}`} aria-labelledby="tx-rubriques">
        <h2 id="tx-rubriques" className="text-base font-semibold text-foreground">
          Rubriques
        </h2>
        <p className="text-sm text-foreground">
          Une rubrique par article, deux niveaux au plus. Chaque rubrique a sa page, avec son texte
          d'introduction : elle donne le fil d'Ariane des articles.
        </p>
        {taxo.rubriques.length > 0 ? (
          <ul className="divide-y divide-border rounded-md border border-border">
            {taxo.rubriques.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="text-foreground">
                  {r.parent_id ? "— " : ""}
                  {r.libelle} · /blog/rubrique/{r.slug}
                </span>
                {admin ? (
                  <ConfirmButton
                    title={`Supprimer la rubrique « ${r.libelle} »`}
                    question={`Supprimer la rubrique « ${r.libelle} » ? Ses articles restent, sans rubrique.`}
                    onConfirm={async () => {
                      await apres(await supprimerRubrique(r.id), "Rubrique supprimée.");
                    }}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        {admin ? (
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await apres(
                await enregistrerRubrique(null, {
                  libelle: rub.libelle.trim(),
                  slug: borneSlug(slugify(rub.libelle)),
                  intro: rub.intro.trim(),
                  parent_id: rub.parent_id || null,
                  ordre: 0,
                }),
                "Rubrique créée.",
              );
              if (ok) setRub({ libelle: "", intro: "", parent_id: "" });
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="tx-rub-libelle">Nouvelle rubrique</Label>
              <Input
                id="tx-rub-libelle"
                value={rub.libelle}
                onChange={(e) => setRub({ ...rub, libelle: e.target.value })}
                minLength={2}
                maxLength={60}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tx-rub-parent">Rubrique mère</Label>
              <select
                id="tx-rub-parent"
                value={rub.parent_id}
                onChange={(e) => setRub({ ...rub, parent_id: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Aucune (premier niveau)</option>
                {meres.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.libelle}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="tx-rub-intro">Texte d'introduction de la page</Label>
              <Textarea
                id="tx-rub-intro"
                rows={2}
                maxLength={2000}
                value={rub.intro}
                onChange={(e) => setRub({ ...rub, intro: e.target.value })}
              />
            </div>
            <Button type="submit" className="sm:col-span-2 sm:w-fit" title="Créer cette rubrique">
              Créer la rubrique
            </Button>
          </form>
        ) : (
          <p className="text-sm text-foreground">
            Les rubriques sont créées par un administrateur.
          </p>
        )}
      </section>

      <section className={`space-y-4 ${cardClass}`} aria-labelledby="tx-etiquettes">
        <h2 id="tx-etiquettes" className="text-base font-semibold text-foreground">
          Étiquettes
        </h2>
        <p className="text-sm text-foreground">
          Un vocabulaire commun : un article ne porte que des étiquettes de cette liste. Une
          définition courte aide les rédacteurs à choisir.
        </p>
        {taxo.etiquettes.length > 0 ? (
          <ul className="divide-y divide-border rounded-md border border-border">
            {taxo.etiquettes.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="text-foreground">
                  <span className="font-medium">{e.libelle}</span>
                  {e.definition ? ` · ${e.definition}` : ""}
                </span>
                {admin ? (
                  <ConfirmButton
                    title={`Supprimer l'étiquette « ${e.libelle} »`}
                    question={`Supprimer l'étiquette « ${e.libelle} » ? Les articles qui la portent la gardent jusqu'à leur prochaine modification.`}
                    onConfirm={async () => {
                      await apres(await supprimerEtiquette(e.id), "Étiquette supprimée.");
                    }}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={async (ev) => {
            ev.preventDefault();
            const ok = await apres(
              await enregistrerEtiquette(null, {
                libelle: eti.libelle.trim(),
                definition: eti.definition.trim(),
              }),
              "Étiquette créée.",
            );
            if (ok) setEti({ libelle: "", definition: "" });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="tx-eti-libelle">Nouvelle étiquette</Label>
            <Input
              id="tx-eti-libelle"
              value={eti.libelle}
              onChange={(ev) => setEti({ ...eti, libelle: ev.target.value })}
              minLength={2}
              maxLength={60}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tx-eti-definition">Définition</Label>
            <Input
              id="tx-eti-definition"
              value={eti.definition}
              onChange={(ev) => setEti({ ...eti, definition: ev.target.value })}
              maxLength={300}
            />
          </div>
          <Button type="submit" className="sm:col-span-2 sm:w-fit" title="Créer cette étiquette">
            Créer l'étiquette
          </Button>
        </form>
      </section>

      <section className={`space-y-4 ${cardClass}`} aria-labelledby="tx-series">
        <h2 id="tx-series" className="text-base font-semibold text-foreground">
          Séries
        </h2>
        <p className="text-sm text-foreground">
          Une suite d'articles à lire dans l'ordre : chaque article de la série renvoie au précédent
          et au suivant.
        </p>
        {taxo.series.length > 0 ? (
          <ul className="divide-y divide-border rounded-md border border-border">
            {taxo.series.map((se) => (
              <li key={se.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="text-foreground">
                  {se.titre} · /blog/serie/{se.slug}
                </span>
                {admin ? (
                  <ConfirmButton
                    title={`Supprimer la série « ${se.titre} »`}
                    question={`Supprimer la série « ${se.titre} » ? Ses articles restent, hors série.`}
                    onConfirm={async () => {
                      await apres(await supprimerSerie(se.id), "Série supprimée.");
                    }}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={async (ev) => {
            ev.preventDefault();
            const ok = await apres(
              await enregistrerSerie(null, {
                titre: ser.titre.trim(),
                slug: borneSlug(slugify(ser.titre)),
                description: ser.description.trim(),
              }),
              "Série créée.",
            );
            if (ok) setSer({ titre: "", description: "" });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="tx-ser-titre">Nouvelle série</Label>
            <Input
              id="tx-ser-titre"
              value={ser.titre}
              onChange={(ev) => setSer({ ...ser, titre: ev.target.value })}
              minLength={3}
              maxLength={120}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tx-ser-description">Présentation</Label>
            <Input
              id="tx-ser-description"
              value={ser.description}
              onChange={(ev) => setSer({ ...ser, description: ev.target.value })}
              maxLength={600}
            />
          </div>
          <Button type="submit" className="sm:col-span-2 sm:w-fit" title="Créer cette série">
            Créer la série
          </Button>
        </form>
      </section>
    </>
  );
}

/** Sources injoignables d'un article, et lien vers ses performances dans la Search Console. */
function SourcesArticle({ contenu }: { contenu: ContenuEditorial }) {
  const { sources } = useContext(Contexte);
  const mortes = lireSources(contenu.sources).filter((s) => sources.get(s.url)?.ok === false);
  const enLigne = contenu.statut_lu === "publie" || contenu.statut_lu === "a_actualiser";
  if (mortes.length === 0 && !enLigne) return null;
  return (
    <div className="mt-4 space-y-2 text-sm text-foreground">
      {mortes.length > 0 ? (
        <ul className="list-disc space-y-1 rounded-md border border-warning-border bg-warning-soft py-2 pl-7 pr-3 text-warning-text">
          {mortes.map((s) => (
            <li key={s.url}>
              Source injoignable : {s.libelle} ({sources.get(s.url)?.erreur || "erreur"}).
            </li>
          ))}
        </ul>
      ) : null}
      {enLigne ? (
        <a
          href={lienSearchConsole(absoluteUrl("/").replace(/\/$/, ""), `/blog/${contenu.slug}`)}
          target="_blank"
          rel="noopener noreferrer"
          title="Ouvrir les performances de cet article dans la Search Console"
          className="font-medium text-primary-text underline underline-offset-2"
        >
          Performances dans la Search Console
        </a>
      ) : null}
    </div>
  );
}

function SourcesPanneau({ recharger }: { recharger: () => Promise<void> }) {
  const { sources } = useContext(Contexte);
  const [envoi, setEnvoi] = useState(false);
  const injoignables = [...sources.values()].filter((e) => !e.ok);

  async function verifier() {
    setEnvoi(true);
    try {
      const r = await verifierLiensSources();
      toast.success(
        `${r.verifiees} adresse${r.verifiees > 1 ? "s" : ""} vérifiée${r.verifiees > 1 ? "s" : ""}.`,
        {
          description: `${r.injoignables} injoignable${r.injoignables > 1 ? "s" : ""} ; ${r.restantes} à vérifier au prochain passage.`,
        },
      );
      await recharger();
    } catch (e) {
      toast.error("Vérification impossible.", {
        description: e instanceof Error ? e.message : "Réessayez dans un instant.",
      });
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <section className={`space-y-4 ${cardClass}`} aria-labelledby="sources-titre-reglages">
      <h2 id="sources-titre-reglages" className="text-base font-semibold text-foreground">
        Liens de sources
      </h2>
      <p className="text-sm text-foreground">
        Le site appelle les adresses citées en sources, 30 à la fois, les plus anciennes d'abord.
        Seules les adresses https publiques sont appelées. Une source injoignable est signalée sous
        l'article.
      </p>
      <Button
        type="button"
        disabled={envoi}
        onClick={() => void verifier()}
        title="Vérifier les liens de sources"
      >
        {envoi ? "Vérification…" : "Vérifier les liens de sources"}
      </Button>
      {injoignables.length > 0 ? (
        <ul className="divide-y divide-border rounded-md border border-border text-sm">
          {injoignables.map((e) => (
            <li key={e.url} className="px-3 py-2 text-foreground">
              <span className="break-all">{e.url}</span> · {e.erreur || `réponse ${e.code_http}`} ·
              vérifiée le {new Date(e.verifie_le).toLocaleDateString("fr-FR")}
            </li>
          ))}
        </ul>
      ) : sources.size > 0 ? (
        <p className="text-sm text-foreground">Toutes les sources vérifiées répondent.</p>
      ) : null}
    </section>
  );
}

/** Synonymes et recherches sans résultat (socle 1.13.0) : ce que les lecteurs cherchent en vain. */
function RecherchePanneau({ recharger }: { recharger: () => Promise<void> }) {
  const [synonymes, setSynonymes] = useState<Synonyme[]>([]);
  const [sansResultat, setSansResultat] = useState<RechercheSansResultat[]>([]);
  const [terme, setTerme] = useState("");
  const [variantes, setVariantes] = useState("");

  const charger = useCallback(async () => {
    try {
      const r = await fetchRecherche();
      setSynonymes(r.synonymes);
      setSansResultat(r.sansResultat);
    } catch {
      toast.error("Recherche : données indisponibles.");
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function idee(t: string) {
    const titre = t.charAt(0).toUpperCase() + t.slice(1);
    const erreur = await creerArticle(titre, borneSlug(slugify(titre)));
    if (erreur) {
      toast.error("Idée non créée.", { description: erreur });
      return;
    }
    await effacerRechercheSansResultat(t);
    toast.success("Idée créée, en rédaction.", { description: titre });
    await Promise.all([charger(), recharger()]);
  }

  return (
    <>
      <section className={`space-y-4 ${cardClass}`} aria-labelledby="rch-sans">
        <h2 id="rch-sans" className="text-base font-semibold text-foreground">
          Recherches sans résultat
        </h2>
        <p className="text-sm text-foreground">
          Ce que les lecteurs cherchent sur le blog sans rien trouver. Aucun compte ni aucune
          adresse n'est gardé : seulement les mots et le nombre de fois.
        </p>
        {sansResultat.length === 0 ? (
          <p className="text-sm text-foreground">Aucune pour l'instant.</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {sansResultat.map((r) => (
              <li
                key={r.terme}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
              >
                <span className="text-foreground">
                  <span className="font-medium">{r.terme}</span> · {r.nombre} fois · dernière le{" "}
                  {new Date(r.derniere).toLocaleDateString("fr-FR")}
                </span>
                <span className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void idee(r.terme)}
                    title="Créer un article sur ce sujet, en rédaction"
                  >
                    En faire une idée
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    title="Retirer de la liste"
                    onClick={async () => {
                      const erreur = await effacerRechercheSansResultat(r.terme);
                      if (erreur) toast.error("Non retiré.", { description: erreur });
                      else await charger();
                    }}
                  >
                    Retirer
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={`space-y-4 ${cardClass}`} aria-labelledby="rch-syn">
        <h2 id="rch-syn" className="text-base font-semibold text-foreground">
          Synonymes
        </h2>
        <p className="text-sm text-foreground">
          Plusieurs noms pour la même chose : une recherche sur l'un trouve les articles qui
          emploient les autres.
        </p>
        {synonymes.length > 0 ? (
          <ul className="divide-y divide-border rounded-md border border-border">
            {synonymes.map((sy) => (
              <li key={sy.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="text-foreground">
                  <span className="font-medium">{sy.terme}</span> = {sy.variantes.join(", ")}
                </span>
                <ConfirmButton
                  title={`Retirer les synonymes de « ${sy.terme} »`}
                  question={`Retirer les synonymes de « ${sy.terme} » ?`}
                  label="Retirer"
                  confirmLabel="Retirer"
                  onConfirm={async () => {
                    const erreur = await supprimerSynonyme(sy.id);
                    if (erreur) toast.error("Non retiré.", { description: erreur });
                    else await charger();
                  }}
                />
              </li>
            ))}
          </ul>
        ) : null}
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const erreur = await ajouterSynonyme(terme, variantes.split(","));
            if (erreur) {
              toast.error("Synonymes non ajoutés.", { description: erreur });
              return;
            }
            setTerme("");
            setVariantes("");
            await charger();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="rch-terme">Terme</Label>
            <Input
              id="rch-terme"
              value={terme}
              onChange={(e) => setTerme(e.target.value)}
              minLength={2}
              maxLength={60}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rch-variantes">Variantes, séparées par des virgules</Label>
            <Input
              id="rch-variantes"
              value={variantes}
              onChange={(e) => setVariantes(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="sm:col-span-2 sm:w-fit" title="Ajouter ces synonymes">
            Ajouter
          </Button>
        </form>
      </section>
    </>
  );
}
