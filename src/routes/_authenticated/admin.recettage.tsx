import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/cds/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { requireFeature } from "@/config/features";
import {
  QA_CHECKLIST,
  QA_CHECKLIST_TOTAL,
  QA_AUDIT_CODES,
  QA_PAGES,
  type QaItem,
  type QaReport,
} from "@/lib/qa-plan";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin/recettage")({
  beforeLoad: () => requireFeature("studio"),
  head: () =>
    seo({
      title: "Recette",
      description: "Plan de recette du site : robot et contrôles manuels.",
      path: "/admin/recettage",
      noindex: true,
    }),
  component: AdminRecettePage,
});

// Progression propre à ce navigateur (comme Goldwing) : une campagne de recette = un poste.
const CHECK_KEY = "cds.recette.checklist.v1";
const REPORT_KEY = "cds.recette.rapport.v1";

const SEVERITY: Record<QaItem["severity"], "destructive" | "default" | "secondary"> = {
  bloquant: "destructive",
  majeur: "default",
  mineur: "secondary",
};

function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStore(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* stockage indisponible : la page fonctionne, sans mémoire */
  }
}

function isReport(value: unknown): value is QaReport {
  const v = value as Partial<QaReport> | null;
  return Boolean(v && v.version === 1 && Array.isArray(v.results));
}

