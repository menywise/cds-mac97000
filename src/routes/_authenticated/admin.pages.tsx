import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/cds/AdminShell";
import { ConfirmButton } from "@/components/cds/ConfirmButton";
import { ImageField } from "@/components/cds/MediaPicker";
import { PageRender } from "@/components/cds/PageSections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { requireFeature } from "@/config/features";
import type { Json } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, slugify } from "@/lib/format";
import {
  emptyPageData,
  isSectionType,
  items,
  newSection,
  SECTIONS,
  str,
  type Field,
  type PageData,
  type PageRow,
  toPageRow,
  type Section,
  type SectionType,
} from "@/lib/pages";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin/pages")({
  beforeLoad: () => requireFeature("pages"),
  head: () =>
    seo({
      title: "Administration — Pages",
      description: "Créer et modifier les pages du site, section par section, accueil compris.",
      path: "/admin/pages",
      noindex: true,
    }),
  component: AdminPagesPage,
});

const cardClass = "rounded-xl border border-border bg-card p-5";

function AdminPagesPage() {
  const [pages, setPages] = useState<PageRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("pages")
      .select("id, slug, title, description, data, is_home, published, published_at, updated_at")
      .order("is_home", { ascending: false })
      .order("title");
    if (error) {
      setFailed(true);
      return;
    }
    setFailed(false);
    setPages((data ?? []).map((row) => toPageRow(row)!));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const current = pages?.find((page) => page.id === editing) ?? null;

  return (
    <AdminShell
      title="Pages"
      intro="Composez vos pages section par section, sans code : bandeau, texte, image, points forts, questions, appel à l'action. La page marquée « Accueil » remplace la page d'accueil du site."
    >
      {current ? (
        <PageEditor
          key={current.id}
          page={current}
          onClose={() => setEditing(null)}
          onSaved={() => void load()}
        />
      ) : failed ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-card p-4 text-sm text-destructive-text"
        >
          Pages indisponibles.{" "}
          <button type="button" className="underline" onClick={() => void load()}>
            Réessayer
          </button>
        </p>
      ) : pages === null ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <PageList pages={pages} reload={load} onEdit={setEditing} />
      )}
    </AdminShell>
  );
}

