import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminShell, useIsAdmin } from "@/components/cds/AdminShell";
import { ConfirmButton } from "@/components/cds/ConfirmButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { seo } from "@/lib/seo";
import { requireFeature } from "@/config/features";

export const Route = createFileRoute("/_authenticated/admin/pilotage")({
  beforeLoad: () => requireFeature("studio"),
  head: () =>
    seo({
      title: "Administration — Pilotage",
      description: "Feuille de route, plan directeur et historique des audits.",
      path: "/admin/pilotage",
      noindex: true,
    }),
  component: AdminPilotagePage,
});

type Item = {
  id: string;
  title: string;
  description: string;
  lot: string;
  status: string;
  priority: string;
  position: number;
};

type Section = { id: string; title: string; content: string; position: number };

type Audit = {
  id: string;
  label: string;
  score: number;
  max_score: number;
  summary: string;
  performed_at: string;
};

type Finding = {
  id: string;
  audit_id: string;
  code: string;
  severity: string;
  location: string;
  description: string;
  resolved: boolean;
};

const statusLabel: Record<string, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  fait: "Fait",
};

// Mêmes valeurs que l'outil MCP upsert_roadmap_item.
const PRIORITIES = [
  { value: "normale", label: "Normale" },
  { value: "haute", label: "Haute" },
  { value: "bloque", label: "Bloquante" },
] as const;

function priorityLabel(value: string) {
  return PRIORITIES.find((p) => p.value === value)?.label ?? value;
}

const selectClass =
  "h-11 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground sm:h-9";

function text(data: FormData, key: string) {
  return String(data.get(key) ?? "").trim();
}

