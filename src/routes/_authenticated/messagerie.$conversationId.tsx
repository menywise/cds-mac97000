import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Flag, Check, CheckCheck } from "lucide-react";
import { PageShell } from "@/components/cds/SiteHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/messagerie/$conversationId")({
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

function ConversationPage() {
  const { conversationId } = Route.useParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [otherName, setOtherName] = useState("Membre");
  const [busy, setBusy] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const load = useCallback(async () => {
    if (!user) return;
    const { data: conversation } = await supabase
      .from("conversations")
      .select("id, user_a, user_b")
      .eq("id", conversationId)
      .maybeSingle();

    if (conversation) {
      const otherId = conversation.user_a === user.id ? conversation.user_b : conversation.user_a;
      const { data: profile } = await supabase
        .from("member_profiles")
        .select("display_name")
        .eq("user_id", otherId)
        .maybeSingle();
      if (profile?.display_name) setOtherName(profile.display_name);
    }

    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, content, read_at, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    setMessages(data ?? []);

    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .neq("sender_id", user.id)
      .is("read_at", null);
  }, [conversationId, user]);

  useEffect(() => {
    void load();
  }, [load]);

  // Niveau 1 — Abonnement Temps Réel Supabase (WebSockets)
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          void load();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, load]);

  // Auto-scroll au bas du fil
  useEffect(() => {
    if (messages) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

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
    await load();
  }

  // Niveau 3 — Signalement d'un message inapproprié
  async function reportMessage(msgId: string, content: string) {
    if (!user) return;
    const { error } = await supabase.from("contact_messages").insert({
      name: user.email ?? "Membre",
      email: user.email ?? "membre@communaute.cds",
      subject: `[Signalement Messagerie] Message ID: ${msgId}`,
      message: `Message signalé dans la conversation ${conversationId} :\n"${content}"`,
    });
    if (error) {
      toast.error("Signalement non transmis.");
    } else {
      toast.success("Signalement transmis à l'équipe de modération.");
    }
  }

  return (
    <PageShell>
      <div className="mx-auto flex max-w-[760px] flex-col min-h-[70vh]">
        <Link
          to="/messagerie"
          title="Revenir à toutes mes conversations"
          className="text-xs font-medium text-primary-text hover:underline"
        >
          ← Ma messagerie
        </Link>
        <div className="mt-3 flex items-center justify-between border-b border-border pb-3">
          <h1 className="text-2xl font-bold text-foreground">{otherName}</h1>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            En direct
          </span>
        </div>

        <div className="mt-6 flex-1 overflow-y-auto space-y-3 pr-1">
          {messages === null ? (
            <p className="text-sm text-muted-foreground">Chargement de la conversation…</p>
          ) : messages.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Aucun message. Lancez-vous : une phrase claire suffit.
            </p>
          ) : (
            messages.map((message) => {
              const mine = message.sender_id === user?.id;
              return (
                <div
                  key={message.id}
                  className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl border p-3 text-sm ${
                      mine
                        ? "border-primary bg-accent text-foreground"
                        : "border-border bg-card text-muted-foreground"
                    }`}
                  >
                    <p className="whitespace-pre-line">{message.content}</p>
                    <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span>{new Date(message.created_at).toLocaleString("fr-FR")}</span>
                      {mine ? (
                        <span className="inline-flex items-center gap-1 font-medium">
                          {message.read_at ? (
                            <>
                              <CheckCheck className="size-3.5 text-primary-text" />
                              <span>
                                Vu à{" "}
                                {new Date(message.read_at).toLocaleTimeString("fr-FR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </>
                          ) : (
                            <>
                              <Check className="size-3.5" />
                              <span>Envoyé</span>
                            </>
                          )}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => reportMessage(message.id, message.content)}
                          title="Signaler ce message à l'administration"
                          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Flag className="size-3" />
                          Signaler
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={send} className="mt-6 space-y-3 pt-3 border-t border-border">
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
