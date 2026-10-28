import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminShell, useIsAdmin } from "@/components/cds/AdminShell";
import { ConfirmButton } from "@/components/cds/ConfirmButton";
import { ImageField } from "@/components/cds/MediaPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/format";
import { lirePrix } from "@/lib/prix";
import { seo } from "@/lib/seo";
import { requireAnyFeature, withActiveModules } from "@/config/features";

export const Route = createFileRoute("/_authenticated/admin/contenus")({
  head: () =>
    seo({
      title: "Contenus",
      description: "Gestion de la FAQ, des offres tarifaires et des articles du blog.",
      path: "/admin/contenus",
      noindex: true,
    }),
  beforeLoad: () => requireAnyFeature(["faq", "pricing", "blog"]),
  component: AdminContenusPage,
});

type Faq = {
  id: string;
  question: string;
  answer: string;
  category: string;
  position: number;
  published: boolean;
};

type Plan = {
  id: string;
  name: string;
  tagline: string;
  price_cents: number;
  currency: string;
  period: string;
  features: unknown;
  cta_label: string;
  highlighted: boolean;
  active: boolean;
  position: number;
};

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  cover_url: string | null;
  tags: string[];
  published: boolean;
  published_at: string | null;
};

type Reload = () => Promise<void>;

const cardClass =
  "rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card-tactile)] sm:p-6";

function splitTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

/** Message d'erreur lisible pour les erreurs les plus courantes. */
function explain(error: { code?: string; message?: string } | null) {
  if (error?.code === "23505")
    return "Cette adresse (slug) est déjà utilisée par un autre article.";
  return "Réessayez dans un instant.";
}

/** Affiche le résultat d'une opération et recharge les listes si elle a réussi. */
function useNotify(reload: Reload) {
  return useCallback(
    (error: { code?: string; message?: string } | null, message: string) => {
      if (error) {
        toast.error("Enregistrement impossible.", { description: explain(error) });
        return false;
      }
      toast.success(message);
      void reload();
      return true;
    },
    [reload],
  );
}

