import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Clock, GraduationCap, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/cds/SiteHeader";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RichText } from "@/lib/richtext";
import { isFeatureOn, requireFeature } from "@/config/features";
import { getCourse } from "@/lib/lms.functions";
import { startCourseCheckout } from "@/lib/payments.functions";
import { RetractionWaiver } from "@/components/cds/RetractionWaiver";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { breadcrumbJsonLd, seo } from "@/lib/seo";
import { formatDuration, formatPrice } from "@/lib/format";

const LEVEL_LABEL: Record<string, string> = {
  debutant: "Débutant",
  intermediaire: "Intermédiaire",
  avance: "Avancé",
};

type CourseSearch = { paiement?: "reussi" | "annule" };

export const Route = createFileRoute("/formation/$slug/")({
  validateSearch: (search: Record<string, unknown>): CourseSearch =>
    search["paiement"] === "reussi" || search["paiement"] === "annule"
      ? { paiement: search["paiement"] }
      : {},
  beforeLoad: () => requireFeature("lms"),
  loader: async ({ params }) => {
    const data = await getCourse({ data: { slug: params.slug } });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Formation introuvable" }, { name: "robots", content: "noindex" }] };
    }
    const { course } = loaderData;
    const description =
      course.excerpt || `Programme détaillé de la formation ${course.title}, leçon par leçon.`;
    return {
      ...seo({
        title: course.title,
        description: description.slice(0, 200),
        path: `/formation/${course.slug}`,
        type: "article",
        ...(course.cover_url && /^https:\/\//.test(course.cover_url)
          ? { image: course.cover_url }
          : {}),
      }),
      scripts: [
        breadcrumbJsonLd([
          { name: "Formations", path: "/formations" },
          { name: course.title, path: `/formation/${course.slug}` },
        ]),
      ],
    };
  },
  errorComponent: () => (
    <PageShell>
      <p className="text-sm text-muted-foreground">Cette formation n'a pas pu être chargée.</p>
    </PageShell>
  ),
  notFoundComponent: () => (
    <PageShell>
      <p className="text-sm text-muted-foreground">
        Cette formation n'existe pas ou n'est plus publiée.{" "}
        <Link to="/formations" title="Revenir au catalogue" className="underline">
          Revenir au catalogue
        </Link>
      </p>
    </PageShell>
  ),
  component: CoursePage,
});

