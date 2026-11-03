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
  /** Calculés par editorial_etat(). */
  statut_lu: Statut;
  manques: string[];
  codes_manques: string[];
};

const COLONNES =
  "id, type, slug, titre, description, chapo, corps, sources, auteur_fonction, auteur_nom, etiquettes, image_url, image_alt, relu_le, publie_le, updated_at, date_prevue, public_vise, requete_visee";

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
