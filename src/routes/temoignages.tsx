import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Quote } from "lucide-react";
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
import { listTestimonials } from "@/lib/community.functions";
import { absoluteUrl } from "@/lib/site-config";
import { seo } from "@/lib/seo";
import { requireFeature } from "@/config/features";

export const Route = createFileRoute("/temoignages")({
  beforeLoad: () => requireFeature("testimonials"),
  loader: () => listTestimonials(),
  head: ({ loaderData }) => {
    const base = seo({
      title: "Témoignages",
      description:
        "Ce que des indépendants, artisans et solopreneurs ont concrètement obtenu : le point de départ, ce qui a changé, et le résultat au bout.",
      path: "/temoignages",
      type: "website",
    });
    return {
      ...base,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Témoignages",
            url: absoluteUrl("/temoignages"),
            itemListElement: (loaderData ?? []).slice(0, 10).map((item, index) => ({
              "@type": "ListItem",
              position: index + 1,
              item: {
                "@type": "Review",
                author: { "@type": "Person", name: item.author_name },
                reviewBody: item.content,
              },
            })),
          }),
        },
      ],
    };
  },
  errorComponent: () => (
    <PageShell>
      <p className="text-sm text-muted-foreground">Les témoignages n'ont pas pu être chargés.</p>
    </PageShell>
  ),
  notFoundComponent: () => (
    <PageShell>
      <p className="text-sm text-muted-foreground">Cette page n'existe pas.</p>
    </PageShell>
  ),
  component: TestimonialsPage,
});

function TestimonialsPage() {
  const testimonials = Route.useLoaderData();
  const { user } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    const form = e.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    const { error } = await supabase.from("testimonials").insert({
      author_id: user.id,
      author_name:
        String(data.get("author_name") ?? "").trim() ||
        (user.user_metadata?.["full_name"] as string) ||
        "Membre",
      role_title: String(data.get("role_title") ?? "").trim(),
      company: String(data.get("company") ?? "").trim(),
      content: String(data.get("content") ?? "").trim(),
      outcome: String(data.get("outcome") ?? "").trim(),
    });
    setBusy(false);
    if (error) {
      toast.error("Témoignage non enregistré.", { description: "Réessayez dans un instant." });
      return;
    }
    form.reset();
    toast.success("Merci, votre témoignage est envoyé.", {
      description: "Il apparaîtra dès qu'il aura été relu.",
    });
    router.invalidate();
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-[900px]">
        <p className="text-xs font-medium uppercase tracking-wide text-primary-text">Témoignages</p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">
          Ils sont partis du même point que vous
        </h1>
        <p className="mt-2 max-w-[70ch] text-sm text-muted-foreground">
          Pas de promesse en l'air : chaque témoignage dit d'où la personne partait, ce qu'elle a
          mis en place, et ce que ça a changé pour son activité.
        </p>

        {testimonials.length === 0 ? (
          <p className="mt-8 rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Les premiers témoignages arrivent bientôt. Le vôtre peut ouvrir la série.
          </p>
        ) : (
          <ul className="mt-8 grid gap-4 md:grid-cols-2">
            {testimonials.map((item) => (
              <li
                key={item.id}
                className={`rounded-xl border bg-card p-6 ${
                  item.featured ? "border-primary" : "border-border"
                }`}
              >
                <Quote className="size-5 text-primary-text" aria-hidden="true" />
                <p className="mt-3 text-sm text-foreground">{item.content}</p>
                <ModerationNote note={item.moderation_note} at={item.moderated_at} />
                <ReportButton contentType="temoignage" contentId={item.id} />
                {item.outcome ? (
                  <p className="mt-3 rounded-md bg-muted px-3 py-2 text-xs font-medium text-success-text">
                    Résultat : {item.outcome}
                  </p>
                ) : null}
                <p className="mt-4 text-sm font-semibold text-foreground">{item.author_name}</p>
                <p className="text-xs text-muted-foreground">
                  {[item.role_title, item.company].filter(Boolean).join(" — ")}
                </p>
              </li>
            ))}
          </ul>
        )}

        <section className="mt-12 rounded-xl border border-border bg-card p-6">
          <h2 className="text-base font-semibold text-foreground">Partager votre expérience</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Quelques lignes honnêtes valent mieux qu'un long discours : ce que vous cherchiez, ce
            que vous avez fait, ce que vous avez obtenu.
          </p>
          {user ? (
            <form onSubmit={submit} className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="t-name">Votre nom</Label>
                  <Input id="t-name" name="author_name" placeholder="Prénom Nom" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="t-role">Votre métier</Label>
                  <Input id="t-role" name="role_title" placeholder="Artisan, consultante…" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="t-company">Votre activité</Label>
                  <Input id="t-company" name="company" placeholder="Nom de l'entreprise" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t-content">Votre témoignage</Label>
                <Textarea
                  id="t-content"
                  name="content"
                  rows={4}
                  required
                  placeholder="Ce que ça a changé…"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t-outcome">Le résultat en une phrase</Label>
                <Input
                  id="t-outcome"
                  name="outcome"
                  placeholder="Par exemple : trois demandes de devis par semaine"
                />
              </div>
              <Button type="submit" disabled={busy} title="Envoyer votre témoignage">
                {busy ? "Envoi…" : "Envoyer mon témoignage"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Chaque témoignage est relu avant publication, pour protéger la qualité de la page.
              </p>
            </form>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              <Link
                to="/login"
                title="Se connecter pour témoigner"
                className="text-primary-text hover:underline"
              >
                Connectez-vous
              </Link>{" "}
              pour partager votre expérience.
            </p>
          )}
        </section>
      </div>
    </PageShell>
  );
}
