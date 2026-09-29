import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/cds/SiteHeader";
import { CategoryBadge, TopicMeta, TopMembers } from "@/components/cds/ForumParts";
import { RichTextEditor, richTextToPlain } from "@/lib/richtext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getForumOverview, getTopMembers } from "@/lib/community.functions";
import { seo } from "@/lib/seo";
import { requireFeature, isFeatureOn } from "@/config/features";

export const Route = createFileRoute("/forum/")({
  beforeLoad: () => requireFeature("forum"),
  loader: async () => ({
    overview: await getForumOverview({ data: {} }),
    members: await getTopMembers(),
  }),
  head: () =>
    seo({
      title: "Forum de la communauté",
      description:
        "Posez votre question et trouvez la réponse d'un indépendant, d'un artisan ou d'un solopreneur passé par là : thématiques, discussions et membres actifs.",
      path: "/forum",
      type: "website",
    }),
  errorComponent: () => (
    <PageShell>
      <p className="text-sm text-muted-foreground">Les discussions n'ont pas pu être chargées.</p>
    </PageShell>
  ),
  notFoundComponent: () => (
    <PageShell>
      <p className="text-sm text-muted-foreground">Cette page n'existe pas.</p>
    </PageShell>
  ),
  component: ForumIndex,
});

function ForumIndex() {
  const { overview, members } = Route.useLoaderData();
  const { user } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function createTopic(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    const form = e.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    const { error } = await supabase.from("forum_topics").insert({
      author_id: user.id,
      author_name:
        (user.user_metadata?.["full_name"] as string) || user.email?.split("@")[0] || "Membre",
      title: String(data.get("title") ?? "").trim(),
      content: String(data.get("content") ?? "").trim(),
      category_id: String(data.get("category_id") ?? "") || null,
    });
    setBusy(false);
    if (error) {
      toast.error("Sujet non créé.", { description: "Réessayez dans un instant." });
      return;
    }
    form.reset();
    toast.success("Votre sujet est ouvert.", {
      description: "La communauté peut désormais y répondre.",
    });
    router.invalidate();
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-[1100px]">
        <p className="text-xs font-medium uppercase tracking-wide text-primary-text">Forum</p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">
          Posez votre question, repartez avec une réponse utilisable
        </h1>
        <p className="mt-2 max-w-[70ch] text-sm text-muted-foreground">
          Vous bloquez sur un point précis ? Décrivez-le simplement. Quelqu'un est probablement
          passé par là avant vous, et la réponse servira aussi aux suivants.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          {overview.totals.topics} discussion{overview.totals.topics > 1 ? "s" : ""} ·{" "}
          {overview.totals.replies} réponse{overview.totals.replies > 1 ? "s" : ""} ·{" "}
          {overview.totals.likes} j'aime
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            <h2 className="sr-only">Discussions</h2>
            {overview.topics.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                Aucune discussion pour le moment. Ouvrez la première.
              </p>
            ) : (
              <ul className="space-y-3">
                {overview.topics.map((topic) => (
                  <li key={topic.id} className="rounded-xl border border-border bg-card p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      {topic.category ? (
                        <CategoryBadge name={topic.category.name} color={topic.category.color} />
                      ) : null}
                      {topic.locked ? (
                        <span className="text-xs text-muted-foreground">Discussion close</span>
                      ) : null}
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-foreground">
                      <Link
                        to="/forum/$topicId"
                        params={{ topicId: topic.id }}
                        title={`Ouvrir la discussion : ${topic.title}`}
                        className="hover:text-primary-text"
                      >
                        {topic.title}
                      </Link>
                    </h3>
                    <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                      {richTextToPlain(topic.content)}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        {topic.author_name} —{" "}
                        {new Date(topic.created_at).toLocaleDateString("fr-FR")}
                      </p>
                      <TopicMeta replies={topic.replies} likes={topic.likes} views={topic.views} />
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <section className="mt-10 rounded-xl border border-border bg-card p-6">
              <h2 className="text-base font-semibold text-foreground">Ouvrir une discussion</h2>
              {user ? (
                <form onSubmit={createTopic} className="mt-4 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="topic-title">Sujet</Label>
                    <Input
                      id="topic-title"
                      name="title"
                      required
                      placeholder="Votre question en une phrase"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="topic-category">Thématique</Label>
                    <select
                      id="topic-category"
                      name="category_id"
                      className="h-11 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">Sans thématique</option>
                      {overview.categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="topic-content">Détails</Label>
                    <RichTextEditor
                      id="topic-content"
                      name="content"
                      required
                      placeholder="Le contexte, ce que vous avez déjà essayé…"
                    />
                  </div>
                  <Button type="submit" disabled={busy} title="Publier votre discussion">
                    {busy ? "Publication…" : "Publier ma question"}
                  </Button>
                </form>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  Pour garder un espace sain, seuls les membres connectés publient.{" "}
                  <Link
                    to="/login"
                    title="Se connecter pour participer au forum"
                    className="text-primary-text hover:underline"
                  >
                    Se connecter
                  </Link>{" "}
                  ou{" "}
                  <Link
                    to="/signup"
                    title="Créer un compte pour participer au forum"
                    className="text-primary-text hover:underline"
                  >
                    créer un compte
                  </Link>
                  .
                </p>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground">Thématiques</h2>
              <ul className="mt-3 space-y-1.5">
                {overview.categories.map((category) => (
                  <li key={category.id}>
                    <Link
                      to="/forum/categorie/$slug"
                      params={{ slug: category.slug }}
                      title={`Voir les discussions de la thématique ${category.name}`}
                      className="flex min-h-11 items-center justify-between gap-2 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-full"
                          style={{ background: category.color }}
                          aria-hidden="true"
                        />
                        {category.name}
                      </span>
                      <span className="text-xs">{category.topics}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground">Discussions récentes</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {overview.recentTopics.map((topic) => (
                  <li key={topic.id}>
                    <Link
                      to="/forum/$topicId"
                      params={{ topicId: topic.id }}
                      title={`Ouvrir la discussion : ${topic.title}`}
                      className="text-muted-foreground hover:text-primary-text"
                    >
                      {topic.title}
                    </Link>
                  </li>
                ))}
              </ul>
              {overview.recentReplies.length > 0 ? (
                <>
                  <h3 className="mt-5 text-sm font-semibold text-foreground">Dernières réponses</h3>
                  <ul className="mt-3 space-y-2 text-sm">
                    {overview.recentReplies.map((reply) => (
                      <li key={reply.id}>
                        <Link
                          to="/forum/$topicId"
                          params={{ topicId: reply.topicId }}
                          title={`Lire la réponse de ${reply.authorName}`}
                          className="text-muted-foreground hover:text-primary-text"
                        >
                          {reply.authorName} — {reply.topicTitle}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </section>

            <TopMembers data={members} />

            {isFeatureOn("members") ? (
              <section className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-sm font-semibold text-foreground">Annuaire</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Découvrez qui compose la communauté et échangez en privé.
                </p>
                <Link
                  to="/membres"
                  title="Parcourir l'annuaire des membres"
                  className="mt-3 inline-flex min-h-11 items-center rounded-md border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                >
                  Voir les membres
                </Link>
              </section>
            ) : null}
          </aside>
        </div>
      </div>
    </PageShell>
  );
}
