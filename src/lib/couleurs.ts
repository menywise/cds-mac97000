/**
 * Couleurs libres (couleur principale réglée en administration, couleurs de données saisies en
 * base) : validation et teintes au contraste AA. Fichier sans dépendance (testé seul). Une couleur
 * invalide est ignorée : le site garde alors les jetons par défaut de `src/styles.css`.
 * Copié tel quel dans les clones (DB&M : socle.json).
 */

const HEX = /^#[0-9a-f]{6}$/;

/** « #1D4ED8 », « 1d4ed8 » ou « #1d4 » → « #1d4ed8 » ; toute autre valeur → « ». */
export function normaliserCouleur(valeur: string): string {
  let v = valeur.trim().toLowerCase();
  if (!v.startsWith("#")) v = `#${v}`;
  if (/^#[0-9a-f]{3}$/.test(v)) v = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  return HEX.test(v) ? v : "";
}

function canaux(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

function versHex(c: [number, number, number]) {
  return `#${c
    .map((x) =>
      Math.round(Math.min(255, Math.max(0, x)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

/** Luminance relative WCAG 2.1. */
export function luminance(hex: string) {
  const lin = (x: number) => {
    const s = x / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = canaux(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contraste(a: string, b: string) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Assombrit d'une fraction (0,15 = 15 %). */
export function assombrir(hex: string, fraction: number) {
  return versHex(canaux(hex).map((x) => x * (1 - fraction)) as [number, number, number]);
}

export const FOND = "#eaeff5"; // fond de page (charte 2.0)
export const BLANC = "#ffffff";
const ENCRE = "#0f172a";

/** Couleur posée sur un fond avec une opacité de 0 à 1 : `${couleur}1a` = 10 %. */
export function melanger(couleur: string, fond: string, opacite: number) {
  const c = canaux(couleur);
  const f = canaux(fond);
  return versHex(c.map((x, i) => x * opacite + f[i]! * (1 - opacite)) as [number, number, number]);
}

/**
 * Couleur de données (famille, catégorie saisie en base…) employée en texte ou en fond plein sous
 * un texte blanc : assombrie jusqu'au seuil (4,5:1) sur chacun des fonds. Par défaut : carte
 * blanche, fond de page et fond pâle de la couleur elle-même (10 %). Couleur invalide → encre.
 */
export function couleurLisible(couleur: string, fonds?: string[], seuil = 4.5) {
  const depart = normaliserCouleur(couleur);
  if (!depart) return ENCRE;
  const liste = fonds ?? [BLANC, FOND, melanger(depart, FOND, 0.1)];
  let texte = depart;
  for (let i = 0; i < 30 && liste.some((f) => contraste(texte, f) < seuil); i++) {
    texte = assombrir(texte, 0.06);
  }
  return texte;
}

/**
 * Teintes dérivées d'une couleur principale, toutes au contraste AA (4,5:1) :
 * - texte posé sur la couleur : blanc si possible, sinon encre foncée ;
 * - couleur en texte et en liens sur le fond clair : assombrie jusqu'à 4,5:1 ;
 * - survol : 12 % plus sombre.
 */
export function teintesPrincipales(couleur: string) {
  let principale = normaliserCouleur(couleur);
  if (!principale) return null;
  // Teinte moyenne où ni le blanc ni l'encre n'atteignent 4,5:1 : assombrie jusqu'au blanc lisible.
  for (
    let i = 0;
    i < 20 && contraste(principale, BLANC) < 4.5 && contraste(principale, ENCRE) < 4.5;
    i++
  ) {
    principale = assombrir(principale, 0.06);
  }
  const surCouleur = contraste(principale, BLANC) >= 4.5 ? BLANC : ENCRE;
  let texte = principale;
  for (let i = 0; i < 20 && contraste(texte, FOND) < 4.5; i++) texte = assombrir(texte, 0.08);
  return { principale, survol: assombrir(principale, 0.12), surCouleur, texte };
}

/** Bloc CSS qui remplace les jetons de couleur principale ; vide si la couleur est invalide. */
export function cssCouleurPrincipale(couleur: string) {
  const t = teintesPrincipales(couleur);
  if (!t) return "";
  return `:root{--primary:${t.principale};--primary-hover:${t.survol};--primary-foreground:${t.surCouleur};--primary-text:${t.texte};--ring:${t.principale};}`;
}
