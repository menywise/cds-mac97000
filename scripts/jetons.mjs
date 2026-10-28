#!/usr/bin/env node
// Source unique des jetons de la charte (verrou A, 28/10/2026). Lit tokens/cds.tokens.json, puis
// les autres fichiers tokens/*.tokens.json d'un projet (surcharges), et fabrique dans
// src/styles.css le bloc :root et les couleurs Tailwind (bloc « jetons:couleurs » de @theme).
// Format W3C Design Tokens : $value, $type (color, dimension, shadow), $description, alias {nom}.
// Le nom d'un jeton est celui de la variable CSS ; le groupe sert au classement et au commentaire.
// Une surcharge de même nom remplace la valeur sur place ; un nom nouveau s'ajoute à son groupe.
// Usage : node scripts/jetons.mjs            écrit src/styles.css
//         node scripts/jetons.mjs --verifier refuse un styles.css modifié à la main
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import prettier from "prettier";

const RACINE = join(import.meta.dirname, "..");
const STYLES = join(RACINE, "src", "styles.css");
const DOSSIER = join(RACINE, "tokens");
const DEBUT = "/* jetons:couleurs (scripts/jetons.mjs, tokens/*.tokens.json) */";
const FIN = "/* /jetons:couleurs */";
const TYPES = new Set(["color", "dimension", "shadow"]);

/** Fichiers de jetons, le socle d'abord, puis les surcharges du projet dans l'ordre alphabétique. */
function fichiers() {
  const autres = readdirSync(DOSSIER)
    .filter((f) => f.endsWith(".tokens.json") && f !== "cds.tokens.json")
    .sort();
  return ["cds.tokens.json", ...autres];
}

/** Jetons fusionnés : [{ groupe, description, jetons: [{ nom, type, valeur, description, utilitaire }] }]. */
export function lireJetons() {
  const groupes = [];
  const parNom = new Map();
  for (const f of fichiers()) {
    const doc = JSON.parse(readFileSync(join(DOSSIER, f), "utf8"));
    for (const [cle, groupe] of Object.entries(doc)) {
      if (cle.startsWith("$")) continue;
      let cible = groupes.find((g) => g.groupe === cle);
      if (!cible) {
        cible = { groupe: cle, description: groupe.$description ?? "", jetons: [] };
        groupes.push(cible);
      }
      for (const [nom, j] of Object.entries(groupe)) {
        if (nom.startsWith("$")) continue;
        if (!TYPES.has(j.$type)) throw new Error(`${f} : ${nom} : $type inconnu (${j.$type})`);
        const jeton = {
          nom,
          type: j.$type,
          valeur: j.$value,
          description: j.$description ?? "",
          utilitaire: j.$extensions?.cds?.utilitaire ?? nom,
        };
        const deja = parNom.get(nom);
        if (deja)
          Object.assign(deja, jeton, { description: jeton.description || deja.description });
        else {
          parNom.set(nom, jeton);
          cible.jetons.push(jeton);
        }
      }
    }
  }
  for (const j of parNom.values()) {
    const ref = /^\{([\w-]+)\}$/.exec(String(j.valeur));
    if (ref && !parNom.has(ref[1]))
      throw new Error(`${j.nom} : alias vers un jeton absent {${ref[1]}}`);
  }
  return groupes;
}

/** Valeur CSS : alias {nom} → var(--nom) ; ombre en tableau d'objets → liste CSS. */
function css(j) {
  const ref = /^\{([\w-]+)\}$/.exec(String(j.valeur));
  if (ref) return `var(--${ref[1]})`;
  if (j.type === "shadow" && Array.isArray(j.valeur))
    return j.valeur
      .map((o) =>
        [o.inset ? "inset" : "", o.offsetX, o.offsetY, o.blur, o.spread ?? "", o.color]
          .filter(Boolean)
          .join(" "),
      )
      .join(", ");
  return String(j.valeur);
}

/** Commentaire CSS replié à 100 colonnes, suite alignée sous le texte (comme le reste du fichier). */
function commentaire(texte, retrait = "  ") {
  const lignes = [];
  let ligne = "";
  for (const mot of texte.split(/\s+/)) {
    const debut = lignes.length ? `${retrait}   ` : `${retrait}/* `;
    if (ligne && (debut + ligne + " " + mot).length > 97) {
      lignes.push(debut + ligne);
      ligne = mot;
    } else ligne = ligne ? `${ligne} ${mot}` : mot;
  }
  lignes.push(`${lignes.length ? `${retrait}   ` : `${retrait}/* `}${ligne} */`);
  return lignes.join("\n");
}

function blocRacine(groupes) {
  const lignes = [":root {"];
  groupes.forEach((g, i) => {
    if (i) lignes.push("");
    if (g.description) lignes.push(commentaire(g.description));
    for (const j of g.jetons)
      lignes.push(`  --${j.nom}: ${css(j)};${j.description ? ` /* ${j.description} */` : ""}`);
  });
  lignes.push("}");
  return lignes.join("\n");
}

function blocCouleurs(groupes) {
  const lignes = [`  ${DEBUT}`];
  for (const g of groupes)
    for (const j of g.jetons)
      if (j.type === "color") lignes.push(`  --color-${j.utilitaire}: var(--${j.nom});`);
  lignes.push(`  ${FIN}`);
  return lignes.join("\n");
}

/** styles.css tel que les jetons le fabriquent, mis en forme par Prettier. */
export async function stylesAttendus() {
  const groupes = lireJetons();
  let s = readFileSync(STYLES, "utf8");
  const r0 = s.indexOf("\n:root {");
  const r1 = s.indexOf("\n}", r0);
  if (r0 < 0 || r1 < 0) throw new Error("src/styles.css : bloc :root introuvable");
  s = s.slice(0, r0 + 1) + blocRacine(groupes) + s.slice(r1 + 2);
  const c0 = s.indexOf(`  ${DEBUT}`);
  const c1 = s.indexOf(FIN, c0);
  if (c0 < 0 || c1 < 0) throw new Error(`src/styles.css : repères ${DEBUT} … ${FIN} introuvables`);
  s = s.slice(0, c0) + blocCouleurs(groupes) + s.slice(c1 + FIN.length);
  const options = (await prettier.resolveConfig(STYLES)) ?? {};
  return prettier.format(s, { ...options, filepath: STYLES });
}

if (process.argv[1] && import.meta.filename === process.argv[1]) {
  const attendu = await stylesAttendus();
  const actuel = readFileSync(STYLES, "utf8");
  if (process.argv.includes("--verifier")) {
    if (attendu !== actuel) {
      console.log("ÉCHEC : src/styles.css ne correspond plus aux jetons (tokens/*.tokens.json).");
      console.log("Une couleur se change dans tokens/, puis : npm run jetons");
      process.exit(1);
    }
    console.log("Jetons OK");
  } else {
    writeFileSync(STYLES, attendu);
    console.log(
      attendu === actuel ? "Jetons : styles.css déjà à jour" : "Jetons : styles.css régénéré",
    );
  }
}
