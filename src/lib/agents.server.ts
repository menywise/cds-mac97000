/**
 * Co-intervenants IA, côté serveur (socle 1.17.0) : authentifier une clé reçue dans l'en-tête
 * x-agent-key, exécuter une action déclarée par la greffe, journaliser ce qu'elle écrit. Les
 * actions sont celles de `GREFFE.actionsAgent` ; le socle n'en connaît qu'une, « aide », qui dit à
 * la clé ce qu'elle peut faire. Toute écriture passe par `journaliser`, qui appelle
 * agent_journaliser() dans la base (rôle de service seul). Socle 1.21.0 : la clé est identifiée par
 * agent_identifier(), qui rend aussi son usage ; une clé d'usage ne fait que les actions de son
 * usage (`cleAutorisee`).
 */
import { GREFFE } from "@/greffe";
import type { ActionAgent, ContexteActionAgent } from "@/config/greffe";
import { cleAutorisee, hacherCle, type NiveauCle } from "@/lib/agents";

export type AgentAuthentifie = {
  id: string;
  nom: string;
  niveau: NiveauCle;
  usage_code: string | null;
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** La clé de l'en-tête, si elle est active et dans sa période ; sinon null. */
export async function authentifierAgent(cle: string): Promise<AgentAuthentifie | null> {
  if (!cle.trim()) return null;
  const db = await admin();
  const { data, error } = await db.rpc("agent_identifier", { _cle_hash: await hacherCle(cle) });
  if (error || !data || data.length === 0) return null;
  const ligne = data[0] as { id: string; nom: string; niveau: string; usage_code: string | null };
  // Un niveau inconnu ne passe pas cleAutorisee : la clé ne fait alors que « aide ».
  return {
    id: ligne.id,
    nom: ligne.nom,
    niveau: ligne.niveau as NiveauCle,
    usage_code: ligne.usage_code ?? null,
  };
}

/** Les actions ouvertes : « aide » du socle, puis celles de la greffe. */
export function actionsDeclarees(): Record<string, ActionAgent> {
  return { ...(GREFFE.actionsAgent ?? {}) };
}

export async function executerAction(
  agent: AgentAuthentifie,
  action: string,
  params: unknown,
): Promise<unknown> {
  const actions = actionsDeclarees();
  if (action === "aide") {
    return {
      agent: agent.nom,
      niveau: agent.niveau,
      ...(agent.usage_code ? { usage: agent.usage_code } : {}),
      actions: Object.entries(actions)
        .filter(([, a]) => cleAutorisee(agent, a))
        .map(([nom, a]) => ({
          nom,
          ...(a.usage ? { usage: a.usage } : { niveau: a.niveau }),
          description: a.description,
        })),
    };
  }
  const declaree = actions[action];
  if (!declaree) throw new Error(`Action inconnue : ${action}`);
  if (!cleAutorisee(agent, declaree))
    throw new Error(
      declaree.usage
        ? `Action réservée aux clés d'usage « ${declaree.usage} »`
        : `Action réservée aux clés de niveau « ${declaree.niveau} »`,
    );
  const db = await admin();
  const contexte: ContexteActionAgent = {
    agent,
    params,
    journaliser: async (entree) => {
      const args: {
        _cle_id: string;
        _action: string;
        _table_cible: string;
        _ligne_id?: string;
        _champ?: string;
        _avant?: string;
        _apres?: string;
      } = { _cle_id: agent.id, _action: action, _table_cible: entree.table_cible };
      if (entree.ligne_id) args._ligne_id = entree.ligne_id;
      if (entree.champ) args._champ = entree.champ;
      if (entree.avant != null) args._avant = entree.avant;
      if (entree.apres != null) args._apres = entree.apres;
      const { error } = await db.rpc("agent_journaliser", args);
      if (error) throw new Error(`Journal des agents : ${error.message}`);
    },
  };
  return declaree.executer(contexte);
}
