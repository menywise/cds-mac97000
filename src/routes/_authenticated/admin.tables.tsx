import { createFileRoute } from "@tanstack/react-router";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { requireFeature } from "@/config/features";
import { supabase } from "@/integrations/supabase/client";
import { downloadCsv } from "@/lib/csv";
import { seo } from "@/lib/seo";
import {
  clePrimaire,
  colonnesSaisies,
  depuisTexte,
  familleDe,
  filtreRecherche,
  lignesExport,
  lireCsv,
  preparerImport,
  versTexte,
  type ColonneCatalogue,
  type ImportPrepare,
  type Ligne,
  type TableCatalogue,
} from "@/lib/tables";

/**
 * Admin → Tables (socle 1.18.0) : faire vivre la base sans écrire de code. Chaque table du schéma
 * public en grille (tri, recherche, pages), fiche d'une ligne (ajout, modification, suppression),
 * export CSV, import CSV en masse. Tout passe par l'interface de données ordinaire, sous les
 * politiques de sécurité par ligne : ce qu'une politique refuse reste refusé, et l'écran le dit.
 */
export const Route = createFileRoute("/_authenticated/admin/tables")({
  beforeLoad: () => requireFeature("studio"),
  head: () =>
    seo({
      title: "Tables",
      description: "Chaque table de la base en grille : fiche, ajout, import et export CSV.",
      path: "/admin/tables",
      noindex: true,
    }),
  component: AdminTablesPage,
});

/** Accès à une table dont le nom n'est connu qu'à l'exécution : les types générés ne s'appliquent pas. */
const brut = supabase as unknown as SupabaseClient;
const PAGE = 50;
const EXPORT_MAX = 10000;
const LOT_IMPORT = 200;
const CHAMP_CHOIX =
  "mt-1 h-11 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground";

type Tri = { colonne: string; croissant: boolean };
type Fiche = { ligne: Ligne | null; valeurs: Record<string, string> };

const apercu = (v: unknown, c: ColonneCatalogue) => {
  const t = versTexte(v, c);
  return t.length > 60 ? `${t.slice(0, 57)}…` : t;
};

