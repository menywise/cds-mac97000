import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/cds/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { requireFeature } from "@/config/features";
import { supabase } from "@/integrations/supabase/client";
import {
  ETATS_REGISTRE,
  LIBELLES_ETAT,
  LIBELLES_TYPE,
  TYPES_REGISTRE,
  estARevoir,
  trierRegistre,
  type ElementAttendu,
  type EtatRegistre,
  type LigneRegistre,
  type TypeRegistre,
} from "@/lib/registre";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin/registre")({
  beforeLoad: () => requireFeature("studio"),
  head: () =>
    seo({
      title: "Registre",
      description: "Chaque élément construit : à quoi il sert, qui s'en sert, jusqu'à quand.",
      path: "/admin/registre",
      noindex: true,
    }),
  component: AdminRegistrePage,
});

type Ligne = LigneRegistre & { id: string };
type Brouillon = Omit<Ligne, "id"> & { id: string | null };

const CHAMP_CHOIX =
  "mt-1 h-11 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground";

const aujourdhui = () => new Date().toLocaleDateString("sv-SE");

const vide = (type: TypeRegistre = "module", identifiant = ""): Brouillon => ({
  id: null,
  type,
  identifiant,
  usage: "",
  utilisateur: "",
  etat: "a_confirmer",
  a_revoir_le: aujourdhui(),
  decision: null,
});

const estType = (v: string): v is TypeRegistre => (TYPES_REGISTRE as readonly string[]).includes(v);

function dateFr(iso: string | null) {
  return iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR") : "—";
}

