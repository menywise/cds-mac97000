import { useEffect, useState } from "react";
import { isFeatureOn } from "@/config/features";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/** Regroupe les événements rapprochés (plusieurs messages marqués lus d'un coup) en un seul comptage. */
const DELAI_MS = 300;

/**
 * Nombre de messages reçus et non lus, actualisé en direct (socle 1.8.0). Les règles d'accès de la
 * table limitent le comptage et les événements temps réel aux conversations du membre connecté.
 */
export function useUnreadMessages(): number {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId || !isFeatureOn("messaging")) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function refresh() {
      const { count: unread } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .neq("sender_id", userId!)
        .is("read_at", null);
      if (active) setCount(unread ?? 0);
    }

    void refresh();
    const channel = supabase
      .channel(`messages-non-lus:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => void refresh(), DELAI_MS);
      })
      .subscribe();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return userId ? count : 0;
}