function AdminPilotagePage() {
  const isAdmin = useIsAdmin();
  const [items, setItems] = useState<Item[] | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoadError(false);
    const [roadmap, masterplan, auditList, findingList] = await Promise.all([
      supabase
        .from("roadmap_items")
        .select("id, title, description, lot, status, priority, position")
        .order("position", { ascending: true }),
      supabase
        .from("masterplan_sections")
        .select("id, title, content, position")
        .order("position", { ascending: true }),
      supabase
        .from("audits")
        .select("id, label, score, max_score, summary, performed_at")
        .order("performed_at", { ascending: false }),
      supabase
        .from("audit_findings")
        .select("id, audit_id, code, severity, location, description, resolved")
        .order("created_at", { ascending: true }),
    ]);
    if (roadmap.error || masterplan.error || auditList.error || findingList.error) {
      setLoadError(true);
      setItems([]);
      return;
    }
    setItems(roadmap.data ?? []);
    setSections(masterplan.data ?? []);
    setAudits(auditList.data ?? []);
    setFindings(findingList.data ?? []);
  }, []);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  async function addItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const last = items?.at(-1)?.position ?? 0;
    const { error } = await supabase.from("roadmap_items").insert({
      title: text(data, "title"),
      description: text(data, "description"),
      lot: text(data, "lot"),
      status: "a_faire",
      priority: text(data, "priority") || "normale",
      position: last + 1,
    });
    if (error) {
      toast.error("Étape non ajoutée.");
      return;
    }
    form.reset();
    toast.success("Étape ajoutée à la feuille de route.");
    void load();
  }

  async function addSection(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const position = Number(data.get("position"));
    const { error } = await supabase.from("masterplan_sections").insert({
      title: text(data, "title"),
      content: text(data, "content"),
      position: Number.isFinite(position) ? position : sections.length + 1,
    });
    if (error) {
      toast.error("Section non ajoutée.");
      return;
    }
    form.reset();
    toast.success("Section ajoutée au plan directeur.");
    void load();
  }

  async function addAudit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const { error } = await supabase.from("audits").insert({
      label: text(data, "label"),
      score: Number(data.get("score") ?? 0),
      max_score: Number(data.get("max_score") ?? 100),
      summary: text(data, "summary"),
    });
    if (error) {
      toast.error("Audit non enregistré.");
      return;
    }
    form.reset();
    toast.success("Audit enregistré.", {
      description: "Il rejoint l'historique et sert de mémoire.",
    });
    void load();
  }

  const nextSectionPosition = (sections.at(-1)?.position ?? 0) + 1;

  return (
    <AdminShell
      title="Pilotage"
      intro="Ce que vous construisez, dans quel ordre, et ce que chaque audit a relevé : tout se règle ici, sans toucher au code."
    >
      {items === null ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : loadError ? (
        <div className="rounded-lg border border-destructive/40 p-6 text-sm">
          <p className="text-destructive-text">Le pilotage n'a pas pu être chargé.</p>
          <Button className="mt-3" variant="outline" onClick={() => void load()} title="Recharger">
            Réessayer
          </Button>
        </div>
      ) : (
        <>
          <section>
            <h2 className="text-base font-semibold text-foreground">Feuille de route</h2>
            {items.length === 0 ? (
              <p className="mt-4 rounded-lg border border-dashed border-border p-10 text-center text-sm text-foreground">
                Aucune étape pour l'instant. Ajoutez la première ci-dessous.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {items.map((item) => (
                  <RoadmapRow key={item.id} item={item} onChanged={load} />
                ))}
              </ul>
            )}

            <form onSubmit={addItem} className="mt-6 rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground">Ajouter une étape</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="r-title">Titre</Label>
                  <Input id="r-title" name="title" required placeholder="Brancher les paiements" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="r-lot">Lot</Label>
                  <Input id="r-lot" name="lot" placeholder="Lot 6" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="r-priority">Priorité</Label>
                  <select
                    id="r-priority"
                    name="priority"
                    defaultValue="normale"
                    className={selectClass}
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5 sm:col-span-3">
                  <Label htmlFor="r-desc">Description</Label>
                  <Input
                    id="r-desc"
                    name="description"
                    placeholder="Ce que l'étape doit produire"
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="mt-4"
                title="Ajouter cette étape à la feuille de route"
              >
                Ajouter
              </Button>
            </form>
          </section>

          <section className="mt-10">
            <h2 className="text-base font-semibold text-foreground">Plan directeur</h2>
            {sections.length === 0 ? (
              <p className="mt-4 rounded-lg border border-dashed border-border p-10 text-center text-sm text-foreground">
                Le plan directeur est vide. Ajoutez une première section ci-dessous.
              </p>
            ) : (
              <ul className="mt-4 space-y-4">
                {sections.map((section) => (
                  <SectionRow key={section.id} section={section} onChanged={load} />
                ))}
              </ul>
            )}

            <form
              key={nextSectionPosition}
              onSubmit={addSection}
              className="mt-6 rounded-xl border border-border bg-card p-5"
            >
              <h3 className="text-sm font-semibold text-foreground">Ajouter une section</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="m-title">Titre</Label>
                  <Input id="m-title" name="title" required placeholder="Objectifs du trimestre" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m-position">Position</Label>
                  <Input
                    id="m-position"
                    name="position"
                    type="number"
                    min={0}
                    defaultValue={nextSectionPosition}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-3">
                  <Label htmlFor="m-content">Contenu</Label>
                  <Textarea
                    id="m-content"
                    name="content"
                    rows={3}
                    placeholder="Ce que cette section fixe"
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="mt-4"
                title="Ajouter cette section au plan directeur"
              >
                Ajouter la section
              </Button>
            </form>
          </section>

          <section className="mt-10">
            <h2 className="text-base font-semibold text-foreground">Audits</h2>
            <p className="mt-1 text-sm text-foreground">
              Chaque audit reste en mémoire : vous comparez d'un coup d'œil ce qui progresse.
            </p>
            {audits.length === 0 ? (
              <p className="mt-3 text-sm text-foreground">Aucun audit enregistré.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {audits.map((audit) => (
                  <AuditRow
                    key={audit.id}
                    audit={audit}
                    findings={findings.filter((f) => f.audit_id === audit.id)}
                    onChanged={load}
                  />
                ))}
              </ul>
            )}

            <form onSubmit={addAudit} className="mt-6 rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground">Enregistrer un audit</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="a-label">Intitulé</Label>
                  <Input
                    id="a-label"
                    name="label"
                    required
                    placeholder="Audit complet du 12 mars"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="a-score">Score</Label>
                  <Input id="a-score" name="score" type="number" min={0} defaultValue={0} />
                </div>
                <div className="space-y-1.5 sm:col-span-3">
                  <Label htmlFor="a-summary">Résumé</Label>
                  <Textarea
                    id="a-summary"
                    name="summary"
                    rows={3}
                    placeholder="Ce que l'audit a relevé"
                  />
                </div>
                <input type="hidden" name="max_score" value={100} />
              </div>
              <Button
                type="submit"
                className="mt-4"
                title="Enregistrer cet audit dans l'historique"
              >
                Enregistrer l'audit
              </Button>
            </form>
          </section>
        </>
      )}
    </AdminShell>
  );
}

