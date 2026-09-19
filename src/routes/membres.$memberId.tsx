import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/cds/SiteHeader";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getMember } from "@/lib/community.functions";
import { richTextToPlain } from "@/lib/richtext";
import { breadcrumbJsonLd, seo } from "@/lib/seo";

export const Route = createFileRoute("/membres/$memberId")({
  loader: async ({ params }) => {
    const data = await getMember({ data: { userId: params.memberId } });
    if (!data || !data.profile.listed) throw notFound();
    return data;
  },
  head: ({ loaderData, params }) => {
    const profile = loaderData?.profile;
    const base = seo({
      title: profile?.display_name ?? "Profil membre",
      description: (
        profile?.bio || `${profile?.display_name ?? "Ce membre"} contribue à la communauté CDS.`
      ).slice(0, 155),
      path: `/membres/${params.memberId}`,
      type: "article",
    });
    return {
      ...base,
      scripts: [
        breadcrumbJsonLd([
          { name: "Accueil", path: "/" },
          { name: "Annuaire", path: "/membres" },
          { name: profile?.display_name ?? "Membre", path: `/membres/${params.memberId}` },
        ]),
      ],
    };
  },
  errorComponent: () => (
    <PageShell>
      <p className="text-sm text-muted-foreground">Ce profil n'a pas pu être chargé.</p>
    </PageShell>
  ),
  notFoundComponent: () => (
    <PageShell>
      <h1 className="text-2xl font-bold text-foreground">Profil introuvable</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        <Link
          to="/membres"
          title="Revenir à l'annuaire des membres"
          className="text-primary-text hover:underline"
        >
          Revenir à l'annuaire
        </Link>
      </p>
    </PageShell>
  ),
  component: MemberPage,
});

function MemberPage() {
  const { profile, topics, replies } = Route.useLoaderData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function openConversation() {
    if (!user) {
      toast.info("Connectez-vous pour envoyer un message.");
      return;
    }
    if (!profile.accepts_messages) {
      toast.error("Ce membre n'accepte pas les messages privés.");
      return;
    }
    setBusy(true);
    const [a, b] = [user.id, profile.user_id].sort();
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("user_a", a!)
      .eq("user_b", b!)
      .maybeSingle();

    let id = existing?.id;
    if (!id) {
      const { data: created, error } = await supabase
        .from("conversations")
        .insert({ user_a: a!, user_b: b! })
        .select("id")
        .single();
      if (error || !created) {
        setBusy(false);
        toast.error("Conversation impossible.", {
          description: "Ce membre n'accepte peut-être pas les messages.",
        });
        return;
      }
      id = created.id;
    }
    setBusy(false);
    navigate({ to: "/messagerie/$conversationId", params: { conversationId: id } });
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-[820px]">
        <Link
          to="/membres"
          title="Revenir à l'annuaire des membres"
          className="text-xs font-medium text-primary-text hover:underline"
        >
          ← Annuaire
        </Link>

        <header className="mt-4 flex flex-wrap items-center gap-4">
          <span className="grid size-14 place-items-center rounded-full bg-muted text-lg font-semibold text-foreground">
            {profile.display_name.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{profile.display_name}</h1>
            {profile.job_title ? (
              <p className="text-sm text-muted-foreground">{profile.job_title}</p>
            ) : null}
          </div>
          {profile.accepts_messages && user?.id !== profile.user_id ? (
            <Button
              className="ml-auto"
              onClick={openConversation}
              disabled={busy}
              title={`Écrire un message privé à ${profile.display_name}`}
            >
              {busy ? "Ouverture…" : "Envoyer un message"}
            </Button>
          ) : null}
        </header>

        {profile.bio ? <p className="mt-5 text-sm text-muted-foreground">{profile.bio}</p> : null}
        {profile.website ? (
          <p className="mt-2 text-sm">
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer nofollow"
              title={`Ouvrir le site de ${profile.display_name}`}
              className="text-primary-text hover:underline"
            >
              {profile.website}
            </a>
          </p>
        ) : null}

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-foreground">Discussions ouvertes</h2>
          {topics.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Aucune discussion pour l'instant.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {topics.map((topic) => (
                <li key={topic.id}>
                  <Link
                    to="/forum/$topicId"
                    params={{ topicId: topic.id }}
                    title={`Ouvrir la discussion : ${topic.title}`}
                    className="text-muted-foreground hover:text-primary-text"
                  >
                    {topic.title}
                  </Link>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {new Date(topic.created_at).toLocaleDateString("fr-FR")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-foreground">Dernières réponses</h2>
          {replies.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Aucune réponse pour l'instant.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {replies.map((reply) => (
                <li key={reply.id}>
                  <Link
                    to="/forum/$topicId"
                    params={{ topicId: reply.topic_id }}
                    title="Ouvrir la discussion concernée"
                    className="text-muted-foreground hover:text-primary-text"
                  >
                    {richTextToPlain(reply.content).slice(0, 90)}…
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PageShell>
  );
}
