import { createFileRoute } from "@tanstack/react-router";

/**
 * Entrée des co-intervenants IA (socle 1.17.0).
 * Requête : POST, en-tête « x-agent-key », corps JSON { "action": "...", "params": { ... } }.
 * Le socle authentifie la clé (agent_cles) et journalise ; l'installation déclare les actions dans
 * sa prise de greffe (src/greffe/index.ts, actionsAgent). Sans action déclarée, seule « aide » répond.
 */
export const Route = createFileRoute("/api/agent")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { authentifierAgent, executerAction } = await import("@/lib/agents.server");
        const agent = await authentifierAgent(request.headers.get("x-agent-key") ?? "");
        if (!agent)
          return Response.json({ erreur: "Clé d'agent absente ou refusée" }, { status: 401 });
        let body: { action?: unknown; params?: unknown };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return Response.json({ erreur: "Corps JSON illisible" }, { status: 400 });
        }
        if (typeof body.action !== "string")
          return Response.json({ erreur: "Champ « action » manquant" }, { status: 400 });
        try {
          const resultat = await executerAction(agent, body.action, body.params);
          return Response.json({ ok: true, resultat });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Erreur inconnue";
          return Response.json({ ok: false, erreur: message }, { status: 400 });
        }
      },
    },
  },
});