/** Une étape de la feuille de route : état, modification en place, suppression. */
function RoadmapRow({ item, onChanged }: { item: Item; onChanged: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  async function setStatus(status: string) {
    const { error } = await supabase.from("roadmap_items").update({ status }).eq("id", item.id);
    if (error) toast.error("Modification non enregistrée.");
    else await onChanged();
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await supabase
      .from("roadmap_items")
      .update({
        title: text(data, "title"),
        lot: text(data, "lot"),
        description: text(data, "description"),
        priority: text(data, "priority") || "normale",
      })
      .eq("id", item.id);
    setBusy(false);
    if (error) {
      toast.error("Étape non enregistrée.");
      return;
    }
    toast.success("Étape mise à jour.");
    setEditing(false);
    await onChanged();
  }

  async function remove() {
    const { error } = await supabase.from("roadmap_items").delete().eq("id", item.id);
    if (error) {
      toast.error("La suppression a échoué.");
      return;
    }
    toast.success("Étape supprimée.");
    await onChanged();
  }

  if (editing) {
    return (
      <li className="rounded-xl border border-border bg-card p-4">
        <form onSubmit={save} className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor={`r-title-${item.id}`}>Titre</Label>
            <Input id={`r-title-${item.id}`} name="title" required defaultValue={item.title} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`r-lot-${item.id}`}>Lot</Label>
            <Input id={`r-lot-${item.id}`} name="lot" defaultValue={item.lot} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`r-priority-${item.id}`}>Priorité</Label>
            <select
              id={`r-priority-${item.id}`}
              name="priority"
              defaultValue={item.priority}
              className={selectClass}
            >
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-3">
            <Label htmlFor={`r-desc-${item.id}`}>Description</Label>
            <Textarea
              id={`r-desc-${item.id}`}
              name="description"
              rows={2}
              defaultValue={item.description}
            />
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-3">
            <Button type="submit" size="sm" disabled={busy} title="Enregistrer cette étape">
              {busy ? "Enregistrement…" : "Enregistrer"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => setEditing(false)}
              title="Abandonner les modifications"
            >
              Annuler
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-foreground">{item.title}</p>
        {item.lot ? (
          <span className="rounded-full bg-neutral-soft px-2.5 py-0.5 text-xs text-neutral-text">
            {item.lot}
          </span>
        ) : null}
        {item.priority !== "normale" ? (
          <span
            className={`text-xs font-medium ${
              item.priority === "bloque" ? "text-destructive-text" : "text-warning-text"
            }`}
          >
            Priorité {priorityLabel(item.priority).toLowerCase()}
          </span>
        ) : null}
      </div>
      {item.description ? (
        <p className="mt-1.5 text-sm text-foreground">{item.description}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {(["a_faire", "en_cours", "fait"] as const).map((status) => (
          <button
            key={status}
            type="button"
            aria-pressed={item.status === status}
            onClick={() => void setStatus(status)}
            title={`Marquer cette étape comme « ${statusLabel[status]} »`}
            className={`min-h-11 rounded-md border px-3 text-xs font-medium transition-colors sm:min-h-9 ${
              item.status === status
                ? "border-primary bg-accent text-foreground"
                : "border-border text-foreground hover:bg-accent"
            }`}
          >
            {statusLabel[status]}
          </button>
        ))}
        <div className="ml-auto flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setEditing(true)}
            title="Modifier le titre, le lot, la description ou la priorité"
          >
            Modifier
          </Button>
          <ConfirmButton
            title="Supprimer cette étape"
            question={`Supprimer l'étape « ${item.title} » ?`}
            onConfirm={remove}
          />
        </div>
      </div>
    </li>
  );
}

/** Une section du plan directeur : contenu enregistré à la sortie du champ. */
function SectionRow({ section, onChanged }: { section: Section; onChanged: () => Promise<void> }) {
  async function save(content: string) {
    const { error } = await supabase
      .from("masterplan_sections")
      .update({ content })
      .eq("id", section.id);
    if (error) {
      toast.error("Section non enregistrée.");
      return;
    }
    toast.success("Plan directeur mis à jour.");
    await onChanged();
  }

  async function remove() {
    const { error } = await supabase.from("masterplan_sections").delete().eq("id", section.id);
    if (error) {
      toast.error("La suppression a échoué.");
      return;
    }
    toast.success("Section supprimée.");
    await onChanged();
  }

  return (
    <li className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={`s-${section.id}`}>{section.title}</Label>
        <span className="ml-auto">
          <ConfirmButton
            title="Supprimer cette section"
            question={`Supprimer la section « ${section.title} » ?`}
            onConfirm={remove}
          />
        </span>
      </div>
      <Textarea
        id={`s-${section.id}`}
        defaultValue={section.content}
        rows={3}
        className="mt-2"
        onBlur={(e) => {
          if (e.target.value !== section.content) void save(e.target.value);
        }}
      />
    </li>
  );
}

/** Un audit de l'historique, ses constats, et leur suivi. */
function AuditRow({
  audit,
  findings,
  onChanged,
}: {
  audit: Audit;
  findings: Finding[];
  onChanged: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await supabase
      .from("audits")
      .update({
        label: text(data, "label"),
        score: Number(data.get("score") ?? 0),
        max_score: Number(data.get("max_score") ?? 100),
        summary: text(data, "summary"),
      })
      .eq("id", audit.id);
    setBusy(false);
    if (error) {
      toast.error("Audit non enregistré.");
      return;
    }
    toast.success("Audit mis à jour.");
    setEditing(false);
    await onChanged();
  }

  async function remove() {
    const { error } = await supabase.from("audits").delete().eq("id", audit.id);
    if (error) {
      toast.error("La suppression a échoué.");
      return;
    }
    toast.success("Audit supprimé.");
    await onChanged();
  }

  async function toggleFinding(finding: Finding) {
    const { error } = await supabase
      .from("audit_findings")
      .update({ resolved: !finding.resolved })
      .eq("id", finding.id);
    if (error) {
      toast.error("Modification non enregistrée.");
      return;
    }
    await onChanged();
  }

  return (
    <li className="rounded-xl border border-border bg-card p-5">
      {editing ? (
        <form onSubmit={save} className="grid gap-3 sm:grid-cols-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor={`a-label-${audit.id}`}>Intitulé</Label>
            <Input id={`a-label-${audit.id}`} name="label" required defaultValue={audit.label} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`a-score-${audit.id}`}>Score</Label>
            <Input
              id={`a-score-${audit.id}`}
              name="score"
              type="number"
              min={0}
              defaultValue={audit.score}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`a-max-${audit.id}`}>Sur</Label>
            <Input
              id={`a-max-${audit.id}`}
              name="max_score"
              type="number"
              min={1}
              defaultValue={audit.max_score}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-4">
            <Label htmlFor={`a-summary-${audit.id}`}>Résumé</Label>
            <Textarea
              id={`a-summary-${audit.id}`}
              name="summary"
              rows={3}
              defaultValue={audit.summary}
            />
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-4">
            <Button type="submit" size="sm" disabled={busy} title="Enregistrer cet audit">
              {busy ? "Enregistrement…" : "Enregistrer"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => setEditing(false)}
              title="Abandonner les modifications"
            >
              Annuler
            </Button>
          </div>
        </form>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{audit.label}</p>
            <span className="text-xs text-muted-foreground">
              {new Date(audit.performed_at).toLocaleDateString("fr-FR")}
            </span>
            <span className="ml-auto text-sm font-semibold text-primary-text">
              {audit.score}/{audit.max_score}
            </span>
          </div>
          {audit.summary ? <p className="mt-2 text-sm text-foreground">{audit.summary}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setEditing(true)}
              title="Modifier l'intitulé, le score ou le résumé"
            >
              Modifier
            </Button>
            <ConfirmButton
              title="Supprimer cet audit"
              question={`Supprimer l'audit « ${audit.label} » ?`}
              detail={
                findings.length > 0
                  ? `Ses ${findings.length} constat${findings.length > 1 ? "s" : ""} seront supprimés avec lui. Cette action ne peut pas être annulée.`
                  : "Cette action ne peut pas être annulée."
              }
              onConfirm={remove}
            />
          </div>
        </>
      )}

      {findings.length > 0 ? (
        <ul className="mt-4 space-y-2 border-t border-border pt-3 text-xs text-foreground">
          {findings.map((finding) => (
            <li key={finding.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="min-w-0 flex-1">
                <span
                  className={
                    finding.resolved
                      ? "line-through"
                      : finding.severity === "majeur"
                        ? "text-warning-text"
                        : ""
                  }
                >
                  {finding.code} — {finding.description}
                </span>{" "}
                <span>({finding.location})</span>
                {finding.resolved ? <span className="text-success-text"> — corrigé</span> : null}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void toggleFinding(finding)}
                title={
                  finding.resolved
                    ? "Rouvrir ce constat : il redevient à traiter"
                    : "Marquer ce constat comme corrigé"
                }
              >
                {finding.resolved ? "Rouvrir" : "Corrigé"}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}
