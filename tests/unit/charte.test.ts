/**
 * Charte de style 2.0 (docs/CHARTE_STYLE_CDS.md) : contrôlée à chaque PR par l'étape « Tests
 * unitaires » existante, sans action GitHub de plus. Mêmes scripts que le hook pre-commit.
 * Lancer : node --test tests/unit/*.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
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
