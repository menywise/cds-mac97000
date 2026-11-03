/**
 * CDS — Plan du site (sitemap.xml) : dates de modification.
 * Fichier sans dépendance : la date d'une adresse est celle de la base, jamais le jour courant.
 */

/** Jour (AAAA-MM-JJ) d'une date ISO de la base ; `undefined` si absente ou illisible. */
export function toDay(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
}

/** Le jour le plus récent d'une liste de dates ISO ; `undefined` si aucune n'est lisible. */
export function latestDay(values: Iterable<string | null | undefined>): string | undefined {
  let latest: string | undefined;
  for (const value of values) {
    const day = toDay(value);
    if (day && (!latest || day > latest)) latest = day;
  }
  return latest;
}

/** La plus récente de deux dates ISO (chaînes comparables), ou `null`. */
export function laterOf(a: string | null | undefined, b: string | null | undefined) {
  if (!a) return b ?? null;
  if (!b) return a;
  return a > b ? a : b;
}

/** Ligne `<lastmod>` d'une adresse, vide quand la date est inconnue. */
export function lastmodLine(lastmod: string | undefined) {
  return lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : "";
}

/** Échappe une valeur pour le XML (adresses, titres). */
export function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Lignes `<image:image>` d'une adresse (plan du site des images), vides sans image. */
export function imageLines(images: Array<{ loc: string; title?: string }> | undefined) {
  return (images ?? [])
    .map(
      (img) =>
        `    <image:image>\n      <image:loc>${xmlEscape(img.loc)}</image:loc>\n${
          img.title ? `      <image:title>${xmlEscape(img.title)}</image:title>\n` : ""
        }    </image:image>\n`,
    )
    .join("");
}
