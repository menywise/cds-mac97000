import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/cds/SiteHeader";
import { RetractionWaiver } from "@/components/cds/RetractionWaiver";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireFeature } from "@/config/features";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { getShopProducts, startShopCheckout } from "@/lib/shop.functions";
import {
  CART_MAX_QUANTITY,
  cartTotals,
  defaultShopSettings,
  isDigital,
  setCartQuantity,
  shopKindLabel,
  type ShopSettings,
} from "@/lib/shop";
import { seo } from "@/lib/seo";
import { formatPrice } from "@/lib/format";

type CartSearch = { paiement?: "annule" };

type Product = Awaited<ReturnType<typeof getShopProducts>>["products"][number];

export const Route = createFileRoute("/boutique/panier")({
  validateSearch: (search: Record<string, unknown>): CartSearch =>
    search["paiement"] === "annule" ? { paiement: "annule" } : {},
  beforeLoad: () => requireFeature("shop"),
  head: () =>
    seo({
      title: "Mon panier",
      description:
        "Vérifiez votre panier puis réglez votre commande sur la page sécurisée de Stripe.",
      path: "/boutique/panier",
      noindex: true,
    }),
  component: CartPage,
});

function CartPage() {
  const { paiement } = Route.useSearch();
  const { user } = useAuth();
  const { cart, ready, update } = useCart();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [settings, setSettings] = useState<ShopSettings>(defaultShopSettings);
  const [failed, setFailed] = useState(false);
  const [waiver, setWaiver] = useState(false);
  const [paying, setPaying] = useState(false);
  // Relecture du stock après un refus : les quantités au-delà du stock restant s'affichent.
  const [reload, setReload] = useState(0);
  const ids = cart.map((l) => l.productId).join(",");

  useEffect(() => {
    if (paiement === "annule") {
      toast.info("Paiement annulé.", { description: "Aucun montant n'a été débité." });
    }
  }, [paiement]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    setFailed(false);
    getShopProducts({ data: { ids: ids ? ids.split(",") : [] } })
      .then((res) => {
        if (cancelled) return;
        setProducts(res.products);
        setSettings(res.settings);
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
          setProducts([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [ready, ids, reload]);

  // Lignes du panier dont le produit est toujours en vente.
  const lines = useMemo(
    () =>
      cart.flatMap((l) => {
        const product = products?.find((p) => p.id === l.productId);
        return product
          ? [{ ...l, product, quantity: isDigital(product.kind) ? 1 : l.quantity }]
          : [];
      }),
    [cart, products],
  );
  const gone = products !== null && !failed && cart.length > lines.length;
  const totals = cartTotals(
    lines.map((l) => ({
      price_cents: l.product.price_cents,
      quantity: l.quantity,
      kind: l.product.kind,
    })),
    settings,
  );
  const tooMany = lines.some((l) => l.product.stock !== null && l.quantity > l.product.stock);
  // Stock limité : réservé à la commande, rendu si la page de paiement expire (30 minutes).
  const reserved = lines.some((l) => l.product.stock !== null);

  useEffect(() => {
    // Produits retirés de la vente : ils quittent le panier.
    if (gone)
      update((current) => current.filter((l) => products?.some((p) => p.id === l.productId)));
  }, [gone, products, update]);

  async function pay() {
    if (totals.digital && !waiver) {
      toast.info("Cochez la case de renonciation pour continuer.");
      return;
    }
    setPaying(true);
    try {
      const { url } = await startShopCheckout({
        data: {
          items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
          waiver: totals.digital ? waiver : false,
        },
      });
      window.location.assign(url);
    } catch (err) {
      setPaying(false);
      setReload((n) => n + 1);
      toast.error("Commande impossible.", {
        description: err instanceof Error ? err.message : "Réessayez dans un instant.",
      });
    }
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-[800px]">
        <nav aria-label="Fil d'Ariane" className="text-xs text-muted-foreground">
          <Link to="/boutique" title="Revenir à la boutique" className="hover:underline">
            Boutique
          </Link>
          {" / "}Panier
        </nav>
        <h1 className="mt-4 text-3xl font-bold text-foreground">Mon panier</h1>

        {!ready || products === null ? (
          <div className="mt-6 space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : failed ? (
          <p className="mt-6 rounded-lg border border-destructive/40 p-6 text-sm text-foreground">
            Le panier n'a pas pu être chargé. Rechargez la page dans un instant.
          </p>
        ) : lines.length === 0 ? (
          <p className="mt-6 rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
            Votre panier est vide.{" "}
            <Link
              to="/boutique"
              title="Parcourir la boutique"
              className="text-primary-text hover:underline"
            >
              Parcourir la boutique
            </Link>
          </p>
        ) : (
          <>
            <ul className="mt-6 divide-y divide-border rounded-xl border border-border bg-card">
              {lines.map((l) => {
                const digital = isDigital(l.product.kind);
                const max = Math.min(
                  CART_MAX_QUANTITY,
                  Math.max(1, l.product.stock ?? CART_MAX_QUANTITY),
                );
                return (
                  <li key={l.productId} className="flex flex-wrap items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        <Link
                          to="/boutique/$slug"
                          params={{ slug: l.product.slug }}
                          title={`Revoir le produit ${l.product.title}`}
                          className="hover:underline"
                        >
                          {l.product.title}
                        </Link>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {shopKindLabel(l.product.kind)} ·{" "}
                        {formatPrice(l.product.price_cents, "EUR")}
                        {l.product.stock !== null && l.quantity > l.product.stock
                          ? ` · ${l.product.stock === 0 ? "épuisé" : `${l.product.stock} en stock`}`
                          : ""}
                      </p>
                    </div>
                    {digital ? (
                      <span className="text-xs text-muted-foreground">1 exemplaire</span>
                    ) : (
                      <select
                        aria-label={`Quantité de ${l.product.title}`}
                        value={l.quantity}
                        onChange={(e) =>
                          update((current) =>
                            setCartQuantity(current, l.productId, Number(e.target.value)),
                          )
                        }
                        className="h-11 w-20 rounded-md border border-border bg-card px-3 text-sm text-foreground"
                      >
                        {Array.from({ length: Math.max(max, l.quantity) }, (_, i) => i + 1).map(
                          (n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ),
                        )}
                      </select>
                    )}
                    <p className="w-24 text-right text-sm font-semibold text-foreground">
                      {formatPrice(l.product.price_cents * l.quantity, "EUR")}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-11"
                      onClick={() => update((current) => setCartQuantity(current, l.productId, 0))}
                      title={`Retirer ${l.product.title} du panier`}
                      aria-label={`Retirer ${l.product.title} du panier`}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </li>
                );
              })}
            </ul>

            <dl className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="font-medium">Sous-total</dt>
                <dd className="text-foreground">{formatPrice(totals.subtotal, "EUR")}</dd>
              </div>
              {totals.physical ? (
                <div className="flex justify-between">
                  <dt className="font-medium">Livraison ({settings.countries.join(", ")})</dt>
                  <dd className="text-foreground">
                    {totals.shipping === 0 ? "Offerte" : formatPrice(totals.shipping, "EUR")}
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                <dt className="text-foreground">Total TTC</dt>
                <dd className="text-primary-text">{formatPrice(totals.total, "EUR")}</dd>
              </div>
            </dl>

            <div className="mt-6 rounded-xl border border-border bg-card p-5">
              {!user ? (
                <p className="text-sm text-muted-foreground">
                  <Link
                    to="/login"
                    title="Se connecter pour commander"
                    className="text-primary-text hover:underline"
                  >
                    Connectez-vous
                  </Link>{" "}
                  pour commander : vos achats et vos téléchargements restent dans votre espace.
                </p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    {totals.physical
                      ? "Stripe vous demande l'adresse de livraison puis le paiement par carte."
                      : "Paiement par carte sur la page sécurisée de Stripe."}{" "}
                    {totals.digital
                      ? "Les fichiers se téléchargent depuis « Mes achats » dès la confirmation."
                      : "Vous avez 14 jours après réception pour changer d'avis."}
                  </p>
                  {totals.digital ? (
                    <RetractionWaiver
                      checked={waiver}
                      onChange={setWaiver}
                      subject="ces fichiers"
                    />
                  ) : null}
                  <Button
                    className="mt-4"
                    disabled={paying || tooMany || (totals.digital && !waiver)}
                    onClick={pay}
                    title="Régler la commande sur la page sécurisée de Stripe"
                  >
                    {paying
                      ? "Ouverture du paiement…"
                      : `Commander et payer ${formatPrice(totals.total, "EUR")}`}
                  </Button>
                  {tooMany ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Ajustez les quantités au stock disponible pour commander.
                    </p>
                  ) : null}
                  {reserved ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Vos articles en stock limité restent réservés 30 minutes, le temps de payer.
                    </p>
                  ) : null}
                  <p className="mt-3 text-xs text-muted-foreground">
                    En commandant, vous acceptez les{" "}
                    <Link
                      to="/legal/cgv"
                      title="Lire les conditions générales de vente"
                      className="underline"
                    >
                      conditions générales de vente
                    </Link>
                    .
                  </p>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
}
