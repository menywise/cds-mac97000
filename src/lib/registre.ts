/**
 * Registre de l'application (socle 1.16.0). Une ligne par élément construit : à quoi il sert, qui
 * s'en sert, dans quel état, jusqu'à quand. Les fiches de décision disent le « pourquoi » ; le
 * registre dit le « quoi, qui, jusqu'à quand ». Six mois plus tard, on sait encore pourquoi une
 * tâche planifiée tourne ou à quoi sert un script.
 *
 * Fichier sans dépendance (ni base, ni écran) : copie exacte dans chaque installation
 * (docs/SYNCHRO.md). La table `public.registre` et la fonction `registre_manquants()` vivent en
 * base ; ce fichier porte les listes, le tri et les contrôles purs.
 */

/** Types d'élément. Toute valeur ici est aussi dans la contrainte `registre_type_check`. */
export const TYPES_REGISTRE = [
  "module",
  "cle",
  "tache",
  "script",
  "automatisme",
  "compte",
  "adresse",
  "integration",
  "export",
  "autre",
] as const;
export type TypeRegistre = (typeof TYPES_REGISTRE)[number];

export const LIBELLES_TYPE: Record<TypeRegistre, string> = {
  module: "Module",
  cle: "Clé d'agent",
  tache: "Tâche planifiée",
  script: "Script",
  automatisme: "Automatisme (hook, action GitHub)",
  compte: "Compte technique",
  adresse: "Adresse publique",
  integration: "Intégration",
  export: "Export",
  autre: "Autre",
};

/** États. Toute valeur ici est aussi dans la contrainte `registre_etat_check`. */
export const ETATS_REGISTRE = [
  "en_service",
  "en_construction",
  "prevu",
  "en_pause",
  "a_confirmer",
  "abandonne",
] as const;
export type EtatRegistre = (typeof ETATS_REGISTRE)[number];

export const LIBELLES_ETAT: Record<EtatRegistre, string> = {
  en_service: "En service",
  en_construction: "En construction",
  prevu: "Prévu",
  en_pause: "En pause",
  a_confirmer: "À confirmer",
  abandonne: "Abandonné",
};

export type LigneRegistre = {
  type: TypeRegistre;
  identifiant: string;
  usage: string;
  utilisateur: string;
  etat: EtatRegistre;
  /** Date ISO (AAAA-MM-JJ) ; absente seulement pour un élément abandonné. */
  a_revoir_le: string | null;
  decision: string | null;
};

export type ElementAttendu = { type: string; identifiant: string };

/** Un élément est à revoir quand sa date est atteinte ou dépassée (un abandonné ne l'est jamais). */
export function estARevoir(ligne: Pick<LigneRegistre, "etat" | "a_revoir_le">, aujourdhui: string) {
  if (ligne.etat === "abandonne") return false;
  return ligne.a_revoir_le === null || ligne.a_revoir_le <= aujourdhui;
}

/**
 * Ordre d'affichage : les éléments à revoir d'abord (date la plus ancienne en tête), puis les
 * autres par date, les abandonnés en dernier ; à égalité, par type puis identifiant.
 */
export function trierRegistre<T extends LigneRegistre>(
  lignes: readonly T[],
  aujourdhui: string,
): T[] {
  const rang = (l: T) => (estARevoir(l, aujourdhui) ? 0 : l.etat === "abandonne" ? 2 : 1);
  return [...lignes].sort(
    (a, b) =>
      rang(a) - rang(b) ||
      (a.a_revoir_le ?? "9999-12-31").localeCompare(b.a_revoir_le ?? "9999-12-31") ||
      a.type.localeCompare(b.type) ||
      a.identifiant.localeCompare(b.identifiant),
  );
}

/** Éléments présents mais absents du registre (comparaison par type et identifiant). */
export function elementsManquants(
  attendus: readonly ElementAttendu[],
  lignes: readonly ElementAttendu[],
): ElementAttendu[] {
  const inscrits = new Set(lignes.map((l) => `${l.type}\u0000${l.identifiant}`));
  const vus = new Set<string>();
  return attendus.filter((a) => {
    const cle = `${a.type}\u0000${a.identifiant}`;
    if (inscrits.has(cle) || vus.has(cle)) return false;
    vus.add(cle);
    return true;
  });
}

/**
 * Scripts attendus au registre : chaque entrée du dossier `scripts/` (un fichier, ou un dossier
 * d'outils compté comme un seul élément), écrite `scripts/<nom>`. Fichiers cachés et notes
 * (`.md`, `.txt`) exclus.
 */
export function scriptsAttendus(entrees: readonly string[]): string[] {
  return entrees
    .filter((e) => !e.startsWith(".") && !/\.(md|txt)$/i.test(e))
    .map((e) => `scripts/${e}`)
    .sort();
}

/**
 * Inscriptions écrites dans du SQL versionné : appels `registre_inscrire('<type>', '<identifiant>'`.
 * Sert au contrôle des éléments du dépôt (scripts), qu'aucune base ne voit.
 */
export function inscriptionsSql(sql: string): ElementAttendu[] {
  const motif = /registre_inscrire\(\s*'([a-z_]+)'\s*,\s*'((?:[^']|'')+)'/g;
  return [...sql.matchAll(motif)].map((m) => ({
    type: m[1]!,
    identifiant: m[2]!.replace(/''/g, "'"),
  }));
}
