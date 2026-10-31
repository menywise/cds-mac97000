import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/cds/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageField } from "@/components/cds/MediaPicker";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  type BrandSettings,
  saveBrandSettings,
  useEditableBrandSettings,
} from "@/hooks/useSiteSettings";
import { seo } from "@/lib/seo";
import { normaliserCouleur } from "@/lib/couleurs";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () =>
    seo({
      title: "Administration",
      description:
        "Espace d'administration : paramètres du site, identité, coordonnées légales et hébergeur.",
      path: "/admin",
      noindex: true,
    }),
  component: AdminPage,
});

function Field({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Couleur : nuancier et saisie libre « #rrggbb ». Une valeur invalide est ignorée à l'enregistrement. */
function ColorField({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint: string;
}) {
  const valide = normaliserCouleur(value);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} : nuancier`}
          title={`${label} : choisir dans le nuancier`}
          value={valide || "#334155"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 max-md:h-11 w-12 shrink-0 cursor-pointer rounded-md border border-input bg-card p-1"
        />
        <Input
          id={id}
          value={value}
          placeholder="#334155"
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {value.trim() && !valide
          ? "Format attendu : #rrggbb. Valeur ignorée à l'enregistrement."
          : hint}
      </p>
    </div>
  );
}

function AdminPage() {
  const { settings, loading, setSettings } = useEditableBrandSettings();
  const [saving, setSaving] = useState(false);

  function patch(next: Partial<BrandSettings>) {
    setSettings({ ...settings, ...next });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await saveBrandSettings(settings);
      toast.success("Paramètres enregistrés.", {
        description:
          "Titres, mentions légales, sitemap et partages utilisent désormais ces informations.",
      });
    } catch {
      toast.error("Enregistrement impossible.", {
        description: "Vérifiez votre connexion, puis réessayez.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell
      title="Paramètres du site"
      intro="Tout ce qui identifie le site se règle ici : aucun fichier à modifier. Ces informations alimentent l'en-tête, le pied de page, les mentions légales et les aperçus de partage."
    >
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-8">
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-base font-semibold text-foreground">Identité</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field
                id="shortName"
                label="Nom court"
                value={settings.shortName}
                onChange={(v) => patch({ shortName: v })}
                hint="Affiché à côté du logo."
              />
              <Field
                id="name"
                label="Nom complet"
                value={settings.name}
                onChange={(v) => patch({ name: v })}
              />
              <Field
                id="tagline"
                label="Signature du pied de page"
                value={settings.tagline}
                onChange={(v) => patch({ tagline: v })}
              />
              <Field
                id="url"
                label="Adresse publique du site"
                value={settings.url}
                onChange={(v) => patch({ url: v })}
                hint={
                  settings.url.trim()
                    ? "Sans barre oblique finale. Sert au canonical, au sitemap, au flux RSS et aux partages."
                    : "À remplir : tant qu'elle est vide, le canonical, le sitemap et les partages restent relatifs."
                }
              />
              <div className="sm:col-span-2">
                <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-foreground">
                  <Switch
                    checked={!settings.horsIndex}
                    onCheckedChange={(ouvert) => patch({ horsIndex: !ouvert })}
                  />
                  {settings.horsIndex
                    ? "Fermé aux moteurs de recherche"
                    : "Ouvert aux moteurs de recherche"}
                </label>
                <p className="mt-1 text-xs text-foreground">
                  {settings.horsIndex
                    ? "Chaque page porte « noindex » et le sitemap n'est plus annoncé : le site sort des résultats en quelques semaines."
                    : "Réglage normal d'un site public. Fermer seulement un site de démonstration ou de recette."}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-base font-semibold text-foreground">Éditeur (mentions légales)</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field
                id="company"
                label="Raison sociale"
                value={settings.legal.company}
                onChange={(v) => patch({ legal: { ...settings.legal, company: v } })}
              />
              <Field
                id="form"
                label="Forme juridique"
                value={settings.legal.form}
                onChange={(v) => patch({ legal: { ...settings.legal, form: v } })}
              />
              <Field
                id="capital"
                label="Capital social"
                value={settings.legal.capital}
                onChange={(v) => patch({ legal: { ...settings.legal, capital: v } })}
              />
              <Field
                id="rcs"
                label="Immatriculation"
                value={settings.legal.rcs}
                onChange={(v) => patch({ legal: { ...settings.legal, rcs: v } })}
              />
              <Field
                id="address"
                label="Adresse du siège"
                value={settings.legal.address}
                onChange={(v) => patch({ legal: { ...settings.legal, address: v } })}
              />
              <Field
                id="country"
                label="Pays"
                value={settings.legal.country}
                onChange={(v) => patch({ legal: { ...settings.legal, country: v } })}
              />
              <Field
                id="publisher"
                label="Directeur de la publication"
                value={settings.legal.publisher}
                onChange={(v) => patch({ legal: { ...settings.legal, publisher: v } })}
              />
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-base font-semibold text-foreground">Hébergeur</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field
                id="hostName"
                label="Nom"
                value={settings.host.name}
                onChange={(v) => patch({ host: { ...settings.host, name: v } })}
              />
              <Field
                id="hostDetail"
                label="Immatriculation"
                value={settings.host.detail}
                onChange={(v) => patch({ host: { ...settings.host, detail: v } })}
              />
              <Field
                id="hostAddress"
                label="Adresse"
                value={settings.host.address}
                onChange={(v) => patch({ host: { ...settings.host, address: v } })}
              />
              <Field
                id="hostPhone"
                label="Téléphone"
                value={settings.host.phone}
                onChange={(v) => patch({ host: { ...settings.host, phone: v } })}
              />
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-base font-semibold text-foreground">Envoi des e-mails</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Utilisé par les e-mails de compte (inscription, mot de passe oublié…). Le sous-domaine
              d'envoi est celui délégué au service de Lovable (Cloud → Emails). Laissez vide tant
              que le domaine n'est pas validé.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field
                id="emailSenderDomain"
                label="Sous-domaine d'envoi (ex. notify.exemple.fr)"
                value={settings.email.senderDomain}
                onChange={(v) => patch({ email: { ...settings.email, senderDomain: v } })}
              />
              <Field
                id="emailFromDomain"
                label="Domaine de l'expéditeur (ex. exemple.fr)"
                value={settings.email.fromDomain}
                onChange={(v) => patch({ email: { ...settings.email, fromDomain: v } })}
              />
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-base font-semibold text-foreground">Apparence</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Couleurs, logo et icônes du site. Laissez vide pour garder l'habillage neutre du
              socle. Les images se choisissent dans la médiathèque ou se collent sous forme
              d'adresse https.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <ColorField
                id="couleurPrincipale"
                label="Couleur principale"
                value={settings.apparence.couleurPrincipale}
                onChange={(v) =>
                  patch({ apparence: { ...settings.apparence, couleurPrincipale: v } })
                }
                hint="Boutons, liens et focus. Les teintes de texte sont ajustées pour rester lisibles."
              />
              <ColorField
                id="couleurNavigateur"
                label="Couleur de la barre du navigateur"
                value={settings.apparence.couleurNavigateur}
                onChange={(v) =>
                  patch({ apparence: { ...settings.apparence, couleurNavigateur: v } })
                }
                hint="Barre d'adresse sur téléphone. Vide : fond clair du site."
              />
              <ImageField
                id="logo"
                label="Logo (en-tête)"
                value={settings.apparence.logo}
                onChange={(v) => patch({ apparence: { ...settings.apparence, logo: v } })}
              />
              <ImageField
                id="favicon"
                label="Icône d'onglet (PNG carré, 64 px ou plus)"
                value={settings.apparence.favicon}
                onChange={(v) => patch({ apparence: { ...settings.apparence, favicon: v } })}
              />
              <ImageField
                id="icone"
                label="Icône d'application (PNG carré, 512 px)"
                value={settings.apparence.icone}
                onChange={(v) => patch({ apparence: { ...settings.apparence, icone: v } })}
              />
              <ImageField
                id="imagePartage"
                label="Image de partage (1200 × 630)"
                value={settings.apparence.imagePartage}
                onChange={(v) => patch({ apparence: { ...settings.apparence, imagePartage: v } })}
              />
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-base font-semibold text-foreground">Page d'accueil</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Accueil affiché tant qu'aucune page d'accueil n'est publiée avec le module « Pages ».
            </p>
            <div className="mt-4 grid gap-4">
              <Field
                id="accueilTitre"
                label="Titre"
                value={settings.accueil.titre}
                onChange={(v) => patch({ accueil: { ...settings.accueil, titre: v } })}
                hint="Vide : nom complet du site."
              />
              <div className="space-y-1.5">
                <Label htmlFor="accueilTexte">Texte de présentation</Label>
                <Textarea
                  id="accueilTexte"
                  rows={4}
                  value={settings.accueil.texte}
                  onChange={(e) =>
                    patch({ accueil: { ...settings.accueil, texte: e.target.value } })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Vide : signature du pied de page. Sert aussi de description pour les moteurs de
                  recherche.
                </p>
              </div>
            </div>
          </section>

          <div className="space-y-2">
            <Button type="submit" disabled={saving} title="Enregistrer les paramètres du site">
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Vous voyez vos changements tout de suite ; les visiteurs les voient sous une minute.
            </p>
          </div>
        </form>
      )}
    </AdminShell>
  );
}