function AdminContenusPage() {
  const isAdmin = useIsAdmin();
  const [faqs, setFaqs] = useState<Faq[] | null>(null);
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  const reload = useCallback(async () => {
    const [faqRes, planRes, postRes] = await Promise.all([
      supabase.from("faq_items").select("*").order("position"),
      supabase.from("pricing_plans").select("*").order("position"),
      supabase.from("blog_posts").select("*").order("created_at", { ascending: false }),
    ]);
    setLoadError(Boolean(faqRes.error || planRes.error || postRes.error));
    setFaqs((faqRes.data ?? []) as Faq[]);
    setPlans((planRes.data ?? []) as Plan[]);
    setPosts((postRes.data ?? []) as Post[]);
  }, []);

  useEffect(() => {
    if (isAdmin) void reload();
  }, [isAdmin, reload]);

  const tabs = withActiveModules([
    { value: "faq", label: "FAQ", module: "faq" as const },
    { value: "offres", label: "Offres", module: "pricing" as const },
    { value: "articles", label: "Articles", module: "blog" as const },
  ]);

  return (
    <AdminShell
      title="Contenus"
      intro="Vos pages publiques se remplissent ici : questions fréquentes, offres et articles. Tout se crée, se modifie et se supprime sans toucher au code."
    >
      {loadError ? (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-destructive/40 p-4 text-sm text-destructive-text">
          Une partie des contenus n'a pas pu être chargée.
          <button
            type="button"
            className="underline"
            onClick={() => void reload()}
            title="Recharger les contenus"
          >
            Réessayer
          </button>
        </div>
      ) : null}
      <Tabs defaultValue={tabs[0]?.value ?? "faq"}>
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="faq" className="space-y-4 pt-6">
          <FaqSection faqs={faqs} reload={reload} />
        </TabsContent>
        <TabsContent value="offres" className="space-y-4 pt-6">
          <PlanSection plans={plans} reload={reload} />
        </TabsContent>
        <TabsContent value="articles" className="space-y-4 pt-6">
          <PostSection posts={posts} reload={reload} />
        </TabsContent>
      </Tabs>
    </AdminShell>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

/* ---------------------------------- FAQ ---------------------------------- */

function FaqSection({ faqs, reload }: { faqs: Faq[] | null; reload: Reload }) {
  const notify = useNotify(reload);

  async function addFaq(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const { error } = await supabase.from("faq_items").insert({
      question: String(data.get("question") ?? "").trim(),
      answer: String(data.get("answer") ?? "").trim(),
      category: String(data.get("category") ?? "").trim() || "Général",
      position: (faqs?.length ?? 0) + 1,
    });
    if (notify(error, "Question ajoutée.")) form.reset();
  }

  return (
    <>
      <form onSubmit={addFaq} className={`space-y-4 ${cardClass}`}>
        <h2 className="text-base font-semibold text-foreground">Ajouter une question</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="faq-question">Question</Label>
            <Input
              id="faq-question"
              name="question"
              required
              placeholder="Combien de temps pour démarrer ?"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="faq-category">Catégorie</Label>
            <Input id="faq-category" name="category" placeholder="Général" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="faq-answer">Réponse</Label>
          <Textarea id="faq-answer" name="answer" rows={3} required />
        </div>
        <Button type="submit" title="Ajouter cette question à la FAQ">
          Ajouter
        </Button>
      </form>

      {faqs === null ? (
        <ListSkeleton />
      ) : faqs.length === 0 ? (
        <EmptyState>Aucune question pour l'instant : ajoutez la première ci-dessus.</EmptyState>
      ) : (
        faqs.map((item) => <FaqRow key={item.id} item={item} reload={reload} />)
      )}
    </>
  );
}

function FaqRow({ item, reload }: { item: Faq; reload: Reload }) {
  const notify = useNotify(reload);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item);

  const itemKey = JSON.stringify(item);
  useEffect(() => setDraft(item), [itemKey]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase
      .from("faq_items")
      .update({
        question: draft.question.trim(),
        answer: draft.answer.trim(),
        category: draft.category.trim() || "Général",
        position: draft.position,
      })
      .eq("id", item.id);
    if (notify(error, "Question modifiée.")) setEditing(false);
  }

  async function toggle() {
    const { error } = await supabase
      .from("faq_items")
      .update({ published: !item.published })
      .eq("id", item.id);
    notify(error, item.published ? "Question masquée." : "Question publiée.");
  }

  async function remove() {
    const { error } = await supabase.from("faq_items").delete().eq("id", item.id);
    notify(error, "Question supprimée.");
  }

  if (editing) {
    return (
      <form onSubmit={save} className={`space-y-3 ${cardClass}`}>
        <div className="grid gap-3 sm:grid-cols-[1fr_12rem_6rem]">
          <div className="space-y-1.5">
            <Label htmlFor={`faq-q-${item.id}`}>Question</Label>
            <Input
              id={`faq-q-${item.id}`}
              value={draft.question}
              onChange={(e) => setDraft({ ...draft, question: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`faq-c-${item.id}`}>Catégorie</Label>
            <Input
              id={`faq-c-${item.id}`}
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`faq-p-${item.id}`}>Ordre</Label>
            <Input
              id={`faq-p-${item.id}`}
              type="number"
              value={draft.position}
              onChange={(e) => setDraft({ ...draft, position: Number(e.target.value) || 0 })}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`faq-a-${item.id}`}>Réponse</Label>
          <Textarea
            id={`faq-a-${item.id}`}
            rows={4}
            value={draft.answer}
            onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
            required
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm">
            Enregistrer
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>
            Annuler
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="rounded-xl border border-border border-l-4 border-l-primary bg-card p-5 shadow-[var(--shadow-card-tactile)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{item.question}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {item.category} · ordre {item.position}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex min-h-11 items-center gap-2 text-xs">
            <Switch
              checked={item.published}
              onCheckedChange={() => void toggle()}
              aria-label="Publier cette question"
            />
            {item.published ? "Publiée" : "Masquée"}
          </label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setEditing(true)}
            title="Modifier cette question"
          >
            Modifier
          </Button>
          <ConfirmButton
            title="Supprimer cette question"
            question="Supprimer cette question de la FAQ ?"
            onConfirm={remove}
          />
        </div>
      </div>
      <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{item.answer}</p>
    </div>
  );
}

/* --------------------------------- Offres --------------------------------- */

function featuresOf(plan: Plan): string[] {
  return Array.isArray(plan.features) ? plan.features.map((f) => String(f)) : [];
}

function PlanSection({ plans, reload }: { plans: Plan[] | null; reload: Reload }) {
  const notify = useNotify(reload);

  async function addPlan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const prix = lirePrix(String(data.get("price") ?? ""));
    if (prix.cents === null) {
      toast.error(prix.erreur, {
        description: prix.detail ?? "Indiquez 0 pour une offre gratuite.",
      });
      return;
    }
    const { error } = await supabase.from("pricing_plans").insert({
      name: String(data.get("name") ?? "").trim(),
      price_cents: prix.cents,
      period: String(data.get("period") ?? "").trim() || "mois",
      position: (plans?.length ?? 0) + 1,
      active: false,
    });
    if (notify(error, "Offre créée, masquée tant que vous ne l'affichez pas.")) form.reset();
  }

  return (
    <>
      <form onSubmit={addPlan} className={`space-y-4 ${cardClass}`}>
        <h2 className="text-base font-semibold text-foreground">Créer une offre</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="plan-new-name">Nom</Label>
            <Input id="plan-new-name" name="name" required placeholder="Essentiel" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plan-new-price">Prix (€)</Label>
            <Input
              id="plan-new-price"
              name="price"
              inputMode="decimal"
              placeholder="19,90"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plan-new-period">Période</Label>
            <Input id="plan-new-period" name="period" placeholder="mois" />
          </div>
        </div>
        <Button type="submit" title="Créer cette offre (masquée au départ)">
          Créer l'offre
        </Button>
      </form>

      {plans === null ? (
        <ListSkeleton />
      ) : plans.length === 0 ? (
        <EmptyState>Aucune offre pour l'instant : créez la première ci-dessus.</EmptyState>
      ) : (
        plans.map((plan) => <PlanEditor key={plan.id} plan={plan} reload={reload} />)
      )}
    </>
  );
}

