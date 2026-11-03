/**
 * Pilotage du contenu (socle 1.15.0) : calendrier et santé du contenu, calculés à l'écran à partir
 * des données du poste Éditorial. Fichier sans dépendance, destiné à la copie exacte (docs/SYNCHRO.md).
 */

/** Lundi (AAAA-MM-JJ) de la semaine d'un jour, sans décalage de fuseau. */
export function lundiDe(jour: string): string {
  const [a = 0, m = 1, j = 1] = jour.slice(0, 10).split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1, j));
  const decalage = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - decalage);
  return d.toISOString().slice(0, 10);
}

export type ElementCalendrier = {
  id: string;
  titre: string;
  statut: string;
  /** Jour retenu : date de publication (programmée ou passée), sinon date prévue. */
  jour: string;
};

/** Contenus datés, groupés par semaine (lundi), du plus ancien au plus récent. */
export function calendrier(
  contenus: {
    id: string;
    titre: string;
    statut_lu: string;
    publie_le: string | null;
    date_prevue: string | null;
  }[],
): { semaine: string; elements: ElementCalendrier[] }[] {
  const parSemaine = new Map<string, ElementCalendrier[]>();
  for (const c of contenus) {
    const jour = (c.publie_le ?? c.date_prevue)?.slice(0, 10);
    if (!jour) continue;
    const semaine = lundiDe(jour);
    const liste = parSemaine.get(semaine) ?? [];
    liste.push({ id: c.id, titre: c.titre, statut: c.statut_lu, jour });
    parSemaine.set(semaine, liste);
  }
  return [...parSemaine.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([semaine, elements]) => ({
      semaine,
      elements: elements.sort(
        (x, y) => x.jour.localeCompare(y.jour) || x.titre.localeCompare(y.titre, "fr"),
      ),
    }));
}

export type Sante = {
  enLigne: number;
  relecturesDues: number;
  enRetard: number;
  orphelins: number;
  liensCasses: number;
  sourcesInjoignables: number;
  requetesEnDouble: number;
  recherchesSansResultat: number;
};

/** Tableau de santé : un nombre par point de vigilance. Zéro partout : rien à faire. */
export function santeContenu(
  contenus: {
    id: string;
    statut_lu: string;
    date_prevue: string | null;
    sources_mortes: number;
  }[],
  maillage: {
    id: string;
    orphelin: boolean;
    liens_casses: string[];
    requete_en_double: string[];
  }[],
  recherchesSansResultat: number,
  aujourdhui: string,
): Sante {
  const enLigne = (s: string) => s === "publie" || s === "a_actualiser";
  return {
    enLigne: contenus.filter((c) => enLigne(c.statut_lu)).length,
    relecturesDues: contenus.filter((c) => c.statut_lu === "a_actualiser").length,
    enRetard: contenus.filter(
      (c) =>
        !!c.date_prevue &&
        c.date_prevue < aujourdhui &&
        !enLigne(c.statut_lu) &&
        c.statut_lu !== "programme",
    ).length,
    orphelins: maillage.filter((m) => m.orphelin).length,
    liensCasses: maillage.filter((m) => m.liens_casses.length > 0).length,
    sourcesInjoignables: contenus.filter((c) => c.sources_mortes > 0).length,
    requetesEnDouble: maillage.filter((m) => m.requete_en_double.length > 0).length,
    recherchesSansResultat,
  };
}
