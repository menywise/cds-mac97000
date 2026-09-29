import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AdminShell, useIsAdmin } from "@/components/cds/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireFeature } from "@/config/features";
import { supabase } from "@/integrations/supabase/client";
import { downloadCsv } from "@/lib/csv";
import { formatPrice } from "@/lib/format";
import { paymentsConfigStatus } from "@/lib/payments.functions";
import { seo } from "@/lib/seo";
import { getSiteConfig } from "@/lib/site-config";

export const Route = createFileRoute("/_authenticated/admin/paiements")({
  beforeLoad: () => requireFeature("payments"),
  head: () =>
    seo({
      title: "Paiements",
      description: "Paiements Stripe des formations et configuration du module.",
      path: "/admin/paiements",
      noindex: true,
    }),
  component: AdminPaymentsPage,
});

type Payment = {
  id: string;
  user_id: string;
  product_label: string;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
  paid_at: string | null;
  refunded_at: string | null;
  waiver_accepted_at: string;
};

const STATUS: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  paid: { label: "Payé", variant: "default" },
  pending: { label: "En attente", variant: "secondary" },
  expired: { label: "Abandonné", variant: "outline" },
  failed: { label: "Échec", variant: "destructive" },
  refunded: { label: "Remboursé", variant: "outline" },
};

type Config = { mode: "absent" | "test" | "live"; webhook: boolean };

function AdminPaymentsPage() {
  const isAdmin = useIsAdmin();
  const [rows, setRows] = useState<Payment[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState(false);
  const [config, setConfig] = useState<Config | null>(null);

  const load = useCallback(async () => {
    setLoadError(false);
    const { data, error } = await supabase
      .from("payments")
      .select(
        "id, user_id, product_label, amount_cents, currency, status, created_at, paid_at, refunded_at, waiver_accepted_at",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      setLoadError(true);
      setRows([]);
      return;
    }
    const list = (data ?? []) as Payment[];
    setRows(list);
    const ids = [...new Set(list.map((p) => p.user_id))];
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
    if (!isAdmin) return;
    void load();
    paymentsConfigStatus()
      .then(setConfig)
      .catch(() => setConfig({ mode: "absent", webhook: false }));
  }, [isAdmin, load]);

  const paid = (rows ?? []).filter((p) => p.status === "paid");
  const totals = paid.reduce<Record<string, number>>((acc, p) => {
    acc[p.currency] = (acc[p.currency] ?? 0) + p.amount_cents;
    return acc;
  }, {});
  const siteUrl = getSiteConfig().brand.url;

  function exportCsv() {
    downloadCsv(
      "paiements.csv",
      (rows ?? []).map((p) => ({
        date: p.created_at,
        produit: p.product_label,
        montant: (p.amount_cents / 100).toFixed(2),
        devise: p.currency.toUpperCase(),
        statut: STATUS[p.status]?.label ?? p.status,
        paye_le: p.paid_at ?? "",
        rembourse_le: p.refunded_at ?? "",
        renonciation_retractation: p.waiver_accepted_at,
      })),
    );
  }

  return (
    <AdminShell
      title="Paiements"
      intro="Les paiements par carte des formations, encaissés par Stripe. Le remboursement se fait dans le tableau de bord Stripe : l'accès à la formation se ferme alors tout seul."
    >
      <section className="rounded-xl border border-border bg-card p-5 text-sm">
        <h2 className="text-base font-semibold text-foreground">Configuration</h2>
        {config === null ? (
          <Skeleton className="mt-3 h-12 w-full" />
        ) : (
          <ul className="mt-3 space-y-1.5 text-muted-foreground">
            <li>
              Clé Stripe :{" "}
              {config.mode === "absent" ? (
                <span className="font-medium text-destructive">absente</span>
              ) : (
                <span className="font-medium text-foreground">
                  configurée, mode {config.mode === "live" ? "réel" : "test"}
                </span>
              )}
            </li>
            <li>
              Secret du webhook :{" "}
              {config.webhook ? (
                <span className="font-medium text-foreground">configuré</span>
              ) : (
                <span className="font-medium text-destructive">absent</span>
              )}
            </li>
            <li>
              Adresse du webhook à déclarer dans Stripe :{" "}
              <code className="break-all rounded bg-muted px-1.5 py-0.5 text-foreground">
                {(siteUrl || "https://votre-site") + "/api/stripe-webhook"}
              </code>
            </li>
          </ul>
        )}
        {config && (config.mode === "absent" || !config.webhook) ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Les clés se saisissent dans les secrets du projet (STRIPE_SECRET_KEY et
            STRIPE_WEBHOOK_SECRET), jamais dans le code ni en base. Tant qu'elles manquent, le
            bouton de paiement affiche « paiement pas encore configuré ».
          </p>
        ) : null}
      </section>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {rows === null
            ? "Chargement…"
            : `${paid.length} paiement${paid.length > 1 ? "s" : ""} encaissé${paid.length > 1 ? "s" : ""}${
                Object.keys(totals).length
                  ? ` · ${Object.entries(totals)
                      .map(([cur, cents]) => formatPrice(cents, cur.toUpperCase()))
                      .join(" + ")}`
                  : ""
              }`}
        </p>
        <Button
          variant="outline"
          onClick={exportCsv}
          disabled={!rows?.length}
          title="Télécharger les paiements au format CSV (comptabilité)"
        >
          Exporter en CSV
        </Button>
      </div>

      {rows === null ? (
        <Skeleton className="mt-6 h-40 w-full rounded-xl" />
      ) : loadError ? (
        <div className="mt-6 rounded-lg border border-destructive/40 p-6 text-sm">
          <p className="text-destructive">Les paiements n'ont pas pu être chargés.</p>
          <Button className="mt-3" variant="outline" onClick={() => void load()} title="Recharger">
            Réessayer
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Aucun paiement pour le moment.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card p-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Membre</TableHead>
                <TableHead>Formation</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{new Date(p.created_at).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell>{names[p.user_id] ?? "Ancien membre"}</TableCell>
                  <TableCell className="font-medium">{p.product_label}</TableCell>
                  <TableCell className="text-right">
                    {formatPrice(p.amount_cents, p.currency.toUpperCase())}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS[p.status]?.variant ?? "outline"}>
                      {STATUS[p.status]?.label ?? p.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </AdminShell>
  );
}