function CoursePage() {
  const { course, modules, lessons } = Route.useLoaderData();
  const { paiement } = Route.useSearch();
  const { user } = useAuth();
  const router = useRouter();
  const [enrolled, setEnrolled] = useState(false);
  const [paid, setPaid] = useState(false);
  const [doneIds, setDoneIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [waiver, setWaiver] = useState(false);
  const [paying, setPaying] = useState(false);
  const isPaidCourse = course.price_cents > 0;
  const onlinePayment = isPaidCourse && isFeatureOn("payments");
  // Accès au contenu : formation gratuite, ou payante et réglée.
  const hasAccess = enrolled && (!isPaidCourse || paid);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Retour de Stripe : le webhook peut arriver quelques secondes après la redirection.
    let attempts = paiement === "reussi" ? 6 : 1;
    const load = async () => {
      const [{ data: enrollment }, { data: progress }] = await Promise.all([
        supabase
          .from("lms_enrollments")
          .select("id, paid_at")
          .eq("user_id", user.id)
          .eq("course_id", course.id)
          .maybeSingle(),
        supabase.from("lms_progress").select("lesson_id").eq("user_id", user.id),
      ]);
      if (cancelled) return;
      setEnrolled(Boolean(enrollment));
      setPaid(Boolean(enrollment?.paid_at));
      setDoneIds((progress ?? []).map((row) => row.lesson_id));
      attempts -= 1;
      if (!enrollment?.paid_at && attempts > 0) timer = setTimeout(load, 2500);
    };
    void load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [user, course.id, paiement]);

  useEffect(() => {
    if (paiement === "reussi") {
      toast.success("Paiement reçu, merci.", {
        description: "L'accès s'ouvre dès que Stripe nous confirme le règlement.",
      });
    } else if (paiement === "annule") {
      toast.info("Paiement annulé.", { description: "Aucun montant n'a été débité." });
    }
  }, [paiement]);

  async function pay() {
    if (!waiver) {
      toast.info("Cochez la case de renonciation pour continuer.");
      return;
    }
    setPaying(true);
    try {
      const { url } = await startCourseCheckout({ data: { courseId: course.id, waiver } });
      window.location.assign(url);
    } catch (err) {
      setPaying(false);
      toast.error("Paiement impossible.", {
        description: err instanceof Error ? err.message : "Réessayez dans un instant.",
      });
    }
  }

  const lessonIds = lessons.map((lesson) => lesson.id);
  const doneCount = lessonIds.filter((id) => doneIds.includes(id)).length;
  const percent = lessonIds.length ? Math.round((doneCount / lessonIds.length) * 100) : 0;
  const firstLesson = lessons[0];

  async function enroll() {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("lms_enrollments")
      .insert({ user_id: user.id, course_id: course.id });
    setBusy(false);
    if (error) {
      toast.error("Inscription impossible.", { description: "Réessayez dans un instant." });
      return;
    }
    setEnrolled(true);
    toast.success(isPaidCourse ? "Place réservée." : "Vous êtes inscrit.", {
      description: isPaidCourse
        ? "L'équipe vous contacte pour le règlement."
        : "Commencez par la première leçon.",
    });
    router.invalidate();
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-[900px]">
        <nav aria-label="Fil d'Ariane" className="text-xs text-muted-foreground">
          <Link
            to="/formations"
            title="Revenir au catalogue des formations"
            className="hover:underline"
          >
            Formations
          </Link>
          {" / "}
          {course.title}
        </nav>

        <h1 className="mt-4 text-3xl font-bold text-foreground">{course.title}</h1>
        <ul className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <li className="inline-flex items-center gap-1">
            <GraduationCap className="size-3.5" aria-hidden="true" />
            {LEVEL_LABEL[course.level] ?? "Tous niveaux"}
          </li>
          <li className="inline-flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden="true" />
            {formatDuration(course.duration_minutes ?? 0)}
          </li>
          <li className="font-semibold text-primary-text">
            {formatPrice(course.price_cents, course.currency ?? "EUR")}
          </li>
        </ul>

        {course.description ? (
          <RichText value={course.description} className="mt-6 text-sm text-foreground" />
        ) : course.excerpt ? (
          <p className="mt-6 text-sm text-foreground">{course.excerpt}</p>
        ) : null}

        <div className="mt-6 rounded-xl border border-border bg-card p-5">
          {!user ? (
            <p className="text-sm text-muted-foreground">
              <Link
                to="/login"
                title="Se connecter pour suivre cette formation"
                className="text-primary-text hover:underline"
              >
                Connectez-vous
              </Link>{" "}
              pour suivre cette formation et garder votre progression.
            </p>
          ) : hasAccess ? (
            <>
              <p className="text-sm font-medium text-foreground">
                Votre progression : {doneCount} / {lessonIds.length} leçons
              </p>
              <Progress value={percent} className="mt-2" />
              {firstLesson ? (
                <Button asChild className="mt-4" title="Reprendre la formation">
                  <Link
                    to="/formation/$slug/lecon/$lessonId"
                    params={{ slug: course.slug, lessonId: firstLesson.id }}
                  >
                    Reprendre la formation
                  </Link>
                </Button>
              ) : null}
            </>
          ) : onlinePayment ? (
            <>
              <p className="text-sm text-muted-foreground">
                {paiement === "reussi"
                  ? "Paiement en cours de confirmation : cette page s'actualise toute seule."
                  : `Réglez ${formatPrice(course.price_cents, course.currency ?? "EUR")} par carte : l'accès aux leçons s'ouvre dès la confirmation du paiement.`}
              </p>
              <RetractionWaiver checked={waiver} onChange={setWaiver} />
              <Button
                className="mt-4"
                disabled={paying || !waiver}
                onClick={pay}
                title="Payer cette formation sur la page sécurisée de Stripe"
              >
                {paying ? "Ouverture du paiement…" : "Payer et accéder à la formation"}
              </Button>
            </>
          ) : enrolled ? (
            <p className="text-sm text-muted-foreground">
              Votre place est réservée. L'accès aux leçons s'ouvre dès que l'équipe a enregistré
              votre règlement.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {isPaidCourse
                  ? "Inscrivez-vous pour réserver votre place : l'équipe vous contacte pour le règlement."
                  : "Cette formation est offerte : inscrivez-vous et commencez tout de suite."}
              </p>
              <Button
                className="mt-4"
                disabled={busy}
                onClick={enroll}
                title="S'inscrire à cette formation"
              >
                {busy ? "Inscription…" : "M'inscrire"}
              </Button>
            </>
          )}
        </div>

        <section className="mt-10">
          <h2 className="text-base font-semibold text-foreground">Programme</h2>
          {modules.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Programme en cours de rédaction.</p>
          ) : (
            <ol className="mt-3 space-y-4">
              {modules.map((module, index) => {
                const items = lessons.filter((lesson) => lesson.module_id === module.id);
                return (
                  <li key={module.id} className="rounded-xl border border-border bg-card p-5">
                    <h3 className="text-sm font-semibold text-foreground">
                      Module {index + 1} — {module.title}
                    </h3>
                    <ul className="mt-3 space-y-1.5 text-sm">
                      {items.map((lesson) => {
                        const open = hasAccess || lesson.free_preview;
                        const done = doneIds.includes(lesson.id);
                        return (
                          <li key={lesson.id} className="flex items-center gap-2">
                            {done ? (
                              <CheckCircle2
                                className="size-4 text-success-text"
                                aria-hidden="true"
                              />
                            ) : (
                              <PlayCircle
                                className="size-4 text-muted-foreground"
                                aria-hidden="true"
                              />
                            )}
                            {open ? (
                              <Link
                                to="/formation/$slug/lecon/$lessonId"
                                params={{ slug: course.slug, lessonId: lesson.id }}
                                title={`Ouvrir la leçon ${lesson.title}`}
                                className="text-foreground hover:underline"
                              >
                                {lesson.title}
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">{lesson.title}</span>
                            )}
                            {lesson.free_preview && !hasAccess ? (
                              <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-success-text">
                                Aperçu libre
                              </span>
                            ) : null}
                            <span className="ml-auto text-xs text-muted-foreground">
                              {formatDuration(lesson.duration_minutes ?? 0)}
                            </span>
                          </li>
                        );
                      })}
                      {items.length === 0 ? (
                        <li className="text-muted-foreground">Leçons à venir.</li>
                      ) : null}
                    </ul>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </PageShell>
  );
}