function AdminRegistrePage() {
  const [lignes, setLignes] = useState<Ligne[] | null>(null);
  const [manquants, setManquants] = useState<ElementAttendu[]>([]);
  const [filtre, setFiltre] = useState<TypeRegistre | "tous">("tous");
  const [brouillon, setBrouillon] = useState<Brouillon | null>(null);
  const [enCours, setEnCours] = useState(false);

  const charger = useCallback(async () => {
    const [registre, hors] = await Promise.all([
      supabase.from("registre").select("*"),
      supabase.rpc("registre_manquants"),
    ]);
    if (registre.error) {
      toast.error("Registre illisible. La base est-elle à jour du socle 1.16.0 ?");
      setLignes([]);
      return;
    }
    setLignes(registre.data as Ligne[]);
    setManquants(hors.error ? [] : (hors.data ?? []));
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  const jour = aujourdhui();
  const visibles = useMemo(
    () =>
      trierRegistre(
        (lignes ?? []).filter((l) => filtre === "tous" || l.type === filtre),
        jour,
      ),
    [lignes, filtre, jour],
  );
  const aRevoir = (lignes ?? []).filter((l) => estARevoir(l, jour)).length;

  async function enregistrer() {
    if (!brouillon) return;
    setEnCours(true);
    const { id, ...champs } = brouillon;
    const valeurs = {
      ...champs,
      identifiant: champs.identifiant.trim(),
      usage: champs.usage.trim(),
      utilisateur: champs.utilisateur.trim(),
      a_revoir_le: champs.etat === "abandonne" ? champs.a_revoir_le || null : champs.a_revoir_le,
      decision: champs.decision?.trim() || null,
    };
    const { error } = id
      ? await supabase.from("registre").update(valeurs).eq("id", id)
      : await supabase.from("registre").insert(valeurs);
    setEnCours(false);
    if (error) {
      toast.error(
        error.code === "23505"
          ? "Cet élément est déjà au registre."
          : "Fiche refusée : usage, utilisateur et date à revoir sont obligatoires (sauf abandonné).",
      );
      return;
    }
    toast.success("Registre enregistré.");
    setBrouillon(null);
    await charger();
  }

  return (
    <AdminShell
      title="Registre"
      intro="Chaque élément construit dans le site : à quoi il sert, qui s'en sert, jusqu'à quand. Les éléments à revoir sont en tête."
    >
      {manquants.length > 0 ? (
        <section className="mb-6 rounded-xl border border-danger-border bg-danger-soft p-5">
          <h2 className="text-lg font-semibold text-danger-text">
            Hors registre : {manquants.length}
          </h2>
          <p className="mt-1 text-sm text-foreground">
            Ces éléments existent dans la base sans fiche. Inscrivez-les, ou retirez-les s'ils ne
            servent plus.
          </p>
          <ul className="mt-3 space-y-2 rounded-md border border-danger-border bg-card p-3">
            {manquants.map((m) => (
              <li key={`${m.type}-${m.identifiant}`} className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-foreground">
                  {estType(m.type) ? LIBELLES_TYPE[m.type] : m.type} :{" "}
                  <code className="font-mono">{m.identifiant}</code>
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setBrouillon(vide(estType(m.type) ? m.type : "autre", m.identifiant))
                  }
                >
                  Inscrire
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {lignes ? `${lignes.length} éléments` : "Éléments"}
              {aRevoir > 0 ? (
                <Badge className="ml-3 border-warning-border bg-warning-soft text-warning-text">
                  {aRevoir} à revoir
                </Badge>
              ) : null}
            </h2>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="registre-filtre">Type</Label>
              <select
                id="registre-filtre"
                value={filtre}
                onChange={(e) => setFiltre(estType(e.target.value) ? e.target.value : "tous")}
                className={CHAMP_CHOIX}
              >
                <option value="tous">Tous les types</option>
                {TYPES_REGISTRE.map((t) => (
                  <option key={t} value={t}>
                    {LIBELLES_TYPE[t]}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={() => setBrouillon(vide())}>Ajouter un élément</Button>
          </div>
        </div>

        {lignes === null ? (
          <Skeleton className="mt-4 h-40 w-full" />
        ) : (
          <ul className="mt-4 divide-y divide-border rounded-md border border-border">
            {visibles.map((l) => {
              const echu = estARevoir(l, jour);
              return (
                <li key={l.id} className={echu ? "bg-warning-soft p-4" : "p-4"}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">
                        {LIBELLES_TYPE[l.type]} : <code className="font-mono">{l.identifiant}</code>
                      </p>
                      <p className="mt-1 text-sm text-foreground">{l.usage}</p>
                      <p className="mt-1 text-sm text-foreground">
                        <span className="font-medium">Qui s'en sert :</span> {l.utilisateur}
                      </p>
                      {l.decision ? (
                        <p className="mt-1 text-sm text-foreground">
                          <span className="font-medium">Décision :</span> {l.decision}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="outline">{LIBELLES_ETAT[l.etat]}</Badge>
                      <span
                        className={
                          echu
                            ? "text-sm font-semibold text-warning-text"
                            : "text-sm text-foreground"
                        }
                      >
                        À revoir le {dateFr(l.a_revoir_le)}
                      </span>
                      <Button size="sm" variant="outline" onClick={() => setBrouillon({ ...l })}>
                        Modifier
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Dialog open={brouillon !== null} onOpenChange={(o) => (o ? null : setBrouillon(null))}>
        <DialogContent className="max-w-[640px]">
          <DialogHeader>
            <DialogTitle>{brouillon?.id ? "Modifier la fiche" : "Inscrire un élément"}</DialogTitle>
            <DialogDescription>
              Ce qu'il fait, qui s'en sert, quand le revoir. Usage inconnu : état « À confirmer ».
            </DialogDescription>
          </DialogHeader>
          {brouillon ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="registre-type">Type</Label>
                  <select
                    id="registre-type"
                    value={brouillon.type}
                    onChange={(e) =>
                      estType(e.target.value) &&
                      setBrouillon({ ...brouillon, type: e.target.value })
                    }
                    className={CHAMP_CHOIX}
                  >
                    {TYPES_REGISTRE.map((t) => (
                      <option key={t} value={t}>
                        {LIBELLES_TYPE[t]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="registre-identifiant">Identifiant</Label>
                  <Input
                    id="registre-identifiant"
                    value={brouillon.identifiant}
                    onChange={(e) => setBrouillon({ ...brouillon, identifiant: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="registre-usage">À quoi il sert</Label>
                <Textarea
                  id="registre-usage"
                  value={brouillon.usage}
                  onChange={(e) => setBrouillon({ ...brouillon, usage: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="registre-utilisateur">Qui s'en sert</Label>
                <Input
                  id="registre-utilisateur"
                  value={brouillon.utilisateur}
                  onChange={(e) => setBrouillon({ ...brouillon, utilisateur: e.target.value })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="registre-etat">État</Label>
                  <select
                    id="registre-etat"
                    value={brouillon.etat}
                    onChange={(e) =>
                      setBrouillon({ ...brouillon, etat: e.target.value as EtatRegistre })
                    }
                    className={CHAMP_CHOIX}
                  >
                    {ETATS_REGISTRE.map((e) => (
                      <option key={e} value={e}>
                        {LIBELLES_ETAT[e]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="registre-date">À revoir le</Label>
                  <Input
                    id="registre-date"
                    type="date"
                    value={brouillon.a_revoir_le ?? ""}
                    onChange={(e) =>
                      setBrouillon({ ...brouillon, a_revoir_le: e.target.value || null })
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="registre-decision">Décision qui le justifie</Label>
                <Input
                  id="registre-decision"
                  value={brouillon.decision ?? ""}
                  onChange={(e) => setBrouillon({ ...brouillon, decision: e.target.value })}
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBrouillon(null)}>
              Annuler
            </Button>
            <Button onClick={() => void enregistrer()} disabled={enCours}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
