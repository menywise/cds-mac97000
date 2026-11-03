/**
 * Vérification des liens de sources (socle 1.12.0) : règles sans dépendance. Le serveur appelle
 * des adresses saisies par un rédacteur : seules les adresses https publiques sont appelées, jamais
 * une adresse locale, privée ou donnée par une adresse IP (protection contre l'appel de services
 * internes depuis le serveur).
 */

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

/** Vrai si l'adresse peut être appelée par le serveur. */
export function adresseVerifiable(url: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" || u.username || u.password) return false;
  if (u.port && u.port !== "443") return false;
  const hote = u.hostname.toLowerCase();
  if (!hote.includes(".") || hote.startsWith("[") || IPV4.test(hote)) return false;
  return !/(^|\.)(localhost|local|internal|intranet|lan|home|corp)$/.test(hote);
}

/** Résultat d'une vérification, tel que la base l'enregistre. */
export type EtatLien = { url: string; ok: boolean; code_http: number | null; erreur: string };

/** Lecture d'une réponse : en dessous de 400, le lien répond. */
export function etatDepuisReponse(url: string, statut: number): EtatLien {
  const ok = statut < 400;
  return {
    url,
    ok,
    code_http: statut,
    erreur: ok
      ? ""
      : statut === 404 || statut === 410
        ? "Page introuvable"
        : statut === 401 || statut === 403
          ? "Accès refusé au vérificateur (à contrôler à la main)"
          : `Réponse ${statut}`,
  };
}
