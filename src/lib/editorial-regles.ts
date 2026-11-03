/**
 * Circuit de rédaction (socle 1.10.0) : règles lues par l'écran. Fichier sans dépendance (ni base,
 * ni écran) : destiné à être copié tel quel dans les installations (docs/SYNCHRO.md, copie exacte).
 * La base reste juge : elle impose les passages (garde_statut_contenus) et calcule les manques
 * (manques_contenu). Ces règles servent à proposer les bons boutons et à prévenir pendant la saisie.
 */

/** Statut lu : « programmé » et « à actualiser » sont calculés par la base. */
export type Statut =
  "idee" | "redaction" | "a_relire" | "pret" | "programme" | "publie" | "a_actualiser";

export type TypeContenu = "page" | "article";

export const STATUTS: { value: Statut; label: string; aide: string }[] = [
  { value: "idee", label: "Idée", aide: "Un sujet, pas encore de texte." },
  { value: "redaction", label: "En rédaction", aide: "Le texte s'écrit." },
  { value: "a_relire", label: "À relire", aide: "Le texte attend sa relecture." },
  { value: "pret", label: "Prêt", aide: "Relu, rien ne manque." },
  { value: "programme", label: "Programmé", aide: "En ligne à l'heure dite." },
  { value: "publie", label: "Publié", aide: "En ligne, relecture à jour." },
  { value: "a_actualiser", label: "À actualiser", aide: "En ligne, relecture due." },
];

export const statutInfo = (s: Statut) => STATUTS.find((x) => x.value === s) ?? STATUTS[0]!;

/** En ligne pour les visiteurs. */
export const enLigne = (s: Statut) => s === "publie" || s === "a_actualiser";

/** Réglages éditoriaux (site_settings, clé « editorial ») : mêmes valeurs par défaut que la base. */
export type ReglagesEditoriaux = {
  circuit: "complet" | "simple";
  delai_relecture_mois: number;
  exiger_sources: boolean;
  exiger_relecture: boolean;
  exiger_auteur: boolean;
  longueurs_seo: boolean;
  auteur_mode: "fonction" | "nomme";
  avertissement: string;
  /** Articles à partir desquels une page d'étiquette est indexée (socle 1.11.0). */
  seuil_etiquette: number;
  /** Type de page des articles dans les données structurées (socle 1.12.0). */
  type_page: "WebPage" | "MedicalWebPage";
};

export const REGLAGES_PAR_DEFAUT: ReglagesEditoriaux = {
  circuit: "complet",
  delai_relecture_mois: 12,
  exiger_sources: true,
  exiger_relecture: true,
  exiger_auteur: true,
  longueurs_seo: true,
  auteur_mode: "fonction",
  avertissement: "",
  seuil_etiquette: 3,
  type_page: "WebPage",
};

/** Réglages lus en base, complétés par les valeurs par défaut (valeur absente ou d'un autre type). */
export function lireReglages(valeur: unknown): ReglagesEditoriaux {
  const v = (valeur && typeof valeur === "object" ? valeur : {}) as Record<string, unknown>;
  const bool = (k: keyof ReglagesEditoriaux) =>
    typeof v[k] === "boolean" ? (v[k] as boolean) : (REGLAGES_PAR_DEFAUT[k] as boolean);
  const delai = Number(v["delai_relecture_mois"]);
  const seuil = Number(v["seuil_etiquette"]);
  return {
    circuit: v["circuit"] === "simple" ? "simple" : "complet",
    delai_relecture_mois:
      Number.isInteger(delai) && delai >= 1 && delai <= 60
        ? delai
        : REGLAGES_PAR_DEFAUT.delai_relecture_mois,
    exiger_sources: bool("exiger_sources"),
    exiger_relecture: bool("exiger_relecture"),
    exiger_auteur: bool("exiger_auteur"),
    longueurs_seo: bool("longueurs_seo"),
    auteur_mode: v["auteur_mode"] === "nomme" ? "nomme" : "fonction",
    avertissement: typeof v["avertissement"] === "string" ? v["avertissement"].slice(0, 400) : "",
    seuil_etiquette:
      Number.isInteger(seuil) && seuil >= 1 && seuil <= 50
        ? seuil
        : REGLAGES_PAR_DEFAUT.seuil_etiquette,
    type_page: v["type_page"] === "MedicalWebPage" ? "MedicalWebPage" : "WebPage",
  };
}

export type Action = {
  vers: Statut;
  label: string;
  /** Réservé aux administrateurs. */
  admin: boolean;
  /** Motif obligatoire. */
  motif?: boolean;
  /** Date et heure de publication à choisir. */
  date?: boolean;
  principal?: boolean;
};

