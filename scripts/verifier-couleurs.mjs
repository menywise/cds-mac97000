#!/usr/bin/env node
// Charte de style 2.0 (27/10/2026, docs/CHARTE_STYLE_CDS.md) : thème clair seul, couleurs nommées
// seulement (CDS_TOKENS.md). Refuse dans src/ toute variante sombre « dark: » et toute couleur de la
// palette Tailwind écrite en dur (emerald-600, amber-100…). À la place : success, warning, danger,
// info, violet, neutral, en -soft / -text / -border, déclarées dans src/styles.css.
// Fichiers générés exclus (src/integrations/, src/routeTree.gen.ts). Node seul : tourne pareil sous
// Windows, Linux et en CI. Usage : node scripts/verifier-couleurs.mjs
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = join(import.meta.dirname, "..");
const PALETTE =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const INTERDIT = new RegExp(
  `(^|[^a-zA-Z0-9_-])dark:[a-z]|(^|[^a-zA-Z0-9_-])[a-z]+-(${PALETTE})-[0-9]{2,3}([^0-9]|$)`,
);
const EXCLUS = /^src\/(integrations\/|routeTree\.gen\.ts$)/;

/** Lignes hors charte, au format « fichier:ligne:texte ». */
export function couleursHorsCharte(racine = RACINE) {
  const trouve = [];
  const parcourir = (dossier) => {
    for (const e of readdirSync(dossier, { withFileTypes: true })) {
      const chemin = join(dossier, e.name);
      const rel = relative(racine, chemin).split("\\").join("/");
      if (e.isDirectory()) parcourir(chemin);
      else if (/\.tsx?$/.test(e.name) && !EXCLUS.test(rel))
        readFileSync(chemin, "utf8")
          .split("\n")
          .forEach((l, i) => INTERDIT.test(l) && trouve.push(`${rel}:${i + 1}:${l.trim()}`));
    }
  };
  parcourir(join(racine, "src"));
  return trouve;
}

// Lancé en ligne de commande (et non importé par un test).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const trouve = couleursHorsCharte();
  if (trouve.length) {
    console.log(trouve.join("\n"));
    console.log("");
    console.log(
      "ÉCHEC : couleur hors charte ci-dessus (fichier:ligne). Thème clair seul, pas de « dark: ».",
    );
    console.log(
      "Remplacer par une couleur nommée : bg-success-soft, text-warning-text, border-danger-border…",
    );
    process.exit(1);
  }
  console.log("Couleurs OK");
}
