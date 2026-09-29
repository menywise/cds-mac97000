import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/cds/SiteHeader";
import { Button } from "@/components/ui/button";
import { RichText } from "@/lib/richtext";
import { requireFeature } from "@/config/features";
import { getMarketplaceListing } from "@/lib/marketplace.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { absoluteUrl } from "@/lib/site-config";
import { breadcrumbJsonLd, seo } from "@/lib/seo";
import { formatDate, formatPrice } from "@/lib/format";
import { ReportButton } from "@/components/cds/ReportButton";

export const Route = createFileRoute("/marketplace/$slug")({
  beforeLoad: () => requireFeature("marketplace"),
  loader: async ({ params }) => {
    const data = await getMarketplaceListing({ data: { slug: params.slug } });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Annonce introuvable" }, { name: "robots", content: "noindex" }] };
    }
    const { listing } = loaderData;
    const description =
      (listing.description ?? "").replace(/\s+/g, " ").slice(0, 180) ||
      `Annonce publiée par ${listing.seller_name}.`;
    const photo = (listing.photos ?? [])[0];
    return {
      ...seo({
        title: listing.title,
        description,
        path: `/marketplace/${listing.slug}`,
        ...(photo && /^https:\/\//.test(photo) ? { image: photo } : {}),
      }),
      scripts: [
        breadcrumbJsonLd([
          { name: "Petites annonces", path: "/marketplace" },
          { name: listing.title, path: `/marketplace/${listing.slug}` },
        ]),
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: listing.title,
            description,
            url: absoluteUrl(`/marketplace/${listing.slug}`),
            ...(photo ? { image: photo } : {}),
            offers: {
              "@type": "Offer",
              price: (listing.price_cents / 100).toFixed(2),
              priceCurrency: listing.currency ?? "EUR",
              availability: "https://schema.org/InStock",
            },
          }),
        },
      ],
    };
  },
  errorComponent: () => (
    <PageShell>
      <p className="text-sm text-muted-foreground">Cette annonce n'a pas pu être chargée.</p>
    </PageShell>
  ),
  notFoundComponent: () => (
    <PageShell>
      <p className="text-sm text-muted-foreground">
        Cette annonce n'existe plus.{" "}
        <Link to="/marketplace" title="Revenir aux annonces" className="underline">
          Revenir aux annonces
        </Link>
      </p>
    </PageShell>
  ),
  component: ListingPage,
});

function ListingPage() {
  const { listing, similar, category } = Route.useLoaderData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Vue comptée une fois par ouverture de la page (fonction en base : le vendeur ne peut pas gonfler le compteur).
    void supabase.rpc("increment_listing_views", { _listing_id: listing.id });
  }, [listing.id]);

  async function contactSeller() {
    if (!user) return;
    if (user.id === listing.seller_id) return;
    setBusy(true);
    const [a, b] = [user.id, listing.seller_id].sort() as [string, string];
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("user_a", a)
      .eq("user_b", b)
      .maybeSingle();
    let conversationId = existing?.id ?? null;
    if (!conversationId) {
      const { data: created, error } = await supabase
        .from("conversations")
        .insert({ user_a: a, user_b: b })
        .select("id")
        .maybeSingle();
      if (error || !created) {
        setBusy(false);
        toast.error("Conversation impossible.", { description: "Réessayez dans un instant." });
        return;
      }
      conversationId = created.id;
    }
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: `Bonjour, je suis intéressé par votre annonce « ${listing.title} ».`,
    });
    setBusy(false);
    void navigate({ to: "/messagerie/$conversationId", params: { conversationId } });
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-[900px]">
        <nav aria-label="Fil d'Ariane" className="text-xs text-muted-foreground">
          <Link to="/marketplace" title="Revenir aux petites annonces" className="hover:underline">
            Petites annonces
          </Link>
          {category ? ` / ${category.name}` : null}
          {" / "}
          {listing.title}
        </nav>

        <h1 className="mt-4 text-3xl font-bold text-foreground">{listing.title}</h1>
        <ReportButton contentType="annonce" contentId={listing.id} authorId={listing.seller_id} />
        <p className="mt-2 text-xl font-semibold text-primary-text">
          {formatPrice(listing.price_cents, listing.currency ?? "EUR")}
          {listing.negotiable ? (
            <span className="ml-2 text-sm font-normal text-muted-foreground">à débattre</span>
          ) : null}
        </p>
        <p className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {listing.city ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden="true" />
              {listing.city}
            </span>
          ) : null}
          <span>Publiée le {formatDate(listing.created_at)}</span>
          <span>par {listing.seller_name}</span>
        </p>

        {(listing.photos ?? []).length > 0 ? (
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(listing.photos ?? []).map((photo, index) => (
              <li key={photo}>
                <img
                  src={photo}
                  alt={`${listing.title} — photo ${index + 1}`}
                  loading="lazy"
                  className="aspect-video w-full rounded-lg border border-border object-cover"
                />
              </li>
            ))}
          </ul>
        ) : null}

        {listing.description ? (
          <RichText value={listing.description} className="mt-6 text-sm text-foreground" />
        ) : null}

        <div className="mt-8 rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Contacter le vendeur</h2>
          {!user ? (
            <p className="mt-2 text-sm text-muted-foreground">
              <Link
                to="/login"
                title="Se connecter pour contacter le vendeur"
                className="text-primary-text hover:underline"
              >
                Connectez-vous
              </Link>{" "}
              pour envoyer un message privé.
            </p>
          ) : user.id === listing.seller_id ? (
            <p className="mt-2 text-sm text-muted-foreground">Ceci est votre annonce.</p>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                Votre message part en privé : aucune coordonnée n'est rendue publique.
              </p>
              <Button
                className="mt-4"
                disabled={busy}
                onClick={contactSeller}
                title="Envoyer un message privé au vendeur"
              >
                {busy ? "Ouverture…" : "Envoyer un message"}
              </Button>
            </>
          )}
        </div>

        {similar.length > 0 ? (
          <section className="mt-12">
            <h2 className="text-base font-semibold text-foreground">Annonces similaires</h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {similar.map((item) => (
                <li key={item.id} className="rounded-lg border border-border bg-card p-4">
                  <Link
                    to="/marketplace/$slug"
                    params={{ slug: item.slug }}
                    title={`Voir l'annonce ${item.title}`}
                    className="text-sm font-medium text-foreground hover:underline"
                  >
                    {item.title}
                  </Link>
                  <p className="mt-1 text-xs text-primary-text">
                    {formatPrice(item.price_cents, item.currency ?? "EUR")}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </PageShell>
  );
}
