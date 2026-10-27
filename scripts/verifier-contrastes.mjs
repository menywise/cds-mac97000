#!/usr/bin/env node
// Contrastes de la charte 2.0 (CDS_TOKENS.md : WCAG AA, 4,5:1 pour le texte, 3:1 pour les
// éléments graphiques). Lit les couleurs de :root dans src/styles.css et calcule chaque paire
// d'usage ci-dessous. Aucun appel réseau. Usage : node scripts/verifier-contrastes.mjs
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const racine = css.slice(css.indexOf(":root {"), css.indexOf("}", css.indexOf(":root {")));
const vars = Object.fromEntries(
  [...racine.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]),
);

/** Couleur CSS (#rrggbb, oklch(L C H [/ a]), var(--x)) → [r, g, b, a] en sRGB 0..1. */
function rgb(valeur, fond = [1, 1, 1, 1]) {
  const v = valeur.trim();
  const ref = v.match(/^var\(--([a-z0-9-]+)\)$/);
  if (ref) return rgb(vars[ref[1]] ?? "", fond);
  if (v.startsWith("#")) {
    const h = v.slice(1);
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).concat(1);
  }
  const m = v.match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+))?\s*\)$/);
  if (!m) throw new Error(`Couleur illisible : ${v}`);
  const [L, C, H] = [+m[1], +m[2], (+m[3] * Math.PI) / 180];
  const a = m[4] === undefined ? 1 : +m[4];
  const [A, B] = [C * Math.cos(H), C * Math.sin(H)];
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const mm = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s,
  ];
  const srgb = lin.map((x) => {
    const c = Math.min(1, Math.max(0, x));
    return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  });
  // Couleur translucide : posée sur son fond.
  return srgb.map((c, i) => c * a + fond[i] * (1 - a)).concat(1);
}

const luminance = ([r, g, b]) => {
  const f = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
function contraste(texte, fond) {
  const f = rgb(`var(--${fond})`, rgb("var(--card)"));
  const t = rgb(`var(--${texte})`, f);
  const [a, b] = [luminance(t), luminance(f)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

// [texte ou trait, fond, seuil]. 4,5 : texte ; 3 : élément graphique (bordure de carte, barre).
const PAIRES = [
  ["foreground", "background", 4.5],
  ["muted-foreground", "background", 4.5],
  ["muted-foreground", "card", 4.5],
  ["muted-foreground", "muted", 4.5],
  ["primary-foreground", "primary", 4.5],
  ["text-light", "background", 4.5],
  ["primary-text", "background", 4.5],
  ["primary-text", "card", 4.5],
  ["secondary-foreground", "secondary", 4.5],
  ["destructive-foreground", "destructive", 4.5],
  ["destructive-text", "background", 4.5],
  ...["success", "warning", "danger", "info", "violet", "neutral"].flatMap((t) => [
    [`${t}-text`, `${t}-soft`, 4.5],
    [`${t}-text`, "card", 4.5],
    [`${t}-text`, "background", 4.5],
    [`${t}-foreground`, t, 4.5],
    [t, "card", 3],
  ]),
];

let echec = 0;
for (const [t, f, seuil] of PAIRES) {
  if (!vars[t] || !vars[f]) {
    console.log(`ÉCHEC : couleur absente de :root (--${vars[t] ? f : t})`);
    echec = 1;
    continue;
  }
  const r = contraste(t, f);
  const ok = r >= seuil;
  if (!ok) echec = 1;
  const marque = ok ? "ok   " : "ÉCHEC";
  console.log(`${marque} ${r.toFixed(2).padStart(5)}:1 (≥ ${seuil}) --${t} sur --${f}`);
}
console.log(echec ? "Contrastes : au moins une paire sous le seuil." : "Contrastes OK");
process.exit(echec);
