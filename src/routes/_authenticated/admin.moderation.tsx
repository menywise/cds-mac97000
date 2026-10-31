import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/cds/ConfirmButton";
import { ModerationEditor, type ModeratedTable } from "@/components/cds/ModerationEditor";
import { ModerationNote } from "@/components/cds/ModerationNote";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminShell, useIsAdmin } from "@/components/cds/AdminShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { seo } from "@/lib/seo";
import { isFeatureOn, requireAnyFeature } from "@/config/features";

export const Route = createFileRoute("/_authenticated/admin/moderation")({
  head: () =>
    seo({
      title: "Modération",
      description: "Validation des avis, des commentaires et gestion des discussions du forum.",
      path: "/admin/moderation",
      noindex: true,
    }),
  beforeLoad: () => requireAnyFeature(["reviews", "blog", "forum"]),
  component: AdminModerationPage,
});

type Review = {
  id: string;
  author_name: string;
  rating: number;
  title: string;
  content: string;
  approved: boolean;
  created_at: string;
  moderation_note: string | null;
};

type Comment = {
  id: string;
  author_name: string;
  content: string;
  approved: boolean;
  created_at: string;
  moderation_note: string | null;
};

type Topic = {
  id: string;
  title: string;
  content: string;
  author_name: string;
  locked: boolean;
  created_at: string;
  moderation_note: string | null;
};

type Reply = {
  id: string;
  topic_id: string;
  author_name: string;
  content: string;
  created_at: string;
  moderation_note: string | null;
  forum_topics: { title: string } | null;
};

