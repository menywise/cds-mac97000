/**
 * Version du socle affichée dans le pied de page (src/config/socle.ts) : même numéro que le dernier
 * dossier de blocs `supabase/seed/vX_Y_Z/`, que la dernière version écrite par une migration et que
 * la « Version courante » de docs/MISE_A_NIVEAU.md. Un oubli à la sortie d'une version est refusé.
 * Lancer : node --test tests/unit/*.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { SOCLE_VERSION } from "../../src/config/socle.ts";

const RACINE = join(import.meta.dirname, "..", "..");
const ordre = (a: string, b: string) => {
  const [x, y] = [a.split(".").map(Number), b.split(".").map(Number)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return (x[i] ?? 0) - (y[i] ?? 0);
  return 0;
};
const derniere = (versions: string[]) => [...versions].sort(ordre).at(-1);

test("version du pied de page = dernier dossier de blocs", () => {
  const dossiers = readdirSync(join(RACINE, "supabase", "seed"))
    .filter((nom) => /^v\d+_\d+_\d+$/.test(nom))
    .map((nom) => nom.slice(1).replaceAll("_", "."));
  assert.equal(SOCLE_VERSION, derniere(dossiers));
});

test("version du pied de page = dernière version écrite par une migration", () => {
  const versions = readdirSync(join(RACINE, "supabase", "migrations"))
    .map((nom) => /_v(\d+)_(\d+)_(\d+)_/.exec(nom))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => `${m[1]}.${m[2]}.${m[3]}`);
  assert.equal(SOCLE_VERSION, derniere(versions));
});

test("version du pied de page = version courante du guide de mise à niveau", () => {
  const guide = readFileSync(join(RACINE, "docs", "MISE_A_NIVEAU.md"), "utf8");
  assert.match(
    guide,
    new RegExp(`Version courante : \\*\\*${SOCLE_VERSION.replaceAll(".", "\\.")}\\*\\*`),
  );
});
