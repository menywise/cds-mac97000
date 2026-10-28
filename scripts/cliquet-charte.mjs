#!/usr/bin/env node
// Cliquet de la charte (verrou B, 28/10/2026, docs/CHARTE_STYLE_CDS.md). Pour chaque fichier de src/,
// cinq comptes ne peuvent que baisser :
// - gris : text-muted-foreground (le gris est réservé aux métadonnées) ;
// - opacite : opacity-NN sans variante (hover:, disabled:…), ou couleur de texte, d'anneau ou de
//   contour éclaircie par un modificateur (text-foreground/50, ring-ring/30) hors « disabled: » :
//   l'un et l'autre font tomber un texte ou un focus sous l'AA ;
// - listes : <ul> ou <ol> sans carte ni bordure sur la balise (repère grossier : il ne fait que
//   baisser, un faux positif ne bloque donc personne) ;
// - couleurs : couleur écrite en dur dans une chaîne (« #ea580c », rgb(…), hsl(…), oklch(…)) ;
// - styles : couleur posée en style en ligne (style={{ color, backgroundColor, fill… }}), souvent
//   une couleur venue de la base : elle passe par couleurLisible() (src/lib/couleurs.ts).
// Audit du 28/10/2026 : ces trois écarts passaient tous les contrôles.
// Les plafonds vivent dans charte-plafonds.json. Un nouveau fichier a un budget : gris 5,
// opacite 0, listes 2, couleurs 0, styles 0. Un critère ajouté part du compte du jour.
// Usage : --verifier           refuse un fichier au-dessus de son plafond (ou de son budget)
//         --mettre-a-jour      abaisse les plafonds aux comptes actuels, ajoute les nouveaux
//                              fichiers, retire les fichiers supprimés ; ne relève jamais
//         --relever <fichier>  relève un plafond, à justifier dans la demande de fusion
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const RACINE = join(import.meta.dirname, "..");
const PLAFONDS = join(RACINE, "charte-plafonds.json");
const EXCLUS = /^src\/(integrations\/|routeTree\.gen\.ts$)/;
const BUDGET = { gris: 5, opacite: 0, listes: 2, couleurs: 0, styles: 0 };
const MODIFICATEUR = /(^|[\s"'`{])((?:[a-z-]+:)*)(?:text|ring|outline)-[a-z-]+\/\d{1,3}(?![\d.])/g;
// Une ancre (href="#add", to="#face") n'est pas une couleur.
const EN_DUR = /(?<!(?:href|to)=)["'`]#[0-9a-fA-F]{3,8}["'`]|\b(?:rgba?|hsla?|oklch)\(/g;
const STYLE = /style=\{\{([^{}]*)\}\}/g;
const PROPRIETE_COULEUR =
  /\b(?:color|background(?:Color)?|border(?:Top|Right|Bottom|Left)?Color|outlineColor|fill|stroke)\s*:/g;
const CRITERES = Object.keys(BUDGET);

/** Comptes d'un fichier. */
export function compter(code) {
  const listes = [...code.matchAll(/<(ul|ol)\b[^>]*>/g)].filter(
    (m) => !/module-card|bg-card|CarteSection|border|divide|rounded/.test(m[0]),
  ).length;
  const modificateurs = [...code.matchAll(MODIFICATEUR)].filter(
    (m) => !m[2].includes("disabled:"),
  ).length;
  const styles = [...code.matchAll(STYLE)].reduce(
    (n, m) => n + (m[1].match(PROPRIETE_COULEUR) ?? []).length,
    0,
  );
  return {
    gris: (code.match(/\btext-muted-foreground\b/g) ?? []).length,
    opacite: (code.match(/(^|[\s"'`{])opacity-\d+/g) ?? []).length + modificateurs,
    listes,
    couleurs: (code.match(EN_DUR) ?? []).length,
    styles,
  };
}

/** Comptes de tous les fichiers de src/ ({ "src/…": { gris, opacite, listes } }). */
export function mesurer(racine = RACINE) {
  const res = {};
  const parcourir = (dossier) => {
    for (const e of readdirSync(dossier, { withFileTypes: true })) {
      const chemin = join(dossier, e.name);
      const rel = relative(racine, chemin).split("\\").join("/");
      if (e.isDirectory()) parcourir(chemin);
      else if (/\.tsx?$/.test(e.name) && !EXCLUS.test(rel))
        res[rel] = compter(readFileSync(chemin, "utf8"));
    }
  };
  parcourir(join(racine, "src"));
  return res;
}

const lire = () => (existsSync(PLAFONDS) ? JSON.parse(readFileSync(PLAFONDS, "utf8")) : {});
const ecrire = (p) =>
  writeFileSync(
    PLAFONDS,
    JSON.stringify(
      Object.fromEntries(Object.entries(p).sort(([a], [b]) => a.localeCompare(b))),
      null,
      2,
    ) + "\n",
  );

/** Dépassements : [{ fichier, critere, compte, plafond }]. */
export function depassements(comptes = mesurer(), plafonds = lire()) {
  const res = [];
  for (const [fichier, c] of Object.entries(comptes))
    for (const k of CRITERES) {
      const plafond = plafonds[fichier]?.[k] ?? BUDGET[k];
      if (c[k] > plafond) res.push({ fichier, critere: k, compte: c[k], plafond });
    }
  return res;
}

if (process.argv[1] && import.meta.filename === process.argv[1]) {
  const comptes = mesurer();
  const plafonds = lire();
  const args = process.argv.slice(2);
  if (args[0] === "--verifier") {
    const d = depassements(comptes, plafonds);
    for (const x of d)
      console.log(`${x.fichier} : ${x.critere} ${x.compte} (plafond ${x.plafond})`);
    if (d.length) {
      console.log("");
      console.log(
        "ÉCHEC : la charte recule dans ces fichiers (gris, opacité, listes, couleurs, styles).",
      );
      console.log("Le gris va aux métadonnées ; une liste se range dans une carte (CarteSection).");
      console.log(
        "Une couleur vient des jetons ; une couleur de données passe par couleurLisible().",
      );
      process.exit(1);
    }
    const total = (k) => Object.values(comptes).reduce((n, c) => n + c[k], 0);
    console.log(
      `Cliquet OK (gris ${total("gris")}, opacité ${total("opacite")}, listes ${total("listes")}, ` +
        `couleurs ${total("couleurs")}, styles ${total("styles")})`,
    );
  } else if (args[0] === "--mettre-a-jour") {
    const neufs = {};
    for (const [fichier, c] of Object.entries(comptes)) {
      const p = plafonds[fichier];
      neufs[fichier] = Object.fromEntries(
        CRITERES.map((k) => [k, p ? Math.min(p[k] ?? c[k], c[k]) : Math.min(c[k], BUDGET[k])]),
      );
    }
    ecrire(neufs);
  } else if (args[0] === "--relever" && args[1]) {
    const f = args[1].split("\\").join("/");
    if (!comptes[f]) throw new Error(`${f} : fichier inconnu dans src/`);
    plafonds[f] = comptes[f];
    ecrire(plafonds);
    console.log(`Plafond relevé pour ${f} : à justifier dans la demande de fusion.`);
  } else if (args[0] === "--initialiser") {
    ecrire(comptes);
  } else {
    console.log("Usage : --verifier | --mettre-a-jour | --relever <fichier> | --initialiser");
    process.exit(2);
  }
}
