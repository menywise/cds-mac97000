/**
 * Bibliographie et citation (socle 1.14.0) : règles sans dépendance, destinées à la copie exacte
 * dans les installations (docs/SYNCHRO.md).
 */

export type Reference = {
  rang: number;
  auteurs: string;
  titre: string;
  revue: string;
  annee: number | null;
  doi: string;
  pmid: string;
  url: string;
};

export type FormatCitation = "vancouver" | "apa";

/** Adresse d'une référence : DOI d'abord, puis PubMed, puis l'adresse saisie. Vide si aucune. */
export function lienReference(r: Pick<Reference, "doi" | "pmid" | "url">): string {
  if (r.doi) return `https://doi.org/${r.doi}`;
  if (r.pmid) return `https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/`;
  return r.url;
}

const point = (t: string) => (/[.!?]$/.test(t.trim()) ? t.trim() : `${t.trim()}.`);

/** Référence mise en forme, en texte simple. */
export function formaterReference(r: Reference, format: FormatCitation): string {
  const morceaux: string[] = [];
  if (format === "apa") {
    if (r.auteurs) morceaux.push(point(r.auteurs));
    morceaux.push(r.annee ? `(${r.annee}).` : "(s. d.).");
    morceaux.push(point(r.titre));
    if (r.revue) morceaux.push(point(r.revue));
  } else {
    if (r.auteurs) morceaux.push(point(r.auteurs));
    morceaux.push(point(r.titre));
    if (r.revue) morceaux.push(r.annee ? `${r.revue}. ${r.annee}.` : point(r.revue));
    else if (r.annee) morceaux.push(`${r.annee}.`);
  }
  if (r.doi) morceaux.push(`doi:${r.doi}`);
  else if (r.pmid) morceaux.push(`PMID: ${r.pmid}`);
  return morceaux.join(" ");
}

/** Appels [n] du texte (hors liens [texte](adresse)), sans doublon, dans l'ordre croissant. */
export function appelsDuTexte(corps: string): number[] {
  const vus = new Set<number>();
  for (const m of corps.matchAll(/\[(\d{1,3})\](?!\()/g)) vus.add(Number(m[1]));
  return [...vus].sort((a, b) => a - b);
}

/** Formule « Citer ce contenu », avec la date de consultation. */
export function citerContenu(
  c: { titre: string; auteur: string; site: string; url: string; publie_le: string | null },
  format: FormatCitation,
  consulte: Date,
): string {
  const annee = c.publie_le ? new Date(c.publie_le).getUTCFullYear() : null;
  const jour = consulte.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const auteur = c.auteur || c.site;
  return format === "apa"
    ? `${point(auteur)} ${annee ? `(${annee})` : "(s. d.)"}. ${point(c.titre)} ${c.site}. ${c.url} (consulté le ${jour}).`
    : `${point(auteur)} ${point(c.titre)} ${c.site} [Internet]. ${annee ? `${annee}` : "s. d."} [consulté le ${jour}]. Disponible sur : ${c.url}`;
}
