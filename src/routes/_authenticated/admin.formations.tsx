import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/cds/AdminShell";
import { ConfirmButton } from "@/components/cds/ConfirmButton";
import { ImageField } from "@/components/cds/MediaPicker";
import { RecordEditor } from "@/components/cds/RecordEditor";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { requireFeature } from "@/config/features";
import { downloadCsv } from "@/lib/csv";
import { formatPrice, slugify } from "@/lib/format";
import { lirePrix } from "@/lib/prix";
import { moveRow } from "@/lib/reorder";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin/formations")({
  beforeLoad: () => requireFeature("lms"),
  head: () =>
    seo({
      title: "Administration — Formations",
      description: "Créer et organiser les formations, leurs modules et leurs leçons.",
      path: "/admin/formations",
      noindex: true,
    }),
  component: AdminCoursesPage,
});

type Course = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  level: string;
  price_cents: number;
  duration_minutes: number;
  published: boolean;
  position: number;
  cover_url: string | null;
  description: string;
};

type Module = { id: string; course_id: string; title: string; position: number };
type Lesson = {
  id: string;
  module_id: string;
  title: string;
  position: number;
  free_preview: boolean;
};
type Enrollment = {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
  paid_at: string | null;
};

function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [people, setPeople] = useState<Record<string, string>>({});
  const [editingLesson, setEditingLesson] = useState<string | null>(null);
  const [openCourse, setOpenCourse] = useState<string | null>(null);
  const [courseFormKey, setCourseFormKey] = useState(0);
  const [editingCourse, setEditingCourse] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    const [c, m, l, e] = await Promise.all([
      supabase
        .from("lms_courses")
        .select(
          "id, title, slug, excerpt, level, price_cents, duration_minutes, published, position, cover_url, description",
        )
        .order("position"),
      supabase.from("lms_modules").select("id, course_id, title, position").order("position"),
      supabase
        .from("lms_lessons")
        .select("id, module_id, title, position, free_preview")
        .order("position"),
      supabase.from("lms_enrollments").select("id, user_id, course_id, enrolled_at, paid_at"),
    ]);
    setFailed(Boolean(c.error || m.error || l.error || e.error));
    if (c.error) return;
    setCourses(c.data ?? []);
    setModules(m.data ?? []);
    setLessons(l.data ?? []);
    const rows = (e.data ?? []) as Enrollment[];
    setEnrollments(rows);
    const ids = [...new Set(rows.map((row) => row.user_id))];
    if (ids.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", ids);
      setPeople(
        Object.fromEntries(
          (profiles ?? []).map((p) => [
            p.id,
            p.full_name ? `${p.full_name} (${p.email ?? ""})` : (p.email ?? p.id),
          ]),
        ),
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addCourse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("title") ?? "").trim();
    if (!title) return;
    const prix = lirePrix(String(data.get("price") ?? ""));
    if (prix.cents === null) {
      toast.error(prix.erreur, {
        description: prix.detail ?? "Indiquez 0 pour une formation gratuite.",
      });
      return;
    }
    const { error } = await supabase.from("lms_courses").insert({
      title,
      slug: slugify(title),
      excerpt: String(data.get("excerpt") ?? ""),
      level: String(data.get("level") ?? "debutant"),
      price_cents: prix.cents,
      cover_url: String(data.get("cover_url") ?? "").trim() || null,
      position: (courses ?? []).length,
    });
    if (error) toast.error("Formation non créée.");
    else {
      toast.success("Formation créée.");
      form.reset();
      setCourseFormKey((k) => k + 1);
      void load();
    }
  }

  async function addModule(courseId: string, title: string) {
    const count = modules.filter((item) => item.course_id === courseId).length;
    const { error } = await supabase
      .from("lms_modules")
      .insert({ course_id: courseId, title, position: count });
    if (error) toast.error("Module non créé.");
    else void load();
  }

  /** Écrit une modification et signale l'échec ; renvoie vrai si c'est enregistré. */
  async function write(
    table: "lms_courses" | "lms_modules" | "lms_lessons",
    id: string,
    changes: Record<string, unknown>,
    message: string,
  ) {
    const { error } = await supabase
      .from(table)
      .update(changes as never)
      .eq("id", id);
    if (error) {
      toast.error("Modification non enregistrée.", {
        description: error.code === "23505" ? "Cette adresse est déjà prise." : undefined,
      });
      return false;
    }
    toast.success(message);
    void load();
    return true;
  }

  async function removeRow(
    table: "lms_courses" | "lms_modules" | "lms_lessons",
    id: string,
    message: string,
  ) {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) toast.error("Suppression impossible.");
    else {
      toast.success(message);
      void load();
    }
  }

  async function reorder(
    table: "lms_courses" | "lms_modules" | "lms_lessons",
    rows: ReadonlyArray<{ id: string; position: number }>,
    index: number,
    delta: number,
  ) {
    if (!(await moveRow(table, rows, index, delta))) toast.error("Ordre non enregistré.");
    void load();
  }

  async function addLesson(moduleId: string, title: string) {
    const count = lessons.filter((item) => item.module_id === moduleId).length;
    const { error } = await supabase
      .from("lms_lessons")
      .insert({ module_id: moduleId, title, position: count });
    if (error) toast.error("Leçon non créée.");
    else void load();
  }

  return (
    <AdminShell
      title="Formations"
      intro="Organisez votre catalogue : une formation, ses modules, puis ses leçons. Rien n'est visible tant que ce n'est pas publié."
    >
      <form
        onSubmit={addCourse}
        className="grid gap-3 rounded-xl border border-border bg-card p-5 sm:grid-cols-2"
      >
        <div className="sm:col-span-2">
          <Label htmlFor="course-title">Titre de la formation</Label>
          <Input
            id="course-title"
            name="title"
            required
            className="mt-1"
            placeholder="Réussir son premier lancement"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="course-excerpt">Promesse en une phrase</Label>
          <Textarea id="course-excerpt" name="excerpt" rows={2} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="course-level">Niveau</Label>
          <select
            id="course-level"
            name="level"
            className="mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground"
          >
            <option value="debutant">Débutant</option>
            <option value="intermediaire">Intermédiaire</option>
            <option value="avance">Avancé</option>
          </select>
        </div>
        <div>
          <Label htmlFor="course-price">Prix en euros (0 = gratuite)</Label>
          <Input
            id="course-price"
            name="price"
            type="number"
            min="0"
            step="1"
            defaultValue="0"
            className="mt-1"
          />
        </div>
        <div className="sm:col-span-2">
          <ImageField
            key={courseFormKey}
            id="course-cover"
            name="cover_url"
            label="Image de couverture"
          />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" title="Créer cette formation">
            Créer la formation
          </Button>
        </div>
      </form>

      {failed ? (
        <p
          role="alert"
          className="mt-6 rounded-lg border border-destructive/40 p-4 text-sm text-destructive-text"
        >
          Une partie du catalogue n'a pas pu être chargée.{" "}
          <button type="button" className="underline" onClick={() => void load()}>
            Réessayer
          </button>
        </p>
      ) : null}
      {courses === null ? (
        <p className="mt-6 text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <>
          <div className="mt-6 flex items-center gap-3">
            <p className="text-sm text-muted-foreground">
              {courses.length} formations · {enrollments.length} inscriptions
            </p>
            <Button
              variant="outline"
              className="ml-auto"
              title="Télécharger le catalogue au format tableur"
              onClick={() => downloadCsv("formations.csv", courses)}
            >
              Export CSV
            </Button>
          </div>

          <ul className="mt-3 space-y-3">
            {courses.map((course, courseIndex) => {
              const courseModules = modules.filter((item) => item.course_id === course.id);
              const learners = enrollments.filter((item) => item.course_id === course.id).length;
              return (
                <li key={course.id} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{course.title}</p>
                    <span className="text-xs text-muted-foreground">
                      {course.price_cents === 0 ? "Gratuite" : formatPrice(course.price_cents)} ·{" "}
                      {learners} inscrits
                    </span>
                    <span className="ml-auto rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                      {course.published ? "Publiée" : "Brouillon"}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant={course.published ? "outline" : "default"}
                      title={course.published ? "Retirer du catalogue" : "Publier au catalogue"}
                      onClick={() =>
                        void write(
                          "lms_courses",
                          course.id,
                          { published: !course.published },
                          course.published
                            ? "Formation retirée du catalogue."
                            : "Formation publiée.",
                        )
                      }
                    >
                      {course.published ? "Dépublier" : "Publier"}
                    </Button>
                    <Button
                      variant="outline"
                      title="Modifier titre, prix, niveau, description et image"
                      onClick={() =>
                        setEditingCourse(editingCourse === course.id ? null : course.id)
                      }
                    >
                      {editingCourse === course.id ? "Fermer" : "Modifier"}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={courseIndex === 0}
                      onClick={() => void reorder("lms_courses", courses, courseIndex, -1)}
                      aria-label={`Monter la formation ${course.title}`}
                    >
                      ↑
                    </Button>
                    <Button
                      variant="outline"
                      disabled={courseIndex === courses.length - 1}
                      onClick={() => void reorder("lms_courses", courses, courseIndex, 1)}
                      aria-label={`Descendre la formation ${course.title}`}
                    >
                      ↓
                    </Button>
                    <ConfirmButton
                      size="default"
                      title="Supprimer définitivement cette formation"
                      question={`Supprimer la formation « ${course.title} » ?`}
                      detail={`Modules, leçons, inscriptions (${learners}) et progression sont supprimés définitivement. Pour la retirer sans rien perdre, dépubliez-la.`}
                      onConfirm={() => removeRow("lms_courses", course.id, "Formation supprimée.")}
                    />
                    <Button
                      variant="outline"
                      title="Afficher ou masquer le programme"
                      onClick={() => setOpenCourse(openCourse === course.id ? null : course.id)}
                    >
                      {openCourse === course.id ? "Masquer le programme" : "Programme"}
                    </Button>
                  </div>

                  {editingCourse === course.id ? (
                    <div className="mt-4 border-t border-border pt-4">
                      <RecordEditor
                        idPrefix={`course-${course.id}`}
                        fields={[
                          { key: "title", label: "Titre", type: "text", required: true },
                          {
                            key: "slug",
                            label: "Adresse (/formation/…)",
                            type: "text",
                            required: true,
                          },
                          {
                            key: "excerpt",
                            label: "Promesse en une phrase",
                            type: "text",
                            wide: true,
                          },
                          { key: "description", label: "Description", type: "textarea" },
                          {
                            key: "level",
                            label: "Niveau",
                            type: "select",
                            options: [
                              { value: "debutant", label: "Débutant" },
                              { value: "intermediaire", label: "Intermédiaire" },
                              { value: "avance", label: "Avancé" },
                            ],
                          },
                          { key: "price_cents", label: "Prix (0 = gratuite)", type: "euros" },
                          {
                            key: "duration_minutes",
                            label: "Durée totale (minutes)",
                            type: "number",
                          },
                          {
                            key: "cover_url",
                            label: "Image de couverture",
                            type: "image",
                            nullable: true,
                          },
                        ]}
                        values={course}
                        onCancel={() => setEditingCourse(null)}
                        onSave={async (changes) => {
                          const ok = await write(
                            "lms_courses",
                            course.id,
                            { ...changes, slug: slugify(String(changes["slug"] ?? "")) },
                            "Formation modifiée.",
                          );
                          if (ok) setEditingCourse(null);
                          return ok;
                        }}
                      />
                    </div>
                  ) : null}

                  {openCourse === course.id ? (
                    <div className="mt-4 space-y-3 border-t border-border pt-4">
                      {courseModules.map((module, moduleIndex) => {
                        const moduleLessons = lessons.filter(
                          (lesson) => lesson.module_id === module.id,
                        );
                        return (
                          <div key={module.id} className="rounded-lg bg-muted p-3">
                            <ModuleHeader
                              module={module}
                              first={moduleIndex === 0}
                              last={moduleIndex === courseModules.length - 1}
                              lessonCount={moduleLessons.length}
                              onRename={(title) =>
                                write("lms_modules", module.id, { title }, "Module renommé.")
                              }
                              onMove={(delta) =>
                                void reorder("lms_modules", courseModules, moduleIndex, delta)
                              }
                              onRemove={() =>
                                removeRow("lms_modules", module.id, "Module supprimé.")
                              }
                            />
                            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                              {moduleLessons.map((lesson, lessonIndex) => (
                                <li key={lesson.id}>
                                  {editingLesson === lesson.id ? (
                                    <LessonEditor
                                      lesson={lesson}
                                      onClose={() => setEditingLesson(null)}
                                      onSaved={() => {
                                        setEditingLesson(null);
                                        void load();
                                      }}
                                    />
                                  ) : (
                                    <span className="flex flex-wrap items-center gap-2">
                                      · {lesson.title}
                                      {lesson.free_preview ? " (aperçu libre)" : ""}
                                      <button
                                        type="button"
                                        className="text-xs text-primary-text underline"
                                        onClick={() => setEditingLesson(lesson.id)}
                                        title={`Modifier la leçon ${lesson.title}`}
                                      >
                                        Modifier
                                      </button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        disabled={lessonIndex === 0}
                                        onClick={() =>
                                          void reorder(
                                            "lms_lessons",
                                            moduleLessons,
                                            lessonIndex,
                                            -1,
                                          )
                                        }
                                        aria-label={`Monter la leçon ${lesson.title}`}
                                      >
                                        ↑
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        disabled={lessonIndex === moduleLessons.length - 1}
                                        onClick={() =>
                                          void reorder("lms_lessons", moduleLessons, lessonIndex, 1)
                                        }
                                        aria-label={`Descendre la leçon ${lesson.title}`}
                                      >
                                        ↓
                                      </Button>
                                      <ConfirmButton
                                        title={`Supprimer la leçon ${lesson.title}`}
                                        question={`Supprimer la leçon « ${lesson.title} » ?`}
                                        detail="Son contenu et la progression des inscrits sur cette leçon sont supprimés."
                                        onConfirm={() =>
                                          removeRow("lms_lessons", lesson.id, "Leçon supprimée.")
                                        }
                                      />
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                            <form
                              className="mt-2 flex gap-2"
                              onSubmit={(event) => {
                                event.preventDefault();
                                const input = event.currentTarget.elements.namedItem(
                                  "lesson",
                                ) as HTMLInputElement;
                                if (input.value.trim())
                                  void addLesson(module.id, input.value.trim());
                                event.currentTarget.reset();
                              }}
                            >
                              <Input
                                name="lesson"
                                placeholder="Nouvelle leçon"
                                aria-label="Titre de la leçon"
                              />
                              <Button
                                type="submit"
                                variant="outline"
                                title="Ajouter cette leçon au module"
                              >
                                Ajouter
                              </Button>
                            </form>
                          </div>
                        );
                      })}
                      {course.price_cents > 0 ? (
                        <EnrollmentsPanel
                          rows={enrollments.filter((row) => row.course_id === course.id)}
                          people={people}
                          onChanged={() => void load()}
                        />
                      ) : null}
                      <form
                        className="flex gap-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          const input = event.currentTarget.elements.namedItem(
                            "module",
                          ) as HTMLInputElement;
                          if (input.value.trim()) void addModule(course.id, input.value.trim());
                          event.currentTarget.reset();
                        }}
                      >
                        <Input
                          name="module"
                          placeholder="Nouveau module"
                          aria-label="Titre du module"
                        />
                        <Button
                          type="submit"
                          variant="outline"
                          title="Ajouter ce module à la formation"
                        >
                          Ajouter un module
                        </Button>
                      </form>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </AdminShell>
  );
}

/** Édition d'une leçon : le contenu est lu par la fonction réservée (lms_lesson_content). */
function LessonEditor({
  lesson,
  onClose,
  onSaved,
}: {
  lesson: Lesson;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(lesson.title);
  const [content, setContent] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [preview, setPreview] = useState(lesson.free_preview);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void supabase.rpc("lms_lesson_content", { _lesson_id: lesson.id }).then(({ data }) => {
      if (cancelled) return;
      setContent(data?.[0]?.content ?? "");
      setVideoUrl(data?.[0]?.video_url ?? "");
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [lesson.id]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const { error } = await supabase
      .from("lms_lessons")
      .update({
        title: title.trim() || lesson.title,
        content,
        video_url: videoUrl.trim() || null,
        free_preview: preview,
      })
      .eq("id", lesson.id);
    if (error) toast.error("Leçon non enregistrée.");
    else {
      toast.success("Leçon enregistrée.");
      onSaved();
    }
  }

  async function remove() {
    const { error } = await supabase.from("lms_lessons").delete().eq("id", lesson.id);
    if (error) toast.error("Leçon non supprimée.");
    else {
      toast.success("Leçon supprimée.");
      onSaved();
    }
  }

  return (
    <form onSubmit={save} className="my-2 space-y-2 rounded-lg border border-border bg-card p-3">
      <div className="space-y-1">
        <Label htmlFor={`lesson-title-${lesson.id}`}>Titre</Label>
        <Input
          id={`lesson-title-${lesson.id}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`lesson-content-${lesson.id}`}>Contenu</Label>
        <Textarea
          id={`lesson-content-${lesson.id}`}
          rows={10}
          value={content}
          disabled={loading}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            loading
              ? "Chargement…"
              : "Texte de la leçon (**gras**, *italique*, - liste, [lien](adresse))"
          }
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`lesson-video-${lesson.id}`}>Vidéo (adresse d'intégration)</Label>
        <Input
          id={`lesson-video-${lesson.id}`}
          type="url"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://…"
        />
      </div>
      <label className="flex min-h-11 items-center gap-2 text-xs">
        <Switch checked={preview} onCheckedChange={setPreview} aria-label="Aperçu libre" />
        Aperçu libre (lisible sans inscription)
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={loading}>
          Enregistrer
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <ConfirmButton
          title="Supprimer cette leçon"
          question={`Supprimer la leçon « ${lesson.title} » ?`}
          detail="La leçon et la progression des inscrits sur cette leçon sont supprimées."
          onConfirm={remove}
        />
      </div>
    </form>
  );
}

/** Formation payante : l'admin enregistre les règlements (en attendant le paiement en ligne). */
function EnrollmentsPanel({
  rows,
  people,
  onChanged,
}: {
  rows: Enrollment[];
  people: Record<string, string>;
  onChanged: () => void;
}) {
  async function setPaid(row: Enrollment, paid: boolean) {
    const { error } = await supabase
      .from("lms_enrollments")
      .update({ paid_at: paid ? new Date().toISOString() : null })
      .eq("id", row.id);
    if (error) toast.error("Modification non enregistrée.");
    else {
      toast.success(
        paid ? "Règlement enregistré : la formation est ouverte." : "Règlement retiré.",
      );
      onChanged();
    }
  }

  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-sm font-medium text-foreground">Inscriptions et règlements</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Formation payante : le contenu s'ouvre quand le règlement est enregistré ici.
      </p>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Aucune inscription pour l'instant.</p>
      ) : (
        <ul className="mt-2 divide-y divide-border text-sm">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-3 py-2">
              <span className="min-w-0 flex-1 break-all text-foreground">
                {people[row.user_id] ?? row.user_id}
              </span>
              <label className="flex min-h-11 items-center gap-2 text-xs">
                <Switch
                  checked={Boolean(row.paid_at)}
                  onCheckedChange={(v) => void setPaid(row, v)}
                  aria-label="Règlement reçu"
                />
                {row.paid_at
                  ? `Réglé le ${new Date(row.paid_at).toLocaleDateString("fr-FR")}`
                  : "En attente de règlement"}
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ModuleHeader({
  module,
  first,
  last,
  lessonCount,
  onRename,
  onMove,
  onRemove,
}: {
  module: Module;
  first: boolean;
  last: boolean;
  lessonCount: number;
  onRename: (title: string) => Promise<boolean>;
  onMove: (delta: number) => void;
  onRemove: () => Promise<void>;
}) {
  const [title, setTitle] = useState(module.title);
  const dirty = title.trim() !== module.title && title.trim() !== "";
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (dirty) void onRename(title.trim());
      }}
    >
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        aria-label="Titre du module"
        className="min-w-[180px] flex-1 font-medium"
      />
      <Button type="submit" size="sm" variant="outline" disabled={!dirty}>
        Renommer
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={first}
        onClick={() => onMove(-1)}
        aria-label={`Monter le module ${module.title}`}
      >
        ↑
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={last}
        onClick={() => onMove(1)}
        aria-label={`Descendre le module ${module.title}`}
      >
        ↓
      </Button>
      <ConfirmButton
        title={`Supprimer le module ${module.title}`}
        question={`Supprimer le module « ${module.title} » ?`}
        detail={`Ses ${lessonCount} leçons et la progression associée sont supprimées définitivement.`}
        onConfirm={onRemove}
      />
    </form>
  );
}
