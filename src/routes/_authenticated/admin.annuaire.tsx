import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/cds/AdminShell";
import { CategoryManager } from "@/components/cds/CategoryManager";
import { ConfirmButton } from "@/components/cds/ConfirmButton";
import { RecordEditor } from "@/components/cds/RecordEditor";
import { ModerationControl } from "@/components/cds/ModerationEditor";
import { ModerationNote } from "@/components/cds/ModerationNote";
import { ImageField, ImageListField } from "@/components/cds/MediaPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { fetchAnnuaireSettings, saveAnnuaireSettings } from "@/hooks/useSiteSettings";
import { ANNUAIRE_TYPES_FICHE, type AnnuaireSettings } from "@/lib/site-config";
import { requireFeature } from "@/config/features";
import { downloadCsv } from "@/lib/csv";
import { slugify } from "@/lib/format";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin/annuaire")({
  beforeLoad: () => requireFeature("directory"),
  head: () =>
    seo({
      title: "Administration — Annuaire métier",
      description: "Gérer les fiches, les catégories, les avis et les demandes de revendication.",
      path: "/admin/annuaire",
      noindex: true,
    }),
  component: AdminDirectoryPage,
});

type Listing = {
  id: string;
  name: string;
  slug: string;
  city: string;
  status: string;
  plan: string;
  featured: boolean;
  verified: boolean;
  claimed_by: string | null;
  claim_requested_by: string | null;
  created_at: string;
  logo_url: string | null;
  cover_url: string | null;
  photos: string[];
  description: string;
  excerpt: string;
  category_id: string | null;
  tags: string[];
  address: string;
  postal_code: string;
  departement: string | null;
  phone: string;
  email: string;
  website: string;
};

type Category = { id: string; name: string; slug: string; position: number };
type Review = {
  id: string;
  listing_id: string;
  author_name: string;
  rating: number;
  content: string;
  approved: boolean;
  moderation_note: string | null;
};

const TABS = [
  { key: "fiches", label: "Fiches" },
  { key: "categories", label: "Catégories" },
  { key: "avis", label: "Avis" },
  { key: "claims", label: "Revendications" },
  { key: "reglages", label: "Réglages" },
] as const;

function AdminDirectoryPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("fiches");
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [openImages, setOpenImages] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const [l, c, r] = await Promise.all([
      supabase
        .from("directory_listings")
        .select(
          "id, name, slug, city, status, plan, featured, verified, claimed_by, claim_requested_by, created_at, logo_url, cover_url, photos, description, excerpt, category_id, tags, address, postal_code, departement, phone, email, website",
        )
        .order("created_at", { ascending: false }),
      supabase.from("directory_categories").select("id, name, slug, position").order("position"),
      supabase
        .from("directory_reviews")
        .select("id, listing_id, author_name, rating, content, approved, moderation_note")
        .order("created_at", { ascending: false }),
    ]);
    setFailed(Boolean(l.error || c.error || r.error));
    if (l.error) return;
    setListings(l.data ?? []);
    setCategories(c.data ?? []);
    setReviews(r.data ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateListing(id: string, changes: Partial<Listing>) {
    const { error } = await supabase.from("directory_listings").update(changes).eq("id", id);
    if (error) {
      toast.error("Modification non enregistrée.", {
        description: error.code === "23505" ? "Cette adresse est déjà prise." : undefined,
      });
      return false;
    }
    toast.success("Fiche mise à jour.");
    void load();
    return true;
  }

  /** Nouvelle fiche : brouillon au nom provisoire, ouvert aussitôt dans l'éditeur. */
  async function createListing() {
    setCreating(true);
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("directory_listings")
      .insert({
        name: "Nouvelle fiche",
        slug: `nouvelle-fiche-${Date.now().toString(36)}`,
        status: "draft",
        created_by: userData.user?.id ?? null,
      })
      .select("id")
      .single();
    setCreating(false);
    if (error) {
      toast.error("Fiche non créée.");
      return;
    }
    toast.success("Brouillon créé.", { description: "Complétez la fiche puis publiez-la." });
    setTab("fiches");
    setOpenImages(null);
    setEditing(data.id);
    await load();
  }

  async function removeListing(item: Listing) {
    const { error } = await supabase.from("directory_listings").delete().eq("id", item.id);
    if (error) toast.error("Fiche non supprimée.");
    else {
      toast.success("Fiche supprimée.");
      void load();
    }
  }

  /** Accepter : la fiche est confiée au membre, datée ; la demande est close. */
  async function approveClaim(item: Listing) {
    if (!item.claim_requested_by) return;
    await updateListing(item.id, {
      claimed_by: item.claim_requested_by,
      claimed_at: new Date().toISOString(),
      claim_requested_by: null,
      claim_requested_at: null,
    } as Partial<Listing>);
  }

  const pendingClaims = (listings ?? []).filter((item) => item.claim_requested_by);

  return (
    <AdminShell
      title="Annuaire métier"
      intro="Les fiches professionnelles, leurs catégories, les avis reçus et les demandes de revendication."
    >
      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            title={`Afficher : ${item.label}`}
            className={`min-h-11 rounded-md border px-3 text-sm ${
              tab === item.key
                ? "border-primary bg-accent text-foreground"
                : "border-border text-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
        <Button
          className="ml-auto"
          disabled={creating}
          title="Créer une fiche en brouillon et l'ouvrir dans l'éditeur"
          onClick={() => void createListing()}
        >
          {creating ? "Création…" : "Nouvelle fiche"}
        </Button>
        <Button
          variant="outline"
          title="Télécharger les fiches au format tableur"
          onClick={() => downloadCsv("annuaire.csv", listings ?? [])}
        >
          Export CSV
        </Button>
      </div>

      {failed ? (
        <p
          role="alert"
          className="mt-6 rounded-lg border border-destructive/40 p-4 text-sm text-destructive-text"
        >
          Une partie de l'annuaire n'a pas pu être chargée.{" "}
          <button type="button" className="underline" onClick={() => void load()}>
            Réessayer
          </button>
        </p>
      ) : null}
      {tab === "reglages" ? (
        <AnnuaireSettingsTab />
      ) : listings === null ? (
        // Échec du chargement : le bandeau d'erreur suffit, pas de « Chargement… » sans fin.
        failed ? null : (
          <p className="mt-6 text-sm text-foreground">Chargement…</p>
        )
      ) : tab === "fiches" ? (
        <>
          {listings.length === 0 ? (
            <p className="mt-6 text-sm text-foreground">Aucune fiche pour l'instant.</p>
          ) : null}
          <ul className="mt-6 space-y-3">
            {listings.map((item) => (
              <li key={item.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.city}</p>
                  <span className="ml-auto rounded-full bg-neutral-soft px-2.5 py-0.5 text-xs text-neutral-text">
                    {item.status === "published"
                      ? "En ligne"
                      : item.status === "draft"
                        ? "Brouillon"
                        : "Archivée"}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant={item.status === "published" ? "outline" : "default"}
                    title={
                      item.status === "published"
                        ? "Retirer cette fiche du site"
                        : "Publier cette fiche"
                    }
                    onClick={() =>
                      updateListing(item.id, {
                        status: item.status === "published" ? "draft" : "published",
                      })
                    }
                  >
                    {item.status === "published" ? "Dépublier" : "Publier"}
                  </Button>
                  <Button
                    variant="outline"
                    title={
                      item.plan === "premium"
                        ? "Repasser en fiche gratuite"
                        : "Passer cette fiche en premium"
                    }
                    onClick={() =>
                      updateListing(item.id, { plan: item.plan === "premium" ? "free" : "premium" })
                    }
                  >
                    {item.plan === "premium" ? "Retirer le premium" : "Passer en premium"}
                  </Button>
                  <Button
                    variant="outline"
                    title={
                      item.verified
                        ? "Retirer le badge vérifié"
                        : "Marquer cette fiche comme vérifiée"
                    }
                    onClick={() => updateListing(item.id, { verified: !item.verified })}
                  >
                    {item.verified ? "Retirer « vérifié »" : "Marquer vérifié"}
                  </Button>
                  <Button
                    variant="outline"
                    title={
                      item.featured ? "Retirer de la mise en avant" : "Mettre en avant cette fiche"
                    }
                    onClick={() => updateListing(item.id, { featured: !item.featured })}
                  >
                    {item.featured ? "Ne plus mettre en avant" : "Mettre en avant"}
                  </Button>
                  <Button
                    variant="outline"
                    title="Modifier le logo, la couverture et les photos"
                    onClick={() => setOpenImages(openImages === item.id ? null : item.id)}
                  >
                    {openImages === item.id ? "Masquer les images" : "Images"}
                  </Button>
                  <Button
                    variant="outline"
                    title="Modifier le contenu de cette fiche"
                    onClick={() => setEditing(editing === item.id ? null : item.id)}
                  >
                    {editing === item.id ? "Fermer" : "Modifier"}
                  </Button>
                  <Button
                    variant="outline"
                    title={
                      item.status === "archived"
                        ? "Remettre en brouillon"
                        : "Retirer du site sans supprimer"
                    }
                    onClick={() =>
                      updateListing(item.id, {
                        status: item.status === "archived" ? "draft" : "archived",
                      })
                    }
                  >
                    {item.status === "archived" ? "Désarchiver" : "Archiver"}
                  </Button>
                  <ConfirmButton
                    size="default"
                    title="Supprimer définitivement cette fiche"
                    question={`Supprimer la fiche « ${item.name} » ?`}
                    detail="La fiche et ses avis sont supprimés définitivement. Pour la retirer sans la perdre, archivez-la."
                    onConfirm={() => removeListing(item)}
                  />
                </div>
                {editing === item.id ? (
                  <div className="mt-4 border-t border-border pt-4">
                    <RecordEditor
                      idPrefix={`dir-${item.id}`}
                      fields={[
                        { key: "name", label: "Nom", type: "text", required: true },
                        {
                          key: "slug",
                          label: "Adresse (/annuaire/…)",
                          type: "text",
                          required: true,
                        },
                        {
                          key: "category_id",
                          label: "Catégorie",
                          type: "select",
                          nullable: true,
                          options: categories.map((c) => ({ value: c.id, label: c.name })),
                        },
                        { key: "tags", label: "Étiquettes", type: "tags" },
                        { key: "excerpt", label: "Résumé", type: "text", wide: true },
                        { key: "description", label: "Description", type: "textarea" },
                        { key: "address", label: "Adresse postale", type: "text", wide: true },
                        { key: "postal_code", label: "Code postal", type: "text" },
                        { key: "city", label: "Ville", type: "text" },
                        {
                          key: "departement",
                          label: "Département (code)",
                          type: "text",
                          nullable: true,
                          hint: "Code INSEE, par exemple 75 ou 2A. Vide si inconnu.",
                        },
                        { key: "phone", label: "Téléphone", type: "text" },
                        { key: "email", label: "E-mail", type: "email" },
                        { key: "website", label: "Site web", type: "url" },
                      ]}
                      values={item}
                      onCancel={() => setEditing(null)}
                      onSave={async (changes) => {
                        const ok = await updateListing(item.id, {
                          ...changes,
                          slug: slugify(String(changes["slug"] ?? "")),
                        } as Partial<Listing>);
                        if (ok) setEditing(null);
                        return ok;
                      }}
                    />
                  </div>
                ) : null}
                {openImages === item.id ? (
                  <ListingImages
                    item={item}
                    onSave={(changes) => updateListing(item.id, changes)}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : tab === "categories" ? (
        <div className="mt-6">
          <CategoryManager
            table="directory_categories"
            withDescription
            placeholder="Plombiers"
            usage="fiches"
          />
        </div>
      ) : tab === "avis" ? (
        <>
          {reviews.length === 0 ? (
            <p className="mt-6 text-sm text-foreground">Aucun avis reçu.</p>
          ) : null}
          <ul className="mt-6 space-y-3">
            {reviews.map((item) => (
              <li key={item.id} className="rounded-xl border border-border bg-card p-5">
                <p className="text-sm font-semibold text-foreground">
                  {item.author_name} — {item.rating}/5
                </p>
                <p className="mt-2 text-sm text-foreground">{item.content}</p>
                <ModerationNote note={item.moderation_note} />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant={item.approved ? "outline" : "default"}
                    title={item.approved ? "Retirer cet avis du site" : "Publier cet avis"}
                    onClick={async () => {
                      const { error } = await supabase
                        .from("directory_reviews")
                        .update({ approved: !item.approved })
                        .eq("id", item.id);
                      if (error) toast.error("Modification non enregistrée.");
                      void load();
                    }}
                  >
                    {item.approved ? "Dépublier" : "Publier"}
                  </Button>
                  <ConfirmButton
                    size="default"
                    title="Supprimer cet avis"
                    question={`Supprimer l'avis de ${item.author_name} ?`}
                    onConfirm={async () => {
                      const { error } = await supabase
                        .from("directory_reviews")
                        .delete()
                        .eq("id", item.id);
                      if (error) toast.error("Avis non supprimé.");
                      else toast.success("Avis supprimé.");
                      void load();
                    }}
                  />
                  <ModerationControl
                    table="directory_reviews"
                    item={item}
                    approvable
                    onDone={() => void load()}
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          {pendingClaims.length === 0 ? (
            <p className="mt-6 text-sm text-foreground">
              Aucune demande de revendication en attente.
            </p>
          ) : null}
          <ul className="mt-6 space-y-3">
            {pendingClaims.map((item) => (
              <li key={item.id} className="rounded-xl border border-border bg-card p-5">
                <p className="text-sm font-semibold text-foreground">{item.name}</p>
                <p className="mt-1 text-xs text-foreground">
                  Un membre demande à gérer cette fiche.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button title="Confier la fiche à ce membre" onClick={() => approveClaim(item)}>
                    Accepter
                  </Button>
                  <Button
                    variant="outline"
                    title="Refuser cette demande"
                    onClick={() =>
                      updateListing(item.id, {
                        claim_requested_by: null,
                        claim_requested_at: null,
                      } as Partial<Listing>)
                    }
                  >
                    Refuser
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </AdminShell>
  );
}

function ListingImages({
  item,
  onSave,
}: {
  item: Listing;
  onSave: (changes: Partial<Listing>) => Promise<unknown>;
}) {
  const [logo, setLogo] = useState(item.logo_url ?? "");
  const [cover, setCover] = useState(item.cover_url ?? "");
  const [photos, setPhotos] = useState<string[]>(item.photos ?? []);

  return (
    <form
      className="mt-4 space-y-4 border-t border-border pt-4"
      onSubmit={(event) => {
        event.preventDefault();
        void onSave({ logo_url: logo.trim() || null, cover_url: cover.trim() || null, photos });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <ImageField id={`dir-logo-${item.id}`} label="Logo" value={logo} onChange={setLogo} />
        <ImageField
          id={`dir-cover-${item.id}`}
          label="Image de couverture"
          value={cover}
          onChange={setCover}
        />
      </div>
      <ImageListField
        id={`dir-photos-${item.id}`}
        label="Photos"
        value={photos}
        onChange={setPhotos}
        max={10}
      />
      <Button type="submit" size="sm">
        Enregistrer les images
      </Button>
    </form>
  );
}

const TYPE_FICHE_LABELS: Record<AnnuaireSettings["type_fiche"], string> = {
  LocalBusiness: "Établissement avec adresse (LocalBusiness)",
  Organization: "Organisation (Organization)",
  WebSite: "Site web (WebSite)",
};

/** Réglages de l'annuaire (clé `annuaire` de site_settings) : titre, description, type des fiches. */
function AnnuaireSettingsTab() {
  const [settings, setSettings] = useState<AnnuaireSettings | null>(null);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  const read = useCallback(() => {
    setFailed(false);
    fetchAnnuaireSettings()
      .then(setSettings)
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    read();
  }, [read]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      await saveAnnuaireSettings(settings);
      setSettings(await fetchAnnuaireSettings());
      toast.success("Réglages enregistrés.");
    } catch {
      toast.error("Réglages non enregistrés.");
    } finally {
      setSaving(false);
    }
  }

  if (failed) {
    return (
      <p role="alert" className="mt-6 text-sm text-destructive-text">
        Les réglages n'ont pas pu être chargés.{" "}
        <button type="button" className="underline" onClick={read}>
          Réessayer
        </button>
      </p>
    );
  }
  if (!settings) return <p className="mt-6 text-sm text-foreground">Chargement…</p>;

  return (
    <form
      onSubmit={save}
      className="mt-6 grid max-w-[640px] gap-4 rounded-xl border border-border bg-card p-5"
    >
      <div>
        <Label htmlFor="ann-titre">Titre de la page Annuaire</Label>
        <Input
          id="ann-titre"
          value={settings.titre}
          maxLength={120}
          onChange={(e) => setSettings({ ...settings, titre: e.target.value })}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="ann-description">Description</Label>
        <Textarea
          id="ann-description"
          rows={3}
          maxLength={300}
          value={settings.description}
          onChange={(e) => setSettings({ ...settings, description: e.target.value })}
          className="mt-1"
        />
        <p className="mt-1 text-xs text-foreground">
          Affichée sous le titre et reprise par les moteurs de recherche. Vide : texte par défaut.
        </p>
      </div>
      <div>
        <Label htmlFor="ann-type">Nature des fiches</Label>
        <select
          id="ann-type"
          value={settings.type_fiche}
          onChange={(e) =>
            setSettings({
              ...settings,
              type_fiche: e.target.value as AnnuaireSettings["type_fiche"],
            })
          }
          className="mt-1 h-11 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground"
        >
          {ANNUAIRE_TYPES_FICHE.map((type) => (
            <option key={type} value={type}>
              {TYPE_FICHE_LABELS[type]}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-foreground">
          Sert aux données structurées de chaque fiche. L'adresse n'y figure que pour un
          établissement.
        </p>
      </div>
      <div>
        <Button type="submit" disabled={saving} title="Enregistrer les réglages de l'annuaire">
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
