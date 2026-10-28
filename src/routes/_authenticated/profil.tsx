import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/cds/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { messageAuth } from "@/lib/auth-messages";
import { PasswordInput } from "@/components/cds/PasswordInput";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { seo } from "@/lib/seo";
import { isFeatureOn } from "@/config/features";

export const Route = createFileRoute("/_authenticated/profil")({
  head: () =>
    seo({
      title: "Mon profil",
      description: "Modifier son nom affiché et son mot de passe.",
      path: "/profil",
      noindex: true,
    }),
  component: ProfilPage,
});

function ProfilPage() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      if (!cancelled && data?.full_name) setFullName(data.full_name);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const name = fullName.trim();
    setSavingName(true);
    // upsert : la ligne existe même si le compte a été créé avant son initialisation.
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, email: user.email ?? null, full_name: name }, { onConflict: "id" });
    // Le forum, le blog et les avis affichent le nom enregistré dans le compte.
    const { error: metaError } = error
      ? { error: null }
      : await supabase.auth.updateUser({ data: { full_name: name } });
    setSavingName(false);
    if (error || metaError) toast.error("Le nom n'a pas pu être enregistré.");
    else toast.success("Nom mis à jour.");
  }

  async function savePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    if (password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      toast.error("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSavingPassword(false);
    if (error) toast.error(messageAuth(error, "mot-de-passe"));
    else {
      toast.success("Mot de passe modifié.");
      e.currentTarget.reset();
    }
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-[620px]">
        <nav aria-label="Fil d'Ariane" className="text-xs text-muted-foreground">
          <Link to="/compte" title="Revenir à mon compte" className="hover:text-foreground">
            Mon compte
          </Link>
          <span aria-hidden="true"> / </span>
          <span className="text-foreground">Mon profil</span>
        </nav>

        <h1 className="mt-2 text-3xl font-bold text-foreground">Mon profil</h1>
        <p className="mt-2 text-sm text-muted-foreground">{user?.email}</p>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-base">Nom affiché</CardTitle>
            <CardDescription>Le nom utilisé dans l'interface et les échanges.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={saveName}>
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Nom complet</Label>
                <Input
                  id="full_name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  placeholder="Prénom Nom"
                />
              </div>
              <Button type="submit" disabled={savingName}>
                {savingName ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {isFeatureOn("members") ? <PublicProfileCard /> : null}

        <Card id="mot-de-passe" className="mt-6 scroll-mt-24">
          <CardHeader>
            <CardTitle className="text-base">Mot de passe</CardTitle>
            <CardDescription>8 caractères minimum.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={savePassword}>
              <div className="space-y-1.5">
                <Label htmlFor="password">Nouveau mot de passe</Label>
                <PasswordInput id="password" name="password" autoComplete="new-password" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirmer le mot de passe</Label>
                <PasswordInput id="confirm" name="confirm" autoComplete="new-password" required />
              </div>
              <Button type="submit" disabled={savingPassword}>
                {savingPassword ? "Modification…" : "Modifier le mot de passe"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <DeleteAccountCard />
      </div>
    </PageShell>
  );
}

/**
 * Suppression de son compte (promise dans les CGU) : données personnelles effacées,
 * contributions publiques conservées sous le nom « Ancien membre ». Tout se fait en base
 * (fonction delete_my_account), en une seule opération.
 */
function DeleteAccountCard() {
  const navigate = useNavigate();
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const ready = confirmation.trim().toUpperCase() === "SUPPRIMER";

  async function deleteAccount() {
    if (!ready) return;
    setDeleting(true);
    const { error } = await supabase.rpc("delete_my_account");
    if (error) {
      setDeleting(false);
      toast.error("Suppression impossible.", {
        description: error.message.includes("dernier administrateur")
          ? "Vous êtes le dernier administrateur : nommez-en un autre avant de partir."
          : "Réessayez dans un instant.",
      });
      return;
    }
    await supabase.auth.signOut();
    toast.success("Compte supprimé.", {
      description: "Vos données personnelles ont été effacées.",
    });
    navigate({ to: "/", replace: true });
  }

  return (
    <Card className="mt-6 border-destructive/40">
      <CardHeader>
        <CardTitle className="text-base">Supprimer mon compte</CardTitle>
        <CardDescription>
          Définitif. Votre compte, votre profil, vos messages privés, vos annonces et votre suivi de
          contacts sont effacés. Vos discussions, réponses, commentaires et avis restent en ligne
          sous le nom « Ancien membre ».
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" title="Supprimer définitivement mon compte">
              Supprimer mon compte
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer définitivement votre compte ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action ne peut pas être annulée. Tapez SUPPRIMER pour confirmer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="delete-confirm">Confirmation</Label>
              <Input
                id="delete-confirm"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                autoComplete="off"
                placeholder="SUPPRIMER"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmation("")}>Annuler</AlertDialogCancel>
              <Button
                variant="destructive"
                disabled={!ready || deleting}
                onClick={() => void deleteAccount()}
              >
                {deleting ? "Suppression…" : "Supprimer définitivement"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

type PublicProfile = {
  display_name: string;
  job_title: string;
  bio: string;
  website: string;
  listed: boolean;
  accepts_messages: boolean;
};

const emptyProfile: PublicProfile = {
  display_name: "",
  job_title: "",
  bio: "",
  website: "",
  // Inscription volontaire dans l'annuaire des membres (RGPD).
  listed: false,
  accepts_messages: true,
};

/** Profil visible par la communauté : annuaire, forum et messagerie. */
function PublicProfileCard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<PublicProfile>(emptyProfile);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("member_profiles")
        .select("display_name, job_title, bio, website, listed, accepts_messages")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled && data) {
        setProfile({
          display_name: data.display_name ?? "",
          job_title: data.job_title ?? "",
          bio: data.bio ?? "",
          website: data.website ?? "",
          listed: data.listed,
          accepts_messages: data.accepts_messages,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("member_profiles").upsert(
      {
        user_id: user.id,
        display_name: profile.display_name.trim() || user.email?.split("@")[0] || "Membre",
        job_title: profile.job_title.trim(),
        bio: profile.bio.trim(),
        website: profile.website.trim(),
        listed: profile.listed,
        accepts_messages: profile.accepts_messages,
      },
      { onConflict: "user_id" },
    );
    setSaving(false);
    if (error) toast.error("Profil public non enregistré.");
    else toast.success("Profil public mis à jour.");
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base">Profil public</CardTitle>
        <CardDescription>
          Ce que la communauté voit de vous dans l'annuaire, le forum et la messagerie.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={save}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="display_name">Nom affiché</Label>
              <Input
                id="display_name"
                value={profile.display_name}
                onChange={(e) => setProfile((p) => ({ ...p, display_name: e.target.value }))}
                placeholder="Comment souhaitez-vous apparaître ?"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="job_title">Votre métier</Label>
              <Input
                id="job_title"
                value={profile.job_title}
                onChange={(e) => setProfile((p) => ({ ...p, job_title: e.target.value }))}
                placeholder="Artisan, consultante, développeur…"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bio">Présentation</Label>
            <textarea
              id="bio"
              rows={3}
              value={profile.bio}
              onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
              placeholder="En deux phrases : ce que vous faites et ce que vous cherchez ici."
              className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="website">Votre site</Label>
            <Input
              id="website"
              value={profile.website}
              onChange={(e) => setProfile((p) => ({ ...p, website: e.target.value }))}
              placeholder="https://votre-site.fr"
            />
          </div>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={profile.listed}
              onChange={(e) => setProfile((p) => ({ ...p, listed: e.target.checked }))}
              className="size-4"
            />
            Figurer dans l'annuaire public des membres
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={profile.accepts_messages}
              onChange={(e) => setProfile((p) => ({ ...p, accepts_messages: e.target.checked }))}
              className="size-4"
            />
            Accepter les messages privés des autres membres
          </label>
          <Button type="submit" disabled={saving} title="Enregistrer mon profil public">
            {saving ? "Enregistrement…" : "Enregistrer mon profil public"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
