import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { BadgeCheck, Globe, Mail, MapPin, Phone, Star } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/cds/SiteHeader";
import { ModerationNote } from "@/components/cds/ModerationNote";
import { ReportButton } from "@/components/cds/ReportButton";
import { AdSlot } from "@/components/cds/AdSlot";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichText } from "@/lib/richtext";
import { requireFeature } from "@/config/features";
import { getDirectoryListing } from "@/lib/directory.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { absoluteUrl } from "@/lib/site-config";
import { breadcrumbJsonLd, seo } from "@/lib/seo";
import { formatDate } from "@/lib/format";

const DAYS = [
  ["lundi", "Lundi"],
  ["mardi", "Mardi"],
  ["mercredi", "Mercredi"],
  ["jeudi", "Jeudi"],
  ["vendredi", "Vendredi"],
  ["samedi", "Samedi"],
  ["dimanche", "Dimanche"],
] as const;

export const Route = createFileRoute("/annuaire/$slug")({
  beforeLoad: () => requireFeature("directory"),
  loader: async ({ params }) => {
    const data = await getDirectoryListing({ data: { slug: params.slug } });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Fiche introuvable" }, { name: "robots", content: "noindex" }] };
    }
    const { listing, reviews } = loaderData;
    const description =
      listing.excerpt ||
      `${listing.name}${listing.city ? ` à ${listing.city}` : ""} : coordonnées, horaires et avis.`;
    const base = seo({
      title: listing.name,
      description: description.slice(0, 200),
      path: `/annuaire/${listing.slug}`,
      ...(listing.cover_url && /^https:\/\//.test(listing.cover_url)
        ? { image: listing.cover_url }
        : {}),
    });
    const average = reviews.length
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null;
    return {
      ...base,
      scripts: [
        breadcrumbJsonLd([
          { name: "Annuaire", path: "/annuaire" },
          { name: listing.name, path: `/annuaire/${listing.slug}` },
        ]),
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            name: listing.name,
            description,
            url: absoluteUrl(`/annuaire/${listing.slug}`),
            ...(listing.phone ? { telephone: listing.phone } : {}),
            ...(listing.website ? { sameAs: [listing.website] } : {}),
            address: {
              "@type": "PostalAddress",
              streetAddress: listing.address || undefined,
              postalCode: listing.postal_code || undefined,
              addressLocality: listing.city || undefined,
              addressCountry: "FR",
            },
            ...(average
              ? {
                  aggregateRating: {
                    "@type": "AggregateRating",
                    ratingValue: average.toFixed(1),
                    reviewCount: reviews.length,
                  },
                }
              : {}),
          }),
        },
      ],
    };
  },
  errorComponent: () => (
    <PageShell>
      <p className="text-sm text-muted-foreground">Cette fiche n'a pas pu être chargée.</p>
    </PageShell>
  ),
  notFoundComponent: () => (
    <PageShell>
      <p className="text-sm text-muted-foreground">
        Cette fiche n'existe pas ou n'est plus publiée.{" "}
        <Link to="/annuaire" title="Revenir à l'annuaire" className="underline">
          Revenir à l'annuaire
        </Link>
      </p>
    </PageShell>
  ),
  component: ListingPage,
});

