import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adresseVerifiable, etatDepuisReponse, type EtatLien } from "@/lib/sources-verif";

/** Adresses vérifiées par appel : les plus anciennes ou jamais vérifiées d'abord. */
const PAR_APPEL = 30;
/** Délai d'attente d'une adresse. */
const DELAI_MS = 8000;

async function verifier(url: string): Promise<EtatLien> {
  if (!adresseVerifiable(url)) {
    return {
      url,
      ok: false,
      code_http: null,
      erreur: "Adresse non vérifiable (locale, privée ou non https)",
    };
  }
  const essai = async (method: "HEAD" | "GET") => {
    const arret = new AbortController();
    const minuterie = setTimeout(() => arret.abort(), DELAI_MS);
    try {
      const r = await fetch(url, {
        method,
        redirect: "follow",
        signal: arret.signal,
        headers: { "User-Agent": "verification-sources/1.0" },
      });
      return r.status;
    } finally {
      clearTimeout(minuterie);
    }
  };
  try {
    let statut = await essai("HEAD");
    // Certains sites refusent HEAD : une seconde chance en GET.
    if (statut === 405 || statut === 403 || statut === 501) statut = await essai("GET");
    return etatDepuisReponse(url, statut);
  } catch (e) {
    const delai = e instanceof Error && e.name === "AbortError";
    return {
      url,
      ok: false,
      code_http: null,
      erreur: delai ? "Pas de réponse en 8 secondes" : "Site injoignable",
    };
  }
}

/**
 * Vérifie les liens de sources des contenus, 30 à la fois (socle 1.12.0). Réservé aux rédacteurs et
 * aux administrateurs : la base revérifie le droit en enregistrant le résultat.
 */
export const verifierLiensSources = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: urls, error } = await context.supabase.rpc("sources_a_verifier");
    if (error) throw new Error("Réservé aux rédacteurs et aux administrateurs.");
    const lot = (urls ?? []).slice(0, PAR_APPEL).map((u) => u.url);
    const etats = await Promise.all(lot.map(verifier));
    if (etats.length) {
      const { error: e2 } = await context.supabase.rpc("enregistrer_liens_sources", {
        _etats: etats,
      });
      if (e2) throw new Error("Résultats non enregistrés.");
    }
    return {
      verifiees: etats.length,
      injoignables: etats.filter((e) => !e.ok).length,
      restantes: Math.max(0, (urls ?? []).length - etats.length),
    };
  });
