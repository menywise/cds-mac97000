/**
 * Charte de style 2.0 (docs/CHARTE_STYLE_CDS.md) : contrôlée à chaque PR par l'étape « Tests
 * unitaires » existante, sans action GitHub de plus. Mêmes scripts que le hook pre-commit.
 * Lancer : node --test tests/unit/*.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
// @ts-expect-error script Node sans déclaration de types
import { couleursHorsCharte } from "../../scripts/verifier-couleurs.mjs";

const DEPOT = join(import.meta.dirname, "..", "..");

test("aucune couleur Tailwind en dur ni variante sombre dark: dans src/", () => {
  assert.deepEqual(couleursHorsCharte(DEPOT), []);
});

test("chaque paire de couleurs de src/styles.css tient le contraste AA", () => {
  const r = spawnSync(process.execPath, [join(DEPOT, "scripts", "verifier-contrastes.mjs")], {
    encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

// Verrou A : tokens/*.tokens.json est la source unique ; styles.css, CDS_TOKENS.md et
// src/lib/cds-tokens.ts disent la même chose.
test("src/styles.css est celui que fabriquent les jetons (npm run jetons)", () => {
  const r = spawnSync(process.execPath, [join(DEPOT, "scripts", "jetons.mjs"), "--verifier"], {
    encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("CDS_TOKENS.md et src/lib/cds-tokens.ts reprennent les valeurs des jetons", async () => {
  // @ts-expect-error script Node sans déclaration de types
  const { lireJetons } = await import("../../scripts/jetons.mjs");
  const jetons = new Map<string, string>();
  for (const g of lireJetons() as { jetons: { nom: string; valeur: string }[] }[])
    for (const j of g.jetons) jetons.set(j.nom, String(j.valeur).toLowerCase());
  const doc = readFileSync(join(DEPOT, "CDS_TOKENS.md"), "utf8").toLowerCase();
  const ts = readFileSync(join(DEPOT, "src", "lib", "cds-tokens.ts"), "utf8").toLowerCase();
  for (const etat of ["success", "warning", "danger", "info", "violet", "neutral"]) {
    const valeurs = ["", "-soft", "-text", "-border"].map((s) => jetons.get(etat + s)!);
    const ligne = doc.split("\n").find((l) => l.startsWith(`| \`${etat}\``)) ?? "";
    for (const v of valeurs) assert.ok(ligne.includes(v), `CDS_TOKENS.md, ${etat} : ${v} absent`);
    const objet = ts.split("\n").find((l) => l.trim().startsWith(`${etat}: { solid`)) ?? "";
    for (const v of valeurs) assert.ok(objet.includes(v), `cds-tokens.ts, ${etat} : ${v} absent`);
  }
  for (const [nom, v] of jetons) {
    if (!v.startsWith("#")) continue;
    const ligne = doc
      .split("\n")
      .find((l) => l.startsWith("|") && (l.split("|")[1] ?? "").includes(`\`--${nom}\``));
    if (ligne) assert.ok(ligne.includes(v), `CDS_TOKENS.md, --${nom} : ${v} attendu`);
  }
});

// Verrou B : texte gris, opacité et listes sans carte ne montent dans aucun fichier.
test("cliquet de la charte : aucun fichier au-dessus de son plafond", async () => {
  // @ts-expect-error script Node sans déclaration de types
  const { depassements } = await import("../../scripts/cliquet-charte.mjs");
  assert.deepEqual(depassements(), []);
});
