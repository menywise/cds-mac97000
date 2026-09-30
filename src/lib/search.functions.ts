import { createServerFn } from "@tanstack/react-start";
import { publicClient } from "@/lib/supabase-public";
import { cleanSearch, type SearchResult } from "@/lib/search";

/** Recherche dans les contenus publics, avec les droits d'un visiteur. */
export const searchSite = createServerFn({ method: "GET" })
  .inputValidator((input: { q: string }) => ({ q: cleanSearch(input?.q) }))
  .handler(async ({ data }): Promise<{ results: SearchResult[]; failed: boolean }> => {
    if (data.q.length < 2) return { results: [], failed: false };
    const { data: rows, error } = await publicClient().rpc("search_site", {
      _q: data.q,
      _limit: 30,
    });
    if (error) return { results: [], failed: true };
    return {
      results: (rows ?? []).map((r) => ({
        kind: r.kind,
        title: r.title,
        excerpt: r.excerpt,
        url: r.url,
      })),
      failed: false,
    };
  });
