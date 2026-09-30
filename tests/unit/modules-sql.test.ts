/**
 * Les modules du code (src/config/modules.ts) et leurs valeurs par défaut en base
 * (public.module_defaults(), dernière migration qui la définit) doivent rester identiques.
 * Lancer : node --test tests/unit/*.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { defaultModuleStates } from "../../src/config/modules.ts";

const dir = join(import.meta.dirname, "..", "..", "supabase", "migrations");

function latestSqlDefaults(): Record<string, boolean> {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .reverse();
  for (const f of files) {
    const sql = readFileSync(join(dir, f), "utf8");
    const m = /FUNCTION public\.module_defaults\(\)[\s\S]*?SELECT '(\{[\s\S]*?\})'::jsonb/.exec(sql);
    if (m) return JSON.parse(m[1]!) as Record<string, boolean>;
  }
  throw new Error("module_defaults() introuvable dans les migrations");
}

test("valeurs par défaut des modules : code = base", () => {
  assert.deepEqual(latestSqlDefaults(), { ...defaultModuleStates });
});
