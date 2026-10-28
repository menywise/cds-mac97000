import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminShell, useIsAdmin } from "@/components/cds/AdminShell";
import { ConfirmButton } from "@/components/cds/ConfirmButton";
import { RecordEditor } from "@/components/cds/RecordEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { requireFeature } from "@/config/features";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { downloadCsv } from "@/lib/csv";
import { formatDate, formatPrice, slugify } from "@/lib/format";
import { paymentsConfigStatus } from "@/lib/payments.functions";
import {
  ORDER_STATUS,
  SHOP_KINDS,
  SHOP_SETTINGS_KEY,
  formatAddress,
  isDigital,
  normalizeShopSettings,
  orderStatusLabel,
  parseCountries,
  shopKindLabel,
  type ShopSettings,
} from "@/lib/shop";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin/boutique")({
  beforeLoad: () => requireFeature("shop"),
  head: () =>
    seo({
      title: "Boutique",
      description: "Produits, fichiers vendus, commandes à expédier et réglages de livraison.",
      path: "/admin/boutique",
      noindex: true,
    }),
  component: AdminShopPage,
});

type Product = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  kind: string;
  price_cents: number;
  image_url: string | null;
  stock: number | null;
  published: boolean;
  position: number;
};
type ProductFile = {
  product_id: string;
  path: string;
  file_name: string;
  size_bytes: number | null;
};
type OrderItem = {
  id: string;
  title: string;
  kind: string;
  unit_price_cents: number;
  quantity: number;
  downloads: number;
};
type Order = {
  id: string;
  number: number;
  user_id: string;
  status: string;
  has_physical: boolean;
  subtotal_cents: number;
  shipping_cents: number;
  total_cents: number;
  email: string | null;
  shipping_name: string | null;
  shipping_address: Json | null;
  carrier: string | null;
  tracking_number: string | null;
  admin_note: string | null;
  created_at: string;
  paid_at: string | null;
  shipped_at: string | null;
  shop_order_items: OrderItem[];
};

const TABS = [
  { key: "produits", label: "Produits" },
  { key: "commandes", label: "Commandes" },
  { key: "reglages", label: "Réglages" },
] as const;

const ACCEPTED_FILES = ".pdf,.epub,.zip,application/pdf,application/epub+zip,application/zip";
const MAX_FILE_BYTES = 50 * 1024 * 1024;

