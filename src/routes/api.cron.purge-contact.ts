import { createFileRoute } from "@tanstack/react-router";

/**
 * Purge planifiée des messages de contact (politique de confidentialité : 3 ans).
 * POST /api/cron/purge-contact, appelée chaque nuit par les tâches planifiées de Lovable
 * (en-tête « Authorization: Bearer <LOVABLE_CRON_SECRET> »). Sert quand pg_cron n'est pas
 * activé dans la base ; sinon la base fait déjà ce ménage seule. Sans effet si rejouée.
 */
export const Route = createFileRoute("/api/cron/purge-contact")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { authenticateCronRequest } = await import("@/integrations/supabase/cron-auth");
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("purge_contact_messages");
        if (error) {
          return new Response(JSON.stringify({ error: "Purge impossible" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ purged: data ?? 0 }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
