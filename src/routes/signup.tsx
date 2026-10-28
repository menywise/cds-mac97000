import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AuthLayout } from "@/components/cds/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { messageAuth } from "@/lib/auth-messages";
import { PasswordInput } from "@/components/cds/PasswordInput";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { GoogleSignInButton } from "@/components/cds/GoogleSignInButton";

import { seo } from "@/lib/seo";
import { getSiteConfig } from "@/lib/site-config";

export const Route = createFileRoute("/signup")({
  head: () =>
    seo({
      title: "Créer un compte",
      description: `Créez votre compte ${getSiteConfig().brand.name} en quelques secondes : nom, adresse e-mail et mot de passe, avec confirmation par e-mail.`,
      path: "/signup",
      type: "website",
    }),
  component: SignupPage,
});

function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accepted) {
      setError("Vous devez accepter les conditions générales.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: { full_name: fullName },
      },
    });
    setBusy(false);
    if (signUpError) {
      setError(messageAuth(signUpError, "inscription"));
      return;
    }
    setDone(true);
  }

  return (
    <AuthLayout
      title="Créer un compte"
      subtitle="Quelques secondes suffisent."
      footer={
        <>
          Déjà inscrit ?{" "}
          <Link
            to="/login"
            title="Se connecter à son espace personnel"
            className="font-medium text-primary-text hover:underline"
          >
            Se connecter
          </Link>
        </>
      }
    >
      {done ? (
        <Alert>
          <AlertTitle>Vérifiez votre boîte mail</AlertTitle>
          <AlertDescription>
            Un e-mail de confirmation vient de vous être envoyé. Cliquez sur le lien qu'il contient
            pour activer votre compte, puis connectez-vous.
          </AlertDescription>
        </Alert>
      ) : (
        <form className="space-y-4" onSubmit={onSubmit}>
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Inscription impossible</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="name">Nom complet</Label>
            <Input
              id="name"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Prénom Nom"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Adresse e-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nom@exemple.fr"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Mot de passe</Label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8 caractères minimum"
            />
          </div>
          <div className="flex items-start gap-2">
            <Checkbox
              id="cgu"
              className="mt-0.5"
              checked={accepted}
              onCheckedChange={(v) => setAccepted(v === true)}
            />
            <Label htmlFor="cgu" className="block min-h-11 text-xs font-normal leading-relaxed">
              J'accepte les{" "}
              <Link
                to="/legal/cgu"
                title="Lire les conditions générales d'utilisation"
                className="text-primary-text hover:underline"
              >
                conditions générales
              </Link>{" "}
              et la{" "}
              <Link
                to="/legal/confidentialite"
                title="Lire la politique de confidentialité"
                className="text-primary-text hover:underline"
              >
                politique de confidentialité
              </Link>
              .
            </Label>
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Création…" : "Créer mon compte"}
          </Button>
          <GoogleSignInButton label="S'inscrire avec Google" />
        </form>
      )}
    </AuthLayout>
  );
}
