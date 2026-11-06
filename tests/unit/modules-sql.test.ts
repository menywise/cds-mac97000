/**
 * Les modules du code (src/config/modules.ts) et leurs valeurs par défaut en base
 * (public.module_defaults(), dernière version qui la définit) doivent rester identiques.
 * Socle 1.15.7 : un clone n'a pas de supabase/migrations (le remix le retire). La définition se lit
 * alors dans les blocs supabase/seed/vX_Y_Z/, qui portent le même SQL. Dans le socle, les deux
 * sources doivent donner la même chose : c'est ce qui rend la lecture des blocs sûre dans un clone.
 * Lancer : node --test tests/unit/*.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { defaultModuleStates } from "../../src/config/modules.ts";

const SUPABASE = join(import.meta.dirname, "..", "..", "supabase");
const MIGRATIONS = join(SUPABASE, "migrations");
const BLOCS = join(SUPABASE, "seed");
const DEFINITION = /FUNCTION public\.module_defaults\(\)[\s\S]*?SELECT '(\{[\s\S]*?\})'::jsonb/;

function lire(fichiers: string[]): Record<string, boolean> | null {
  for (const f of fichiers) {
    const m = DEFINITION.exec(readFileSync(f, "utf8"));
    if (m) return JSON.parse(m[1]!) as Record<string, boolean>;
  }
  return null;
}

/** Dernière migration qui définit module_defaults() ; null si le dossier est absent (clone). */
function depuisMigrations(): Record<string, boolean> | null {
  if (!existsSync(MIGRATIONS)) return null;
  const fichiers = readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .reverse()
    .map((f) => join(MIGRATIONS, f));
  return lire(fichiers);
}

/** Version d'un dossier de blocs « v1_15_7 » → [1, 15, 7] ; null pour les autres dossiers. */
function version(dossier: string): number[] | null {
  const m = /^v(\d+)_(\d+)_(\d+)$/.exec(dossier);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

function compare(a: number[], b: number[]): number {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i]! - b[i]!;
  return 0;
}

/** Bloc de la plus haute version qui définit module_defaults(). */
function depuisBlocs(): Record<string, boolean> | null {
  const dossiers = readdirSync(BLOCS)
    .map((d) => ({ d, v: version(d) }))
    .filter((x): x is { d: string; v: number[] } => x.v !== null)
    .sort((x, y) => compare(y.v, x.v));
  for (const { d } of dossiers) {
    const fichiers = readdirSync(join(BLOCS, d))
      .filter((f) => f.endsWith(".sql"))
      .sort()
      .reverse()
      .map((f) => join(BLOCS, d, f));
    const valeurs = lire(fichiers);
    if (valeurs) return valeurs;
  }
  return null;
}

test("valeurs par défaut des modules : code = base", () => {
  const valeurs = depuisMigrations() ?? depuisBlocs();
  assert.ok(valeurs, "module_defaults() introuvable dans les migrations ni dans les blocs");
  assert.deepEqual(valeurs, { ...defaultModuleStates });
});

test("module_defaults() : les blocs disent la même chose que les migrations", (t) => {
  const migrations = depuisMigrations();
  if (migrations === null) {
    t.skip("pas de supabase/migrations : clone du socle, les blocs font référence");
    return;
  }
  assert.deepEqual(depuisBlocs(), migrations);
});

test("lecture des versions de blocs", () => {
  assert.deepEqual(version("v1_15_7"), [1, 15, 7]);
  assert.equal(version("boutique"), null);
  assert.ok(compare([1, 10, 0], [1, 9, 0]) > 0, "1.10.0 passe après 1.9.0");
});
