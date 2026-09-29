import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { PageShell } from "@/components/cds/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

import { seo } from "@/lib/seo";
import { requireFeature } from "@/config/features";

export const Route = createFileRoute("/contact")({
  beforeLoad: () => requireFeature("contact"),
  head: () =>
    seo({
      title: "Contact",
      description:
        "Écrivez-nous en deux minutes : formulaire protégé contre le spam, réponse personnelle, aucune adresse e-mail affichée en clair.",
      path: "/contact",
      type: "website",
    }),
  component: ContactPage,
});

function ContactPage() {
  const [sent, setSent] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const openedAt = useRef(Date.now());

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    // Piège à robots : champ invisible qui doit rester vide + délai minimal de saisie.
    const trap = String(form.get("company") ?? "");
    const tooFast = Date.now() - openedAt.current < 2500;
    if (trap.length > 0 || tooFast) {
      setBlocked(true);
      return;
    }
    setBlocked(false);
    setFailed(false);
    setBusy(true);
    const { error } = await supabase.from("contact_messages").insert({
      name: String(form.get("name") ?? "").trim(),
      email: String(form.get("email") ?? "").trim(),
      subject: String(form.get("subject") ?? "").trim(),
      message: String(form.get("message") ?? "").trim(),
    });
    setBusy(false);
    if (error) {
      setFailed(true);
      return;
    }
    setSent(true);
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-[620px]">
        <h1 className="text-3xl font-bold text-foreground">Contact</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Écrivez-nous via ce formulaire. Aucune adresse e-mail n'est affichée sur le site : les
          messages sont transmis directement au responsable de la publication.
        </p>

        {sent ? (
          <Alert className="mt-8">
            <AlertTitle>Message envoyé</AlertTitle>
            <AlertDescription>
              Merci, votre message a bien été transmis. Nous vous répondons sous 48 heures ouvrées.
            </AlertDescription>
          </Alert>
        ) : (
          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            {blocked && (
              <Alert variant="destructive">
                <AlertTitle>Envoi bloqué</AlertTitle>
                <AlertDescription>
                  Votre envoi a été identifié comme automatique. Merci de réessayer.
                </AlertDescription>
              </Alert>
            )}

            {failed && (
              <Alert variant="destructive">
                <AlertTitle>Envoi impossible</AlertTitle>
                <AlertDescription>
                  Votre message n'a pas pu être transmis. Merci de réessayer dans un instant.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="name">Nom</Label>
              <Input id="name" name="name" autoComplete="name" required placeholder="Prénom Nom" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Votre adresse e-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="nom@exemple.fr"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subject">Objet</Label>
              <Input id="subject" name="subject" required placeholder="Objet de votre demande" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                name="message"
                required
                rows={6}
                placeholder="Votre message…"
              />
            </div>

            {/* Champ piège : invisible pour les humains, rempli par les robots. */}
            <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
              <label htmlFor="company">Société (ne pas remplir)</label>
              <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
            </div>

            <Button type="submit" className="w-full sm:w-auto" disabled={busy}>
              {busy ? "Envoi…" : "Envoyer le message"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Les informations transmises servent uniquement à traiter votre demande. Voir la{" "}
              <Link
                to="/legal/confidentialite"
                title="Lire la politique de confidentialité"
                className="text-primary-text hover:underline"
              >
                politique de confidentialité
              </Link>
              .
            </p>
          </form>
        )}
      </div>
    </PageShell>
  );
}