function planDraft(plan: Plan) {
  return {
    name: plan.name,
    tagline: plan.tagline,
    price: (plan.price_cents / 100).toFixed(2).replace(".", ","),
    currency: plan.currency,
    period: plan.period,
    cta_label: plan.cta_label,
    features: featuresOf(plan).join("\n"),
    position: plan.position,
  };
}

function PlanEditor({ plan, reload }: { plan: Plan; reload: Reload }) {
  const notify = useNotify(reload);
  const [draft, setDraft] = useState(() => planDraft(plan));

  // Brouillon réinitialisé seulement si l'offre a changé en base (pas à chaque rechargement).
  const planKey = JSON.stringify(plan);
  useEffect(() => setDraft(planDraft(plan)), [planKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const id = (field: string) => `plan-${field}-${plan.id}`;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const prix = lirePrix(draft.price);
    if (prix.cents === null) {
      toast.error(prix.erreur, {
        description: prix.detail ?? "Indiquez 0 pour une offre gratuite.",
      });
      return;
    }
    const { error } = await supabase
      .from("pricing_plans")
      .update({
        name: draft.name.trim(),
        tagline: draft.tagline.trim(),
        price_cents: prix.cents,
        currency: draft.currency.trim().toUpperCase() || "EUR",
        period: draft.period.trim() || "mois",
        cta_label: draft.cta_label.trim() || "Commencer",
        features: draft.features
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
        position: draft.position,
      })
      .eq("id", plan.id);
    notify(error, "Offre enregistrée.");
  }

  async function setFlag(patch: { active?: boolean; highlighted?: boolean }) {
    const { error } = await supabase.from("pricing_plans").update(patch).eq("id", plan.id);
    notify(error, "Offre mise à jour.");
  }

  async function remove() {
    const { error } = await supabase.from("pricing_plans").delete().eq("id", plan.id);
    notify(error, "Offre supprimée.");
  }

  return (
    <form
      onSubmit={save}
      className="space-y-3 rounded-xl border border-border border-l-4 border-l-primary bg-card p-5 shadow-[var(--shadow-card-tactile)]"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={id("name")}>Nom de l'offre</Label>
          <Input
            id={id("name")}
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("tagline")}>Accroche</Label>
          <Input
            id={id("tagline")}
            value={draft.tagline}
            onChange={(e) => setDraft({ ...draft, tagline: e.target.value })}
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor={id("price")}>Prix</Label>
          <Input
            id={id("price")}
            inputMode="decimal"
            value={draft.price}
            onChange={(e) => setDraft({ ...draft, price: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("currency")}>Devise</Label>
          <Input
            id={id("currency")}
            value={draft.currency}
            maxLength={3}
            onChange={(e) => setDraft({ ...draft, currency: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("period")}>Période</Label>
          <Input
            id={id("period")}
            value={draft.period}
            onChange={(e) => setDraft({ ...draft, period: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("position")}>Ordre</Label>
          <Input
            id={id("position")}
            type="number"
            value={draft.position}
            onChange={(e) => setDraft({ ...draft, position: Number(e.target.value) || 0 })}
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={id("features")}>Avantages (un par ligne)</Label>
          <Textarea
            id={id("features")}
            rows={4}
            value={draft.features}
            onChange={(e) => setDraft({ ...draft, features: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("cta")}>Texte du bouton</Label>
          <Input
            id={id("cta")}
            value={draft.cta_label}
            onChange={(e) => setDraft({ ...draft, cta_label: e.target.value })}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <label className="flex min-h-11 items-center gap-2">
          <Switch
            checked={plan.active}
            onCheckedChange={(v) => void setFlag({ active: v })}
            aria-label="Afficher cette offre"
          />
          {plan.active ? "Affichée" : "Masquée"}
        </label>
        <label className="flex min-h-11 items-center gap-2">
          <Switch
            checked={plan.highlighted}
            onCheckedChange={(v) => void setFlag({ highlighted: v })}
            aria-label="Mettre cette offre en avant"
          />
          Mise en avant
        </label>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button type="submit" size="sm" title="Enregistrer les modifications de cette offre">
            Enregistrer
          </Button>
          <ConfirmButton
            title="Supprimer cette offre"
            question={`Supprimer l'offre « ${plan.name} » ?`}
            detail="Elle disparaît de la page Tarifs. Pour la retirer temporairement, masquez-la plutôt."
            onConfirm={remove}
          />
        </div>
      </div>
    </form>
  );
}

/* -------------------------------- Articles -------------------------------- */

function PostSection({ posts, reload }: { posts: Post[] | null; reload: Reload }) {
  const notify = useNotify(reload);

  async function addPost(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("title") ?? "").trim();
    const { error } = await supabase.from("blog_posts").insert({
      title,
      slug: slugify(title),
      excerpt: String(data.get("excerpt") ?? "").trim(),
      content: String(data.get("content") ?? "").trim(),
      tags: splitTags(String(data.get("tags") ?? "")),
      published: false,
    });
    if (notify(error, "Article créé en brouillon.")) form.reset();
  }

  return (
    <>
      <form onSubmit={addPost} className={`space-y-4 ${cardClass}`}>
        <h2 className="text-base font-semibold text-foreground">Écrire un article</h2>
        <div className="space-y-1.5">
          <Label htmlFor="post-title">Titre</Label>
          <Input id="post-title" name="title" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="post-excerpt">Résumé</Label>
          <Textarea id="post-excerpt" name="excerpt" rows={2} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="post-content">Contenu</Label>
          <Textarea id="post-content" name="content" rows={8} required />
          <p className="text-xs text-muted-foreground">
            Mise en forme : **gras**, *italique*, &gt; citation, - liste, [texte](adresse).
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="post-tags">Étiquettes</Label>
          <Input id="post-tags" name="tags" placeholder="référencement, conformité, tarifs" />
          <p className="text-xs text-muted-foreground">
            Séparées par des virgules : elles servent au filtre et aux articles liés.
          </p>
        </div>
        <Button type="submit" title="Créer cet article en brouillon">
          Créer le brouillon
        </Button>
      </form>

      {posts === null ? (
        <ListSkeleton />
      ) : posts.length === 0 ? (
        <EmptyState>Aucun article pour l'instant : écrivez le premier ci-dessus.</EmptyState>
      ) : (
        posts.map((post) => <PostRow key={post.id} post={post} reload={reload} />)
      )}
    </>
  );
}

function postDraft(post: Post) {
  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    tags: (post.tags ?? []).join(", "),
    cover_url: post.cover_url ?? "",
  };
}

function PostRow({ post, reload }: { post: Post; reload: Reload }) {
  const notify = useNotify(reload);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => postDraft(post));

  const postKey = JSON.stringify(post);
  useEffect(() => setDraft(postDraft(post)), [postKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const id = (field: string) => `post-${field}-${post.id}`;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const slug = slugify(draft.slug || draft.title);
    if (!slug) {
      toast.error("Adresse invalide.", { description: "Donnez un titre ou une adresse." });
      return;
    }
    const { error } = await supabase
      .from("blog_posts")
      .update({
        title: draft.title.trim(),
        slug,
        excerpt: draft.excerpt.trim(),
        content: draft.content.trim(),
        tags: splitTags(draft.tags),
        cover_url: draft.cover_url.trim() || null,
      })
      .eq("id", post.id);
    if (notify(error, "Article enregistré.")) setEditing(false);
  }

  async function toggle() {
    const publishing = !post.published;
    const { error } = await supabase
      .from("blog_posts")
      .update({
        published: publishing,
        published_at: publishing
          ? (post.published_at ?? new Date().toISOString())
          : post.published_at,
      })
      .eq("id", post.id);
    notify(error, publishing ? "Article publié." : "Article repassé en brouillon.");
  }

  async function remove() {
    const { error } = await supabase.from("blog_posts").delete().eq("id", post.id);
    notify(error, "Article supprimé.");
  }

  if (editing) {
    return (
      <form onSubmit={save} className={`space-y-3 ${cardClass}`}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={id("title")}>Titre</Label>
            <Input
              id={id("title")}
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={id("slug")}>Adresse (/blog/…)</Label>
            <Input
              id={id("slug")}
              value={draft.slug}
              onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
            />
            {post.published && slugify(draft.slug) !== post.slug ? (
              <p className="text-xs text-destructive-text">
                Article publié : changer l'adresse casse les liens déjà partagés.
              </p>
            ) : null}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("excerpt")}>Résumé</Label>
          <Textarea
            id={id("excerpt")}
            rows={2}
            value={draft.excerpt}
            onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("content")}>Contenu</Label>
          <Textarea
            id={id("content")}
            rows={12}
            value={draft.content}
            onChange={(e) => setDraft({ ...draft, content: e.target.value })}
            required
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={id("tags")}>Étiquettes</Label>
            <Input
              id={id("tags")}
              value={draft.tags}
              onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
            />
          </div>
          <ImageField
            id={id("cover")}
            label="Image de couverture"
            value={draft.cover_url}
            onChange={(cover_url) => setDraft({ ...draft, cover_url })}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm">
            Enregistrer
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>
            Annuler
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{post.title}</p>
          <p className="mt-1 break-all text-xs text-muted-foreground">/blog/{post.slug}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex min-h-11 items-center gap-2 text-xs">
            <Switch
              checked={post.published}
              onCheckedChange={() => void toggle()}
              aria-label="Publier cet article"
            />
            {post.published ? "Publié" : "Brouillon"}
          </label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setEditing(true)}
            title="Modifier cet article"
          >
            Modifier
          </Button>
          <ConfirmButton
            title="Supprimer cet article"
            question={`Supprimer l'article « ${post.title} » ?`}
            detail="L'article et ses commentaires sont supprimés définitivement."
            onConfirm={remove}
          />
        </div>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{post.excerpt}</p>
    </div>
  );
}
