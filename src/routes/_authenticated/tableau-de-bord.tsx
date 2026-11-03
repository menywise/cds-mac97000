import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/cds/SiteHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { bootstrapCurrentUser, useAuth } from "@/hooks/useAuth";
import { seo } from "@/lib/seo";
import { isFeatureOn, withActiveModules } from "@/config/features";
import { useDroitsEditorial } from "@/lib/editorial";

export const Route = createFileRoute("/_authenticated/tableau-de-bord")({
  head: () =>
    seo({
      title: "Tableau de bord",
      description: "Vue d'ensemble de votre activité et de celle du site.",
      path: "/tableau-de-bord",
      noindex: true,
    }),
  component: DashboardPage,
});

type Stats = {
  messages: number | null;
  subscribers: number | null;
  reviews: number | null;
  topics: number | null;
  posts: number | null;
  comments: number | null;
};

const raccourcis = [
  {
    to: "/admin",
    label: "Paramètres du site",
    desc: "Nom, coordonnées légales, hébergeur",
    title: "Régler les paramètres du site",
  },
  {
    to: "/admin/messages",
    label: "Messages reçus",
    desc: "Demandes envoyées par le formulaire",
    title: "Consulter les messages reçus",
    module: "contact",
  },
  {
    to: "/editorial",
    label: "Éditorial",
    desc: "Écrire, relire et publier les articles",
    title: "Ouvrir le poste Éditorial",
    module: "blog",
  },
  {
    to: "/profil",
    label: "Mon profil",
    desc: "Nom affiché, profil public et mot de passe",
    title: "Modifier mon profil",
  },
  {
    to: "/decouvrir",
    label: "Découvrir",
    desc: "Tout ce que votre espace permet déjà",
    title: "Faire le tour des fonctionnalités actives",
    module: "onboarding",
  },
  {
    to: "/messagerie",
    label: "Messagerie",
    desc: "Vos échanges privés",
    title: "Ouvrir ma messagerie",
    module: "messaging",
  },
  {
    to: "/membres",
    label: "Annuaire",
    desc: "Les membres de la communauté",
    title: "Parcourir l'annuaire",
    module: "members",
  },
  {
    to: "/forum",
    label: "Forum",
    desc: "Discussions en cours",
    title: "Ouvrir le forum",
    module: "forum",
  },
] as const;

type FollowedTopic = { id: string; title: string; last_activity_at: string };

function DashboardPage() {
  const { user } = useAuth();
  const droitsEditorial = useDroitsEditorial();
  const [role, setRole] = useState<"admin" | "user" | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [followed, setFollowed] = useState<FollowedTopic[] | null>(null);
  const [followedError, setFollowedError] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void supabase
      .from("forum_follows")
      .select("forum_topics(id, title, last_activity_at)")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setFollowedError(true);
          setFollowed([]);
          return;
        }
        const topics = (data ?? [])
          .map((row) => row.forum_topics)
          .filter((topic): topic is FollowedTopic => Boolean(topic))
          .sort((a, b) => b.last_activity_at.localeCompare(a.last_activity_at));
        setFollowed(topics);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      let nextRole: "admin" | "user" = "user";
      try {
        nextRole = await bootstrapCurrentUser();
      } catch {
        nextRole = "user";
      }
      if (cancelled) return;
      setRole(nextRole);

      const count = async (
        table:
          | "contact_messages"
          | "newsletter_subscribers"
          | "reviews"
          | "forum_topics"
          | "blog_comments",
      ) => {
        const { count: value } = await supabase
          .from(table)
          .select("id", { count: "exact", head: true });
        return value ?? null;
      };
      // Articles du blog : lignes « article » de contenus_publics (socle 1.9.0).
      const countPosts = async () => {
        const { count: value } = await supabase
          .from("contenus_publics")
          .select("id", { count: "exact", head: true })
          .eq("type", "article");
        return value ?? null;
      };

      const [messages, subscribers, reviews, topics, posts, comments] = await Promise.all([
        nextRole === "admin" ? count("contact_messages") : Promise.resolve(null),
        nextRole === "admin" ? count("newsletter_subscribers") : Promise.resolve(null),
        count("reviews"),
        count("forum_topics"),
        countPosts(),
        count("blog_comments"),
      ]);
      if (!cancelled) setStats({ messages, subscribers, reviews, topics, posts, comments });
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const cards = [
    {
      label: "Messages reçus",
      value: stats?.messages,
      adminOnly: true,
      module: "contact" as const,
    },
    {
      label: "Abonnés à la lettre",
      value: stats?.subscribers,
      adminOnly: true,
      module: "newsletter" as const,
    },
    { label: "Avis publiés", value: stats?.reviews, adminOnly: false, module: "reviews" as const },
    { label: "Discussions", value: stats?.topics, adminOnly: false, module: "forum" as const },
    { label: "Articles", value: stats?.posts, adminOnly: false, module: "blog" as const },
    { label: "Commentaires", value: stats?.comments, adminOnly: false, module: "blog" as const },
  ].filter((card) => (!card.adminOnly || role === "admin") && isFeatureOn(card.module));

  return (
    <PageShell>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tableau de bord</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Bonjour {user?.email}. Voici où en est votre espace, en un coup d'œil.
          </p>
        </div>
        {role && (
          <Badge variant={role === "admin" ? "default" : "secondary"}>
            {role === "admin" ? "Administrateur" : "Utilisateur"}
          </Badge>
        )}
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats === null
          ? Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full rounded-xl" />
            ))
          : cards.map((card) => (
              <Card key={card.label}>
                <CardHeader className="pb-2">
                  <CardDescription>{card.label}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-foreground">{card.value ?? 0}</p>
                </CardContent>
              </Card>
            ))}
      </section>

      {isFeatureOn("forum") ? (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-foreground">Discussions suivies</h2>
          {followed === null ? (
            <Skeleton className="mt-4 h-16 w-full rounded-xl" />
          ) : followedError ? (
            <p className="mt-4 text-sm text-destructive-text">
              Impossible de charger vos discussions suivies. Rechargez la page.
            </p>
          ) : followed.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Vous ne suivez aucune discussion. Cliquez sur « Suivre » dans une discussion du forum
              pour la retrouver ici.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border rounded-xl border border-border bg-card">
              {followed.map((topic) => (
                <li key={topic.id}>
                  <Link
                    to="/forum/$topicId"
                    params={{ topicId: topic.id }}
                    title={`Ouvrir la discussion « ${topic.title} »`}
                    className="flex min-h-11 items-center justify-between gap-4 px-5 py-3 text-sm hover:bg-accent"
                  >
                    <span className="font-medium text-foreground">{topic.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {new Date(topic.last_activity_at).toLocaleDateString("fr-FR")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-foreground">Vos raccourcis</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {withActiveModules(raccourcis)
            .filter(
              (item) =>
                role === "admin" ||
                (item.to !== "/admin" &&
                  item.to !== "/admin/messages" &&
                  (item.to !== "/editorial" || droitsEditorial?.ecrit === true)),
            )
            .map((item) => (
              <Link
                key={item.to}
                to={item.to}
                title={item.title}
                className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary"
              >
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
              </Link>
            ))}
        </div>
      </section>
    </PageShell>
  );
}
