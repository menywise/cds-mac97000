import { defineTool } from "@lovable.dev/mcp-js";
import { requireAdmin } from "../guard";
import { errorResult, textResult } from "../supabase";

const TABLES = [
  "contenus_publics",
  "blog_comments",
  "faq_items",
  "pricing_plans",
  "reviews",
  "testimonials",
  "forum_categories",
  "forum_topics",
  "forum_replies",
  "member_profiles",
  "newsletter_subscribers",
  "contact_messages",
  "roadmap_items",
  "masterplan_sections",
  "template_checks",
  "audits",
] as const;

export default defineTool({
  name: "site_overview",
  title: "État des fonctionnalités",
  description:
    "Donne le volume de contenus et d'activité par module (blog, FAQ, offres, avis, témoignages, forum, membres, messages, pilotage) pour repérer les briques vides ou inactives.",
  inputSchema: {},
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    try {
      const supabase = await requireAdmin(ctx);
      const counts: Record<string, number | string> = {};
      for (const table of TABLES) {
        const { count, error } = await supabase
          .from(table)
          .select("*", { count: "exact", head: true });
        counts[table] = error ? `erreur: ${error.message}` : (count ?? 0);
      }
      return textResult({ volumes: counts });
    } catch (e) {
      return errorResult((e as Error).message);
    }
  },
});
