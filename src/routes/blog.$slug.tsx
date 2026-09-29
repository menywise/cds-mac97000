import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/cds/SiteHeader";
import { ModerationNote } from "@/components/cds/ModerationNote";
import { ReportButton } from "@/components/cds/ReportButton";
import { ShareButtons } from "@/components/cds/ShareButtons";
import { AdSlot } from "@/components/cds/AdSlot";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getPost } from "@/lib/content.functions";
import { RichText } from "@/lib/richtext";
import { readingMinutes } from "@/lib/reading";
import { absoluteUrl } from "@/lib/site-config";
import { breadcrumbJsonLd, seo } from "@/lib/seo";
import { requireFeature } from "@/config/features";

export const Route = createFileRoute("/blog/$slug")({
  beforeLoad: () => requireFeature("blog"),
  loader: async ({ params }) => {
    const data = await getPost({ data: { slug: params.slug } });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData, params }) => {
    const post = loaderData?.post;
    const base = seo({
      title: post?.title ?? "Article",
      description: post?.excerpt ?? "Article du blog.",
      path: `/blog/${params.slug}`,
      type: "article",
    });
    return {
      ...base,
      scripts: [
        breadcrumbJsonLd([
          { name: "Accueil", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: post?.title ?? "Article", path: `/blog/${params.slug}` },
        ]),
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post?.title,
            description: post?.excerpt,
            datePublished: post?.published_at,
            mainEntityOfPage: absoluteUrl(`/blog/${params.slug}`),
          }),
        },
      ],
    };
  },
  errorComponent: () => (
    <PageShell>
      <p className="text-sm text-muted-foreground">Cet article n'a pas pu être chargé.</p>
    </PageShell>
  ),
  notFoundComponent: () => (
    <PageShell>
      <h1 className="text-2xl font-bold text-foreground">Article introuvable</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Cet article n'existe plus ou n'est pas encore publié.{" "}
        <Link
          to="/blog"
          title="Revenir à la liste des articles"
          className="text-primary-text hover:underline"
        >
          Revenir au blog
        </Link>
      </p>
    </PageShell>
  ),
  component: BlogPostPage,
});

function BlogPostPage() {
  const { post, comments, related } = Route.useLoaderData();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submitComment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    const form = new FormData(e.currentTarget);
    const content = String(form.get("content") ?? "").trim();
    if (content.length < 3) return;
    setBusy(true);
    const { error } = await supabase.from("blog_comments").insert({
      post_id: post.id,
      author_id: user.id,
      author_name:
        (user.user_metadata?.["full_name"] as string) || user.email?.split("@")[0] || "Membre",
      content,
    });
    setBusy(false);
    if (error) {
      toast.error("Commentaire non enregistré.", { description: "Réessayez dans un instant." });
      return;
    }
    setSent(true);
    toast.success("Merci pour votre commentaire.", {
      description: "Il apparaîtra dès qu'il aura été relu.",
    });
  }

  return (
    <PageShell>
      <article className="mx-auto max-w-[760px]">
        <Link
          to="/blog"
          title="Revenir à la liste des articles"
          className="text-xs font-medium text-primary-text hover:underline"
        >
          ← Blog
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-foreground">{post.title}</h1>
        {post.published_at ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Publié le{" "}
            {new Date(post.published_at).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        ) : null}
        <p className="mt-1 text-xs text-muted-foreground">
          {readingMinutes(post.content)} min de lecture
        </p>
        <p className="mt-4 text-sm font-medium text-foreground">{post.excerpt}</p>

        {(post.tags ?? []).length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {(post.tags ?? []).map((item) => (
              <li
                key={item}
                className="rounded border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                {item}
              </li>
            ))}
          </ul>
        ) : null}

        <RichText value={post.content} className="mt-6" />

        <AdSlot placement="blog-article" className="mt-8" />

        <div className="mt-8 border-t border-border pt-6">
          <ShareButtons path={`/blog/${post.slug}`} title={post.title} />
          <ReportButton contentType="article" contentId={post.id} className="mt-2" />
        </div>

        {related.length > 0 ? (
          <section className="mt-10">
            <h2 className="text-lg font-semibold text-foreground">À lire ensuite</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-3">
              {related.map((item) => (
                <li key={item.id} className="rounded-xl border border-border bg-card p-4">
                  <Link
                    to="/blog/$slug"
                    params={{ slug: item.slug }}
                    title={`Lire l'article : ${item.title}`}
                    className="text-sm font-semibold text-foreground hover:text-primary-text"
                  >
                    {item.title}
                  </Link>
                  <p className="mt-1.5 line-clamp-3 text-xs text-muted-foreground">
                    {item.excerpt}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-foreground">
            Commentaires ({comments.length})
          </h2>

          {comments.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Personne n'a encore réagi. Votre point de vue ouvrira la discussion.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {comments.map((comment) => (
                <li key={comment.id} className="rounded-lg border border-border bg-card p-4">
                  <p className="text-sm font-medium text-foreground">{comment.author_name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(comment.created_at).toLocaleDateString("fr-FR")}
                  </p>
                  <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                    {comment.content}
                  </p>
                  <ModerationNote note={comment.moderation_note} at={comment.moderated_at} />
                  <ReportButton contentType="commentaire" contentId={comment.id} />
                </li>
              ))}
            </ul>
          )}

          {user ? (
            sent ? (
              <p className="mt-6 rounded-lg border border-border bg-muted p-4 text-sm text-foreground">
                Votre commentaire est enregistré et sera publié après relecture.
              </p>
            ) : (
              <form onSubmit={submitComment} className="mt-6 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="comment">Votre commentaire</Label>
                  <Textarea
                    id="comment"
                    name="content"
                    rows={4}
                    required
                    placeholder="Ce que cet article vous inspire…"
                  />
                </div>
                <Button type="submit" disabled={busy} title="Publier votre commentaire">
                  {busy ? "Envoi…" : "Publier mon commentaire"}
                </Button>
              </form>
            )
          ) : (
            <p className="mt-6 rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
              Vous souhaitez réagir ?{" "}
              <Link
                to="/login"
                title="Se connecter pour commenter"
                className="text-primary-text hover:underline"
              >
                Connectez-vous
              </Link>{" "}
              ou{" "}
              <Link
                to="/signup"
                title="Créer un compte pour commenter"
                className="text-primary-text hover:underline"
              >
                créez un compte
              </Link>
              , cela prend une minute.
            </p>
          )}
        </section>
      </article>
    </PageShell>
  );
}
