/**
 * Tables (socle 1.18.0) : faire vivre la base sans écrire de code. Règles pures de l'écran
 * Admin → Tables : lecture du catalogue, conversion entre le texte d'un champ ou d'un CSV et la
 * valeur attendue par la colonne, lecture d'un CSV, préparation d'un import ligne par ligne.
 * L'écriture elle-même passe par l'interface de données, sous les politiques de chaque table.
 *
 * Fichier sans alias « @/ » : lu aussi par Node (tests unitaires).
 */
export type ColonneCatalogue = {
  nom: string;
  type: string;
  nullable: boolean;
  defaut: string | null;
  cle_primaire: boolean;
  reference: string | null;
  enum: string[] | null;
  commentaire: string | null;
};

export type TableCatalogue = {
  nom: string;
  commentaire: string | null;
  lignes_environ: number;
  rls: boolean;
  colonnes: ColonneCatalogue[];
};

export type Ligne = Record<string, unknown>;

/** Colonnes gérées par la base, jamais saisies : clé avec valeur par défaut, dates de création et de mise à jour. */
export function colonneAutomatique(c: ColonneCatalogue): boolean {
  if (c.cle_primaire && c.defaut) return true;
  return ["created_at", "updated_at", "updated_by", "created_by"].includes(c.nom);
}

/** Colonnes qu'une fiche propose à la saisie. */
export function colonnesSaisies(table: TableCatalogue): ColonneCatalogue[] {
  return table.colonnes.filter((c) => !colonneAutomatique(c));
}

/** La clé primaire de la table, si elle tient sur une colonne. */
export function clePrimaire(table: TableCatalogue): string | null {
  const cles = table.colonnes.filter((c) => c.cle_primaire);
  return cles.length === 1 ? cles[0]!.nom : null;
}

/** Colonnes sur lesquelles une recherche par texte a un sens. */
export function colonnesTexte(table: TableCatalogue): string[] {
  return table.colonnes
    .filter(
      (c) => !c.type.endsWith("[]") && (/^(text|character varying|citext)/.test(c.type) || c.enum),
    )
    .map((c) => c.nom);
}

/** Famille d'une colonne, pour la saisie et la conversion. */
export type Famille =
  "booleen" | "entier" | "nombre" | "json" | "tableau" | "date" | "horodatage" | "uuid" | "texte";

export function familleDe(c: ColonneCatalogue): Famille {
  const t = c.type;
  if (t.endsWith("[]")) return "tableau";
  if (t === "boolean") return "booleen";
  if (/^(smallint|integer|bigint)$/.test(t)) return "entier";
  if (/^(numeric|real|double precision|money)/.test(t)) return "nombre";
  if (/^jsonb?$/.test(t)) return "json";
  if (t === "date") return "date";
  if (/^timestamp/.test(t)) return "horodatage";
  if (t === "uuid") return "uuid";
  return "texte";
}

/** Valeur de la base → texte d'un champ ou d'une cellule CSV. */
export function versTexte(valeur: unknown, c: ColonneCatalogue): string {
  if (valeur === null || valeur === undefined) return "";
  const f = familleDe(c);
  if (f === "json" || f === "tableau") return JSON.stringify(valeur);
  if (f === "booleen") return valeur ? "true" : "false";
  return String(valeur);
}

export type Conversion = { ok: true; valeur: unknown } | { ok: false; message: string };

/** Texte saisi ou lu dans un CSV → valeur pour la base, ou une erreur lisible. */
export function depuisTexte(texte: string, c: ColonneCatalogue): Conversion {
  const t = texte.trim();
  if (t === "") {
    if (c.nullable || c.defaut) return { ok: true, valeur: null };
    return { ok: false, message: `${c.nom} : valeur obligatoire` };
  }
  if (c.enum && !c.enum.includes(t))
    return { ok: false, message: `${c.nom} : « ${t} » n'est pas parmi ${c.enum.join(", ")}` };
  switch (familleDe(c)) {
    case "booleen": {
      if (/^(true|vrai|oui|1|x)$/i.test(t)) return { ok: true, valeur: true };
      if (/^(false|faux|non|0)$/i.test(t)) return { ok: true, valeur: false };
      return { ok: false, message: `${c.nom} : « ${t} » n'est ni vrai ni faux` };
    }
    case "entier": {
      if (!/^-?\d+$/.test(t))
        return { ok: false, message: `${c.nom} : « ${t} » n'est pas un entier` };
      return { ok: true, valeur: Number(t) };
    }
    case "nombre": {
      const n = Number(t.replace(",", "."));
      if (Number.isNaN(n)) return { ok: false, message: `${c.nom} : « ${t} » n'est pas un nombre` };
      return { ok: true, valeur: n };
    }
    case "json": {
      try {
        return { ok: true, valeur: JSON.parse(t) };
      } catch {
        return { ok: false, message: `${c.nom} : JSON illisible` };
      }
    }
    case "tableau": {
      if (t.startsWith("[")) {
        try {
          const v = JSON.parse(t);
          if (Array.isArray(v)) return { ok: true, valeur: v };
        } catch {
          /* lu ensuite comme une liste séparée par des virgules */
        }
      }
      const sans = t.replace(/^\{|\}$/g, "");
      return { ok: true, valeur: sans === "" ? [] : sans.split(",").map((x) => x.trim()) };
    }
    case "date": {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(t))
        return { ok: false, message: `${c.nom} : date attendue au format AAAA-MM-JJ` };
      return { ok: true, valeur: t };
    }
    case "uuid": {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t))
        return { ok: false, message: `${c.nom} : identifiant (uuid) attendu` };
      return { ok: true, valeur: t };
    }
    default:
      return { ok: true, valeur: t };
  }
}

