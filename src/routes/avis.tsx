import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/cds/SiteHeader";
import { ModerationNote } from "@/components/cds/ModerationNote";
import { ReportButton } from "@/components/cds/ReportButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { listReviews } from "@/lib/content.functions";
import { seo } from "@/lib/seo";
import { requireFeature } from "@/config/features";

export const Route = createFileRoute("/avis")({
  beforeLoad: () => requireFeature("reviews"),
  loader: () => listReviews(),
  head: () =>
    seo({
      title: "Avis",
      description:
        "Les retours de celles et ceux qui utilisent le modèle au quotidien : ce qu'ils ont gagné, ce qui les a surpris, ce qu'ils referaient.",
      path: "/avis",
      type: "website",
    }),
  errorComponent: () => (
    <PageShell>
      <p className="text-sm text-muted-foreground">Les avis n'ont pas pu être chargés.</p>
    </PageShell>
  ),
  notFoundComponent: () => (
    <PageShell>
      <p className="text-sm text-muted-foreground">Cette page n'existe pas.</p>
    </PageShell>
  ),
  component: AvisPage,
});

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Note : ${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`size-4 ${n <= value ? "fill-warning-text text-warning-text" : "text-border"}`}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

function AvisPage() {
  const reviews = Route.useLoaderData();
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const average =
    reviews.length > 0
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
      : null;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    const form = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await supabase.from("reviews").insert({
      author_id: user.id,
      author_name:
        (user.user_metadata?.["full_name"] as string) || user.email?.split("@")[0] || "Membre",
      rating,
      title: String(form.get("title") ?? "").trim(),
      content: String(form.get("content") ?? "").trim(),
    });
    setBusy(false);
    if (error) {
      toast.error("Avis non enregistré.", { description: "Réessayez dans un instant." });
      return;
    }
    setSent(true);
    toast.success("Merci pour votre retour.", { description: "Il sera publié après relecture." });
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-[820px]">
        <p className="text-xs font-medium uppercase tracking-wide text-primary-text">Avis</p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">
          Ce que disent celles et ceux qui l'utilisent déjà
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Vous voulez savoir si cela tient la route dans la vraie vie. Voici des retours complets,
          publiés après vérification, avec leurs nuances.
        </p>

        {average !== null ? (
          <div className="mt-6 flex items-center gap-3 rounded-xl border border-border bg-card p-4">
            <Stars value={Math.round(average)} />
            <span className="text-sm font-medium text-foreground">{average} / 5</span>
            <span className="text-sm text-muted-foreground">
              sur {reviews.length} avis vérifié{reviews.length > 1 ? "s" : ""}
            </span>
          </div>
        ) : null}

        {reviews.length === 0 ? (
          <p className="mt-8 rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Aucun avis publié pour l'instant. Le vôtre sera le premier.
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {reviews.map((review) => (
              <li key={review.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    {review.title || "Retour d'expérience"}
                  </p>
                  <Stars value={review.rating} />
                </div>
                <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                  {review.content}
                </p>
                <ModerationNote note={review.moderation_note} at={review.moderated_at} />
                <ReportButton contentType="avis" contentId={review.id} />
                <p className="mt-3 text-xs text-muted-foreground">
                  {review.author_name} — {new Date(review.created_at).toLocaleDateString("fr-FR")}
                </p>
              </li>
            ))}
          </ul>
        )}

        <section className="mt-10 rounded-xl border border-border bg-card p-6">
          <h2 className="text-base font-semibold text-foreground">Partager votre expérience</h2>
          {user ? (
            sent ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Votre avis est enregistré. Merci de prendre le temps d'aider les suivants.
              </p>
            ) : (
              <form onSubmit={submit} className="mt-4 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="review-rating">Votre note</Label>
                  <div id="review-rating" className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRating(n)}
                        title={`Attribuer la note de ${n} sur 5`}
                        aria-label={`${n} sur 5`}
                        className="rounded p-1"
                      >
                        <Star
                          className={`size-6 ${n <= rating ? "fill-warning-text text-warning-text" : "text-border"}`}
                          aria-hidden="true"
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="review-title">Titre</Label>
                  <Input id="review-title" name="title" placeholder="En une phrase" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="review-content">Votre avis</Label>
                  <Textarea
                    id="review-content"
                    name="content"
                    rows={4}
                    required
                    placeholder="Ce que vous avez gagné, ce qui vous a surpris…"
                  />
                </div>
                <Button type="submit" disabled={busy} title="Publier votre avis">
                  {busy ? "Envoi…" : "Publier mon avis"}
                </Button>
              </form>
            )
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Pour garantir des avis authentiques, seuls les membres connectés peuvent en déposer.{" "}
              <Link
                to="/login"
                title="Se connecter pour déposer un avis"
                className="text-primary-text hover:underline"
              >
                Se connecter
              </Link>
              .
            </p>
          )}
        </section>
      </div>
    </PageShell>
  );
}
