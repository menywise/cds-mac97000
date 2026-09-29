import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isFeatureOn } from "@/config/features";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { REPORT_REASONS, type ReportContentType } from "@/lib/reports";

const TRIGGER =
  "inline-flex min-h-11 items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground";

/**
 * Bouton discret « Signaler » + fenêtre de signalement (repris de Goldwing).
 * Membres connectés seulement ; l'auteur du contenu ne sait jamais qui a signalé.
 * Invisible si le module « Signalements » est éteint ou sur son propre contenu.
 */
export function ReportButton({
  contentType,
  contentId = null,
  authorId = null,
  label = "Signaler",
  className = "",
}: {
  contentType: ReportContentType;
  contentId?: string | null;
  /** Auteur du contenu : le bouton est masqué pour lui. */
  authorId?: string | null;
  label?: string;
  className?: string;
}) {
  const { user } = useAuth();
  const pathname = useLocation({ select: (l) => l.pathname });
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!isFeatureOn("reports")) return null;
  if (user && authorId && user.id === authorId) return null;

  if (!user) {
    return (
      <Link
        to="/login"
        search={{ next: pathname }}
        title="Connectez-vous pour signaler ce contenu"
        className={`${TRIGGER} ${className}`}
      >
        <Flag className="size-3.5" aria-hidden="true" />
        {label}
      </Link>
    );
  }

  const close = (value: boolean) => {
    setOpen(value);
    if (!value) {
      setReason("");
      setDetails("");
      setSent(false);
    }
  };

  async function send() {
    if (!user) return;
    if (!reason) {
      toast.info("Indiquez le motif du signalement.");
      return;
    }
    setSending(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      content_type: contentType,
      content_id: contentId,
      reason,
      details: details.trim().slice(0, 2000) || null,
      reported_url: pathname.slice(0, 500),
    });
    setSending(false);
    if (error) {
      const message =
        error.code === "23505"
          ? "Vous avez déjà signalé ce contenu : l'équipe l'examine."
          : error.message.includes("Trop de signalements")
            ? "Trop de signalements aujourd'hui : réessayez demain."
            : "Envoi impossible pour le moment.";
      toast.error(message);
      return;
    }
    setSent(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Signaler ce contenu à l'équipe"
        className={`${TRIGGER} ${className}`}
      >
        <Flag className="size-3.5" aria-hidden="true" />
        {label}
      </button>
      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Signaler un contenu</DialogTitle>
            <DialogDescription>
              Votre signalement reste confidentiel : l'auteur ne saura pas qui l'a envoyé.
            </DialogDescription>
          </DialogHeader>
          {sent ? (
            <div className="space-y-4">
              <p className="text-sm text-foreground">
                Merci. L'équipe examine votre signalement dans les meilleurs délais.
              </p>
              <Button onClick={() => close(false)} title="Fermer la fenêtre">
                Fermer
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              <fieldset>
                <legend className="text-sm font-semibold text-foreground">
                  Pourquoi signalez-vous ce contenu ?
                </legend>
                <div className="mt-3 space-y-2">
                  {REPORT_REASONS.map((r) => (
                    <label
                      key={r.value}
                      className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-input px-3 py-2 text-sm hover:bg-accent"
                    >
                      <input
                        type="radio"
                        name="report_reason"
                        value={r.value}
                        checked={reason === r.value}
                        onChange={() => setReason(r.value)}
                        className="accent-primary"
                      />
                      <span>{r.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div>
                <label htmlFor="report-details" className="text-sm font-semibold text-foreground">
                  Précisions (facultatif)
                </label>
                <textarea
                  id="report-details"
                  rows={4}
                  maxLength={2000}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Décrivez brièvement le problème."
                  className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <Button disabled={sending || !reason} onClick={send} title="Envoyer le signalement">
                {sending ? "Envoi…" : "Envoyer le signalement"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
