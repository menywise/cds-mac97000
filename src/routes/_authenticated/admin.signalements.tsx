import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminShell, useIsAdmin } from "@/components/cds/AdminShell";
import { ConfirmButton } from "@/components/cds/ConfirmButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { requireFeature } from "@/config/features";
import { supabase } from "@/integrations/supabase/client";
import {
  REPORT_STATUSES,
  reportContentTypeLabel,
  reportReasonLabel,
  reportStatusLabel,
  type ReportStatus,
} from "@/lib/reports";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin/signalements")({
  beforeLoad: () => requireFeature("reports"),
  head: () =>
    seo({
      title: "Signalements",
      description: "Contenus signalés par les membres et suivi de leur traitement.",
      path: "/admin/signalements",
      noindex: true,
    }),
  component: AdminReportsPage,
});

type Report = {
  id: string;
  reporter_id: string;
  content_type: string;
  content_id: string | null;
  reason: string;
  details: string | null;
  reported_url: string | null;
  status: string;
  admin_note: string | null;
  handled_at: string | null;
  created_at: string;
};

const FILTERS: Array<{ value: ReportStatus | "tous"; label: string }> = [
  { value: "en_attente", label: "À examiner" },
  { value: "tous", label: "Tous" },
  ...REPORT_STATUSES.filter((s) => s.value !== "en_attente"),
];

function statusVariant(status: string) {
  if (status === "en_attente") return "default" as const;
  if (status === "classe") return "outline" as const;
  return "secondary" as const;
}

function AdminReportsPage() {
  const isAdmin = useIsAdmin();
  const [filter, setFilter] = useState<ReportStatus | "tous">("en_attente");
  const [rows, setRows] = useState<Report[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoadError(false);
    let query = supabase
      .from("reports")
      .select(
        "id, reporter_id, content_type, content_id, reason, details, reported_url, status, admin_note, handled_at, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (filter !== "tous") query = query.eq("status", filter);
    const { data, error } = await query;
    if (error) {
      setLoadError(true);
      setRows([]);
      return;
    }
    const list = (data ?? []) as Report[];
    setRows(list);
    const ids = [...new Set(list.map((r) => r.reporter_id))];
    if (ids.length) {
      const { data: people } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);
      setNames(
        Object.fromEntries((people ?? []).map((p) => [p.id, p.full_name || p.email || "Membre"])),
      );
    }
  }, [filter]);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  return (
    <AdminShell
      title="Signalements"
      intro="Les contenus que les membres vous ont signalés. Ouvrez la page, modérez si besoin (écran Modération), puis classez le signalement avec une note. L'auteur du contenu ne voit jamais qui a signalé."
    >
      <div role="tablist" aria-label="Filtrer par statut" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            role="tab"
            aria-selected={filter === f.value}
            size="sm"
            variant={filter === f.value ? "default" : "outline"}
            onClick={() => setFilter(f.value)}
            title={`Afficher les signalements : ${f.label.toLowerCase()}`}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {rows === null ? (
        <Skeleton className="mt-6 h-40 w-full rounded-xl" />
      ) : loadError ? (
        <div className="mt-6 rounded-lg border border-destructive/40 p-6 text-sm">
          <p className="text-destructive">Les signalements n'ont pas pu être chargés.</p>
          <Button className="mt-3" variant="outline" onClick={() => void load()} title="Recharger">
            Réessayer
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          {filter === "en_attente" ? "Aucun signalement à examiner." : "Aucun signalement."}
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map((row) => (
            <ReportItem
              key={row.id}
              row={row}
              reporter={names[row.reporter_id] ?? "Ancien membre"}
              onChanged={load}
            />
          ))}
        </ul>
      )}
    </AdminShell>
  );
}

function ReportItem({
  row,
  reporter,
  onChanged,
}: {
  row: Report;
  reporter: string;
  onChanged: () => Promise<void>;
}) {
  const [note, setNote] = useState(row.admin_note ?? "");
  const [busy, setBusy] = useState(false);

  async function setStatus(status: ReportStatus) {
    setBusy(true);
    const { error } = await supabase
      .from("reports")
      .update({ status, admin_note: note.trim().slice(0, 2000) || null })
      .eq("id", row.id);
    setBusy(false);
    if (error) {
      toast.error("La modification n'a pas pu être enregistrée.");
      return;
    }
    toast.success(`Signalement : ${reportStatusLabel(status).toLowerCase()}.`);
    await onChanged();
  }

  async function remove() {
    const { error } = await supabase.from("reports").delete().eq("id", row.id);
    if (error) {
      toast.error("La suppression a échoué.");
      return;
    }
    toast.success("Signalement supprimé.");
    await onChanged();
  }

  return (
    <li className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={statusVariant(row.status)}>{reportStatusLabel(row.status)}</Badge>
        <span className="text-sm font-semibold text-foreground">
          {reportContentTypeLabel(row.content_type)} — {reportReasonLabel(row.reason)}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Signalé par {reporter} le {new Date(row.created_at).toLocaleString("fr-FR")}
        {row.handled_at ? ` · traité le ${new Date(row.handled_at).toLocaleString("fr-FR")}` : ""}
      </p>
      {row.details ? (
        <p className="mt-3 whitespace-pre-line rounded-md bg-muted px-3 py-2 text-sm text-foreground">
          {row.details}
        </p>
      ) : null}
      {row.reported_url ? (
        <a
          href={row.reported_url}
          target="_blank"
          rel="noreferrer"
          title="Ouvrir la page signalée dans un nouvel onglet"
          className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-primary-text hover:underline"
        >
          Ouvrir la page signalée ({row.reported_url})
        </a>
      ) : null}
      <label className="mt-3 block text-xs font-medium text-foreground" htmlFor={`note-${row.id}`}>
        Note interne (visible des admins seulement)
      </label>
      <Textarea
        id={`note-${row.id}`}
        value={note}
        maxLength={2000}
        rows={2}
        onChange={(e) => setNote(e.target.value)}
        className="mt-1"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={busy}
          onClick={() => void setStatus("action_prise")}
          title="Le contenu a été modéré ou retiré"
        >
          Action prise
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => void setStatus("examine")}
          title="Examiné, en cours de suivi"
        >
          Examiné
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => void setStatus("classe")}
          title="Signalement non fondé"
        >
          Écarter
        </Button>
        {row.status !== "en_attente" ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => void setStatus("en_attente")}
            title="Remettre le signalement à examiner"
          >
            Rouvrir
          </Button>
        ) : null}
        <ConfirmButton
          title="Supprimer ce signalement"
          question="Supprimer ce signalement ?"
          detail="Préférez « Écarter » pour garder une trace."
          onConfirm={remove}
        />
      </div>
    </li>
  );
}
