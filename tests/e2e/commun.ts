/**
 * CDS — Réglages communs aux robots de test (recette.ts, parcours.ts) : environnement, adresse du
 * site, Supabase, état des modules, connexion des comptes de test.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isModuleOn, normalizeModules, type FeatureKey } from "../../src/config/modules.ts";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const args = process.argv.slice(2);
export const arg = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

// Variables d'environnement : .env du projet (adresse et clé publique Supabase) puis environnement.
function loadEnv() {
  const env: Record<string, string> = {};
  const file = join(ROOT, ".env");
  if (existsSync(file)) {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/.exec(line);
      if (m) env[m[1]!] = m[2]!;
    }
  }
  return { ...env, ...process.env } as Record<string, string | undefined>;
}
export const ENV = loadEnv();
export const BASE = (arg("url") ?? ENV["CDS_RECETTE_URL"] ?? "http://localhost:8080").replace(
  /\/+$/,
  "",
);
export const SUPABASE_URL = ENV["VITE_SUPABASE_URL"] ?? ENV["SUPABASE_URL"] ?? "";
export const SUPABASE_KEY =
  ENV["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? ENV["SUPABASE_PUBLISHABLE_KEY"] ?? "";
export const PROJECT_REF = /^https:\/\/([^.]+)\./.exec(SUPABASE_URL)?.[1] ?? "";
/** Moteur de rendu : chromium (défaut), firefox ou webkit (Safari). */
export const NAVIGATEUR = (arg("navigateur") ?? "chromium") as "chromium" | "firefox" | "webkit";
/** Options Chromium facultatives, ex. derrière un proxy d'entreprise qui réécrit TLS. */
export const CHROMIUM_ARGS = (ENV["CDS_RECETTE_CHROMIUM_ARGS"] ?? "").split(" ").filter(Boolean);

export async function modulesState(): Promise<Record<string, boolean>> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/site_settings?select=value&key=eq.modules`, {
    headers: { apikey: SUPABASE_KEY },
  });
  const rows = (await res.json()) as Array<{ value: Record<string, boolean> }>;
  return rows[0]?.value ?? {};
}

/** Même règle que le site : valeurs par défaut pour les clés absentes, dépendances respectées. */
export function moduleOn(states: Record<string, boolean>, key: string): boolean {
  return isModuleOn(normalizeModules(states), key as FeatureKey);
}

export type Session = Record<string, unknown> & { access_token: string; user: { id: string } };

/**
 * Compte de test réel (secrets CDS_RECETTE_MEMBRE_EMAIL / _MDP, CDS_RECETTE_ADMIN_EMAIL / _MDP).
 * null si le compte n'est pas fourni.
 */
export async function realSession(role: "membre" | "admin"): Promise<Session | null> {
  const email = ENV[`CDS_RECETTE_${role.toUpperCase()}_EMAIL`];
  const password = ENV[`CDS_RECETTE_${role.toUpperCase()}_MDP`];
  if (!email || !password) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Connexion ${role} refusée (${res.status})`);
  return (await res.json()) as Session;
}

/** Clé de stockage de la session Supabase dans le navigateur. */
export const AUTH_STORAGE_KEY = `sb-${PROJECT_REF}-auth-token`;
