import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/cds/SiteHeader";
import { ModerationNote } from "@/components/cds/ModerationNote";
import { ReportButton } from "@/components/cds/ReportButton";
import { ShareButtons } from "@/components/cds/ShareButtons";
import {
  CategoryBadge,
  FollowButton,
  LikeButton,
  MemberName,
} from "@/components/cds/ForumParts";
import { RichText, RichTextEditor, richTextToPlain } from "@/lib/richtext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getTopicDetail } from "@/lib/community.functions";
import { breadcrumbJsonLd, seo } from "@/lib/seo";
import { requireFeature } from "@/config/features";

export const Route = createFileRoute("/forum/$topicId")({
  beforeLoad: () => requireFeature("forum"),
  loader: async ({ params }) => {
    const data = await getTopicDetail({ data: { id: params.topicId } });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData, params }) => {
    const topic = loaderData?.topic;
    const base = seo({
      title: topic?.title ?? "Discussion",
      description: richTextToPlain(topic?.content ?? "Discussion du forum.").slice(0, 155),
      path: `/forum/${params.topicId}`,
      type: "article",
    });
    return {
      ...base,
      scripts: [
        breadcrumbJsonLd([
          { name: "Accueil", path: "/" },
          { name: "Forum", path: "/forum" },
          { name: topic?.title ?? "Discussion", path: `/forum/${params.topicId}` },
        ]),
      ],
    };
  },
  errorComponent: () => (
    <PageShell>
      <p className="text-sm text-muted-foreground">Cette discussion n'a pas pu être chargée.</p>
    </PageShell>
  ),
  notFoundComponent: () => (
    <PageShell>
      <h1 className="text-2xl font-bold text-foreground">Discussion introuvable</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        <Link
          to="/forum"
          title="Revenir à la liste des discussions"
          className="text-primary-text hover:underline"
        >
          Revenir au forum
        </Link>
      </p>
    </PageShell>
  ),
  component: TopicPage,
});

function TopicPage() {
  const { topic, replies, category } = Route.useLoaderData();
  const { user } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const isOwner = user?.id === topic.author_id;

  useEffect(() => {
    void supabase.rpc("increment_topic_views", { _topic_id: topic.id });
  }, [topic.id]);

  async function reply(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    const form = e.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    const { error } = await supabase.from("forum_replies").insert({
      topic_id: topic.id,
      author_id: user.id,
      author_name:
        (user.user_metadata?.["full_name"] as string) || user.email?.split("@")[0] || "Membre",
      content: String(data.get("content") ?? "").trim(),
    });
    setBusy(false);
    if (error) {
      toast.error("Réponse non enregistrée.", { description: "Réessayez dans un instant." });
      return;
    }
    form.reset();
    toast.success("Votre réponse est publiée.");
    router.invalidate();
  }

  async function accept(replyId: string, current: boolean) {
    const { error } = await supabase
      .from("forum_replies")
      .update({ accepted: !current })
      .eq("id", replyId);
    if (error) {
      toast.error("Marquage impossible.", {
        description: "Seul l'auteur du sujet peut valider une réponse.",
      });
      return;
    }
    toast.success(current ? "Réponse retirée des solutions." : "Réponse marquée comme solution.");
    router.invalidate();
  }

  return (
    <PageShell>
      <article className="mx-auto max-w-[820px]">
        <nav aria-label="Fil d'Ariane" className="text-xs text-muted-foreground">
          <Link
            to="/forum"
            title="Revenir à la liste des discussions"
            className="font-medium text-primary-text hover:underline"
          >
            Forum
          </Link>
          {category ? (
            <>
              {" / "}
              <Link
                to="/forum/categorie/$slug"
                params={{ slug: category.slug }}
                title={`Voir les discussions de la thématique ${category.name}`}
                className="font-medium text-primary-text hover:underline"
              >
                {category.name}
              </Link>
            </>
          ) : null}
        </nav>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {category ? <CategoryBadge name={category.name} color={category.color} /> : null}
          <span className="text-xs text-muted-foreground">{topic.views} vues</span>
        </div>

        <h1 className="mt-2 text-2xl font-bold text-foreground">{topic.title}</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          <MemberName
            id={topic.author_id}
            name={topic.author_name}
            className="hover:text-primary-text"
          />{" "}
          — {new Date(topic.created_at).toLocaleDateString("fr-FR")}
        </p>

        <RichText value={topic.content} className="mt-4 text-sm text-muted-foreground" />
        <ModerationNote note={topic.moderation_note} at={topic.moderated_at} />
        <ReportButton contentType="sujet" contentId={topic.id} authorId={topic.author_id} />

        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-5">
          <LikeButton topicId={topic.id} initialCount={topic.likes} />
          <FollowButton topicId={topic.id} />
          <div className="ml-auto">
            <ShareButtons path={`/forum/${topic.id}`} title={topic.title} />
          </div>
        </div>

        <h2 className="mt-10 text-lg font-semibold text-foreground">Réponses ({replies.length})</h2>
        {replies.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Aucune réponse pour l'instant. La vôtre sera la bienvenue.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {replies.map((item) => (
              <li
                key={item.id}
                className={`rounded-lg border bg-card p-4 ${
                  item.accepted ? "border-success" : "border-border"
                }`}
              >
                {item.accepted ? (
                  <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-success-text">
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                    Réponse retenue
                  </p>
                ) : null}
                <p className="text-sm font-medium text-foreground">
                  <MemberName
                    id={item.author_id}
                    name={item.author_name}
                    className="hover:text-primary-text"
                  />
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(item.created_at).toLocaleDateString("fr-FR")}
                </p>
                <RichText value={item.content} className="mt-2 text-sm text-muted-foreground" />
                <ModerationNote note={item.moderation_note} at={item.moderated_at} />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <ReportButton contentType="reponse" contentId={item.id} authorId={item.author_id} />
                  <LikeButton replyId={item.id} initialCount={item.likes} />
                  {isOwner ? (
                    <button
                      type="button"
                      onClick={() => accept(item.id, item.accepted)}
                      title={
                        item.accepted
                          ? "Retirer cette réponse des solutions"
                          : "Marquer cette réponse comme solution"
                      }
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <CheckCircle2 className="size-4" aria-hidden="true" />
                      {item.accepted ? "Retirer la solution" : "C'est la solution"}
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}

        {topic.locked ? (
          <p className="mt-6 rounded-lg border border-border bg-muted p-4 text-sm text-muted-foreground">
            Cette discussion est close : elle reste consultable, mais n'accepte plus de réponse.
          </p>
        ) : user ? (
          <form onSubmit={reply} className="mt-6 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="reply">Votre réponse</Label>
              <RichTextEditor
                id="reply"
                name="content"
                rows={5}
                required
                placeholder="Votre contribution…"
              />
            </div>
            <Button type="submit" disabled={busy} title="Publier votre réponse">
              {busy ? "Envoi…" : "Répondre"}
            </Button>
          </form>
        ) : (
          <p className="mt-6 rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
            <Link
              to="/login"
              title="Se connecter pour répondre"
              className="text-primary-text hover:underline"
            >
              Connectez-vous
            </Link>{" "}
            pour participer à cette discussion.
          </p>
        )}
      </article>
    </PageShell>
  );
}