function PageList({
  pages,
  reload,
  onEdit,
}: {
  pages: PageRow[];
  reload: () => Promise<void>;
  onEdit: (id: string) => void;
}) {
  const hasHome = pages.some((page) => page.is_home);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("title") ?? "").trim();
    const home = data.get("home") === "on";
    const slug = home ? "accueil" : slugify(title);
    if (!title || !slug) {
      toast.error("Donnez un titre à la page.");
      return;
    }
    const content = emptyPageData();
    const hero = newSection("Hero");
    hero.props["title"] = title;
    content.content.push(hero);
    const { data: row, error } = await supabase
      .from("pages")
      .insert({ title, slug, is_home: home, data: content as unknown as Json })
      .select("id")
      .single();
    if (error || !row) {
      toast.error("Page non créée.", {
        description: error?.code === "23505" ? "Cette adresse est déjà prise." : undefined,
      });
      return;
    }
    toast.success("Page créée en brouillon.");
    form.reset();
    await reload();
    onEdit(row.id);
  }

  async function togglePublished(page: PageRow) {
    const { error } = await supabase
      .from("pages")
      .update({ published: !page.published })
      .eq("id", page.id);
    if (error) toast.error("Modification non enregistrée.");
    else toast.success(page.published ? "Page repassée en brouillon." : "Page publiée.");
    void reload();
  }

  async function makeHome(page: PageRow) {
    const { error: clearError } = await supabase
      .from("pages")
      .update({ is_home: false })
      .eq("is_home", true);
    const { error } = clearError
      ? { error: clearError }
      : await supabase.from("pages").update({ is_home: true }).eq("id", page.id);
    if (error) toast.error("Accueil non modifié.");
    else toast.success(`« ${page.title} » devient la page d'accueil.`);
    void reload();
  }

  async function remove(page: PageRow) {
    const { error } = await supabase.from("pages").delete().eq("id", page.id);
    if (error) toast.error("Page non supprimée.");
    else toast.success("Page supprimée.");
    void reload();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={create} className={`flex flex-wrap items-end gap-3 ${cardClass}`}>
        <div className="min-w-[220px] flex-1 space-y-1.5">
          <Label htmlFor="page-title">Nouvelle page</Label>
          <Input id="page-title" name="title" required maxLength={160} placeholder="Nos services" />
        </div>
        {!hasHome ? (
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" name="home" className="h-4 w-4" />
            C'est la page d'accueil
          </label>
        ) : null}
        <Button type="submit" title="Créer cette page en brouillon">
          Créer
        </Button>
      </form>

      {pages.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Aucune page pour l'instant. Commencez par la page d'accueil : cochez « C'est la page
          d'accueil ».
        </p>
      ) : (
        <ul className="space-y-3">
          {pages.map((page) => (
            <li key={page.id} className={cardClass}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {page.title}
                    {page.is_home ? (
                      <span className="ml-2 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-primary-text">
                        Accueil
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 break-all text-xs text-muted-foreground">
                    {page.is_home ? "/" : `/pages/${page.slug}`} · {page.data.content.length}{" "}
                    sections · modifiée le {formatDate(page.updated_at)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex min-h-11 items-center gap-2 text-xs">
                    <Switch
                      checked={page.published}
                      onCheckedChange={() => void togglePublished(page)}
                      aria-label={`Publier la page ${page.title}`}
                    />
                    {page.published ? "Publiée" : "Brouillon"}
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onEdit(page.id)}
                    title="Modifier cette page"
                  >
                    Modifier
                  </Button>
                  {!page.is_home ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void makeHome(page)}
                      title="Afficher cette page comme page d'accueil du site"
                    >
                      Définir comme accueil
                    </Button>
                  ) : null}
                  <ConfirmButton
                    title="Supprimer cette page"
                    question={`Supprimer la page « ${page.title} » ?`}
                    detail={
                      page.is_home
                        ? "C'est la page d'accueil : le site affichera de nouveau l'accueil par défaut. Cette action ne peut pas être annulée."
                        : "Les liens vers cette page ne fonctionneront plus. Cette action ne peut pas être annulée."
                    }
                    onConfirm={() => remove(page)}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PageEditor({
  page,
  onClose,
  onSaved,
}: {
  page: PageRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  const [description, setDescription] = useState(page.description);
  const [data, setData] = useState<PageData>(() => structuredClone(page.data));
  const [addType, setAddType] = useState<SectionType>("Text");
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const dirty =
    title !== page.title ||
    slug !== page.slug ||
    description !== page.description ||
    JSON.stringify(data) !== JSON.stringify(page.data);

  function setSections(next: Section[]) {
    setData({ ...data, content: next });
  }

  function move(index: number, delta: number) {
    const next = [...data.content];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    setSections(next);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const cleanSlug = page.is_home ? page.slug : slugify(slug || title);
    if (!title.trim() || !cleanSlug) {
      toast.error("Titre et adresse obligatoires.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("pages")
      .update({
        title: title.trim(),
        slug: cleanSlug,
        description: description.trim(),
        data: data as unknown as Json,
      })
      .eq("id", page.id);
    setSaving(false);
    if (error) {
      toast.error("Page non enregistrée.", {
        description: error.code === "23505" ? "Cette adresse est déjà prise." : error.message,
      });
      return;
    }
    toast.success("Page enregistrée.");
    onSaved();
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (!dirty || window.confirm("Quitter sans enregistrer vos modifications ?")) onClose();
          }}
        >
          ← Toutes les pages
        </Button>
        <span className="text-xs text-muted-foreground">
          {page.published ? "Publiée" : "Brouillon"}
          {dirty ? " · modifications non enregistrées" : ""}
        </span>
        <div className="ml-auto flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setPreview(!preview)}
            aria-pressed={preview}
          >
            {preview ? "Revenir à l'édition" : "Aperçu"}
          </Button>
          <Button type="submit" disabled={saving || !dirty}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </div>

      {preview ? (
        <div className="rounded-xl border border-dashed border-border bg-background p-6">
          <PageRender data={data} titleFallback={title} />
        </div>
      ) : (
        <>
          <fieldset className={`grid gap-3 sm:grid-cols-2 ${cardClass}`}>
            <legend className="sr-only">Réglages de la page</legend>
            <div className="space-y-1.5">
              <Label htmlFor="edit-title">
                Titre (onglet du navigateur et moteurs de recherche)
              </Label>
              <Input
                id="edit-title"
                value={title}
                maxLength={160}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-slug">Adresse</Label>
              {page.is_home ? (
                <p className="flex min-h-10 items-center text-sm text-muted-foreground">
                  Page d'accueil : toujours « / »
                </p>
              ) : (
                <>
                  <Input
                    id="edit-slug"
                    value={slug}
                    maxLength={80}
                    onChange={(e) => setSlug(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    /pages/{slugify(slug || title) || "…"}
                  </p>
                  {page.published && slugify(slug) !== page.slug ? (
                    <p className="text-xs text-destructive-text">
                      Page publiée : changer l'adresse casse les liens déjà partagés.
                    </p>
                  ) : null}
                </>
              )}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="edit-description">
                Description pour les moteurs de recherche (160 caractères conseillés)
              </Label>
              <Textarea
                id="edit-description"
                rows={2}
                maxLength={300}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </fieldset>

          {data.content.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Page vide : ajoutez une première section ci-dessous.
            </p>
          ) : (
            <ol className="space-y-4">
              {data.content.map((section, index) => (
                <SectionEditor
                  key={section.props.id}
                  section={section}
                  index={index}
                  count={data.content.length}
                  onChange={(next) =>
                    setSections(data.content.map((s, i) => (i === index ? next : s)))
                  }
                  onMove={(delta) => move(index, delta)}
                  onRemove={() => setSections(data.content.filter((_, i) => i !== index))}
                />
              ))}
            </ol>
          )}

          <div className={`flex flex-wrap items-end gap-3 ${cardClass}`}>
            <div className="min-w-[220px] flex-1 space-y-1.5">
              <Label htmlFor="add-section">Ajouter une section</Label>
              <select
                id="add-section"
                value={addType}
                onChange={(e) => setAddType(e.target.value as SectionType)}
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground"
              >
                {(Object.keys(SECTIONS) as SectionType[]).map((type) => (
                  <option key={type} value={type}>
                    {SECTIONS[type].label} — {SECTIONS[type].description}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSections([...data.content, newSection(addType)])}
            >
              Ajouter
            </Button>
          </div>
        </>
      )}
    </form>
  );
}

function SectionEditor({
  section,
  index,
  count,
  onChange,
  onMove,
  onRemove,
}: {
  section: Section;
  index: number;
  count: number;
  onChange: (next: Section) => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
}) {
  const known = isSectionType(section.type);
  const def = known ? SECTIONS[section.type as SectionType] : null;
  const label = def?.label ?? `Section inconnue (${section.type})`;

  return (
    <li className={cardClass}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-foreground">
          {index + 1}. {label}
        </p>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            aria-label={`Monter la section ${index + 1}`}
          >
            ↑
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={index === count - 1}
            onClick={() => onMove(1)}
            aria-label={`Descendre la section ${index + 1}`}
          >
            ↓
          </Button>
          <ConfirmButton
            title="Retirer cette section"
            question={`Retirer la section « ${label} » ?`}
            detail="La section disparaît de la page à l'enregistrement."
            confirmLabel="Retirer"
            label="Retirer"
            onConfirm={onRemove}
          />
        </div>
      </div>
      {def ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {Object.entries(def.fields as Record<string, Field>).map(([key, field]) => (
            <FieldEditor
              key={key}
              name={key}
              field={field}
              props={section.props}
              onChange={(value) =>
                onChange({ ...section, props: { ...section.props, [key]: value } })
              }
            />
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          Ce type de section n'est pas affiché sur le site. Vous pouvez la retirer.
        </p>
      )}
    </li>
  );
}

const wide = (field: Field) =>
  field.type === "textarea" || field.type === "array" || field.type === "image";

function FieldEditor({
  name,
  field,
  props,
  onChange,
}: {
  name: string;
  field: Field;
  props: Record<string, unknown>;
  onChange: (value: unknown) => void;
}) {
  const id = `${useId()}-${name}`;
  const span = wide(field) ? "sm:col-span-2" : "";

  if (field.type === "image") {
    return (
      <div className={span}>
        <ImageField id={id} label={field.label} value={str(props, name)} onChange={onChange} />
      </div>
    );
  }
  if (field.type === "select") {
    return (
      <div className={`space-y-1.5 ${span}`}>
        <Label htmlFor={id}>{field.label}</Label>
        <select
          id={id}
          value={str(props, name) || field.options[0]?.value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground"
        >
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
  if (field.type === "array") {
    const list = items(props, name);
    const set = (next: Array<Record<string, unknown>>) => onChange(next);
    return (
      <fieldset className={`space-y-3 ${span}`}>
        <legend className="text-sm font-medium text-foreground">
          {field.label} ({list.length}/{field.max})
        </legend>
        {list.map((item, i) => (
          <div key={i} className="space-y-2 rounded-lg bg-muted p-3">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                {field.itemLabel} {i + 1}
              </p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="ml-auto"
                disabled={i === 0}
                onClick={() => {
                  const next = [...list];
                  [next[i - 1], next[i]] = [next[i]!, next[i - 1]!];
                  set(next);
                }}
                aria-label={`Monter : ${field.itemLabel} ${i + 1}`}
              >
                ↑
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => set(list.filter((_, j) => j !== i))}
                aria-label={`Retirer : ${field.itemLabel} ${i + 1}`}
              >
                Retirer
              </Button>
            </div>
            {Object.entries(field.arrayFields).map(([key, sub]) => (
              <FieldEditor
                key={key}
                name={key}
                field={sub}
                props={item}
                onChange={(value) =>
                  set(list.map((it, j) => (j === i ? { ...it, [key]: value } : it)))
                }
              />
            ))}
          </div>
        ))}
        {list.length < field.max ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              set([
                ...list,
                Object.fromEntries(Object.keys(field.arrayFields).map((key) => [key, ""])),
              ])
            }
          >
            Ajouter : {field.itemLabel.toLowerCase()}
          </Button>
        ) : null}
      </fieldset>
    );
  }
  return (
    <div className={`space-y-1.5 ${span}`}>
      <Label htmlFor={id}>{field.label}</Label>
      {field.type === "textarea" ? (
        <>
          <Textarea
            id={id}
            rows={4}
            value={str(props, name)}
            onChange={(e) => onChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            **gras**, *italique*, [lien](/contact), listes avec « - ».
          </p>
        </>
      ) : (
        <Input
          id={id}
          value={str(props, name)}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.type === "link" ? "/contact ou https://…" : undefined}
        />
      )}
    </div>
  );
}