function AdminRecettePage() {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [report, setReport] = useState<QaReport | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setDone(readStore<Record<string, boolean>>(CHECK_KEY, {}));
    const stored = readStore<unknown>(REPORT_KEY, null);
    setReport(isReport(stored) ? stored : null);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) writeStore(CHECK_KEY, done);
  }, [done, loaded]);

  const doneCount = useMemo(
    () => QA_CHECKLIST.reduce((n, s) => n + s.items.filter((i) => done[i.id]).length, 0),
    [done],
  );

  async function importReport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isReport(parsed)) throw new Error("format");
      setReport(parsed);
      writeStore(REPORT_KEY, parsed);
      toast.success("Rapport importé.");
    } catch {
      toast.error("Ce fichier n'est pas un rapport de recette (recette.json).");
    }
  }

  const results = report?.results ?? [];
  const fails = results.filter((r) => r.status === "echec");
  const oks = results.filter((r) => r.status === "ok");
  // Remarques non bloquantes, regroupées par contrôle du catalogue d'audit.
  const remarks = new Map<string, string[]>();
  for (const r of results) {
    for (const w of r.warnings) {
      const code = /^\[([a-z]\d)\]/.exec(w)?.[1];
      if (!code) continue;
      remarks.set(code, [...(remarks.get(code) ?? []), `${r.viewport} · ${r.url} : ${w.slice(5)}`]);
    }
  }

  return (
    <AdminShell
      title="Recette"
      intro="Avant chaque mise en ligne : le robot ouvre toutes les pages (visiteur, membre, admin, ordinateur et mobile), puis vous déroulez les contrôles que seul un humain peut juger."
    >
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">1. Recette automatisée</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Le robot vérifie {QA_PAGES.length} pages : pas de page blanche, pas d'erreur console, pas
          de débordement sur mobile, un titre par page, modules éteints invisibles, pages protégées
          fermées aux visiteurs. Il se lance depuis le poste du studio (commande dans{" "}
          <code className="rounded bg-muted px-1">tests/e2e/recette.ts</code>) et produit un fichier{" "}
          <code className="rounded bg-muted px-1">recette.json</code> à importer ici.
        </p>
        <label className="mt-4 inline-flex min-h-11 cursor-pointer items-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent">
          Importer un rapport (recette.json)
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={importReport}
          />
        </label>

        {report ? (
          <div className="mt-5">
            <p className="text-sm text-foreground">
              Rapport du {new Date(report.startedAt).toLocaleString("fr-FR")} sur{" "}
              <span className="font-medium">{report.baseUrl}</span> — membre : {report.auth.membre},
              admin : {report.auth.admin}.
            </p>
            <p className="mt-2 flex flex-wrap gap-2 text-sm">
              <Badge>{oks.length} conformes</Badge>
              <Badge variant={fails.length ? "destructive" : "secondary"}>
                {fails.length} en échec
              </Badge>
              <Badge variant="outline">
                {results.length - oks.length - fails.length} ignorées (module éteint ou sans
                contenu)
              </Badge>
            </p>
            {fails.length ? (
              <ul className="mt-4 space-y-2">
                {fails.map((r) => (
                  <li
                    key={`${r.viewport}-${r.role}-${r.url}`}
                    className="rounded-md border border-destructive/40 p-3 text-sm"
                  >
                    <p className="font-medium text-foreground">
                      {r.label} — <code>{r.url}</code>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.viewport} · {r.role}
                    </p>
                    <ul className="mt-1 list-disc pl-5 text-xs text-destructive">
                      {r.problems.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-success-text">
                Aucune page en échec : zéro page blanche, zéro erreur console.
              </p>
            )}
            {remarks.size ? (
              <div className="mt-5">
                <h3 className="text-sm font-semibold text-foreground">
                  Remarques par contrôle d'audit (non bloquantes)
                </h3>
                <ul className="mt-2 space-y-2">
                  {[...remarks].map(([code, lines]) => (
                    <li key={code} className="rounded-md border border-border p-3 text-sm">
                      <details>
                        <summary className="cursor-pointer text-foreground">
                          <span className="font-medium">
                            {code} · {QA_AUDIT_CODES[code]?.label ?? code}
                          </span>{" "}
                          <span className="text-muted-foreground">
                            ({QA_AUDIT_CODES[code]?.agent ?? "—"}) — {lines.length}
                          </span>
                        </summary>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                          {lines.slice(0, 50).map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>
                      </details>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            Aucun rapport importé pour l'instant.
          </p>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">2. Contrôles manuels</h2>
            <p className="text-sm text-muted-foreground">
              {doneCount} / {QA_CHECKLIST_TOTAL} validés (mémorisé dans ce navigateur)
            </p>
          </div>
          <Button variant="outline" onClick={() => setDone({})} title="Décocher tous les contrôles">
            Nouvelle campagne
          </Button>
        </div>
        <Progress value={Math.round((doneCount / QA_CHECKLIST_TOTAL) * 100)} className="mt-3" />

        <div className="mt-6 space-y-6">
          {QA_CHECKLIST.map((section) => (
            <article key={section.id}>
              <h3 className="text-sm font-semibold text-foreground">
                {section.zone}{" "}
                <span className="font-normal text-muted-foreground">
                  ({section.items.filter((i) => done[i.id]).length}/{section.items.length})
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">{section.objectif}</p>
              <ul className="mt-2 space-y-2">
                {section.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start gap-3 rounded-md border border-border p-3"
                  >
                    <input
                      type="checkbox"
                      id={`qa-${item.id}`}
                      checked={Boolean(done[item.id])}
                      onChange={(e) =>
                        setDone((prev) => ({ ...prev, [item.id]: e.target.checked }))
                      }
                      className="mt-1 size-4 accent-primary"
                    />
                    <label htmlFor={`qa-${item.id}`} className="min-w-0 flex-1 text-sm">
                      <span
                        className={
                          done[item.id] ? "text-muted-foreground line-through" : "text-foreground"
                        }
                      >
                        {item.label}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant={SEVERITY[item.severity]}>{item.severity}</Badge>
                        <Badge variant="outline">{item.role}</Badge>
                        {item.path ? (
                          <a
                            href={item.path}
                            target="_blank"
                            rel="noreferrer"
                            title={`Ouvrir ${item.path} dans un nouvel onglet`}
                            className="text-xs font-medium text-primary-text hover:underline"
                          >
                            Ouvrir {item.path}
                          </a>
                        ) : null}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}