/** Lit un CSV (séparateur « ; » ou « , » deviné sur la première ligne, guillemets, sauts de ligne entre guillemets). */
export function lireCsv(texte: string): { entetes: string[]; lignes: string[][] } {
  const source = texte.charCodeAt(0) === 0xfeff ? texte.slice(1) : texte;
  const premiere = source.split(/\r?\n/, 1)[0] ?? "";
  const separateur =
    (premiere.match(/;/g)?.length ?? 0) >= (premiere.match(/,/g)?.length ?? 0) ? ";" : ",";
  const lignes: string[][] = [];
  let ligne: string[] = [];
  let cellule = "";
  let entreGuillemets = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i]!;
    if (entreGuillemets) {
      if (c === '"') {
        if (source[i + 1] === '"') {
          cellule += '"';
          i++;
        } else entreGuillemets = false;
      } else cellule += c;
    } else if (c === '"') entreGuillemets = true;
    else if (c === separateur) {
      ligne.push(cellule);
      cellule = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && source[i + 1] === "\n") i++;
      ligne.push(cellule);
      lignes.push(ligne);
      ligne = [];
      cellule = "";
    } else cellule += c;
  }
  if (cellule !== "" || ligne.length > 0) {
    ligne.push(cellule);
    lignes.push(ligne);
  }
  const utiles = lignes.filter((l) => l.some((v) => v.trim() !== ""));
  const entetes = (utiles.shift() ?? []).map((e) => e.trim());
  return { entetes, lignes: utiles };
}

export type ImportPrepare = {
  lignes: Ligne[];
  erreurs: { ligne: number; message: string }[];
  colonnesInconnues: string[];
  colonnesLues: string[];
};

/** Prépare un import : chaque ligne du CSV devient une ligne pour la base, ou une erreur numérotée. */
export function preparerImport(
  csv: { entetes: string[]; lignes: string[][] },
  table: TableCatalogue,
): ImportPrepare {
  const parNom = new Map(table.colonnes.map((c) => [c.nom, c]));
  const colonnesInconnues = csv.entetes.filter((e) => e && !parNom.has(e));
  const colonnesLues = csv.entetes.filter((e) => parNom.has(e));
  const lignes: Ligne[] = [];
  const erreurs: { ligne: number; message: string }[] = [];
  csv.lignes.forEach((valeurs, i) => {
    const numero = i + 2;
    const ligne: Ligne = {};
    let bonne = true;
    csv.entetes.forEach((entete, j) => {
      const colonne = parNom.get(entete);
      if (!colonne) return;
      const conversion = depuisTexte(valeurs[j] ?? "", colonne);
      if (!conversion.ok) {
        erreurs.push({ ligne: numero, message: conversion.message });
        bonne = false;
        return;
      }
      if (conversion.valeur === null && colonneAutomatique(colonne)) return;
      ligne[entete] = conversion.valeur;
    });
    if (bonne) lignes.push(ligne);
  });
  return { lignes, erreurs, colonnesInconnues, colonnesLues };
}

/** Lignes de la base → lignes d'export, colonnes dans l'ordre du catalogue, valeurs en texte. */
export function lignesExport(lignes: Ligne[], table: TableCatalogue): Record<string, string>[] {
  return lignes.map((l) =>
    Object.fromEntries(table.colonnes.map((c) => [c.nom, versTexte(l[c.nom], c)])),
  );
}

/** Expression PostgREST « or » d'une recherche sur les colonnes de texte. */
export function filtreRecherche(table: TableCatalogue, mot: string): string | null {
  const m = mot
    .trim()
    .replace(/[%,()]/g, " ")
    .trim();
  const colonnes = colonnesTexte(table);
  if (!m || colonnes.length === 0) return null;
  return colonnes.map((c) => `${c}.ilike.*${m}*`).join(",");
}
