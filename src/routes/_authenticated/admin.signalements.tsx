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
import { CAPTURE_DOSSIER, CAPTURE_LIEN_SECONDES, cheminCapture } from "@/lib/captures";
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
      description:
        "Erreurs, oublis, corrections proposées et contenus signalés par les visiteurs et les membres.",
      path: "/admin/signalements",
      noindex: true,
    }),
  component: AdminReportsPage,
});

type Report = {
  id: string;
  reporter_id: string | null;
  source: string;
  content_type: string;
  content_id: string | null;
  reason: string;
  details: string | null;
  proposed_value: string | null;
  contact_email: string | null;
  tracking_code: string | null;
  public_note: string | null;
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
  /** Codes de suivi des signalements qui ont une capture d'écran (socle 1.19.0). */
  const [captures, setCaptures] = useState<Set<string>>(new Set());

  // Captures expirées (signalement supprimé, traité depuis 3 mois, envoyé depuis 12 mois) :
  // effacées à l'ouverture de l'écran, par l'interface des fichiers, seule voie admise.
  useEffect(() => {
    if (!isAdmin) return;
    void (async () => {
      const { data } = await supabase.rpc("report_captures_a_effacer");
      if (data?.length) await supabase.storage.from(CAPTURE_DOSSIER).remove(data);
    })();
  }, [isAdmin]);

  const load = useCallback(async () => {
    setLoadError(false);
    let query = supabase
      .from("reports")
      .select(
        "id, reporter_id, source, content_type, content_id, reason, details, proposed_value, contact_email, tracking_code, public_note, reported_url, status, admin_note, handled_at, created_at",
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
    const { data: dossiers } = await supabase.storage
      .from(CAPTURE_DOSSIER)
      .list("", { limit: 1000, sortBy: { column: "name", order: "asc" } });
    setCaptures(new Set((dossiers ?? []).map((d) => d.name)));
    const ids = [...new Set(list.flatMap((r) => (r.reporter_id ? [r.reporter_id] : [])))];
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
      intro="Les erreurs, oublis et corrections proposées par les visiteurs et les membres, et les contenus à modérer. Ouvrez la page, corrigez ou modérez si besoin, puis classez le signalement. Une réponse publique sur un signalement « Action prise » apparaît sur la page « Le site s'améliore grâce à vous » et dans le suivi du signaleur. L'auteur du contenu ne voit jamais qui a signalé."
    >
      <div role="group" aria-label="Filtrer par statut" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            type="button"
            aria-pressed={filter === f.value}
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
          <p className="text-destructive-text">Les signalements n'ont pas pu être chargés.</p>
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
              reporter={
                row.source === "visiteur"
                  ? "un visiteur"
                  : (names[row.reporter_id ?? ""] ?? "Ancien membre")
              }
              hasCapture={!!row.tracking_code && captures.has(row.tracking_code)}
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
  hasCapture,
  onChanged,
}: {
  row: Report;
  reporter: string;
  hasCapture: boolean;
  onChanged: () => Promise<void>;
}) {
  const [captureUrl, setCaptureUrl] = useState("");
  const [captureBusy, setCaptureBusy] = useState(false);
  const chemin = row.tracking_code ? cheminCapture(row.tracking_code) : null;

  async function openCapture() {
    if (!chemin) return;
    setCaptureBusy(true);
    const { data, error } = await supabase.storage
      .from(CAPTURE_DOSSIER)
      .createSignedUrl(chemin, CAPTURE_LIEN_SECONDES);
    setCaptureBusy(false);
    if (error || !data) {
      toast.error("La capture d'écran n'a pas pu être ouverte.");
      return;
    }
    setCaptureUrl(data.signedUrl);
  }

  const [note, setNote] = useState(row.admin_note ?? "");
  const [publicNote, setPublicNote] = useState(row.public_note ?? "");
  const [busy, setBusy] = useState(false);

  async function setStatus(status: ReportStatus) {
    setBusy(true);
    const { error } = await supabase
      .from("reports")
      .update({
        status,
        admin_note: note.trim().slice(0, 2000) || null,
        public_note: publicNote.trim().slice(0, 500) || null,
      })
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
    // La capture part avec le signalement ; une capture restée seule est effacée à la prochaine
    // ouverture de l'écran (report_captures_a_effacer).
    if (hasCapture && chemin) await supabase.storage.from(CAPTURE_DOSSIER).remove([chemin]);
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
        <Badge variant="outline">{row.source === "visiteur" ? "Visiteur" : "Membre"}</Badge>
        <span className="text-sm font-semibold text-foreground">
          {reportContentTypeLabel(row.content_type)} — {reportReasonLabel(row.reason)}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Signalé par {reporter} le {new Date(row.created_at).toLocaleString("fr-FR")}
        {row.handled_at ? ` · traité le ${new Date(row.handled_at).toLocaleString("fr-FR")}` : ""}
        {row.tracking_code ? ` · code ${row.tracking_code}` : ""}
      </p>
      {row.contact_email ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Répondre au visiteur :{" "}
          <a
            href={`mailto:${row.contact_email}`}
            title="Écrire au visiteur qui a signalé"
            className="font-medium text-primary-text hover:underline"
          >
            {row.contact_email}
          </a>{" "}
          (adresse effacée 3 mois après le traitement)
        </p>
      ) : null}
      {row.proposed_value ? (
        <div className="mt-3">
          <p className="text-xs font-medium text-foreground">Correction proposée</p>
          <p className="mt-1 whitespace-pre-line rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-foreground">
            {row.proposed_value}
          </p>
        </div>
      ) : null}
      {row.details ? (
        <p className="mt-3 whitespace-pre-line rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
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
      {hasCapture ? (
        <div className="mt-3">
          {captureUrl ? (
            <figure>
              <a
                href={captureUrl}
                target="_blank"
                rel="noreferrer"
                title="Ouvrir la capture en grand dans un nouvel onglet (lien valable 5 minutes)"
              >
                <img
                  src={captureUrl}
                  alt="Capture d'écran jointe au signalement"
                  className="max-h-80 rounded-lg border border-border object-contain"
                />
              </a>
              <figcaption className="mt-1 text-xs text-foreground">
                Capture jointe par le signaleur. Lien valable 5 minutes ; effacée 3 mois après le
                traitement.
              </figcaption>
            </figure>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled={captureBusy}
              onClick={() => void openCapture()}
              title="Afficher la capture d'écran jointe par le signaleur"
            >
              {captureBusy ? "Ouverture…" : "Voir la capture d'écran"}
            </Button>
          )}
        </div>
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
      <label
        className="mt-3 block text-xs font-medium text-foreground"
        htmlFor={`public-${row.id}`}
      >
        Réponse publique (facultatif, 500 caractères) : affichée dans le suivi du signaleur et, avec
        « Action prise », sur la page des améliorations. Sans nom ni donnée personnelle.
      </label>
      <Textarea
        id={`public-${row.id}`}
        value={publicNote}
        maxLength={500}
        rows={2}
        onChange={(e) => setPublicNote(e.target.value)}
        placeholder="Exemple : le numéro de téléphone de la fiche a été corrigé. Merci !"
        className="mt-1"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={busy}
          onClick={() => void setStatus("action_prise")}
          title="La page a été corrigée, ou le contenu modéré ou retiré"
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
