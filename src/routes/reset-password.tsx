import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthLayout } from "@/components/cds/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

import { seo } from "@/lib/seo";

export const Route = createFileRoute("/reset-password")({
  head: () =>
    seo({
      title: "Nouveau mot de passe",
      description: "Choisissez un nouveau mot de passe pour votre compte.",
      path: "/reset-password",
      type: "website",
      noindex: true,
    }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError(
        "Le lien de réinitialisation est invalide ou expiré. Demandez-en un nouveau depuis la page « Mot de passe oublié ».",
      );
      return;
    }
    navigate({ to: "/compte" });
  }

  return (
    <AuthLayout
      title="Nouveau mot de passe"
      subtitle="Choisissez un mot de passe d'au moins 8 caractères."
      footer={
        <Link
          to="/login"
          title="Se connecter à son espace personnel"
          className="font-medium text-primary-text hover:underline"
        >
          Retour à la connexion
        </Link>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Modification impossible</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="password">Nouveau mot de passe</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm">Confirmer le mot de passe</Label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Enregistrement…" : "Enregistrer mon mot de passe"}
        </Button>
      </form>
    </AuthLayout>
  );
}
