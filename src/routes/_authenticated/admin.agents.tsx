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
import { GREFFE } from "@/greffe";
import { supabase } from "@/integrations/supabase/client";
import {
  LIBELLES_NIVEAU,
  NIVEAUX_AGENT,
  NIVEAU_USAGE,
  cleUtilisable,
  estNiveauEchelle,
  genererCle,
  hacherCle,
  libelleCle,
  trierCles,
  usagesDeclares,
  type CleAgent,
  type NiveauCle,
} from "@/lib/agents";
import { seo } from "@/lib/seo";

/**
 * Admin → Co-intervenants IA (socle 1.17.0). Chaque clé d'IA avec sa fiche (usage, utilisateur,
 * dernier jour, niveau) et tout ce qu'elle a écrit (journal). La clé en clair n'apparaît qu'une
 * fois, à sa création ; la base garde son empreinte. Une clé se coupe, ne se supprime pas.
 */
export const Route = createFileRoute("/_authenticated/admin/agents")({
  beforeLoad: () => requireFeature("studio"),
  head: () =>
    seo({
      title: "Co-intervenants IA",
      description:
        "Les clés des IA qui écrivent dans le site, leur fiche et tout ce qu'elles ont écrit.",
      path: "/admin/agents",
      noindex: true,
    }),
  component: AdminAgentsPage,
});

type Cle = CleAgent & { id: string };
type Brouillon = {
  id: string | null;
  nom: string;
  niveau: NiveauCle;
  /** Nom de l'usage d'une clé d'usage (socle 1.21.0), choisi parmi ceux que l'installation déclare. */
  usage_code: string;
  usage: string;
  utilisateur: string;
  expire_le: string;
};
type Ecriture = {
  id: string;
  cle_id: string | null;
  agent: string;
  action: string;
  table_cible: string;
  ligne_id: string | null;
  champ: string | null;
  avant: string | null;
  apres: string | null;
  created_at: string;
};

const CHAMP_CHOIX =
  "mt-1 h-11 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground";

const dansUnMois = () => {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toLocaleDateString("sv-SE");
};
const vide = (): Brouillon => ({
  id: null,
  nom: "",
  niveau: "completer",
  usage_code: "",
  usage: "",
  utilisateur: "",
  expire_le: dansUnMois(),
});
/** Usages que l'installation déclare dans sa prise de greffe : seuls choix d'une clé d'usage. */
const USAGES = usagesDeclares(GREFFE.actionsAgent ?? {});
const estNiveau = (v: string): v is NiveauCle => estNiveauEchelle(v) || v === NIVEAU_USAGE;
const dateFr = (iso: string | null) =>
  iso ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("fr-FR") : "—";
const heureFr = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });

