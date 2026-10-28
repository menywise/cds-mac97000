import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminShell, useIsAdmin } from "@/components/cds/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  ALL_MODULES,
  moduleDependents,
  moduleRequires,
  type FeatureKey,
  type ModuleStates,
} from "@/config/modules";
import { fetchModuleStates, fetchModulesChosen, saveModuleStates } from "@/hooks/useSiteSettings";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin/modules")({
  head: () =>
    seo({
      title: "Modules",
      description: "Allumer ou éteindre les modules du site, dépendances comprises.",
      path: "/admin/modules",
      noindex: true,
    }),
  component: AdminModulesPage,
});

const labelOf = (key: FeatureKey) => ALL_MODULES.find((m) => m.key === key)?.label ?? key;

/** Allume un module et, en cascade, tout ce dont il dépend. */
function switchOn(states: ModuleStates, key: FeatureKey, changed: FeatureKey[]) {
  if (!states[key]) {
    states[key] = true;
    changed.push(key);
  }
  for (const dep of moduleRequires(key)) switchOn(states, dep, changed);
}

/** Éteint un module et, en cascade, tout ce qui dépend de lui. */
function switchOff(states: ModuleStates, key: FeatureKey, changed: FeatureKey[]) {
  if (states[key]) {
    states[key] = false;
    changed.push(key);
  }
  for (const child of moduleDependents(key)) switchOff(states, child, changed);
}

function AdminModulesPage() {
  const isAdmin = useIsAdmin();
  const [saved, setSaved] = useState<ModuleStates | null>(null);
  const [draft, setDraft] = useState<ModuleStates | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [chosen, setChosen] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    Promise.all([fetchModuleStates(), fetchModulesChosen()])
      .then(([states, isChosen]) => {
        if (cancelled) return;
        setSaved(states);
        setDraft(states);
        setChosen(isChosen);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  function toggle(key: FeatureKey, on: boolean) {
    if (!draft) return;
    const next = { ...draft };
    const changed: FeatureKey[] = [];
    if (on) switchOn(next, key, changed);
    else switchOff(next, key, changed);
    const cascade = changed.filter((k) => k !== key);
    if (cascade.length > 0) {
      toast.info(on ? "Dépendances allumées aussi." : "Modules dépendants éteints aussi.", {
        description: cascade.map(labelOf).join(", "),
      });
    }
    setDraft(next);
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      await saveModuleStates(draft);
      setSaved(draft);
      setChosen(true);
      toast.success("Modules enregistrés.", {
        description: "Pages, menus, pied de page, sitemap et administration suivent ces réglages.",
      });
    } catch {
      toast.error("Enregistrement refusé.", {
        description: "Vérifiez les dépendances entre modules, puis réessayez.",
      });
    } finally {
      setSaving(false);
    }
  }

  const dirty =
    draft !== null && saved !== null && ALL_MODULES.some((m) => draft[m.key] !== saved[m.key]);
  const tools = ALL_MODULES.filter((m) => m.socle);
  const modules = ALL_MODULES.filter((m) => !m.socle);

  return (
    <AdminShell
      title="Modules"
      intro="Les modules sont les briques facultatives du site : chacun s'allume ou s'éteint ici. Éteint, il ne laisse aucune trace : ses pages renvoient à l'accueil et ses liens disparaissent des menus, du pied de page, du sitemap et de l'administration."
    >
      {loadError ? (
        <p className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive-text">
          Les réglages n'ont pas pu être chargés. Rechargez la page.
        </p>
      ) : draft === null ? (
        <div className="space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          {!chosen ? (
            <p className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-foreground">
              Aucun choix enregistré pour ce site : tous les modules sont éteints. Allumez ceux dont
              le projet a besoin, puis enregistrez ; enregistrer sans rien allumer vaut aussi choix.
            </p>
          ) : null}
          <section aria-labelledby="outils-admin">
            <h2 id="outils-admin" className="mb-2 text-sm font-semibold text-foreground">
              Outils d'administration, toujours allumés
            </h2>
            <ul className="divide-y divide-border rounded-xl border border-border bg-card">
              {tools.map((m) => (
                <li key={m.key} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{m.label}</p>
                    <p className="text-xs text-muted-foreground">
                      Clé <code>{m.key}</code> · fait partie du socle
                    </p>
                  </div>
                  <Badge variant="secondary">Toujours allumé</Badge>
                </li>
              ))}
            </ul>
          </section>
          <h2 className="text-sm font-semibold text-foreground">Modules</h2>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {modules.map((m) => {
              const requires = moduleRequires(m.key);
              return (
                <li key={m.key} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{m.label}</p>
                    {m.definition ? (
                      <p className="text-sm text-muted-foreground">{m.definition}</p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      Clé <code>{m.key}</code>
                      {m.greffe ? " · propre à ce projet" : ""}
                      {requires.length > 0
                        ? ` · nécessite : ${requires.map(labelOf).join(", ")}`
                        : ""}
                    </p>
                  </div>
                  {draft[m.key] !== saved?.[m.key] ? (
                    <Badge variant="secondary">Modifié</Badge>
                  ) : null}
                  <label className="inline-flex min-h-11 items-center gap-2 text-sm">
                    <Switch
                      checked={draft[m.key] === true}
                      onCheckedChange={(on) => toggle(m.key, on)}
                      aria-label={`${draft[m.key] ? "Éteindre" : "Allumer"} le module ${m.label}`}
                    />
                    {draft[m.key] ? "Allumé" : "Éteint"}
                  </label>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={() => void save()}
              disabled={(!dirty && chosen) || saving}
              title="Enregistrer l'état des modules"
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDraft(saved)}
              disabled={!dirty || saving}
              title="Revenir aux réglages enregistrés"
            >
              Annuler les changements
            </Button>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
