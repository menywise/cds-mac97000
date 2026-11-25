/**
 * Co-intervenants IA (socle 1.17.0) : règles pures, partagées par l'écran d'administration, l'entrée
 * /api/agent et les tests. Une clé sert si elle est active et si son dernier jour (`expire_le`,
 * heure de Paris) n'est pas passé. Trois niveaux, du plus étroit au plus large : lecture, compléter
 * (remplir des cases vides), corriger (modifier, supprimer). À côté de cette échelle, une clé
 * d'usage (socle 1.21.0, niveau « usage ») ne sert qu'un usage nommé (`usage_code`) : elle ne fait
 * que les actions déclarées pour cet usage, et aucune clé de l'échelle ne les fait. La clé en clair
 * n'est montrée qu'à sa création ; la base ne garde que son empreinte SHA-256.
 *
 * Fichier sans alias « @/ » : lu aussi par Node (tests unitaires).
 */
export const NIVEAUX_AGENT = ["lecture", "completer", "corriger"] as const;
export type NiveauAgent = (typeof NIVEAUX_AGENT)[number];

/** Niveau d'une clé hors échelle, qui ne sert qu'un usage nommé (socle 1.21.0). */
export const NIVEAU_USAGE = "usage";
/** Niveau enregistré d'une clé : un mot de l'échelle, ou « usage ». */
export type NiveauCle = NiveauAgent | typeof NIVEAU_USAGE;

export const LIBELLES_NIVEAU: Record<NiveauCle, string> = {
  lecture: "Lecture",
  completer: "Compléter",
  corriger: "Corriger",
  usage: "Clé d'usage",
};

/** Nom d'un usage : minuscules, chiffres et tiret bas, 2 à 40 caractères (contrainte de la base). */
export const MOTIF_USAGE = /^[a-z][a-z0-9_]{1,39}$/;

/** Ce qu'une action exige : un niveau de l'échelle, ou un usage nommé. */
export type ExigenceAgent = { niveau: NiveauAgent } | { usage: string };

export type CleAgent = {
  nom: string;
  niveau: NiveauCle;
  /** Nom de l'usage d'une clé de niveau « usage » ; null pour une clé de l'échelle. */
  usage_code?: string | null;
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
  const rang = NIVEAUX_AGENT.indexOf(cle);
  return rang >= 0 && rang >= NIVEAUX_AGENT.indexOf(requis);
}

/** Vrai si le texte est un mot de l'échelle. */
export function estNiveauEchelle(niveau: string): niveau is NiveauAgent {
  return (NIVEAUX_AGENT as readonly string[]).includes(niveau);
}

/**
 * Vrai si la clé peut faire une action qui a cette exigence. Une clé de l'échelle fait les actions
 * de son niveau et en dessous, jamais celles d'un usage. Une clé d'usage ne fait que les actions de
 * son usage. Un niveau inconnu ne fait rien.
 */
export function cleAutorisee(
  cle: { niveau: string; usage_code?: string | null },
  exigence: ExigenceAgent,
): boolean {
  if ("usage" in exigence)
    return cle.niveau === NIVEAU_USAGE && !!cle.usage_code && cle.usage_code === exigence.usage;
  return estNiveauEchelle(cle.niveau) && niveauSuffit(cle.niveau, exigence.niveau);
}

/** Usages nommés par des actions déclarées, triés, sans doublon. */
export function usagesDeclares(actions: Readonly<Record<string, ExigenceAgent>>): string[] {
  const usages = new Set<string>();
  for (const a of Object.values(actions)) if ("usage" in a) usages.add(a.usage);
  return [...usages].sort();
}

/** Libellé d'une clé : son niveau, ou « Clé d'usage : <usage> ». */
export function libelleCle(cle: { niveau: string; usage_code?: string | null }): string {
  if (cle.niveau === NIVEAU_USAGE) return `${LIBELLES_NIVEAU.usage} : ${cle.usage_code ?? "?"}`;
  return estNiveauEchelle(cle.niveau) ? LIBELLES_NIVEAU[cle.niveau] : cle.niveau;
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