function AdminAgentsPage() {
  const [cles, setCles] = useState<Cle[] | null>(null);
  const [brouillon, setBrouillon] = useState<Brouillon | null>(null);
  const [cleEnClair, setCleEnClair] = useState<{ nom: string; cle: string } | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [choisie, setChoisie] = useState<string | "toutes">("toutes");
  const [journal, setJournal] = useState<Ecriture[] | null>(null);

  const charger = useCallback(async () => {
    const { data, error } = await supabase.from("agent_cles").select("*");
    if (error) {
      toast.error("Clés illisibles. La base est-elle à jour du socle 1.17.0 ?");
      setCles([]);
      return;
    }
    setCles(data as Cle[]);
  }, []);

  const chargerJournal = useCallback(async (cleId: string | "toutes") => {
    setJournal(null);
    let requete = supabase
      .from("agent_journal")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (cleId !== "toutes") requete = requete.eq("cle_id", cleId);
    const { data, error } = await requete;
    if (error) {
      toast.error("Journal illisible.");
      setJournal([]);
      return;
    }
    setJournal(data as Ecriture[]);
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);
  useEffect(() => {
    void chargerJournal(choisie);
  }, [chargerJournal, choisie]);

  const [maintenant] = useState(() => new Date());
  const visibles = useMemo(() => trierCles(cles ?? [], maintenant), [cles, maintenant]);

  async function enregistrer() {
    if (!brouillon) return;
    setEnCours(true);
    const fiche = {
      nom: brouillon.nom.trim(),
      niveau: brouillon.niveau,
      usage_code: brouillon.niveau === NIVEAU_USAGE ? brouillon.usage_code || null : null,
      usage: brouillon.usage.trim(),
      utilisateur: brouillon.utilisateur.trim(),
      expire_le: brouillon.expire_le || null,
    };
    let erreur: { code?: string; message: string } | null = null;
    let cle: string | null = null;
    if (brouillon.id) {
      const { error } = await supabase.from("agent_cles").update(fiche).eq("id", brouillon.id);
      erreur = error;
    } else {
      cle = genererCle();
      const { error } = await supabase
        .from("agent_cles")
        .insert({ ...fiche, cle_hash: await hacherCle(cle), actif: true });
      erreur = error;
    }
    setEnCours(false);
    if (erreur) {
      toast.error(
        erreur.code === "23505"
          ? "Une clé porte déjà ce nom."
          : "Fiche refusée : nom, usage, utilisateur et dernier jour sont obligatoires ; une clé d'usage a son usage.",
      );
      return;
    }
    toast.success(brouillon.id ? "Fiche enregistrée." : "Clé créée.");
    if (cle) setCleEnClair({ nom: fiche.nom, cle });
    setBrouillon(null);
    await charger();
  }

  async function basculer(c: Cle) {
    const { error } = await supabase.from("agent_cles").update({ actif: !c.actif }).eq("id", c.id);
    if (error) {
      toast.error(
        c.actif
          ? "Impossible de couper la clé."
          : "Réactivation refusée : complète d'abord sa fiche (usage, utilisateur, dernier jour).",
      );
      return;
    }
    toast.success(c.actif ? "Clé coupée." : "Clé réactivée.");
    await charger();
  }

  return (
    <AdminShell
      title="Co-intervenants IA"
      intro="Chaque IA qui écrit dans le site a une clé, une fiche (à quoi elle sert, qui s'en sert, jusqu'à quand) et laisse une trace de tout ce qu'elle écrit. Une clé se coupe, elle ne se supprime pas."
    >
      {cleEnClair ? (
        <section className="mb-6 rounded-xl border border-warning-border bg-warning-soft p-5">
          <h2 className="text-lg font-semibold text-warning-text">
            Clé « {cleEnClair.nom} » : à copier maintenant
          </h2>
          <p className="mt-1 text-sm text-foreground">
            Elle ne sera plus jamais affichée. La base ne garde que son empreinte.
          </p>
          <code className="mt-3 block break-all rounded-md border border-border bg-card p-3 font-mono text-sm text-foreground">
            {cleEnClair.cle}
          </code>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => {
                void navigator.clipboard.writeText(cleEnClair.cle);
                toast.success("Clé copiée.");
              }}
            >
              Copier
            </Button>
            <Button size="sm" variant="outline" onClick={() => setCleEnClair(null)}>
              J'ai copié la clé
            </Button>
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-lg font-semibold text-foreground">
            {cles ? `${cles.length} clés` : "Clés"}
          </h2>
          <Button onClick={() => setBrouillon(vide())}>Nouvelle clé</Button>
        </div>
        {cles === null ? (
          <div className="mt-4 space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : visibles.length === 0 ? (
          <p className="mt-4 text-sm text-foreground">
            Aucune clé. Une IA qui doit écrire dans le site en reçoit une ici, avec sa fiche.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {visibles.map((c) => {
              const utilisable = cleUtilisable(c, maintenant);
              return (
                <li key={c.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      {c.nom}
                      <Badge className="ml-2 border-border bg-card text-foreground">
                        {libelleCle(c)}
                      </Badge>
                      <Badge
                        className={
                          utilisable
                            ? "ml-2 border-success-border bg-success-soft text-success-text"
                            : "ml-2 border-neutral-border bg-neutral-soft text-neutral-text"
                        }
                      >
                        {!c.actif ? "Coupée" : utilisable ? "En service" : "Expirée"}
                      </Badge>
                    </p>
                    <p className="text-sm text-foreground">{c.usage ?? "Fiche à compléter."}</p>
                    <p className="text-sm text-foreground">
                      <span className="font-medium">Qui s'en sert :</span> {c.utilisateur ?? "—"} ·{" "}
                      <span className="font-medium">Dernier jour :</span> {dateFr(c.expire_le)} ·{" "}
                      <span className="font-medium">Dernier usage :</span>{" "}
                      {c.last_used_at ? heureFr(c.last_used_at) : "jamais"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setChoisie(c.id)}>
                      Ce qu'elle a écrit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setBrouillon({
                          id: c.id,
                          nom: c.nom,
                          niveau: c.niveau,
                          usage_code: c.usage_code ?? "",
                          usage: c.usage ?? "",
                          utilisateur: c.utilisateur ?? "",
                          expire_le: c.expire_le ?? "",
                        })
                      }
                    >
                      Fiche
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void basculer(c)}>
                      {c.actif ? "Couper" : "Réactiver"}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-lg font-semibold text-foreground">
            Journal{journal ? ` : ${journal.length} écritures` : ""}
          </h2>
          <div>
            <Label htmlFor="agents-cle">Clé</Label>
            <select
              id="agents-cle"
              value={choisie}
              onChange={(e) => setChoisie(e.target.value)}
              className={CHAMP_CHOIX}
            >
              <option value="toutes">Toutes les clés</option>
              {(cles ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </select>
          </div>
        </div>
        {journal === null ? (
          <Skeleton className="mt-4 h-24 w-full" />
        ) : journal.length === 0 ? (
          <p className="mt-4 text-sm text-foreground">Rien d'écrit par cette clé.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {journal.map((e) => (
              <li key={e.id} className="py-3 text-sm text-foreground">
                <p className="font-semibold">
                  {heureFr(e.created_at)} · {e.agent} · {e.action} ·{" "}
                  <code className="font-mono font-normal">{e.table_cible}</code>
                  {e.ligne_id ? (
                    <code className="ml-1 font-mono font-normal">{e.ligne_id.slice(0, 8)}</code>
                  ) : null}
                </p>
                {e.champ || e.avant || e.apres ? (
                  <p>
                    {e.champ ? <span className="font-medium">{e.champ} : </span> : null}
                    {e.avant ?? "—"} → {e.apres ?? "—"}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={brouillon !== null} onOpenChange={(o) => (o ? null : setBrouillon(null))}>
        <DialogContent className="max-w-[640px]">
          <DialogHeader>
            <DialogTitle>{brouillon?.id ? "Fiche de la clé" : "Nouvelle clé"}</DialogTitle>
            <DialogDescription>
              À quoi elle sert, qui s'en sert, jusqu'à quand. Une clé pour une session ponctuelle
              expire le jour où le travail finit.
            </DialogDescription>
          </DialogHeader>
          {brouillon ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="agent-nom">Nom</Label>
                  <Input
                    id="agent-nom"
                    value={brouillon.nom}
                    onChange={(e) => setBrouillon({ ...brouillon, nom: e.target.value })}
                    placeholder="Session Claude du 21/11"
                  />
                </div>
                <div>
                  <Label htmlFor="agent-niveau">Niveau</Label>
                  <select
                    id="agent-niveau"
                    value={brouillon.niveau}
                    onChange={(e) =>
                      setBrouillon({
                        ...brouillon,
                        niveau: estNiveau(e.target.value) ? e.target.value : "completer",
                      })
                    }
                    className={CHAMP_CHOIX}
                  >
                    {NIVEAUX_AGENT.map((n) => (
                      <option key={n} value={n}>
                        {LIBELLES_NIVEAU[n]}
                      </option>
                    ))}
                    {USAGES.length > 0 || brouillon.niveau === NIVEAU_USAGE ? (
                      <option value={NIVEAU_USAGE}>{LIBELLES_NIVEAU.usage}</option>
                    ) : null}
                  </select>
                </div>
                {brouillon.niveau === NIVEAU_USAGE ? (
                  <div>
                    <Label htmlFor="agent-usage-code">Usage servi</Label>
                    <select
                      id="agent-usage-code"
                      value={brouillon.usage_code}
                      onChange={(e) => setBrouillon({ ...brouillon, usage_code: e.target.value })}
                      className={CHAMP_CHOIX}
                    >
                      <option value="">Choisir un usage</option>
                      {[...new Set([...USAGES, brouillon.usage_code].filter(Boolean))].map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>
              <div>
                <Label htmlFor="agent-usage">À quoi elle sert</Label>
                <Textarea
                  id="agent-usage"
                  value={brouillon.usage}
                  onChange={(e) => setBrouillon({ ...brouillon, usage: e.target.value })}
                  placeholder="Remplit les définitions vides du glossaire, module par module."
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="agent-utilisateur">Qui s'en sert</Label>
                  <Input
                    id="agent-utilisateur"
                    value={brouillon.utilisateur}
                    onChange={(e) => setBrouillon({ ...brouillon, utilisateur: e.target.value })}
                    placeholder="Script, session, outil"
                  />
                </div>
                <div>
                  <Label htmlFor="agent-expire">Dernier jour</Label>
                  <Input
                    id="agent-expire"
                    type="date"
                    value={brouillon.expire_le}
                    onChange={(e) => setBrouillon({ ...brouillon, expire_le: e.target.value })}
                  />
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBrouillon(null)}>
              Annuler
            </Button>
            <Button onClick={() => void enregistrer()} disabled={enCours}>
              {brouillon?.id ? "Enregistrer" : "Créer la clé"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