/** Texte brut d'une réponse enregistrée en HTML, pour un aperçu court et sûr. */
function plainText(html: string) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function AdminModerationPage() {
  const isAdmin = useIsAdmin();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [r, c, t, rp] = await Promise.all([
      supabase.from("reviews").select("*").order("created_at", { ascending: false }),
      supabase.from("blog_comments").select("*").order("created_at", { ascending: false }),
      supabase.from("forum_topics").select("*").order("created_at", { ascending: false }),
      supabase
        .from("forum_replies")
        .select(
          "id, topic_id, author_name, content, created_at, moderation_note, forum_topics(title)",
        )
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    setLoadError(Boolean(r.error || c.error || t.error || rp.error));
    setReviews((r.data ?? []) as Review[]);
    setComments((c.data ?? []) as Comment[]);
    setTopics((t.data ?? []) as Topic[]);
    setReplies((rp.data ?? []) as Reply[]);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (isAdmin) void reload();
  }, [isAdmin, reload]);

  function done(error: unknown, message: string) {
    if (error) {
      toast.error("Action impossible.", { description: "Réessayez dans un instant." });
      return;
    }
    toast.success(message);
    void reload();
  }

  /** Bouton « Modérer » + éditeur replié sous le contenu. */
  function moderate(
    table: ModeratedTable,
    item: { id: string; content: string; moderation_note: string | null; approved?: boolean },
    approvable: boolean,
  ) {
    const key = `${table}:${item.id}`;
    return {
      button: (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setEditing(editing === key ? null : key)}
          title="Corriger le texte et laisser une note visible"
        >
          Modérer
        </Button>
      ),
      editor:
        editing === key ? (
          <ModerationEditor
            table={table}
            id={item.id}
            content={item.content}
            note={item.moderation_note}
            approvable={approvable}
            {...(item.approved !== undefined ? { approved: item.approved } : {})}
            onCancel={() => setEditing(null)}
            onDone={() => {
              setEditing(null);
              void reload();
            }}
          />
        ) : (
          <ModerationNote note={item.moderation_note} />
        ),
    };
  }

  const pendingReviews = reviews.filter((r) => !r.approved).length;
  const pendingComments = comments.filter((c) => !c.approved).length;

  return (
    <AdminShell
      title="Modération"
      intro="Vous gardez la main sur ce qui apparaît publiquement : rien n'est publié tant que vous ne l'avez pas validé. « Modérer » corrige le texte (lien, insulte) et affiche une note de l'équipe."
    >
      {loadError && (
        <div className="mb-6 rounded-lg border border-destructive/40 p-4 text-sm text-destructive-text">
          Une partie des contenus n'a pas pu être chargée.{" "}
          <button
            type="button"
            className="underline"
            onClick={() => void reload()}
            title="Recharger les contenus à modérer"
          >
            Réessayer
          </button>
        </div>
      )}
      {!loaded ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <Tabs
          defaultValue={
            isFeatureOn("reviews") ? "avis" : isFeatureOn("blog") ? "commentaires" : "forum"
          }
        >
          <TabsList>
            {isFeatureOn("reviews") ? (
              <TabsTrigger value="avis">
                Avis {pendingReviews > 0 ? `(${pendingReviews})` : ""}
              </TabsTrigger>
            ) : null}
            {isFeatureOn("blog") ? (
              <TabsTrigger value="commentaires">
                Commentaires {pendingComments > 0 ? `(${pendingComments})` : ""}
              </TabsTrigger>
            ) : null}
            {isFeatureOn("forum") ? (
              <>
                <TabsTrigger value="forum">Discussions</TabsTrigger>
                <TabsTrigger value="reponses">Réponses</TabsTrigger>
              </>
            ) : null}
          </TabsList>

          <TabsContent value="avis" className="space-y-3 pt-6">
            {reviews.length === 0 && (
              <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-foreground">
                Aucun avis reçu pour l'instant.
              </p>
            )}
            {reviews.map((review) => {
              const mod = moderate("reviews", review, true);
              return (
                <div key={review.id} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {review.title || "Sans titre"} — {review.rating}/5
                    </p>
                    <Badge variant={review.approved ? "default" : "secondary"}>
                      {review.approved ? "Publié" : "En attente"}
                    </Badge>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm text-foreground">
                    {review.content}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {review.author_name} — {new Date(review.created_at).toLocaleString("fr-FR")}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      onClick={async () =>
                        done(
                          (
                            await supabase
                              .from("reviews")
                              .update({ approved: !review.approved })
                              .eq("id", review.id)
                          ).error,
                          review.approved ? "Avis retiré." : "Avis publié.",
                        )
                      }
                      title={review.approved ? "Retirer cet avis du site" : "Publier cet avis"}
                    >
                      {review.approved ? "Retirer" : "Publier"}
                    </Button>
                    {mod.button}
                    <ConfirmButton
                      title="Supprimer définitivement cet avis"
                      question="Supprimer cet avis ?"
                      onConfirm={async () =>
                        done(
                          (await supabase.from("reviews").delete().eq("id", review.id)).error,
                          "Avis supprimé.",
                        )
                      }
                    />
                  </div>
                  {mod.editor}
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="commentaires" className="space-y-3 pt-6">
            {comments.length === 0 && (
              <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-foreground">
                Aucun commentaire reçu pour l'instant.
              </p>
            )}
            {comments.map((comment) => {
              const mod = moderate("blog_comments", comment, true);
              return (
                <div key={comment.id} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{comment.author_name}</p>
                    <Badge variant={comment.approved ? "default" : "secondary"}>
                      {comment.approved ? "Publié" : "En attente"}
                    </Badge>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm text-foreground">
                    {comment.content}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      onClick={async () =>
                        done(
                          (
                            await supabase
                              .from("blog_comments")
                              .update({ approved: !comment.approved })
                              .eq("id", comment.id)
                          ).error,
                          comment.approved ? "Commentaire retiré." : "Commentaire publié.",
                        )
                      }
                      title={comment.approved ? "Retirer ce commentaire" : "Publier ce commentaire"}
                    >
                      {comment.approved ? "Retirer" : "Publier"}
                    </Button>
                    {mod.button}
                    <ConfirmButton
                      title="Supprimer définitivement ce commentaire"
                      question="Supprimer ce commentaire ?"
                      onConfirm={async () =>
                        done(
                          (await supabase.from("blog_comments").delete().eq("id", comment.id))
                            .error,
                          "Commentaire supprimé.",
                        )
                      }
                    />
                  </div>
                  {mod.editor}
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="forum" className="space-y-3 pt-6">
            {topics.length === 0 && (
              <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-foreground">
                Aucune discussion ouverte.
              </p>
            )}
            {topics.map((topic) => {
              const mod = moderate("forum_topics", topic, false);
              return (
                <div key={topic.id} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{topic.title}</p>
                    <Badge variant={topic.locked ? "secondary" : "default"}>
                      {topic.locked ? "Close" : "Ouverte"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {topic.author_name} — {new Date(topic.created_at).toLocaleString("fr-FR")}
                  </p>
                  <p className="mt-2 line-clamp-3 text-sm text-foreground">
                    {plainText(topic.content)}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      onClick={async () =>
                        done(
                          (
                            await supabase
                              .from("forum_topics")
                              .update({ locked: !topic.locked })
                              .eq("id", topic.id)
                          ).error,
                          topic.locked ? "Discussion rouverte." : "Discussion close.",
                        )
                      }
                      title={topic.locked ? "Rouvrir cette discussion" : "Clore cette discussion"}
                    >
                      {topic.locked ? "Rouvrir" : "Clore"}
                    </Button>
                    {mod.button}
                    <ConfirmButton
                      title="Supprimer définitivement cette discussion"
                      question={`Supprimer la discussion « ${topic.title} » ?`}
                      detail="La discussion et toutes ses réponses sont supprimées définitivement."
                      onConfirm={async () =>
                        done(
                          (await supabase.from("forum_topics").delete().eq("id", topic.id)).error,
                          "Discussion supprimée.",
                        )
                      }
                    />
                  </div>
                  {mod.editor}
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="reponses" className="space-y-3 pt-6">
            {replies.length === 0 && (
              <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-foreground">
                Aucune réponse publiée.
              </p>
            )}
            {replies.map((reply) => {
              const mod = moderate("forum_replies", reply, false);
              return (
                <div key={reply.id} className="rounded-xl border border-border bg-card p-5">
                  <p className="text-xs text-muted-foreground">
                    {reply.author_name} — {new Date(reply.created_at).toLocaleString("fr-FR")} —
                    dans « {reply.forum_topics?.title ?? "discussion supprimée"} »
                  </p>
                  <p className="mt-2 line-clamp-3 text-sm text-foreground">
                    {plainText(reply.content)}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link
                        to="/forum/$topicId"
                        params={{ topicId: reply.topic_id }}
                        title="Voir la réponse dans sa discussion"
                      >
                        Voir
                      </Link>
                    </Button>
                    {mod.button}
                    <ConfirmButton
                      title="Supprimer définitivement cette réponse"
                      question="Supprimer cette réponse ?"
                      onConfirm={async () =>
                        done(
                          (await supabase.from("forum_replies").delete().eq("id", reply.id)).error,
                          "Réponse supprimée.",
                        )
                      }
                    />
                  </div>
                  {mod.editor}
                </div>
              );
            })}
          </TabsContent>
        </Tabs>
      )}
    </AdminShell>
  );
}
