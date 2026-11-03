/**
 * Poste éditorial (socle 1.10.0) : lectures et écritures avec la session du compte. Les règles
 * d'accès de la base décident (rédacteur, admin) ; les passages de statut passent par
 * changer_statut_contenu, que la base contrôle.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  lireReglages,
  type ReglagesEditoriaux,
  type Statut,
  type TypeContenu,
} from "@/lib/editorial-regles";

export type ContenuEditorial = {
  id: string;
  type: TypeContenu;
  slug: string;
  titre: string;
  description: string;
  chapo: string;
  corps: string;
  sources: string;
  auteur_fonction: string;
  auteur_nom: string;
  etiquettes: string[];
  image_url: string | null;
  image_alt: string;
  relu_le: string | null;
  publie_le: string | null;
  updated_at: string;
  date_prevue: string | null;
  public_vise: string;
  requete_visee: string;
  rubrique_id: string | null;
  serie_id: string | null;
  serie_ordre: number | null;
  est_pilier: boolean;
  pilier_id: string | null;
  /** Calculés par editorial_etat(). */
  statut_lu: Statut;
  manques: string[];
  codes_manques: string[];
};

const COLONNES =
  "id, type, slug, titre, description, chapo, corps, sources, auteur_fonction, auteur_nom, etiquettes, image_url, image_alt, relu_le, publie_le, updated_at, date_prevue, public_vise, requete_visee, rubrique_id, serie_id, serie_ordre, est_pilier, pilier_id";

/** Message lisible d'une erreur de la base : les refus de la base sont déjà en français. */
export function messageErreur(error: { code?: string; message?: string } | null): string {
  if (!error) return "";
  if (error.code === "42501") return "Action réservée à un autre rôle.";
  if (error.code === "23505") return "Cette adresse (slug) est déjà prise.";
  if (error.code === "23514" || error.code === "P0001") return error.message ?? "Valeur refusée.";
  return "Réessayez dans un instant.";
}

/** Tous les contenus, avec leur statut lu et ce qui leur manque pour publier. */
export async function fetchEditorial(): Promise<ContenuEditorial[]> {
  const [contenus, etat] = await Promise.all([
    supabase.from("contenus_publics").select(COLONNES).order("updated_at", { ascending: false }),
    supabase.rpc("editorial_etat"),
  ]);
  if (contenus.error) throw new Error(messageErreur(contenus.error));
  if (etat.error) throw new Error(messageErreur(etat.error));
  const parId = new Map((etat.data ?? []).map((e) => [e.id, e]));
  return (contenus.data ?? []).map((c) => {
    const e = parId.get(c.id);
    return {
      ...c,
      type: c.type as TypeContenu,
      statut_lu: (e?.statut_lu ?? "redaction") as Statut,
      manques: e?.manques ?? [],
      codes_manques: e?.codes ?? [],
    };
  });
}

export async function fetchReglages(): Promise<ReglagesEditoriaux> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "editorial")
    .maybeSingle();
  if (error) throw new Error(messageErreur(error));
  return lireReglages(data?.value);
}

export async function enregistrerReglages(r: ReglagesEditoriaux): Promise<string> {
  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: "editorial", value: r }, { onConflict: "key" });
  return messageErreur(error);
}

export type Champs = Pick<
  ContenuEditorial,
  | "titre"
  | "slug"
  | "description"
  | "chapo"
  | "corps"
  | "sources"
  | "auteur_fonction"
  | "auteur_nom"
  | "etiquettes"
  | "image_url"
  | "image_alt"
  | "date_prevue"
  | "public_vise"
  | "requete_visee"
  | "rubrique_id"
  | "serie_id"
  | "serie_ordre"
  | "est_pilier"
  | "pilier_id"
>;

export async function creerArticle(titre: string, slug: string): Promise<string> {
  const { error } = await supabase
    .from("contenus_publics")
    .insert({ type: "article", titre, slug, statut: "redaction" });
  return messageErreur(error);
}

export async function enregistrerContenu(id: string, champs: Champs): Promise<string> {
  const { error } = await supabase.from("contenus_publics").update(champs).eq("id", id);
  return messageErreur(error);
}

export async function supprimerContenu(id: string): Promise<string> {
  const { error } = await supabase.from("contenus_publics").delete().eq("id", id);
  return messageErreur(error);
}

export async function changerStatut(
  id: string,
  vers: Statut,
  motif = "",
  publieLe: string | null = null,
): Promise<string> {
  const { error } = await supabase.rpc("changer_statut_contenu", {
    _id: id,
    _vers: vers,
    _motif: motif,
    ...(publieLe ? { _publie_le: publieLe } : {}),
  });
  return messageErreur(error);
}

export type LigneJournal = {
  id: string;
  de: string | null;
  vers: string;
  auto: boolean;
  motif: string;
  created_at: string;
};

export async function fetchJournal(id: string): Promise<LigneJournal[]> {
  const { data, error } = await supabase
    .from("contenus_publics_journal")
    .select("id, de, vers, auto, motif, created_at")
    .eq("contenu_id", id)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(messageErreur(error));
  return data ?? [];
}

export type TermeInterdit = { id: string; terme: string; categorie: string };

export const CATEGORIES_TERMES = [
  { value: "etablissement", label: "Établissement" },
  { value: "groupe", label: "Groupe ou réseau" },
  { value: "ville", label: "Ville" },
  { value: "marque", label: "Marque" },
  { value: "personne", label: "Personne" },
  { value: "autre", label: "Autre" },
] as const;

