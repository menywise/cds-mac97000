/**
 * Capture d'écran jointe à un signalement (socle 1.19.0) : règles pures, partagées par la fenêtre
 * de signalement, l'écran Admin → Signalements et les tests. Mêmes bornes que la base (dossier
 * privé `signalements-captures`, `report_capture_permise`). Copie exacte dans les installations
 * (depuis le 22/11/2026), avec `captures-navigateur.ts`.
 *
 * Fichier sans dépendance ni alias « @/ » : lu aussi par Node (tests unitaires).
 */

/** Dossier privé des captures : lu des seuls administrateurs. */
export const CAPTURE_DOSSIER = "signalements-captures";
/** Taille maximale du fichier envoyé, après réécriture par le navigateur (même borne qu'en base). */
export const CAPTURE_TAILLE_MAX = 2 * 1024 * 1024;
/** Taille maximale du fichier choisi, avant réécriture : une capture de grand écran tient dedans. */
export const CAPTURE_TAILLE_CHOISIE_MAX = 15 * 1024 * 1024;
/** Types admis par la base. */
export const CAPTURE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
/** Plus grand côté de l'image envoyée, en pixels. */
export const CAPTURE_COTE_MAX = 2000;
/** Délai pour joindre la capture après l'envoi du signalement (même délai qu'en base). */
export const CAPTURE_DELAI_MINUTES = 15;
/** Durée de validité du lien signé ouvert par un administrateur, en secondes. */
export const CAPTURE_LIEN_SECONDES = 300;

/**
 * Clé d'un signalement : son code de suivi (socle, 10 caractères hexadécimaux en majuscules) ou
 * son identifiant (installation dont les signalements portent un UUID choisi par le navigateur).
 */
const CODE = /^(?:[0-9A-F]{10}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;

/** Nom du fichier de la capture d'un signalement, ou null si sa clé est mal formée. */
export function cheminCapture(code: string): string | null {
  return CODE.test(code) ? `${code}/capture` : null;
}

/** Clé du signalement lue dans le nom d'un fichier du dossier, ou null. */
export function codeDeCapture(nom: string): string | null {
  const [code = "", fichier, ...reste] = nom.split("/");
  return CODE.test(code) && fichier === "capture" && reste.length === 0 ? code : null;
}

/** Fichier choisi par la personne qui signale : message d'erreur lisible, ou null s'il convient. */
export function refusCapture(fichier: { type: string; size: number }): string | null {
  if (!(CAPTURE_TYPES as readonly string[]).includes(fichier.type)) {
    return "Choisissez une image PNG, JPEG ou WebP.";
  }
  if (fichier.size > CAPTURE_TAILLE_CHOISIE_MAX) {
    return "Cette image est trop lourde : 15 Mo au plus.";
  }
  if (fichier.size === 0) return "Ce fichier est vide.";
  return null;
}

/** Dimensions réduites pour que le plus grand côté tienne dans `max`, proportions gardées. */
export function dimensionsReduites(
  largeur: number,
  hauteur: number,
  max = CAPTURE_COTE_MAX,
): { largeur: number; hauteur: number } {
  const plusGrand = Math.max(largeur, hauteur);
  if (plusGrand <= max || plusGrand <= 0) return { largeur, hauteur };
  const ratio = max / plusGrand;
  return {
    largeur: Math.max(1, Math.round(largeur * ratio)),
    hauteur: Math.max(1, Math.round(hauteur * ratio)),
  };
}

/** Taille lisible : « 850 Ko », « 1,4 Mo ». */
export function tailleLisible(octets: number): string {
  if (octets < 1024 * 1024) return `${Math.max(1, Math.round(octets / 1024))} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}