function ListingPage() {
  const { listing, reviews, category, departement, nearby } = Route.useLoaderData();
  const { user } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [rating, setRating] = useState(5);

  const average = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : null;
  const hours = (listing.hours ?? {}) as Record<string, string>;

  async function submitReview(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    const form = e.currentTarget;
    const content = String(new FormData(form).get("content") ?? "").trim();
    setBusy(true);
    const { error } = await supabase.from("directory_reviews").insert({
      listing_id: listing.id,
      author_id: user.id,
      author_name: (user.user_metadata?.["full_name"] as string) || "Membre",
      rating,
      content,
    });
    setBusy(false);
    if (error) {
      toast.error("Avis non enregistré.", { description: "Réessayez dans un instant." });
      return;
    }
    form.reset();
    toast.success("Merci, votre avis est envoyé.", {
      description: "Il apparaîtra dès qu'il aura été relu.",
    });
    router.invalidate();
  }

  async function claim() {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.rpc("request_directory_claim", {
      _listing_id: listing.id,
    });
    setBusy(false);
    if (error) {
      toast.error("Demande non enregistrée.", { description: "Réessayez dans un instant." });
      return;
    }
    toast.success("Demande envoyée.", {
      description: "L'équipe vérifie puis vous confie la fiche.",
    });
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-[1000px]">
        <nav aria-label="Fil d'Ariane" className="text-xs text-muted-foreground">
          <Link to="/annuaire" title="Revenir à l'annuaire" className="hover:underline">
            Annuaire
          </Link>
          {category ? (
            <>
              {" / "}
              <Link
                to="/annuaire/categorie/$slug"
                params={{ slug: category.slug }}
                title={`Voir les fiches de la catégorie ${category.name}`}
                className="hover:underline"
              >
                {category.name}
              </Link>
            </>
          ) : null}
          {" / "}
          {listing.name}
        </nav>

        {listing.cover_url ? (
          <img
            src={listing.cover_url}
            alt={`Visuel de ${listing.name}`}
            className="mt-4 w-full rounded-xl border border-border object-cover"
          />
        ) : null}

        <h1 className="mt-4 text-3xl font-bold text-foreground">{listing.name}</h1>
        <ReportButton contentType="fiche" contentId={listing.id} />
        <p className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {listing.city ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden="true" />
              {[listing.address, listing.postal_code, listing.city].filter(Boolean).join(", ")}
            </span>
          ) : null}
          {average ? (
            <span className="inline-flex items-center gap-1 text-warning-text">
              <Star className="size-3.5 fill-warning-text" aria-hidden="true" />
              {average.toFixed(1)} / 5 ({reviews.length})
            </span>
          ) : null}
          {listing.verified ? (
            <span className="inline-flex items-center gap-1 text-success-text">
              <BadgeCheck className="size-3.5" aria-hidden="true" />
              Vérifié
            </span>
          ) : null}
          {listing.plan === "premium" ? (
            <span className="rounded bg-muted px-1.5 py-0.5 font-medium text-primary-text">
              Premium
            </span>
          ) : null}
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
          <div>
            {listing.description ? (
              <RichText value={listing.description} className="text-sm text-foreground" />
            ) : (
              <p className="text-sm text-muted-foreground">Description à compléter.</p>
            )}

            {(listing.photos ?? []).length > 0 ? (
              <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {(listing.photos ?? []).map((photo, index) => (
                  <li key={photo}>
                    <img
                      src={photo}
                      alt={`${listing.name} — photo ${index + 1}`}
                      loading="lazy"
                      className="aspect-video w-full rounded-lg border border-border object-cover"
                    />
                  </li>
                ))}
              </ul>
            ) : null}

            <section className="mt-10">
              <h2 className="text-base font-semibold text-foreground">Avis</h2>
              {reviews.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Aucun avis publié pour le moment.
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {reviews.map((review) => (
                    <li key={review.id} className="rounded-lg border border-border bg-card p-4">
                      <p className="text-sm font-medium text-foreground">
                        {review.author_name || "Membre"}{" "}
                        <span className="text-warning-text">
                          {"★".repeat(review.rating)}
                          <span className="text-muted-foreground">
                            {"★".repeat(5 - review.rating)}
                          </span>
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(review.created_at)}
                      </p>
                      {review.content ? (
                        <p className="mt-2 text-sm text-foreground">{review.content}</p>
                      ) : null}
                      <ModerationNote note={review.moderation_note} at={review.moderated_at} />
                      <ReportButton contentType="avis_fiche" contentId={review.id} />
                    </li>
                  ))}
                </ul>
              )}

              {user ? (
                <form
                  onSubmit={submitReview}
                  className="mt-4 space-y-3 rounded-lg border border-border bg-card p-4"
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="rev-rating">Votre note</Label>
                    <select
                      id="rev-rating"
                      value={rating}
                      onChange={(e) => setRating(Number(e.target.value))}
                      className="h-11 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground"
                    >
                      {[5, 4, 3, 2, 1].map((value) => (
                        <option key={value} value={value}>
                          {value} / 5
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rev-content">Votre expérience</Label>
                    <Textarea
                      id="rev-content"
                      name="content"
                      rows={3}
                      placeholder="Ce qui s'est bien passé…"
                    />
                  </div>
                  <Button type="submit" disabled={busy} title="Envoyer votre avis">
                    {busy ? "Envoi…" : "Publier mon avis"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Chaque avis est relu avant publication.
                  </p>
                </form>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  <Link
                    to="/login"
                    title="Se connecter pour laisser un avis"
                    className="text-primary-text hover:underline"
                  >
                    Connectez-vous
                  </Link>{" "}
                  pour laisser un avis.
                </p>
              )}
            </section>
          </div>

          <aside className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="text-sm font-semibold text-foreground">Contact</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {listing.phone ? (
                  <li>
                    <a
                      href={`tel:${listing.phone.replace(/\s/g, "")}`}
                      title={`Appeler ${listing.name}`}
                      className="inline-flex min-h-11 items-center gap-2 text-primary-text hover:underline"
                    >
                      <Phone className="size-4" aria-hidden="true" />
                      {listing.phone}
                    </a>
                  </li>
                ) : null}
                {listing.email ? (
                  <li>
                    <a
                      href={`mailto:${listing.email}`}
                      title={`Écrire à ${listing.name}`}
                      className="inline-flex min-h-11 items-center gap-2 text-primary-text hover:underline"
                    >
                      <Mail className="size-4" aria-hidden="true" />
                      Envoyer un e-mail
                    </a>
                  </li>
                ) : null}
                {listing.website ? (
                  <li>
                    <a
                      href={listing.website}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      title={`Ouvrir le site de ${listing.name}`}
                      className="inline-flex min-h-11 items-center gap-2 text-primary-text hover:underline"
                    >
                      <Globe className="size-4" aria-hidden="true" />
                      Voir le site
                    </a>
                  </li>
                ) : null}
                {!listing.phone && !listing.email && !listing.website ? (
                  <li className="text-muted-foreground">Coordonnées non renseignées.</li>
                ) : null}
              </ul>
            </div>

            {Object.keys(hours).length > 0 ? (
              <div className="rounded-xl border border-border bg-card p-4">
                <h2 className="text-sm font-semibold text-foreground">Horaires</h2>
                <dl className="mt-3 space-y-1 text-sm">
                  {DAYS.filter(([key]) => hours[key]).map(([key, label]) => (
                    <div key={key} className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="text-foreground">{hours[key]}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}

            {departement ? (
              <div className="rounded-xl border border-border bg-card p-4">
                <h2 className="text-sm font-semibold text-foreground">Zone</h2>
                <Link
                  to="/annuaire/departement/$slug"
                  params={{ slug: departement.slug }}
                  title={`Voir les professionnels en ${departement.nom}`}
                  className="mt-2 inline-flex min-h-11 items-center text-sm text-primary-text hover:underline"
                >
                  {departement.nom} ({departement.code})
                </Link>
              </div>
            ) : null}

            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="text-sm font-semibold text-foreground">C'est votre établissement ?</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Reprenez la main sur cette fiche : vous la mettez à jour quand vous voulez.
              </p>
              {listing.claimed_by ? (
                <p className="mt-3 text-xs text-success-text">Fiche déjà revendiquée.</p>
              ) : user ? (
                <Button
                  className="mt-3"
                  variant="outline"
                  disabled={busy}
                  onClick={claim}
                  title="Demander la gestion de cette fiche"
                >
                  Revendiquer cette fiche
                </Button>
              ) : (
                <p className="mt-3 text-sm">
                  <Link
                    to="/login"
                    title="Se connecter pour revendiquer la fiche"
                    className="text-primary-text hover:underline"
                  >
                    Connectez-vous
                  </Link>{" "}
                  pour la revendiquer.
                </p>
              )}
            </div>

            <AdSlot placement="annuaire-fiche" />
          </aside>
        </div>

        {nearby.length > 0 ? (
          <section className="mt-12">
            <h2 className="text-base font-semibold text-foreground">Dans la même activité</h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-3">
              {nearby.map((item) => (
                <li key={item.id} className="rounded-lg border border-border bg-card p-4">
                  <Link
                    to="/annuaire/$slug"
                    params={{ slug: item.slug }}
                    title={`Voir la fiche de ${item.name}`}
                    className="text-sm font-medium text-foreground hover:underline"
                  >
                    {item.name}
                  </Link>
                  {item.city ? (
                    <p className="mt-1 text-xs text-muted-foreground">{item.city}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </PageShell>
  );
}