function AdminShopPage() {
  const isAdmin = useIsAdmin();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("produits");
  const [config, setConfig] = useState<{ mode: string; webhook: boolean } | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    paymentsConfigStatus()
      .then(setConfig)
      .catch(() => setConfig({ mode: "absent", webhook: false }));
  }, [isAdmin]);

  return (
    <AdminShell
      title="Boutique"
      intro="Vos produits (objets, PDF, livres numériques), les commandes à expédier et le prix de la livraison. Le paiement passe par Stripe ; un remboursement se fait dans le tableau de bord Stripe et ferme aussitôt les téléchargements."
    >
      {config && (config.mode === "absent" || !config.webhook) ? (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-destructive/40 p-4 text-sm text-foreground"
        >
          Paiement pas encore configuré : il manque{" "}
          {config.mode === "absent"
            ? "la clé STRIPE_SECRET_KEY"
            : "le secret STRIPE_WEBHOOK_SECRET"}{" "}
          dans les secrets du projet. Tant qu'elle manque, le bouton « Commander » affiche une
          erreur. Détails dans l'écran Paiements.
        </p>
      ) : config?.mode === "test" ? (
        <p className="mb-4 rounded-lg border border-border bg-muted p-4 text-sm text-foreground">
          Stripe est en mode test : aucune carte réelle n'est débitée (carte 4242 4242 4242 4242).
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            aria-pressed={tab === item.key}
            title={`Afficher : ${item.label}`}
            className={`min-h-11 rounded-md border px-3 text-sm ${
              tab === item.key
                ? "border-primary bg-accent text-foreground"
                : "border-border text-muted-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "produits" ? (
          <ProductsTab />
        ) : tab === "commandes" ? (
          <OrdersTab />
        ) : (
          <SettingsTab />
        )}
      </div>
    </AdminShell>
  );
}

// Produits -----------------------------------------------------------------------------------------

function ProductsTab() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [files, setFiles] = useState<ProductFile[]>([]);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [kind, setKind] = useState("physique");

  const load = useCallback(async () => {
    const [p, f] = await Promise.all([
      supabase
        .from("shop_products")
        .select(
          "id, slug, title, summary, description, kind, price_cents, image_url, stock, published, position",
        )
        .order("position")
        .order("created_at", { ascending: false }),
      supabase.from("shop_product_files").select("product_id, path, file_name, size_bytes"),
    ]);
    setFailed(Boolean(p.error || f.error));
    setProducts((p.data ?? []) as Product[]);
    setFiles((f.data ?? []) as ProductFile[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("title") ?? "").trim();
    const price = Math.round(Number(String(data.get("price") ?? "0").replace(",", ".")) * 100);
    if (!title) return;
    if (!(price > 0)) {
      toast.error("Indiquez un prix supérieur à 0 €.");
      return;
    }
    const stockText = String(data.get("stock") ?? "").trim();
    const { error } = await supabase.from("shop_products").insert({
      title,
      slug: slugify(title) || `produit-${Date.now()}`,
      kind,
      price_cents: price,
      summary: String(data.get("summary") ?? "").trim(),
      stock:
        kind === "physique" && stockText !== "" ? Math.max(0, Math.floor(Number(stockText))) : null,
      position: (products ?? []).length,
    });
    if (error) {
      toast.error("Produit non créé.", {
        description:
          error.code === "23505" ? "Un produit porte déjà ce nom : changez le titre." : undefined,
      });
      return;
    }
    toast.success("Produit créé, non publié.", {
      description: isDigital(kind) ? "Ajoutez son fichier avant de le publier." : undefined,
    });
    form.reset();
    setKind("physique");
    void load();
  }

  async function write(id: string, changes: Record<string, unknown>, message: string) {
    const { error } = await supabase
      .from("shop_products")
      .update(changes as never)
      .eq("id", id);
    if (error) {
      toast.error("Modification non enregistrée.", {
        description: error.code === "23505" ? "Cette adresse est déjà prise." : undefined,
      });
      return false;
    }
    toast.success(message);
    void load();
    return true;
  }

  async function remove(product: Product) {
    const file = files.find((f) => f.product_id === product.id);
    const { error } = await supabase.from("shop_products").delete().eq("id", product.id);
    if (error) {
      toast.error("Suppression impossible.");
      return;
    }
    if (file) await supabase.storage.from("shop-files").remove([file.path]);
    toast.success("Produit supprimé. Les commandes passées restent dans l'historique.");
    void load();
  }

  async function upload(product: Product, file: File) {
    if (file.size > MAX_FILE_BYTES) {
      toast.error("Fichier trop lourd : 50 Mo au plus.");
      return;
    }
    const ext = (file.name.split(".").pop() ?? "").toLowerCase();
    if (!["pdf", "epub", "zip"].includes(ext)) {
      toast.error("Format refusé : PDF, EPUB ou ZIP seulement.");
      return;
    }
    const type =
      ext === "pdf"
        ? "application/pdf"
        : ext === "epub"
          ? "application/epub+zip"
          : "application/zip";
    const path = `produits/${product.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("shop-files")
      .upload(path, file, { contentType: type, upsert: false });
    if (error) {
      toast.error("Envoi impossible.", { description: "Réessayez dans un instant." });
      return;
    }
    const previous = files.find((f) => f.product_id === product.id);
    const fileName = `${slugify(product.title) || "fichier"}.${ext}`;
    const { error: rowError } = await supabase.from("shop_product_files").upsert(
      {
        product_id: product.id,
        path,
        file_name: fileName,
        size_bytes: file.size,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "product_id" },
    );
    if (rowError) {
      await supabase.storage.from("shop-files").remove([path]);
      toast.error("Fichier non enregistré.");
      return;
    }
    if (previous && previous.path !== path)
      await supabase.storage.from("shop-files").remove([previous.path]);
    toast.success("Fichier enregistré.", {
      description: "Les acheteurs téléchargent désormais cette version.",
    });
    void load();
  }

  return (
    <>
      <form
        onSubmit={create}
        className="grid gap-3 rounded-xl border border-border bg-card p-5 sm:grid-cols-2"
      >
        <div className="sm:col-span-2">
          <Label htmlFor="shop-title">Nom du produit</Label>
          <Input
            id="shop-title"
            name="title"
            required
            className="mt-1"
            placeholder="Guide du lancement"
          />
        </div>
        <div>
          <Label htmlFor="shop-kind-new">Type</Label>
          <select
            id="shop-kind-new"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground"
          >
            {SHOP_KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label} — {k.hint}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="shop-price">Prix TTC en euros</Label>
          <Input
            id="shop-price"
            name="price"
            type="number"
            min="0.5"
            step="0.01"
            required
            className="mt-1"
          />
        </div>
        {kind === "physique" ? (
          <div>
            <Label htmlFor="shop-stock">Stock (vide = sans limite)</Label>
            <Input id="shop-stock" name="stock" type="number" min="0" step="1" className="mt-1" />
          </div>
        ) : null}
        <div className="sm:col-span-2">
          <Label htmlFor="shop-summary">Accroche en une phrase</Label>
          <Input id="shop-summary" name="summary" maxLength={500} className="mt-1" />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" title="Créer ce produit (non publié)">
            Créer le produit
          </Button>
        </div>
      </form>

      {failed ? (
        <p
          role="alert"
          className="mt-6 rounded-lg border border-destructive/40 p-4 text-sm text-destructive-text"
        >
          Le catalogue n'a pas pu être chargé.{" "}
          <button type="button" className="underline" onClick={() => void load()}>
            Réessayer
          </button>
        </p>
      ) : null}

      {products === null ? (
        <p className="mt-6 text-sm text-muted-foreground">Chargement…</p>
      ) : products.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Aucun produit pour l'instant.
        </p>
      ) : (
        <>
          <div className="mt-6 flex items-center gap-3">
            <p className="text-sm text-muted-foreground">
              {products.length} produit{products.length > 1 ? "s" : ""} ·{" "}
              {products.filter((p) => p.published).length} publié
              {products.filter((p) => p.published).length > 1 ? "s" : ""}
            </p>
            <Button
              variant="outline"
              className="ml-auto"
              title="Télécharger le catalogue au format tableur"
              onClick={() => downloadCsv("boutique-produits.csv", products)}
            >
              Export CSV
            </Button>
          </div>
          <ul className="mt-3 space-y-3">
            {products.map((product) => {
              const file = files.find((f) => f.product_id === product.id);
              const digital = isDigital(product.kind);
              const missingFile = digital && !file;
              return (
                <li key={product.id} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{product.title}</p>
                    <span className="text-xs text-muted-foreground">
                      {shopKindLabel(product.kind)} · {formatPrice(product.price_cents, "EUR")}
                      {product.kind === "physique"
                        ? ` · ${product.stock === null ? "stock sans limite" : `${product.stock} en stock`}`
                        : ""}
                    </span>
                    <label className="ml-auto flex min-h-11 items-center gap-2 text-xs">
                      <Switch
                        checked={product.published}
                        disabled={missingFile && !product.published}
                        onCheckedChange={(on) =>
                          void write(
                            product.id,
                            { published: on },
                            on ? "Produit publié." : "Produit retiré de la vente.",
                          )
                        }
                        aria-label={`Publier ${product.title}`}
                      />
                      Publié
                    </label>
                  </div>

                  {digital ? (
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                      {file ? (
                        <span className="text-muted-foreground">
                          Fichier : {file.file_name}
                          {file.size_bytes
                            ? ` (${(file.size_bytes / 1024 / 1024).toFixed(1)} Mo)`
                            : ""}
                        </span>
                      ) : (
                        <span className="font-medium text-destructive-text">
                          Aucun fichier : le produit ne peut pas être publié.
                        </span>
                      )}
                      <label className="inline-flex min-h-11 cursor-pointer items-center rounded-md border border-border px-3 text-sm text-foreground hover:bg-muted">
                        {file ? "Remplacer le fichier" : "Envoyer le fichier"}
                        <input
                          type="file"
                          accept={ACCEPTED_FILES}
                          className="sr-only"
                          onChange={(e) => {
                            const chosen = e.target.files?.[0];
                            e.target.value = "";
                            if (chosen) void upload(product, chosen);
                          }}
                        />
                      </label>
                    </div>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditing(editing === product.id ? null : product.id)}
                      title={`Modifier ${product.title}`}
                    >
                      {editing === product.id ? "Fermer" : "Modifier"}
                    </Button>
                    <ConfirmButton
                      title={`Supprimer ${product.title}`}
                      question={`Supprimer « ${product.title} » ?`}
                      detail="Le produit et son fichier sont effacés. Les commandes déjà passées restent dans l'historique, mais les acheteurs ne pourront plus télécharger ce fichier."
                      onConfirm={() => remove(product)}
                    />
                  </div>

                  {editing === product.id ? (
                    <div className="mt-4 border-t border-border pt-4">
                      <RecordEditor
                        idPrefix={`product-${product.id}`}
                        fields={[
                          { key: "title", label: "Nom", type: "text", required: true },
                          {
                            key: "slug",
                            label: "Adresse (/boutique/…)",
                            type: "text",
                            required: true,
                          },
                          {
                            key: "summary",
                            label: "Accroche en une phrase",
                            type: "text",
                            wide: true,
                          },
                          { key: "description", label: "Description", type: "textarea" },
                          {
                            key: "kind",
                            label: "Type",
                            type: "select",
                            options: SHOP_KINDS.map((k) => ({ value: k.value, label: k.label })),
                          },
                          { key: "price_cents", label: "Prix TTC", type: "euros", required: true },
                          ...(product.kind === "physique"
                            ? [
                                {
                                  key: "stock",
                                  label: "Stock (vide = sans limite)",
                                  type: "number" as const,
                                  nullable: true,
                                },
                              ]
                            : []),
                          { key: "position", label: "Ordre d'affichage", type: "number" },
                          { key: "image_url", label: "Photo", type: "image", nullable: true },
                        ]}
                        values={product}
                        onCancel={() => setEditing(null)}
                        onSave={async (changes) => {
                          if (!((changes["price_cents"] as number) > 0)) {
                            toast.error("Indiquez un prix supérieur à 0 €.");
                            return false;
                          }
                          const ok = await write(
                            product.id,
                            { ...changes, slug: slugify(String(changes["slug"] ?? "")) },
                            "Produit modifié.",
                          );
                          if (ok) setEditing(null);
                          return ok;
                        }}
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}

// Commandes ----------------------------------------------------------------------------------------

const ORDER_FILTERS = [
  { key: "a_expedier", label: "À expédier" },
  { key: "toutes", label: "Toutes les commandes payées" },
  { key: "abandonnees", label: "Abandonnées" },
] as const;

function OrdersTab() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<(typeof ORDER_FILTERS)[number]["key"]>("a_expedier");
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("shop_orders")
      .select(
        "id, number, user_id, status, has_physical, subtotal_cents, shipping_cents, total_cents, email, shipping_name, shipping_address, carrier, tracking_number, admin_note, created_at, paid_at, shipped_at, shop_order_items(id, title, kind, unit_price_cents, quantity, downloads)",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    setFailed(Boolean(error));
    const list = (data ?? []) as Order[];
    setOrders(list);
    const ids = [...new Set(list.map((o) => o.user_id))];
    if (ids.length) {
      const { data: people } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);
      setNames(
        Object.fromEntries((people ?? []).map((p) => [p.id, p.full_name || p.email || "Membre"])),
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(order: Order, changes: Partial<Order>, message: string) {
    const { error } = await supabase
      .from("shop_orders")
      .update(changes as never)
      .eq("id", order.id);
    if (error) {
      toast.error("Commande non modifiée.", { description: error.message });
      return;
    }
    toast.success(message);
    void load();
  }

  const visible = (orders ?? []).filter((o) =>
    filter === "a_expedier"
      ? o.status === "paid" && o.has_physical
      : filter === "abandonnees"
        ? o.status === "expired" || o.status === "pending"
        : o.status !== "expired" && o.status !== "pending",
  );
  const toShip = (orders ?? []).filter((o) => o.status === "paid" && o.has_physical).length;

  function exportCsv() {
    downloadCsv(
      "boutique-commandes.csv",
      (orders ?? [])
        .filter((o) => o.status !== "expired" && o.status !== "pending")
        .map((o) => ({
          numero: o.number,
          date: o.created_at,
          paye_le: o.paid_at ?? "",
          client: o.shipping_name ?? names[o.user_id] ?? "",
          email: o.email ?? "",
          produits: o.shop_order_items.map((i) => `${i.quantity} x ${i.title}`).join(" ; "),
          sous_total: (o.subtotal_cents / 100).toFixed(2),
          livraison: (o.shipping_cents / 100).toFixed(2),
          total: (o.total_cents / 100).toFixed(2),
          statut: orderStatusLabel(o.status),
          adresse: formatAddress(o.shipping_address).join(", "),
          suivi: [o.carrier, o.tracking_number].filter(Boolean).join(" "),
        })),
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {ORDER_FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            aria-pressed={filter === item.key}
            title={`Afficher : ${item.label}`}
            className={`min-h-11 rounded-md border px-3 text-sm ${
              filter === item.key
                ? "border-primary bg-accent text-foreground"
                : "border-border text-muted-foreground"
            }`}
          >
            {item.label}
            {item.key === "a_expedier" && toShip ? ` (${toShip})` : ""}
          </button>
        ))}
        <Button
          variant="outline"
          className="ml-auto"
          disabled={!orders?.length}
          onClick={exportCsv}
          title="Télécharger les commandes payées au format CSV (comptabilité)"
        >
          Export CSV
        </Button>
      </div>

      {failed ? (
        <p
          role="alert"
          className="mt-6 rounded-lg border border-destructive/40 p-4 text-sm text-destructive-text"
        >
          Les commandes n'ont pas pu être chargées.{" "}
          <button type="button" className="underline" onClick={() => void load()}>
            Réessayer
          </button>
        </p>
      ) : null}

      {orders === null ? (
        <p className="mt-6 text-sm text-muted-foreground">Chargement…</p>
      ) : visible.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          {filter === "a_expedier" ? "Rien à expédier pour le moment." : "Aucune commande."}
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {visible.map((order) => {
            const tone = ORDER_STATUS[order.status]?.tone;
            const address = formatAddress(order.shipping_address);
            return (
              <li key={order.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    Commande n° {order.number}
                  </p>
                  <Badge
                    variant={tone === "ok" ? "default" : tone === "wait" ? "secondary" : "outline"}
                  >
                    {orderStatusLabel(order.status)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(order.created_at)} ·{" "}
                    {order.shipping_name ?? names[order.user_id] ?? "Ancien membre"}
                  </span>
                  <span className="ml-auto text-sm font-semibold text-foreground">
                    {formatPrice(order.total_cents, "EUR")}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {order.shop_order_items.map((i) => `${i.quantity} × ${i.title}`).join(" · ")}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => setOpen(open === order.id ? null : order.id)}
                  title={`Détail de la commande ${order.number}`}
                >
                  {open === order.id ? "Fermer" : "Détail et expédition"}
                </Button>
                {open === order.id ? (
                  <OrderDetail order={order} address={address} onSave={save} />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function OrderDetail({
  order,
  address,
  onSave,
}: {
  order: Order;
  address: string[];
  onSave: (order: Order, changes: Partial<Order>, message: string) => Promise<void>;
}) {
  const [carrier, setCarrier] = useState(order.carrier ?? "");
  const [tracking, setTracking] = useState(order.tracking_number ?? "");
  const [note, setNote] = useState(order.admin_note ?? "");
  const id = (k: string) => `order-${order.id}-${k}`;

  return (
    <div className="mt-4 grid gap-4 border-t border-border pt-4 text-sm sm:grid-cols-2">
      <div>
        <p className="font-medium text-foreground">Articles</p>
        <ul className="mt-1 space-y-1 text-muted-foreground">
          {order.shop_order_items.map((i) => (
            <li key={i.id}>
              {i.quantity} × {i.title} ({shopKindLabel(i.kind)}) —{" "}
              {formatPrice(i.unit_price_cents * i.quantity, "EUR")}
              {isDigital(i.kind)
                ? ` · ${i.downloads} téléchargement${i.downloads > 1 ? "s" : ""}`
                : ""}
            </li>
          ))}
          {order.shipping_cents > 0 ? (
            <li>Livraison — {formatPrice(order.shipping_cents, "EUR")}</li>
          ) : null}
        </ul>
        <p className="mt-3 font-medium text-foreground">Client</p>
        <p className="text-muted-foreground">{order.email ?? "E-mail non transmis par Stripe"}</p>
      </div>
      {order.has_physical ? (
        <div>
          <p className="font-medium text-foreground">Adresse de livraison</p>
          {address.length ? (
            <address className="not-italic text-muted-foreground">
              {order.shipping_name ? <span className="block">{order.shipping_name}</span> : null}
              {address.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
          ) : (
            <p className="text-muted-foreground">Pas encore transmise par Stripe.</p>
          )}
        </div>
      ) : null}

      {order.has_physical && ["paid", "shipped", "delivered"].includes(order.status) ? (
        <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
          <div>
            <Label htmlFor={id("carrier")}>Transporteur</Label>
            <Input
              id={id("carrier")}
              value={carrier}
              maxLength={100}
              onChange={(e) => setCarrier(e.target.value)}
              className="mt-1"
              placeholder="Colissimo"
            />
          </div>
          <div>
            <Label htmlFor={id("tracking")}>Numéro de suivi</Label>
            <Input
              id={id("tracking")}
              value={tracking}
              maxLength={100}
              onChange={(e) => setTracking(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
      ) : null}
      <div className="sm:col-span-2">
        <Label htmlFor={id("note")}>Note interne</Label>
        <Input
          id={id("note")}
          value={note}
          maxLength={2000}
          onChange={(e) => setNote(e.target.value)}
          className="mt-1"
        />
      </div>
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            void onSave(
              order,
              { carrier, tracking_number: tracking, admin_note: note },
              "Commande enregistrée.",
            )
          }
          title="Enregistrer le suivi et la note"
        >
          Enregistrer
        </Button>
        {order.has_physical && order.status === "paid" ? (
          <Button
            size="sm"
            onClick={() =>
              void onSave(
                order,
                { status: "shipped", carrier, tracking_number: tracking, admin_note: note },
                "Commande marquée expédiée.",
              )
            }
            title="Marquer la commande comme expédiée"
          >
            Marquer expédiée
          </Button>
        ) : null}
        {order.status === "shipped" ? (
          <Button
            size="sm"
            onClick={() => void onSave(order, { status: "delivered" }, "Commande marquée livrée.")}
            title="Marquer la commande comme livrée"
          >
            Marquer livrée
          </Button>
        ) : null}
      </div>
    </div>
  );
}

// Réglages -----------------------------------------------------------------------------------------

function SettingsTab() {
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [shipping, setShipping] = useState("");
  const [freeFrom, setFreeFrom] = useState("");
  const [countries, setCountries] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void supabase
      .from("site_settings")
      .select("value")
      .eq("key", SHOP_SETTINGS_KEY)
      .maybeSingle()
      .then(({ data }) => {
        const s = normalizeShopSettings(data?.value);
        setSettings(s);
        setShipping(String(s.shipping_cents / 100));
        setFreeFrom(s.free_shipping_from_cents ? String(s.free_shipping_from_cents / 100) : "");
        setCountries(s.countries.join(", "));
      });
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const euros = (text: string) =>
      Math.max(0, Math.round(Number(text.replace(",", ".") || 0) * 100));
    const next = normalizeShopSettings({
      shipping_cents: euros(shipping),
      free_shipping_from_cents: euros(freeFrom),
      countries: parseCountries(countries),
    });
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("site_settings").upsert(
      {
        key: SHOP_SETTINGS_KEY,
        value: next as unknown as Json,
        updated_at: new Date().toISOString(),
        updated_by: userData.user?.id ?? null,
      },
      { onConflict: "key" },
    );
    setSaving(false);
    if (error) {
      toast.error("Réglages non enregistrés.");
      return;
    }
    setSettings(next);
    setCountries(next.countries.join(", "));
    toast.success("Réglages enregistrés.");
  }

  if (!settings) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  return (
    <form
      onSubmit={save}
      className="grid max-w-[640px] gap-4 rounded-xl border border-border bg-card p-5"
    >
      <div>
        <Label htmlFor="shop-shipping">Livraison par commande (euros TTC, 0 = offerte)</Label>
        <Input
          id="shop-shipping"
          type="number"
          min="0"
          step="0.01"
          value={shipping}
          onChange={(e) => setShipping(e.target.value)}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="shop-free">Livraison offerte à partir de (euros, vide = jamais)</Label>
        <Input
          id="shop-free"
          type="number"
          min="0"
          step="0.01"
          value={freeFrom}
          onChange={(e) => setFreeFrom(e.target.value)}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="shop-countries">
          Pays livrés (codes à deux lettres, séparés par des virgules)
        </Label>
        <Input
          id="shop-countries"
          value={countries}
          onChange={(e) => setCountries(e.target.value)}
          className="mt-1"
          placeholder="FR, BE, CH, LU"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Stripe ne propose que ces pays dans l'adresse de livraison. Les fichiers numériques se
          vendent partout.
        </p>
      </div>
      <div>
        <Button type="submit" disabled={saving} title="Enregistrer les réglages de la boutique">
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
