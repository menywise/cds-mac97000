import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminShell, useIsAdmin } from "@/components/cds/AdminShell";
import { ConfirmButton } from "@/components/cds/ConfirmButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { requireFeature } from "@/config/features";
import { useBrandSettings } from "@/hooks/useSiteSettings";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin/messages")({
  beforeLoad: () => requireFeature("contact"),
  head: () =>
    seo({
      title: "Boîte de réception",
      description: "Messages reçus par le formulaire de contact : lire, traiter, archiver.",
      path: "/admin/messages",
      noindex: true,
    }),
  component: AdminMessagesPage,
});

type Status = "nouveau" | "traite" | "archive";

type Message = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: Status;
  created_at: string;
  handled_at: string | null;
};

const STATUS_LABEL: Record<Status, string> = {
  nouveau: "Nouveaux",
  traite: "Traités",
  archive: "Archivés",
};

const formatDate = (value: string) =>
  new Date(value).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });

function AdminMessagesPage() {
  const isAdmin = useIsAdmin();
  const { settings } = useBrandSettings();
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [status, setStatus] = useState<Status>("nouveau");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function purge() {
    const { data, error } = await supabase.rpc("purge_contact_messages");
    if (error) {
      toast.error("La purge a échoué.");
      return;
    }
    toast.success(
      data ? `${data} message${data > 1 ? "s" : ""} effacé${data > 1 ? "s" : ""}.` : "Aucun message à effacer.",
    );
    void load();
  }

  const load = useCallback(async () => {
    setLoadError(false);
    const { data, error } = await supabase
      .from("contact_messages")
      .select("id, name, email, subject, message, status, created_at, handled_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      setLoadError(true);
      setMessages([]);
      return;
    }
    setMessages((data ?? []) as Message[]);
  }, []);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  async function setMessageStatus(row: Message, next: Status) {
    setBusy(row.id);
    const { error } = await supabase
      .from("contact_messages")
      .update({ status: next })
      .eq("id", row.id);
    setBusy(null);
    if (error) {
      toast.error("La modification n'a pas pu être enregistrée.");
      return;
    }
    toast.success(
      next === "traite"
        ? "Message marqué comme traité."
        : next === "archive"
          ? "Message archivé."
          : "Message remis dans les nouveaux.",
    );
    void load();
  }

  async function remove(row: Message) {
    const { error } = await supabase.from("contact_messages").delete().eq("id", row.id);
    if (error) {
      toast.error("Suppression impossible.");
      return;
    }
    toast.success("Message supprimé.");
    void load();
  }

  const counts = (messages ?? []).reduce<Record<Status, number>>(
    (acc, row) => ({ ...acc, [row.status]: acc[row.status] + 1 }),
    { nouveau: 0, traite: 0, archive: 0 },
  );
  const query = search.trim().toLowerCase();
  const visible = (messages ?? []).filter(
    (row) =>
      row.status === status &&
      (!query ||
        [row.name, row.email, row.subject, row.message].some((v) =>
          v.toLowerCase().includes(query),
        )),
  );

  return (
    <AdminShell
      title="Boîte de réception"
      intro="Les messages envoyés par le formulaire de contact. Répondez par e-mail, puis marquez le message comme traité ; archivez ce qui n'appelle pas de réponse."
    >
      {loadError ? (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-destructive/40 p-4 text-sm text-destructive">
          Les messages n'ont pas pu être chargés.
          <button
            type="button"
            className="underline"
            onClick={() => void load()}
            title="Recharger les messages"
          >
            Réessayer
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <Tabs value={status} onValueChange={(v) => setStatus(v as Status)}>
          <TabsList>
            {(Object.keys(STATUS_LABEL) as Status[]).map((key) => (
              <TabsTrigger key={key} value={key}>
                {STATUS_LABEL[key]} {messages ? `(${counts[key]})` : ""}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="w-full space-y-1.5 sm:w-64">
          <Label htmlFor="message-search" className="sr-only">
            Rechercher un message
          </Label>
          <Input
            id="message-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un nom, une adresse, un mot"
          />
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {messages === null ? (
          <>
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </>
        ) : visible.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {query
              ? "Aucun message ne correspond à cette recherche."
              : status === "nouveau"
                ? "Aucun nouveau message. Tout est traité."
                : "Aucun message ici."}
          </p>
        ) : (
          visible.map((row) => {
            const replySubject = encodeURIComponent(`Re : ${row.subject}`);
            const replyBody = encodeURIComponent(
              `Bonjour ${row.name},\n\n\n\n— ${settings.name}\n\n> ${row.message.split("\n").join("\n> ")}`,
            );
            return (
              <article key={row.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-foreground">{row.subject}</h2>
                    <p className="mt-1 break-all text-xs text-muted-foreground">
                      {row.name} · {row.email} · {formatDate(row.created_at)}
                    </p>
                  </div>
                  {row.handled_at ? (
                    <Badge variant="secondary">Traité le {formatDate(row.handled_at)}</Badge>
                  ) : null}
                </div>
                <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">
                  {row.message}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <a
                      href={`mailto:${row.email}?subject=${replySubject}&body=${replyBody}`}
                      title={`Répondre à ${row.name} par e-mail`}
                    >
                      Répondre
                    </a>
                  </Button>
                  {row.status !== "traite" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy === row.id}
                      onClick={() => void setMessageStatus(row, "traite")}
                    >
                      Marquer comme traité
                    </Button>
                  ) : null}
                  {row.status !== "archive" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy === row.id}
                      onClick={() => void setMessageStatus(row, "archive")}
                    >
                      Archiver
                    </Button>
                  ) : null}
                  {row.status !== "nouveau" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy === row.id}
                      onClick={() => void setMessageStatus(row, "nouveau")}
                    >
                      Remettre en nouveau
                    </Button>
                  ) : null}
                  <ConfirmButton
                    title="Supprimer ce message"
                    question="Supprimer ce message ?"
                    detail="Il est effacé définitivement de la boîte de réception."
                    onConfirm={() => remove(row)}
                  />
                </div>
              </article>
            );
          })
        )}
      </div>

      <section className="mt-10 rounded-xl border border-border bg-card p-5 text-sm">
        <h2 className="text-base font-semibold text-foreground">Durée de conservation</h2>
        <p className="mt-2 text-muted-foreground">
          Comme l'annonce la politique de confidentialité, un message est effacé 3 ans après le
          dernier échange (réception ou traitement). La base fait ce ménage chaque nuit ; vous
          pouvez aussi le lancer maintenant.
        </p>
        <ConfirmButton
          label="Purger maintenant"
          title="Effacer les messages de plus de 3 ans"
          question="Effacer les messages dont le dernier échange date de plus de 3 ans ?"
          detail="Les messages plus récents ne sont pas touchés."
          confirmLabel="Purger"
          onConfirm={purge}
        />
      </section>
    </AdminShell>
  );
}
