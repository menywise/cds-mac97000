import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, CheckCheck } from "lucide-react";
import { PageShell } from "@/components/cds/SiteHeader";
import { ReportButton } from "@/components/cds/ReportButton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { seo } from "@/lib/seo";
import { requireFeature } from "@/config/features";

export const Route = createFileRoute("/_authenticated/messagerie/$conversationId")({
  beforeLoad: () => requireFeature("messaging"),
  head: () =>
    seo({
      title: "Conversation",
      description: "Échange privé entre membres de la communauté.",
      path: "/messagerie",
      noindex: true,
    }),
  component: ConversationPage,
});

type Message = {
  id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
};

/** Regroupe les événements rapprochés (plusieurs messages marqués lus d'un coup) en un seul rechargement. */
const DELAI_MS = 300;

const heure = (iso: string) =>
  new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

function ConversationPage() {
  const { conversationId } = Route.useParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [otherName, setOtherName] = useState("Membre");
  const [otherId, setOtherId] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId) return;
    let active = true;
    void (async () => {
      const { data: conversation } = await supabase
        .from("conversations")
        .select("id, user_a, user_b")
        .eq("id", conversationId)
        .maybeSingle();
      if (!conversation || !active) return;
      const other = conversation.user_a === userId ? conversation.user_b : conversation.user_a;
      setOtherId(other);
      const { data: profile } = await supabase
        .from("member_profiles")
        .select("display_name")
        .eq("user_id", other)
        .maybeSingle();
      if (active && profile?.display_name) setOtherName(profile.display_name);
    })();
    return () => {
      active = false;
    };
  }, [conversationId, userId]);

  /** Messages du fil ; ceux reçus passent à « lu » seulement si la page est sous les yeux du membre. */
  const loadMessages = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, content, read_at, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    setMessages(data ?? []);

    if (document.visibilityState !== "visible") return;
    const unread = (data ?? []).some((m) => m.sender_id !== userId && !m.read_at);
    if (!unread) return;
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .neq("sender_id", userId)
      .is("read_at", null);
  }, [conversationId, userId]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  // Temps réel (socle 1.8.0) : message reçu ou lu par l'autre membre, sans recharger la page.
  useEffect(() => {
    if (!userId) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => void loadMessages(), DELAI_MS);
        },
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    const onVisible = () => {
      if (document.visibilityState === "visible") void loadMessages();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      setLive(false);
      void supabase.removeChannel(channel);
    };
  }, [conversationId, userId, loadMessages]);

  // Fil descendu au dernier message à chaque nouveau message, pas à chaque accusé de lecture.
  const count = messages?.length ?? 0;
  useEffect(() => {
    if (count > 0) endRef.current?.scrollIntoView({ block: "end" });
  }, [count]);

  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    const form = e.currentTarget;
    const content = String(new FormData(form).get("content") ?? "").trim();
    if (!content) return;
    setBusy(true);
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content,
    });
    setBusy(false);
    if (error) {
      toast.error("Message non envoyé.", { description: "Réessayez dans un instant." });
      return;
    }
    form.reset();
    await loadMessages();
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-[760px]">
        <Link
          to="/messagerie"
          title="Revenir à toutes mes conversations"
          className="text-xs font-medium text-primary-text hover:underline"
        >
          ← Ma messagerie
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold text-foreground">{otherName}</h1>
          <div className="flex items-center gap-3">
            {live ? (
              <span
                title="Les nouveaux messages s'affichent sans recharger la page"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
                En direct
              </span>
            ) : null}
            {otherId ? (
              <ReportButton contentType="membre" contentId={otherId} label="Signaler ce membre" />
            ) : null}
          </div>
        </div>

        {messages === null ? (
          <p className="mt-6 text-sm text-muted-foreground">Chargement de la conversation…</p>
        ) : messages.length === 0 ? (
          <p className="mt-6 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Aucun message. Lancez-vous : une phrase claire suffit.
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {messages.map((message) => {
              const mine = message.sender_id === user?.id;
              return (
                <li
                  key={message.id}
                  className={`max-w-[85%] rounded-xl border p-3 text-sm ${
                    mine
                      ? "ml-auto border-primary bg-accent text-foreground"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  <p className="whitespace-pre-line">{message.content}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                    <span>{new Date(message.created_at).toLocaleString("fr-FR")}</span>
                    {mine ? (
                      <span className="inline-flex items-center gap-1">
                        {message.read_at ? (
                          <>
                            <CheckCheck className="size-3.5" aria-hidden="true" />
                            Vu à {heure(message.read_at)}
                          </>
                        ) : (
                          <>
                            <Check className="size-3.5" aria-hidden="true" />
                            Envoyé
                          </>
                        )}
                      </span>
                    ) : null}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
        <div ref={endRef} />

        <form onSubmit={send} className="mt-6 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="message">Votre message</Label>
            <Textarea
              id="message"
              name="content"
              rows={3}
              required
              placeholder="Écrivez votre message…"
            />
          </div>
          <Button type="submit" disabled={busy} title="Envoyer votre message">
            {busy ? "Envoi…" : "Envoyer"}
          </Button>
        </form>
      </div>
    </PageShell>
  );
}
