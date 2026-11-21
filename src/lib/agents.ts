/**
 * Co-intervenants IA (socle 1.17.0) : règles pures, partagées par l'écran d'administration, l'entrée
 * /api/agent et les tests. Une clé sert si elle est active et si son dernier jour (`expire_le`,
 * heure de Paris) n'est pas passé. Trois niveaux, du plus étroit au plus large : lecture, compléter
 * (remplir des cases vides), corriger (modifier, supprimer). La clé en clair n'est montrée qu'à sa
 * création ; la base ne garde que son empreinte SHA-256.
 *
 * Fichier sans alias « @/ » : lu aussi par Node (tests unitaires).
 */
export const NIVEAUX_AGENT = ["lecture", "completer", "corriger"] as const;
export type NiveauAgent = (typeof NIVEAUX_AGENT)[number];

export const LIBELLES_NIVEAU: Record<NiveauAgent, string> = {
  lecture: "Lecture",
  completer: "Compléter",
  corriger: "Corriger",
};

export type CleAgent = {
  nom: string;
  niveau: NiveauAgent;
  actif: boolean;
  usage: string | null;
  utilisateur: string | null;
  expire_le: string | null;
  last_used_at: string | null;
};

/** Jour courant à Paris, au format AAAA-MM-JJ. */
export function jourParis(maintenant: Date = new Date()): string {
  return maintenant.toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
}

/** Vrai si la clé est active et si son dernier jour n'est pas passé. */
export function cleUtilisable(
  cle: Pick<CleAgent, "actif" | "expire_le">,
  maintenant: Date = new Date(),
): boolean {
  if (!cle.actif || !cle.expire_le) return false;
  return cle.expire_le.slice(0, 10) >= jourParis(maintenant);
}

/** Vrai si une clé du niveau `cle` peut faire une action qui demande le niveau `requis`. */
export function niveauSuffit(cle: NiveauAgent, requis: NiveauAgent): boolean {
  return NIVEAUX_AGENT.indexOf(cle) >= NIVEAUX_AGENT.indexOf(requis);
}

/** Clés utilisables d'abord, puis par nom. */
export function trierCles<T extends CleAgent>(cles: readonly T[], maintenant = new Date()): T[] {
  return [...cles].sort((a, b) => {
    const ua = cleUtilisable(a, maintenant) ? 0 : 1;
    const ub = cleUtilisable(b, maintenant) ? 0 : 1;
    return ua - ub || a.nom.localeCompare(b.nom, "fr");
  });
}

/** Une clé neuve : 32 octets aléatoires en base64 URL (43 caractères). */
export function genererCle(aleatoire: (n: number) => Uint8Array = aleatoireDuNavigateur): string {
  const octets = aleatoire(32);
  let binaire = "";
  for (const o of octets) binaire += String.fromCharCode(o);
  return btoa(binaire).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function aleatoireDuNavigateur(n: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n));
}

/** Empreinte SHA-256 de la clé, en hexadécimal : ce que la base garde. */
export async function hacherCle(cle: string): Promise<string> {
  const octets = new TextEncoder().encode(cle);
  const empreinte = await crypto.subtle.digest("SHA-256", octets);
  return [...new Uint8Array(empreinte)].map((o) => o.toString(16).padStart(2, "0")).join("");
}
