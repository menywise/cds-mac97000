import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CrmShell } from "@/components/cds/CrmShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { requireFeature } from "@/config/features";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { seo } from "@/lib/seo";
import { formatDate } from "@/lib/format";

type Action = {
  id: string;
  title: string;
  due_date: string | null;
  done: boolean;
  prospect_id: string | null;
};

export const Route = createFileRoute("/_authenticated/crm/actions")({
  beforeLoad: () => requireFeature("crm"),
  head: () =>
    seo({
      title: "Actions prévues",
      description: "Ce que vous avez prévu de faire, avec les échéances qui approchent.",
      path: "/crm/actions",
      noindex: true,
    }),
  component: ActionsPage,
});

function ActionsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Action[] | null>(null);
  const [prospects, setProspects] = useState<Array<{ id: string; name: string }>>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      const [{ data: actions }, { data: contacts }] = await Promise.all([
        supabase
          .from("crm_actions")
          .select("id, title, due_date, done, prospect_id")
          .eq("owner_id", user.id)
          .order("done", { ascending: true })
          .order("due_date", { ascending: true }),
        supabase.from("crm_prospects").select("id, name").eq("owner_id", user.id).order("name"),
      ]);
      if (cancelled) return;
      setRows((actions ?? []) as Action[]);
      setProspects(contacts ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function addAction(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    const form = e.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("title") ?? "").trim();
    if (!title) return;
    setBusy(true);
    const { data: created, error } = await supabase
      .from("crm_actions")
      .insert({
        owner_id: user.id,
        title,
        due_date: String(data.get("due_date") ?? "") || null,
        prospect_id: String(data.get("prospect_id") ?? "") || null,
      })
      .select("id, title, due_date, done, prospect_id")
      .maybeSingle();
    setBusy(false);
    if (error || !created) {
      toast.error("Action non enregistrée.", { description: "Réessayez dans un instant." });
      return;
    }
    form.reset();
    setRows((prev) => [created as Action, ...(prev ?? [])]);
    toast.success("Action ajoutée.");
  }

  async function toggle(action: Action) {
    const done = !action.done;
    const { error } = await supabase
      .from("crm_actions")
      .update({ done, done_at: done ? new Date().toISOString() : null })
      .eq("id", action.id);
    if (error) {
      toast.error("Modification impossible.");
      return;
    }
    setRows((prev) => prev?.map((row) => (row.id === action.id ? { ...row, done } : row)) ?? null);
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <CrmShell
      title="Vos actions"
      intro="Une promesse tenue vaut dix relances : notez ce que vous avez dit que vous feriez."
    >
      <form
        onSubmit={addAction}
        className="grid gap-3 rounded-xl border border-border bg-card p-5 sm:grid-cols-3"
      >
        <div className="space-y-1.5">
          <Label htmlFor="a-title">Action</Label>
          <Input id="a-title" name="title" required placeholder="Rappeler Camille" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="a-due">Échéance</Label>
          <Input id="a-due" name="due_date" type="date" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="a-prospect">Contact lié</Label>
          <select
            id="a-prospect"
            name="prospect_id"
            className="h-11 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground"
          >
            <option value="">Aucun</option>
            {prospects.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-3">
          <Button type="submit" disabled={busy} title="Ajouter cette action">
            {busy ? "Enregistrement…" : "Ajouter l'action"}
          </Button>
        </div>
      </form>

      {rows === null ? (
        <Skeleton className="mt-6 h-40 w-full" />
      ) : rows.length === 0 ? (
        <p className="mt-6 rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          Aucune action prévue.
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {rows.map((action) => {
            const late = !action.done && action.due_date && action.due_date <= today;
            return (
              <li
                key={action.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4"
              >
                <Checkbox
                  id={`act-${action.id}`}
                  checked={action.done}
                  onCheckedChange={() => toggle(action)}
                  aria-label={`Marquer « ${action.title} » comme faite`}
                />
                <Label
                  htmlFor={`act-${action.id}`}
                  className={`font-normal text-foreground ${action.done ? "line-through" : ""}`}
                >
                  {action.title}
                </Label>
                {action.due_date ? (
                  <span
                    className={`ml-auto text-xs ${late ? "text-warning-text" : "text-muted-foreground"}`}
                  >
                    {formatDate(action.due_date)}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </CrmShell>
  );
}