export async function fetchTermes(): Promise<TermeInterdit[]> {
  const { data, error } = await supabase
    .from("termes_interdits_publics")
    .select("id, terme, categorie")
    .order("categorie")
    .order("terme");
  if (error) throw new Error(messageErreur(error));
  return data ?? [];
}

export async function ajouterTerme(terme: string, categorie: string): Promise<string> {
  const { error } = await supabase
    .from("termes_interdits_publics")
    .insert({ terme: terme.trim(), categorie });
  if (error?.code === "23505") return "Ce terme est déjà dans la liste.";
  if (error?.code === "23514") return "Un terme compte de 3 à 120 caractères.";
  return messageErreur(error);
}

export async function supprimerTerme(id: string): Promise<string> {
  const { error } = await supabase.from("termes_interdits_publics").delete().eq("id", id);
  return messageErreur(error);
}

export type ContenuARevoir = {
  id: string;
  type: string;
  slug: string;
  titre: string;
  termes: string[];
};

export async function fetchARevoir(): Promise<ContenuARevoir[]> {
  const { data, error } = await supabase.rpc("contenus_publics_a_revoir");
  if (error) throw new Error(messageErreur(error));
  return data ?? [];
}

/** Droits du compte sur le poste éditorial : null tant que la base n'a pas répondu. */
export function useDroitsEditorial(): { ecrit: boolean; admin: boolean } | null {
  const { user } = useAuth();
  const [droits, setDroits] = useState<{ ecrit: boolean; admin: boolean } | null>(null);
  useEffect(() => {
    if (!user) return;
    let annule = false;
    void Promise.all([
      supabase.rpc("can_write_content", { _user_id: user.id }),
      supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }),
    ]).then(([ecrit, admin]) => {
      if (!annule) setDroits({ ecrit: Boolean(ecrit.data), admin: Boolean(admin.data) });
    });
    return () => {
      annule = true;
    };
  }, [user]);
  return droits;
}

/* --------------------------- Taxonomie (socle 1.11.0) --------------------------- */

export type Rubrique = {
  id: string;
  slug: string;
  libelle: string;
  intro: string;
  parent_id: string | null;
  ordre: number;
};
export type Etiquette = { id: string; slug: string; libelle: string; definition: string };
export type Serie = { id: string; slug: string; titre: string; description: string };
export type Taxonomie = { rubriques: Rubrique[]; etiquettes: Etiquette[]; series: Serie[] };

export async function fetchTaxonomie(): Promise<Taxonomie> {
  const [r, e, s] = await Promise.all([
    supabase
      .from("rubriques")
      .select("id, slug, libelle, intro, parent_id, ordre")
      .order("ordre")
      .order("libelle"),
    supabase.from("etiquettes").select("id, slug, libelle, definition").order("libelle"),
    supabase.from("series").select("id, slug, titre, description").order("titre"),
  ]);
  if (r.error || e.error || s.error) throw new Error(messageErreur(r.error ?? e.error ?? s.error));
  return { rubriques: r.data ?? [], etiquettes: e.data ?? [], series: s.data ?? [] };
}

export async function enregistrerRubrique(
  id: string | null,
  v: { libelle: string; slug: string; intro: string; parent_id: string | null; ordre: number },
): Promise<string> {
  const { error } = id
    ? await supabase.from("rubriques").update(v).eq("id", id)
    : await supabase.from("rubriques").insert(v);
  return messageErreur(error);
}

export async function supprimerRubrique(id: string): Promise<string> {
  const { error } = await supabase.from("rubriques").delete().eq("id", id);
  if (error?.code === "23503") return "Cette rubrique a des sous-rubriques : les déplacer d'abord.";
  return messageErreur(error);
}

export async function enregistrerEtiquette(
  id: string | null,
  v: { libelle: string; definition: string },
): Promise<string> {
  const { error } = id
    ? await supabase.from("etiquettes").update(v).eq("id", id)
    : await supabase.from("etiquettes").insert(v);
  if (error?.code === "23505") return "Cette étiquette existe déjà.";
  return messageErreur(error);
}

export async function supprimerEtiquette(id: string): Promise<string> {
  const { error } = await supabase.from("etiquettes").delete().eq("id", id);
  return messageErreur(error);
}

export async function enregistrerSerie(
  id: string | null,
  v: { titre: string; slug: string; description: string },
): Promise<string> {
  const { error } = id
    ? await supabase.from("series").update(v).eq("id", id)
    : await supabase.from("series").insert(v);
  return messageErreur(error);
}

export async function supprimerSerie(id: string): Promise<string> {
  const { error } = await supabase.from("series").delete().eq("id", id);
  return messageErreur(error);
}

export type EtatMaillage = {
  id: string;
  sortants: number;
  entrants: number;
  orphelin: boolean;
  liens_casses: string[];
  liens_rediriges: string[];
  ancres_pauvres: string[];
  satellites_absents: string[];
  requete_en_double: string[];
};

export async function fetchMaillage(): Promise<Map<string, EtatMaillage>> {
  const { data, error } = await supabase.rpc("maillage_etat");
  if (error) throw new Error(messageErreur(error));
  return new Map((data ?? []).map((e) => [e.id, e]));
}

/* ------------------------ Liens de sources (socle 1.12.0) ------------------------ */

export type EtatSource = {
  url: string;
  ok: boolean;
  code_http: number | null;
  erreur: string;
  verifie_le: string;
};

export async function fetchEtatSources(): Promise<Map<string, EtatSource>> {
  const { data, error } = await supabase
    .from("liens_sources_etat")
    .select("url, ok, code_http, erreur, verifie_le");
  if (error) throw new Error(messageErreur(error));
  return new Map((data ?? []).map((e) => [e.url, e]));
}
