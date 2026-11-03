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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin/utilisateurs")({
  head: () =>
    seo({
      title: "Utilisateurs et rôles",
      description: "Comptes inscrits, administrateurs et adresses nommées d'avance.",
      path: "/admin/utilisateurs",
      noindex: true,
    }),
  component: AdminUsersPage,
});

type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  is_admin: boolean;
  is_studio_admin: boolean;
};

type StudioAdmin = { email: string; created_at: string };

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("fr-FR") : "—";

function AdminUsersPage() {
  const isAdmin = useIsAdmin();
  const { user } = useAuth();
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [studio, setStudio] = useState<StudioAdmin[] | null>(null);
  const [editors, setEditors] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const load = useCallback(async () => {
    setLoadError(false);
    const [usersRes, studioRes, editorsRes] = await Promise.all([
      supabase.rpc("admin_list_users"),
      supabase.from("studio_admins").select("email, created_at").order("email"),
      supabase.from("user_roles").select("user_id").eq("role", "editor"),
    ]);
    if (usersRes.error || studioRes.error || editorsRes.error) {
      setLoadError(true);
      setUsers([]);
      setStudio([]);
      return;
    }
    setUsers((usersRes.data ?? []) as UserRow[]);
    setStudio((studioRes.data ?? []) as StudioAdmin[]);
    setEditors(new Set((editorsRes.data ?? []).map((r) => r.user_id)));
  }, []);

  /** Rôle rédacteur (socle 1.10.0) : écrit et propose des articles dans le poste Éditorial. */
  async function setEditor(row: UserRow, editor: boolean) {
    setBusy(row.id);
    const { error } = await supabase.rpc("admin_set_editor", { _user_id: row.id, _editor: editor });
    setBusy(null);
    if (error) {
      toast.error("Modification refusée.", { description: error.message });
      return;
    }
    toast.success(editor ? "Rédacteur ajouté." : "Rôle rédacteur retiré.", {
      description: row.email,
    });
    void load();
  }

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  async function setAdmin(row: UserRow, admin: boolean) {
    setBusy(row.id);
    const { error } = await supabase.rpc("admin_set_admin", { _user_id: row.id, _admin: admin });
    setBusy(null);
    if (error) {
      toast.error("Modification refusée.", { description: error.message });
      return;
    }
    toast.success(admin ? "Administrateur ajouté." : "Rôle administrateur retiré.", {
      description: row.email,
    });
    void load();
  }

  async function addStudioAdmin(e: React.FormEvent) {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Adresse e-mail invalide.");
      return;
    }
    setBusy(email);
    const { error } = await supabase.from("studio_admins").insert({ email });
    setBusy(null);
    if (error) {
      toast.error("Ajout impossible.", {
        description:
          error.code === "23505" ? "Cette adresse est déjà dans la liste." : error.message,
      });
      return;
    }
    setNewEmail("");
    toast.success("Adresse ajoutée.", {
      description:
        "Le compte correspondant est administrateur dès que son adresse est confirmée, maintenant ou à son inscription.",
    });
    void load();
  }

  async function removeStudioAdmin(row: StudioAdmin) {
    setBusy(row.email);
    const { error } = await supabase.from("studio_admins").delete().eq("email", row.email);
    setBusy(null);
    if (error) {
      toast.error("Retrait refusé.", { description: error.message });
      return;
    }
    toast.success("Adresse retirée.", {
      description: "Le compte garde son rôle actuel : retirez-le ci-dessous si besoin.",
    });
    void load();
  }

  const query = search.trim().toLowerCase();
  const visibleUsers = (users ?? []).filter(
    (row) =>
      !query ||
      row.email.toLowerCase().includes(query) ||
      (row.full_name ?? "").toLowerCase().includes(query),
  );

  return (
    <AdminShell
      title="Utilisateurs et rôles"
      intro="Tous les comptes inscrits. Nommez ou retirez un administrateur. Le site garde toujours au moins un administrateur : le dernier ne peut ni se retirer ni supprimer son compte."
    >
      {loadError ? (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-destructive/40 p-4 text-sm text-destructive-text">
          La liste n'a pas pu être chargée.
          <button
            type="button"
            className="underline"
            onClick={() => void load()}
            title="Recharger la liste des utilisateurs"
          >
            Réessayer
          </button>
        </div>
      ) : null}

      <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <h2 className="text-base font-semibold text-foreground">Administrateurs nommés d'avance</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ces adresses reçoivent le rôle administrateur à l'inscription ou à la prochaine connexion,
          une fois l'adresse confirmée. La liste peut rester vide : nommer un compte déjà inscrit se
          fait plus bas.
        </p>
        {studio === null ? (
          <Skeleton className="mt-4 h-16 w-full" />
        ) : (
          <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
            {studio.map((row) => (
              <li key={row.email} className="flex flex-wrap items-center gap-3 px-4 py-2 text-sm">
                <span className="min-w-0 flex-1 break-all text-foreground">{row.email}</span>
                {busy === row.email ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled
                    title="Retrait en cours"
                  >
                    Retirer
                  </Button>
                ) : (
                  <ConfirmButton
                    label="Retirer"
                    confirmLabel="Retirer"
                    title={`Retirer ${row.email} de la liste`}
                    question={`Retirer ${row.email} des administrateurs nommés d'avance ?`}
                    detail="Le compte reste administrateur tant que vous ne le rétrogradez pas, mais il n'est plus protégé contre la rétrogradation."
                    onConfirm={() => removeStudioAdmin(row)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={addStudioAdmin} className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1 space-y-1.5">
            <Label htmlFor="studio-email">Ajouter une adresse</Label>
            <Input
              id="studio-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="prenom@exemple.fr"
              autoComplete="off"
            />
          </div>
          <Button type="submit" disabled={!newEmail.trim() || busy !== null}>
            Ajouter
          </Button>
        </form>
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">
            Comptes inscrits {users ? `(${users.length})` : ""}
          </h2>
          <div className="w-full space-y-1.5 sm:w-64">
            <Label htmlFor="user-search" className="sr-only">
              Rechercher un compte
            </Label>
            <Input
              id="user-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un nom ou une adresse"
            />
          </div>
        </div>

        {users === null ? (
          <div className="mt-4 space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : visibleUsers.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {users.length === 0 ? "Aucun compte pour l'instant." : "Aucun compte ne correspond."}
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Compte</TableHead>
                  <TableHead>Inscription</TableHead>
                  <TableHead>Dernière connexion</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleUsers.map((row) => {
                  const isSelf = row.id === user?.id;
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <p className="font-medium text-foreground">{row.full_name || "—"}</p>
                        <p className="break-all text-xs text-muted-foreground">{row.email}</p>
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(row.created_at)}</TableCell>
                      <TableCell className="text-sm">{formatDate(row.last_sign_in_at)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant={row.is_admin ? "default" : "secondary"}>
                            {row.is_admin ? "Administrateur" : "Membre"}
                          </Badge>
                          {row.is_studio_admin ? <Badge variant="outline">Studio</Badge> : null}
                          {editors.has(row.id) ? <Badge variant="outline">Rédacteur</Badge> : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {row.is_admin ? (
                          busy === row.id || isSelf || row.is_studio_admin ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled
                              title={
                                isSelf
                                  ? "Vous ne pouvez pas retirer votre propre rôle"
                                  : "Retirez d'abord l'adresse de la liste des administrateurs nommés d'avance"
                              }
                            >
                              Rétrograder
                            </Button>
                          ) : (
                            <ConfirmButton
                              label="Rétrograder"
                              confirmLabel="Rétrograder"
                              title={`Retirer le rôle administrateur de ${row.email}`}
                              question={`Rétrograder ${row.email} en simple membre ?`}
                              detail="Il perd aussitôt l'accès à l'administration."
                              onConfirm={() => setAdmin(row, false)}
                            />
                          )
                        ) : (
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={busy === row.id}
                              onClick={() => void setEditor(row, !editors.has(row.id))}
                              title={
                                editors.has(row.id)
                                  ? `Retirer le rôle rédacteur de ${row.email}`
                                  : `Nommer ${row.email} rédacteur : il écrit et propose des articles`
                              }
                            >
                              {editors.has(row.id) ? "Retirer rédacteur" : "Nommer rédacteur"}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              disabled={busy === row.id}
                              onClick={() => void setAdmin(row, true)}
                              title={`Nommer ${row.email} administrateur`}
                            >
                              Nommer admin
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </AdminShell>
  );
}
