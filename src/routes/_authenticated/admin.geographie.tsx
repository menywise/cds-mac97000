import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/cds/AdminShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { requireFeature } from "@/config/features";
import { downloadCsv } from "@/lib/csv";
import {
  computeGeoNeighbours,
  geoStatus,
  geoStudioPays,
  importGeoCommunes,
  importGeoSocle,
  importGeoStudio,
  type GeoStatus,
} from "@/lib/geo.functions";
import { GEO_NIVEAUX } from "@/lib/geo-import";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin/geographie")({
  beforeLoad: () => requireFeature("geo"),
  head: () =>
    seo({
      title: "Administration — Géographie",
      description:
        "Référentiel géographique (régions, départements, intercommunalités, communes) et fiches rattachées.",
      path: "/admin/geographie",
      noindex: true,
    }),
  component: AdminGeoPage,
});

type Row = {
  code: string;
  nom: string;
  region: string;
  slug: string;
  population: number;
  listings: number;
};

function AdminGeoPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    void (async () => {
      // Fiches publiées par département comptées par la base : les fiches ne sont pas chargées.
      const [deps, listings] = await Promise.all([
        supabase
          .from("geo_departements")
          .select("code, nom, region, slug, population")
          .order("code"),
        supabase.rpc("directory_departement_counts"),
      ]);
      if (deps.error || listings.error) {
        setFailed(true);
        return;
      }
      const counts = new Map<string, number>();
      for (const item of listings.data ?? []) counts.set(item.departement, Number(item.listings));
      setRows((deps.data ?? []).map((dep) => ({ ...dep, listings: counts.get(dep.code) ?? 0 })));
    })();
  }, []);

  return (
    <AdminShell
      title="Géographie"
      intro="Les pages départementales et communales se génèrent automatiquement à partir du référentiel géographique : rien à créer à la main."
    >
      <StudioPanel />
      <ReferentielPanel />
      {failed ? (
        <p
          role="alert"
          className="mt-8 rounded-lg border border-destructive p-4 text-sm text-foreground"
        >
          Les départements n'ont pas pu être chargés. Rechargez la page.
        </p>
      ) : rows === null ? (
        <p className="text-sm text-foreground">Chargement…</p>
      ) : (
        <>
          <h2 className="mt-10 text-lg font-semibold text-foreground">Départements</h2>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted-foreground">
              {rows.length} départements · {rows.reduce((sum, row) => sum + row.listings, 0)} fiches
              rattachées
            </p>
            <Button
              variant="outline"
              className="ml-auto"
              title="Télécharger la liste au format tableur"
              onClick={() => downloadCsv("departements.csv", rows)}
            >
              Export CSV
            </Button>
          </div>
          <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase text-foreground">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Département</th>
                  <th className="px-4 py-3">Région</th>
                  <th className="px-4 py-3">Fiches</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.code} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 text-muted-foreground">{row.code}</td>
                    <td className="px-4 py-2.5 text-foreground">{row.nom}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{row.region}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{row.listings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AdminShell>
  );
}

const KINDS: Array<{ key: keyof GeoStatus["lieux"]; label: string }> = [
  { key: "region", label: "Régions" },
  { key: "departement", label: "Départements" },
  { key: "epci", label: "Intercommunalités" },
  { key: "commune", label: "Communes" },
];

/** Import du référentiel en trois étapes, chacune rejouable et reprise où elle s'était arrêtée. */
function ReferentielPanel() {
  const [status, setStatus] = useState<GeoStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const stop = useRef(false);

  const refresh = useCallback(async () => {
    try {
      setStatus(await geoStatus());
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function run(step: string, action: () => Promise<boolean>) {
    setBusy(step);
    stop.current = false;
    try {
      // Une étape « jusqu'au bout » s'arrête quand il ne reste rien, ou sur demande.
      while (!stop.current && (await action())) await refresh();
      await refresh();
    } catch (error) {
      toast.error("Import interrompu.", {
        description: error instanceof Error ? error.message : "Réessayez dans un instant.",
      });
    } finally {
      setBusy(null);
    }
  }

  const socle = () =>
    run("socle", async () => {
      const r = await importGeoSocle();
      toast.success(
        `${r.regions} régions, ${r.departements} départements, ${r.epcis} intercommunalités.`,
      );
      return false;
    });
  const communes = () =>
    run("communes", async () => {
      const r = await importGeoCommunes({ data: { lots: 3 } });
      if (r.departements.length)
        toast.success(`${r.communes} communes (${r.departements.join(", ")}).`);
      return r.departements.length > 0;
    });
  const voisins = () =>
    run("voisins", async () => {
      const r = await computeGeoNeighbours({ data: { limit: 300 } });
      return r.communes > 0;
    });

  const pending = status?.departements_sans_communes.length ?? 0;
  const noDeps = !status?.lieux.departement;

  return (
    <section aria-labelledby="referentiel" className="rounded-xl border border-border bg-card p-5">
      <h2 id="referentiel" className="text-lg font-semibold text-foreground">
        Référentiel géographique
      </h2>
      {failed ? (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-destructive p-4 text-sm text-foreground"
        >
          L'état du référentiel n'a pas pu être lu. Vérifiez que le SQL du lot 11 est exécuté.
        </p>
      ) : !status ? (
        <p className="mt-3 text-sm text-foreground">Chargement…</p>
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {KINDS.map((k) => (
              <div key={k.key} className="rounded-lg border border-border p-3">
                <dt className="text-xs">{k.label}</dt>
                <dd className="text-xl font-semibold text-foreground">
                  {new Intl.NumberFormat("fr-FR").format(status.lieux[k.key] ?? 0)}
                </dd>
              </div>
            ))}
            <div className="rounded-lg border border-border p-3">
              <dt className="text-xs">Voisinages</dt>
              <dd className="text-xl font-semibold text-foreground">
                {new Intl.NumberFormat("fr-FR").format(status.voisinages)}
              </dd>
            </div>
          </dl>
          <ol className="mt-5 space-y-3 text-sm">
            <li className="flex flex-wrap items-center gap-3">
              <span className="text-foreground">1. Régions, départements, intercommunalités</span>
              <Button
                size="sm"
                variant="outline"
                disabled={busy !== null}
                onClick={() => void socle()}
                title="Importer ou mettre à jour régions, départements et intercommunalités"
              >
                {busy === "socle" ? "Import…" : "Importer le socle"}
              </Button>
            </li>
            <li className="flex flex-wrap items-center gap-3">
              <span className="text-foreground">
                2. Communes : {pending} département{pending > 1 ? "s" : ""} à importer
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={busy !== null || noDeps || pending === 0}
                onClick={() => void communes()}
                title="Importer les communes, trois départements à la fois, jusqu'au dernier"
              >
                {busy === "communes" ? "Import…" : "Importer les communes"}
              </Button>
            </li>
            <li className="flex flex-wrap items-center gap-3">
              <span className="text-foreground">
                3. Voisinages : {new Intl.NumberFormat("fr-FR").format(status.voisins_a_calculer)}{" "}
                communes à calculer (25 km, 8 voisines au plus)
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={busy !== null || status.voisins_a_calculer === 0}
                onClick={() => void voisins()}
                title="Calculer les communes voisines, par paquets, jusqu'à la dernière"
              >
                {busy === "voisins" ? "Calcul…" : "Calculer les voisinages"}
              </Button>
            </li>
          </ol>
          {busy ? (
            <Button
              size="sm"
              variant="ghost"
              className="mt-3"
              onClick={() => (stop.current = true)}
              title="Arrêter après le paquet en cours (la reprise continue là où elle s'est arrêtée)"
            >
              Arrêter après ce paquet
            </Button>
          ) : null}
        </>
      )}
    </section>
  );
}

const NIVEAU_LIBELLE: Record<(typeof GEO_NIVEAUX)[number], string> = {
  pays: "pays",
  region: "régions",
  departement: "subdivisions",
  epci: "intercommunalités",
  commune: "communes",
};

/**
 * Socle 1.5.0 : import depuis le référentiel géographique du Studio (GeoAnnonces), par clé.
 * Un pays à la fois, niveau par niveau, par paquets de 1 000 ; rejouable, sans doublon.
 */
function StudioPanel() {
  const [pays, setPays] = useState<{ code: string; name: string }[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [choix, setChoix] = useState("FR");
  const [busy, setBusy] = useState<string | null>(null);
  const stop = useRef(false);

  useEffect(() => {
    void (async () => {
      try {
        setPays(await geoStudioPays());
      } catch (error) {
        setErreur(error instanceof Error ? error.message : "Référentiel du Studio injoignable.");
      }
    })();
  }, []);

  async function importer() {
    stop.current = false;
    let total = 0;
    try {
      for (const niveau of GEO_NIVEAUX) {
        let apres: string | null = null;
        do {
          if (stop.current) return;
          setBusy(
            `${NIVEAU_LIBELLE[niveau]}… (${new Intl.NumberFormat("fr-FR").format(total)} lieux)`,
          );
          const r: { lieux: number; suivant: string | null } = await importGeoStudio({
            data: { pays: choix, niveau, apres },
          });
          total += r.lieux;
          apres = r.suivant;
        } while (apres);
      }
      toast.success(
        `${new Intl.NumberFormat("fr-FR").format(total)} lieux importés ou mis à jour.`,
      );
    } catch (error) {
      toast.error("Import interrompu.", {
        description: error instanceof Error ? error.message : "Réessayez dans un instant.",
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-labelledby="studio" className="mb-6 rounded-xl border border-border bg-card p-5">
      <h2 id="studio" className="text-lg font-semibold text-foreground">
        Référentiel du Studio
      </h2>
      <p className="mt-1 text-sm text-foreground">
        Importer un pays depuis le référentiel géographique commun aux projets du Studio : pays,
        régions, subdivisions, intercommunalités et communes.
      </p>
      {erreur ? (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-destructive p-4 text-sm text-foreground"
        >
          {erreur}
        </p>
      ) : !pays ? (
        <p className="mt-3 text-sm text-foreground">Chargement…</p>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label htmlFor="studio-pays" className="text-sm text-foreground">
            Pays
          </label>
          <select
            id="studio-pays"
            value={choix}
            disabled={busy !== null}
            onChange={(event) => setChoix(event.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
          >
            {pays.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="outline"
            disabled={busy !== null}
            onClick={() => void importer()}
            title="Importer ou mettre à jour ce pays, niveau par niveau, jusqu'au dernier lieu"
          >
            {busy ? "Import…" : "Importer ce pays"}
          </Button>
          {busy ? (
            <>
              <span className="text-sm text-foreground">{busy}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => (stop.current = true)}
                title="Arrêter après le paquet en cours (relancer reprend sans doublon)"
              >
                Arrêter après ce paquet
              </Button>
            </>
          ) : null}
        </div>
      )}
    </section>
  );
}