/** Passages proposés depuis un statut lu : même liste que la base (garde_statut_contenus). */
export function actionsPossibles(
  c: { type: TypeContenu; statut_lu: Statut },
  circuit: ReglagesEditoriaux["circuit"] = "complet",
): Action[] {
  if (c.type === "page") {
    return c.statut_lu === "redaction"
      ? [
          { vers: "publie", label: "Publier maintenant", admin: true, principal: true },
          { vers: "programme", label: "Programmer", admin: true, date: true },
        ]
      : [{ vers: "redaction", label: "Retirer du site", admin: true }];
  }
  switch (c.statut_lu) {
    case "idee":
      return [
        { vers: "redaction", label: "Commencer la rédaction", admin: false, principal: true },
      ];
    case "redaction":
      return [
        ...(circuit === "simple"
          ? [
              {
                vers: "publie" as const,
                label: "Publier maintenant",
                admin: true,
                principal: true,
              },
              { vers: "programme" as const, label: "Programmer", admin: true, date: true },
            ]
          : []),
        {
          vers: "a_relire",
          label: "Envoyer en relecture",
          admin: false,
          principal: circuit !== "simple",
        },
        { vers: "idee", label: "Remettre en idée", admin: false },
      ];
    case "a_relire":
      return [
        { vers: "pret", label: "Valider la relecture", admin: true, principal: true },
        { vers: "redaction", label: "Renvoyer en rédaction", admin: false, motif: true },
      ];
    case "pret":
      return [
        { vers: "publie", label: "Publier maintenant", admin: true, principal: true },
        { vers: "programme", label: "Programmer", admin: true, date: true },
        { vers: "redaction", label: "Reprendre la rédaction", admin: false },
      ];
    case "programme":
      return [
        { vers: "pret", label: "Déprogrammer", admin: true, principal: true },
        { vers: "redaction", label: "Reprendre la rédaction", admin: true },
      ];
    case "publie":
      return [
        { vers: "a_actualiser", label: "Signaler à actualiser", admin: false, motif: true },
        { vers: "redaction", label: "Retirer du site", admin: true },
      ];
    case "a_actualiser":
      return [
        { vers: "publie", label: "Valider l'actualisation", admin: true, principal: true },
        { vers: "redaction", label: "Retirer du site", admin: true },
      ];
  }
}

/** Prochaine action, en une phrase. */
export function prochaineAction(statut: Statut): string {
  switch (statut) {
    case "idee":
      return "Commencer la rédaction.";
    case "redaction":
      return "Finir le texte, puis l'envoyer en relecture.";
    case "a_relire":
      return "Relire le texte et valider la relecture.";
    case "pret":
      return "Publier ou programmer.";
    case "programme":
      return "En ligne à l'heure dite.";
    case "publie":
      return "En ligne.";
    case "a_actualiser":
      return "Relire et valider l'actualisation.";
  }
}

/** Seuils de longueur pour les moteurs de recherche (réglage « longueurs_seo »). */
export const LONGUEURS = {
  titre: { min: 10, max: 70 },
  description: { min: 70, max: 160 },
} as const;

export type Manque = { code: string; message: string };

/**
 * Manques calculables pendant la saisie, miroir de manques_contenu : la base reste juge à chaque
 * passage. Les termes interdits ne sont repérés que par la base, sur le texte enregistré.
 */
export function manquesSaisie(
  v: {
    type: TypeContenu;
    titre: string;
    description: string;
    corps: string;
    auteur_fonction: string;
    auteur_nom: string;
    sources: string;
    relu_le: string | null;
  },
  r: ReglagesEditoriaux,
): Manque[] {
  const manques: Manque[] = [];
  const lt = v.titre.trim().length;
  const ld = v.description.trim().length;
  if (r.longueurs_seo) {
    if (lt < LONGUEURS.titre.min || lt > LONGUEURS.titre.max) {
      manques.push({
        code: "titre",
        message: `Titre : de 10 à 70 caractères (${lt} aujourd'hui).`,
      });
    }
    if (ld < LONGUEURS.description.min || ld > LONGUEURS.description.max) {
      manques.push({
        code: "description",
        message: `Description : de 70 à 160 caractères (${ld} aujourd'hui).`,
      });
    }
  }
  if (!v.corps.trim()) manques.push({ code: "corps", message: "Le texte est vide." });
  if (v.type === "article") {
    if (r.exiger_auteur) {
      if (r.auteur_mode === "nomme" && !v.auteur_nom.trim()) {
        manques.push({ code: "auteur", message: "Nom de l'auteur manquant." });
      } else if (r.auteur_mode !== "nomme" && !v.auteur_fonction.trim()) {
        manques.push({ code: "auteur", message: "Fonction de l'auteur manquante." });
      }
    }
    if (r.exiger_sources && !v.sources.includes("https://")) {
      manques.push({ code: "sources", message: "Source manquante (adresse https://)." });
    }
    if (r.exiger_relecture && !v.relu_le) {
      manques.push({ code: "relecture", message: "Relecture à valider." });
    }
  }
  return manques;
}

/** Source d'un contenu : libellé et adresse https://. */
export type Source = { libelle: string; url: string };

/**
 * Sources, une par ligne : « Libellé — https://adresse ». La base impose une adresse https:// par
 * ligne non vide ; sans libellé, l'adresse sert de libellé.
 */
export function lireSources(texte: string): Source[] {
  return texte
    .split("\n")
    .map((ligne) => ligne.trim())
    .filter(Boolean)
    .flatMap((ligne) => {
      const m = /https:\/\/\S+/.exec(ligne);
      if (!m) return [];
      const libelle = ligne
        .replace(m[0], "")
        .replace(/[\s—–:|-]+$/, "")
        .trim();
      return [{ libelle: libelle || m[0], url: m[0] }];
    });
}

/** Date lisible d'une date seule (AAAA-MM-JJ), sans décalage de fuseau. */
export function dateSimple(jour: string | null): string {
  if (!jour) return "";
  const [a = 0, m = 1, j = 1] = jour.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, j)).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Auteur affiché sous un article, selon le réglage : fonction ou nom. Vide : rien à afficher. */
export function auteurAffiche(
  c: { auteur_fonction: string; auteur_nom: string },
  mode: ReglagesEditoriaux["auteur_mode"],
): string {
  return (mode === "nomme" ? c.auteur_nom : c.auteur_fonction).trim();
}