function AdminTablesPage() {
  const [catalogue, setCatalogue] = useState<TableCatalogue[] | null>(null);
  const [catalogueErreur, setCatalogueErreur] = useState<string | null>(null);
  const [recherche, setRecherche] = useState("");
  const [nomTable, setNomTable] = useState<string>("");
  const [lignes, setLignes] = useState<Ligne[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [tri, setTri] = useState<Tri | null>(null);
  const [mot, setMot] = useState("");
  const [erreurLecture, setErreurLecture] = useState<string | null>(null);
  const [fiche, setFiche] = useState<Fiche | null>(null);
  const [aSupprimer, setASupprimer] = useState<Ligne | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [importPrepare, setImportPrepare] = useState<ImportPrepare | null>(null);
  const [importMaj, setImportMaj] = useState(false);
  const fichier = useRef<HTMLInputElement>(null);

  const table = useMemo(
    () => catalogue?.find((t) => t.nom === nomTable) ?? null,
    [catalogue, nomTable],
  );
  const cle = table ? clePrimaire(table) : null;

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase.rpc("tables_catalogue");
      if (error) {
        setCatalogueErreur(
          error.message.includes("Réservé")
            ? "Réservé aux administrateurs."
            : "Catalogue illisible. La base est-elle à jour du socle 1.18.0 ?",
        );
        setCatalogue([]);
        return;
      }
      setCatalogue((data ?? []) as unknown as TableCatalogue[]);
    })();
  }, []);

  const charger = useCallback(async () => {
    if (!table) return;
    setLignes(null);
    setErreurLecture(null);
    let requete = brut.from(table.nom).select("*", { count: "exact" });
    const filtre = filtreRecherche(table, mot);
    if (filtre) requete = requete.or(filtre);
    const ordre = tri ?? { colonne: cle ?? table.colonnes[0]!.nom, croissant: true };
    requete = requete
      .order(ordre.colonne, { ascending: ordre.croissant })
      .range(page * PAGE, page * PAGE + PAGE - 1);
    const { data, error, count } = await requete;
    if (error) {
      setErreurLecture(error.message);
      setLignes([]);
      return;
    }
    setLignes((data ?? []) as Ligne[]);
    setTotal(count ?? 0);
  }, [table, mot, tri, page, cle]);

  useEffect(() => {
    void charger();
  }, [charger]);

  function choisirTable(nom: string) {
    setNomTable(nom);
    setPage(0);
    setTri(null);
    setMot("");
    setImportPrepare(null);
  }

  function ouvrirFiche(ligne: Ligne | null) {
    if (!table) return;
    const valeurs: Record<string, string> = {};
    for (const c of colonnesSaisies(table))
      valeurs[c.nom] = ligne ? versTexte(ligne[c.nom], c) : "";
    setFiche({ ligne, valeurs });
  }

  async function enregistrer() {
    if (!table || !fiche) return;
    const ligne: Ligne = {};
    for (const c of colonnesSaisies(table)) {
      const conversion = depuisTexte(fiche.valeurs[c.nom] ?? "", c);
      if (!conversion.ok) {
        toast.error(conversion.message);
        return;
      }
      ligne[c.nom] = conversion.valeur;
    }
    setEnCours(true);
    const { error } =
      fiche.ligne && cle
        ? await brut.from(table.nom).update(ligne).eq(cle, fiche.ligne[cle])
        : await brut.from(table.nom).insert(ligne);
    setEnCours(false);
    if (error) {
      toast.error(`Refusé par la base : ${error.message}`);
      return;
    }
    toast.success(fiche.ligne ? "Ligne enregistrée." : "Ligne ajoutée.");
    setFiche(null);
    await charger();
  }

  async function supprimer() {
    if (!table || !aSupprimer || !cle) return;
    setEnCours(true);
    const { error } = await brut.from(table.nom).delete().eq(cle, aSupprimer[cle]);
    setEnCours(false);
    if (error) {
      toast.error(`Refusé par la base : ${error.message}`);
      return;
    }
    toast.success("Ligne supprimée.");
    setASupprimer(null);
    await charger();
  }

  async function exporter() {
    if (!table) return;
    const tout: Ligne[] = [];
    for (let depart = 0; depart < EXPORT_MAX; depart += 1000) {
      let requete = brut.from(table.nom).select("*");
      const filtre = filtreRecherche(table, mot);
      if (filtre) requete = requete.or(filtre);
      const ordre = tri ?? { colonne: cle ?? table.colonnes[0]!.nom, croissant: true };
      const { data, error } = await requete
        .order(ordre.colonne, { ascending: ordre.croissant })
        .range(depart, depart + 999);
      if (error) {
        toast.error(`Export refusé : ${error.message}`);
        return;
      }
      tout.push(...((data ?? []) as Ligne[]));
      if ((data ?? []).length < 1000) break;
    }
    downloadCsv(`${table.nom}.csv`, lignesExport(tout, table));
    toast.success(`${tout.length} lignes exportées.`);
  }

  async function lireFichier(f: File | undefined) {
    if (!f || !table) return;
    const texte = await f.text();
    setImportPrepare(preparerImport(lireCsv(texte), table));
  }

  async function importer() {
    if (!table || !importPrepare) return;
    setEnCours(true);
    let faites = 0;
    for (let i = 0; i < importPrepare.lignes.length; i += LOT_IMPORT) {
      const lot = importPrepare.lignes.slice(i, i + LOT_IMPORT);
      const { error } =
        importMaj && cle
          ? await brut.from(table.nom).upsert(lot, { onConflict: cle })
          : await brut.from(table.nom).insert(lot);
      if (error) {
        setEnCours(false);
        toast.error(`Import arrêté après ${faites} lignes : ${error.message}`);
        await charger();
        return;
      }
      faites += lot.length;
    }
    setEnCours(false);
    toast.success(`${faites} lignes importées.`);
    setImportPrepare(null);
    if (fichier.current) fichier.current.value = "";
    await charger();
  }

  const tablesVisibles = (catalogue ?? []).filter((t) =>
    t.nom.includes(recherche.trim().toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <AdminShell
      title="Tables"
      intro="Chaque table de la base, en grille. Une ligne s'ouvre en fiche ; un CSV s'importe en masse. Ce qu'une politique de la table refuse reste refusé : l'écran le dit, il ne contourne rien."
    >
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-xl border border-border bg-card p-4">
          <Label htmlFor="tables-recherche">Table</Label>
          <Input
            id="tables-recherche"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Filtrer les tables"
          />
          {catalogue === null ? (
            <Skeleton className="mt-3 h-40 w-full" />
          ) : catalogueErreur ? (
            <p className="mt-3 text-sm text-danger-text">{catalogueErreur}</p>
          ) : (
            <ul className="mt-3 max-h-[70vh] space-y-1 overflow-y-auto">
              {tablesVisibles.map((t) => (
                <li key={t.nom}>
                  <button
                    type="button"
                    onClick={() => choisirTable(t.nom)}
                    className={`w-full rounded-md px-2 py-1.5 text-left text-sm ${
                      t.nom === nomTable
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted"
                    }`}
                    title={t.commentaire ?? undefined}
                  >
                    <span className="font-mono">{t.nom}</span>
                    <span className="ml-2 text-xs">{t.lignes_environ}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="min-w-0 space-y-4">
          {!table ? (
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm text-foreground">Choisis une table dans la liste.</p>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      <span className="font-mono">{table.nom}</span>
                      <Badge className="ml-3 border-border bg-card text-foreground">
                        {total} lignes
                      </Badge>
                      {!table.rls ? (
                        <Badge className="ml-2 border-warning-border bg-warning-soft text-warning-text">
                          sans sécurité par ligne
                        </Badge>
                      ) : null}
                    </h2>
                    {table.commentaire ? (
                      <p className="mt-1 text-sm text-foreground">{table.commentaire}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => ouvrirFiche(null)}>Ajouter une ligne</Button>
                    <Button variant="outline" onClick={() => void exporter()}>
                      Exporter en CSV
                    </Button>
                    <Button variant="outline" onClick={() => fichier.current?.click()}>
                      Importer un CSV
                    </Button>
                    <input
                      ref={fichier}
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      aria-label="Fichier CSV à importer"
                      onChange={(e) => void lireFichier(e.target.files?.[0])}
                    />
                  </div>
                </div>
                <div className="mt-4 max-w-md">
                  <Label htmlFor="tables-mot">Rechercher dans les colonnes de texte</Label>
                  <Input
                    id="tables-mot"
                    value={mot}
                    onChange={(e) => {
                      setMot(e.target.value);
                      setPage(0);
                    }}
                    placeholder="Un mot, une partie de nom…"
                  />
                </div>
              </div>

              {importPrepare ? (
                <div className="rounded-xl border border-info-border bg-info-soft p-5">
                  <h2 className="text-lg font-semibold text-info-text">
                    Import : {importPrepare.lignes.length} lignes prêtes
                    {importPrepare.erreurs.length
                      ? `, ${importPrepare.erreurs.length} en erreur`
                      : ""}
                  </h2>
                  <p className="mt-1 text-sm text-foreground">
                    Colonnes lues : {importPrepare.colonnesLues.join(", ") || "aucune"}.
                    {importPrepare.colonnesInconnues.length
                      ? ` Ignorées (inconnues de la table) : ${importPrepare.colonnesInconnues.join(", ")}.`
                      : ""}
                  </p>
                  {importPrepare.erreurs.length ? (
                    <ul className="mt-2 max-h-40 overflow-y-auto rounded-md border border-border bg-card p-3 text-sm text-foreground">
                      {importPrepare.erreurs.slice(0, 50).map((e, i) => (
                        <li key={i}>
                          Ligne {e.ligne} : {e.message}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={importMaj}
                        disabled={!cle}
                        onChange={(e) => setImportMaj(e.target.checked)}
                      />
                      Mettre à jour les lignes dont la clé existe déjà
                      {cle ? ` (${cle})` : " (pas de clé simple)"}
                    </label>
                    <Button
                      onClick={() => void importer()}
                      disabled={enCours || importPrepare.lignes.length === 0}
                    >
                      Importer les {importPrepare.lignes.length} lignes
                    </Button>
                    <Button variant="outline" onClick={() => setImportPrepare(null)}>
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="overflow-x-auto rounded-xl border border-border bg-card">
                {lignes === null ? (
                  <Skeleton className="m-4 h-40" />
                ) : erreurLecture ? (
                  <p className="p-5 text-sm text-danger-text">
                    Refusé par la base : {erreurLecture}
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {table.colonnes.map((c) => (
                          <TableHead key={c.nom}>
                            <button
                              type="button"
                              className="font-mono text-xs font-semibold text-foreground"
                              title={`${c.type}${c.nullable ? "" : ", obligatoire"}${c.reference ? `, → ${c.reference}` : ""}`}
                              onClick={() =>
                                setTri({
                                  colonne: c.nom,
                                  croissant: tri?.colonne === c.nom ? !tri.croissant : true,
                                })
                              }
                            >
                              {c.nom}
                              {tri?.colonne === c.nom ? (tri.croissant ? " ↑" : " ↓") : ""}
                            </button>
                          </TableHead>
                        ))}
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lignes.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={table.colonnes.length + 1}>
                            <span className="text-sm text-foreground">Aucune ligne.</span>
                          </TableCell>
                        </TableRow>
                      ) : (
                        lignes.map((l, i) => (
                          <TableRow key={cle ? String(l[cle]) : i}>
                            {table.colonnes.map((c) => (
                              <TableCell key={c.nom} className="max-w-[280px] truncate text-sm">
                                {apercu(l[c.nom], c)}
                              </TableCell>
                            ))}
                            <TableCell className="whitespace-nowrap">
                              <Button size="sm" variant="outline" onClick={() => ouvrirFiche(l)}>
                                Fiche
                              </Button>
                              {cle ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="ml-2"
                                  onClick={() => setASupprimer(l)}
                                >
                                  Supprimer
                                </Button>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm text-foreground">
                  Page {page + 1} sur {pages}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Précédente
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page + 1 >= pages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Suivante
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <Dialog open={fiche !== null} onOpenChange={(o) => (o ? null : setFiche(null))}>
        <DialogContent className="max-h-[90vh] max-w-[720px] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {fiche?.ligne ? "Modifier la ligne" : "Nouvelle ligne"}
              {table ? <span className="ml-2 font-mono text-base">{table.nom}</span> : null}
            </DialogTitle>
            <DialogDescription>
              Une case vide vaut « rien » quand la colonne le permet. Un JSON ou une liste s'écrit
              tel quel ; un booléen vaut vrai ou faux ; une date s'écrit AAAA-MM-JJ.
            </DialogDescription>
          </DialogHeader>
          {fiche && table ? (
            <div className="space-y-3">
              {colonnesSaisies(table).map((c) => {
                const famille = familleDe(c);
                const id = `champ-${c.nom}`;
                const etiquette = `${c.nom}${c.nullable || c.defaut ? "" : " *"}`;
                const titre = `${c.type}${c.reference ? ` → ${c.reference}` : ""}${c.commentaire ? ` — ${c.commentaire}` : ""}`;
                const poser = (v: string) =>
                  setFiche({ ...fiche, valeurs: { ...fiche.valeurs, [c.nom]: v } });
                return (
                  <div key={c.nom}>
                    <Label htmlFor={id} title={titre}>
                      {etiquette} <span className="font-mono text-xs">{c.type}</span>
                    </Label>
                    {c.enum ? (
                      <select
                        id={id}
                        value={fiche.valeurs[c.nom] ?? ""}
                        onChange={(e) => poser(e.target.value)}
                        className={CHAMP_CHOIX}
                      >
                        <option value="">—</option>
                        {c.enum.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    ) : famille === "booleen" ? (
                      <select
                        id={id}
                        value={fiche.valeurs[c.nom] ?? ""}
                        onChange={(e) => poser(e.target.value)}
                        className={CHAMP_CHOIX}
                      >
                        <option value="">—</option>
                        <option value="true">vrai</option>
                        <option value="false">faux</option>
                      </select>
                    ) : famille === "json" ||
                      famille === "tableau" ||
                      (fiche.valeurs[c.nom] ?? "").length > 80 ? (
                      <Textarea
                        id={id}
                        value={fiche.valeurs[c.nom] ?? ""}
                        onChange={(e) => poser(e.target.value)}
                        className="font-mono"
                      />
                    ) : (
                      <Input
                        id={id}
                        type={famille === "date" ? "date" : "text"}
                        value={fiche.valeurs[c.nom] ?? ""}
                        onChange={(e) => poser(e.target.value)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setFiche(null)}>
              Annuler
            </Button>
            <Button onClick={() => void enregistrer()} disabled={enCours}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={aSupprimer !== null} onOpenChange={(o) => (o ? null : setASupprimer(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer cette ligne</DialogTitle>
            <DialogDescription>
              La ligne part de la table {table?.nom}. Une table liée par clé étrangère peut refuser,
              ou suivre, selon ses règles.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setASupprimer(null)}>
              Annuler
            </Button>
            <Button onClick={() => void supprimer()} disabled={enCours}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
