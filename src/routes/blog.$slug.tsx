import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/cds/SiteHeader";
import { erreurChargement } from "@/components/cds/ErreurChargement";
import { ModerationNote } from "@/components/cds/ModerationNote";
import { ReportButton } from "@/components/cds/ReportButton";
import { ShareButtons } from "@/components/cds/ShareButtons";
import { AdSlot } from "@/components/cds/AdSlot";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getPost, trouverRedirection } from "@/lib/content.functions";
import { CorpsArticle } from "@/components/cds/CorpsArticle";
import { analyserCorps, nombreDeMots, questionsReponses } from "@/lib/corps";
import { balisesArticle, donneesStructureesArticle, imageAbsolue } from "@/lib/article-donnees";
import { citerContenu, formaterReference, lienReference } from "@/lib/bibliographie";
import { libelleGenre } from "@/lib/editorial-regles";
import { readingMinutes } from "@/lib/reading";
import { auteurAffiche, dateSimple, lireSources } from "@/lib/editorial-regles";
import { absoluteUrl, getSiteConfig } from "@/lib/site-config";
import { breadcrumbJsonLd, jsonLdScript, seo } from "@/lib/seo";
import { requireFeature } from "@/config/features";

export const Route = createFileRoute("/blog/$slug")({
  beforeLoad: () => requireFeature("blog"),
  loader: async ({ params }) => {
    const data = await getPost({ data: { slug: params.slug } });
    if (!data) {
      // Ancienne adresse d'un article renommé : redirection permanente (socle 1.11.0).
      const vers = await trouverRedirection({ data: { chemin: `/blog/${params.slug}` } });
      if (vers) throw redirect({ href: vers, statusCode: 301 });
      throw notFound();
    }
    return data;
  },
  head: ({ loaderData, params }) => {
    const post = loaderData?.post;
    const { brand } = getSiteConfig();
    const site = {
      url: absoluteUrl("/").replace(/\/$/, ""),
      nom: brand.name,
      image: absoluteUrl(brand.apparence.imagePartage || "/image-partage.png"),
      auteurMode: loaderData?.editorial.auteur_mode ?? "fonction",
      typePage: loaderData?.editorial.type_page ?? "WebPage",
    } as const;
    const rubrique = loaderData?.fil.at(-1)?.libelle ?? null;
    const etiquettes = (loaderData?.etiquettes ?? []).map((e) => e.libelle);
    const base = seo({
      title: post?.title ?? "Article",
      description: post?.description || post?.excerpt || "Article du blog.",
      path: `/blog/${params.slug}`,
      type: "article",
      ...(post?.cover_url ? { image: imageAbsolue(post.cover_url, site) } : {}),
    });
    return {
      ...base,
      meta: [
        ...base.meta,
        ...(post
          ? balisesArticle({
              publie_le: post.published_at,
              updated_at: post.updated_at,
              relu_le: post.relu_le,
              rubrique,
              etiquettes,
            })
          : []),
      ],
      scripts: [
        breadcrumbJsonLd([
          { name: "Accueil", path: "/" },
          { name: "Blog", path: "/blog" },
          ...(loaderData?.fil ?? []).map((r) => ({
            name: r.libelle,
            path: `/blog/rubrique/${r.slug}`,
          })),
          { name: post?.title ?? "Article", path: `/blog/${params.slug}` },
        ]),
        ...(post && loaderData
          ? [
              jsonLdScript(
                donneesStructureesArticle(
                  {
                    slug: post.slug,
                    titre: post.title,
                    description: post.description || post.excerpt,
                    publie_le: post.published_at,
                    updated_at: post.updated_at,
                    relu_le: post.relu_le,
                    auteur_fonction: post.auteur_fonction,
                    auteur_nom: post.auteur_nom,
                    image_url: post.cover_url,
                    rubrique,
                    etiquettes,
                    serie: loaderData.serie
                      ? { titre: loaderData.serie.titre, slug: loaderData.serie.slug }
                      : null,
                    sources: lireSources(post.sources).map((s) => s.url),
                    questions: questionsReponses(analyserCorps(post.content)),
                    mots: nombreDeMots(post.content),
                    genre: post.genre,
                    relecteurs: post.relecteurs,
                    references: loaderData.references.map((r) => ({
                      titre: r.titre,
                      auteurs: r.auteurs,
                      lien: lienReference(r),
                    })),
                  },
                  site,
                ),
              ),
            ]
          : []),
      ],
    };
  },
  errorComponent: erreurChargement("Cet article n'a pas pu être chargé."),
  notFoundComponent: () => (
    <PageShell>
      <h1 className="text-2xl font-bold text-foreground">Article introuvable</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Cet article n'existe plus ou n'est pas encore publié.{" "}
        <Link
          to="/blog"
          title="Revenir à la liste des articles"
          className="text-primary-text hover:underline"
        >
          Revenir au blog
        </Link>
      </p>
    </PageShell>
  ),
  component: BlogPostPage,
});

function BlogPostPage() {
  const { post, comments, related, editorial, etiquettes, fil, serie, references } =
    Route.useLoaderData();
  const [citation, setCitation] = useState<string | null>(null);
  const auteur = auteurAffiche(post, editorial.auteur_mode);
  const sources = lireSources(post.sources);
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submitComment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    const form = new FormData(e.currentTarget);
    const content = String(form.get("content") ?? "").trim();
    if (content.length < 3) return;
    setBusy(true);
    const { error } = await supabase.from("blog_comments").insert({
      post_id: post.id,
      author_id: user.id,
      author_name:
        (user.user_metadata?.["full_name"] as string) || user.email?.split("@")[0] || "Membre",
      content,
    });
    setBusy(false);
    if (error) {
      toast.error("Commentaire non enregistré.", { description: "Réessayez dans un instant." });
      return;
    }
    setSent(true);
    toast.success("Merci pour votre commentaire.", {
      description: "Il apparaîtra dès qu'il aura été relu.",
    });
  }

  return (
    <PageShell>
      <article className="mx-auto max-w-[760px]">
        <nav aria-label="Fil d'Ariane" className="text-xs font-medium text-primary-text">
          <Link to="/blog" title="Revenir à la liste des articles" className="hover:underline">
            Blog
          </Link>
          {fil.map((r) => (
            <span key={r.slug}>
              {" › "}
              <Link
                to="/blog/rubrique/$slug"
                params={{ slug: r.slug }}
                title={`Tous les articles de la rubrique « ${r.libelle} »`}
                className="hover:underline"
              >
                {r.libelle}
              </Link>
            </span>
          ))}
        </nav>
        <h1 className="mt-3 text-3xl font-bold text-foreground">{post.title}</h1>
        {post.published_at ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Publié le{" "}
            {new Date(post.published_at).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        ) : null}
        <p className="mt-1 text-xs text-muted-foreground">
          {readingMinutes(post.content)} min de lecture
          {post.relu_le ? ` · relu le ${dateSimple(post.relu_le)}` : ""}
          {auteur ? ` · ${auteur}` : ""}
          {post.relecteurs.length ? ` · relu par : ${post.relecteurs.join(", ")}` : ""}
        </p>
        {post.genre !== "article" || post.niveau_preuve ? (
          <p className="mt-2 flex flex-wrap gap-2 text-xs">
            {post.genre !== "article" ? (
              <span className="rounded-md border border-info-border bg-info-soft px-2 py-0.5 font-semibold text-info-text">
                {libelleGenre(post.genre)}
              </span>
            ) : null}
            {post.niveau_preuve ? (
              <span className="rounded-md border border-success-border bg-success-soft px-2 py-0.5 font-semibold text-success-text">
                Niveau de preuve : {post.niveau_preuve}
              </span>
            ) : null}
          </p>
        ) : null}
        {post.genre === "compte_rendu" && post.evenement ? (
          <p className="mt-2 text-sm text-foreground">
            Compte rendu de : {post.evenement}
            {post.evenement_le ? `, ${dateSimple(post.evenement_le)}` : ""}.
          </p>
        ) : null}
        <p className="mt-4 text-sm font-medium text-foreground">{post.excerpt}</p>

        {etiquettes.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {etiquettes.map((item) => (
              <li key={item.slug}>
                <Link
                  to="/blog/etiquette/$slug"
                  params={{ slug: item.slug }}
                  title={`Tous les articles sur : ${item.libelle}`}
                  className="inline-flex min-h-9 items-center rounded border border-border bg-muted px-2 text-[11px] text-foreground hover:border-primary"
                >
                  {item.libelle}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        {serie ? (
          <aside
            aria-label="Série"
            className="mt-6 rounded-xl border border-border bg-card p-4 text-sm text-foreground"
          >
            <p>
              Partie {serie.rang} sur {serie.total} de la série{" "}
              <Link
                to="/blog/serie/$slug"
                params={{ slug: serie.slug }}
                title={`Voir toute la série « ${serie.titre} »`}
                className="font-medium text-primary-text hover:underline"
              >
                {serie.titre}
              </Link>
              .
            </p>
          </aside>
        ) : null}

        {post.cover_url ? (
          <img
            src={post.cover_url}
            alt={post.image_alt}
            className="mt-6 w-full rounded-xl border border-border"
            loading="eager"
            decoding="async"
          />
        ) : null}

        <CorpsArticle texte={post.content} className="mt-6" />

        {serie && (serie.precedent || serie.suivant) ? (
          <nav
            aria-label="Articles de la série"
            className="mt-8 flex flex-wrap justify-between gap-3 text-sm"
          >
            {serie.precedent ? (
              <Link
                to="/blog/$slug"
                params={{ slug: serie.precedent.slug }}
                title={`Partie précédente : ${serie.precedent.titre}`}
                className="font-medium text-primary-text hover:underline"
              >
                ← {serie.precedent.titre}
              </Link>
            ) : (
              <span />
            )}
            {serie.suivant ? (
              <Link
                to="/blog/$slug"
                params={{ slug: serie.suivant.slug }}
                title={`Partie suivante : ${serie.suivant.titre}`}
                className="font-medium text-primary-text hover:underline"
              >
                {serie.suivant.titre} →
              </Link>
            ) : null}
          </nav>
        ) : null}

        {sources.length > 0 ? (
          <section aria-labelledby="sources-titre" className="mt-8">
            <h2 id="sources-titre" className="text-base font-semibold text-foreground">
              Sources
            </h2>
            <ul className="mt-2 list-disc space-y-1 rounded-xl border border-border bg-card py-3 pl-8 pr-4 text-sm text-foreground">
              {sources.map((s) => (
                <li key={s.url}>
                  <a
                    href={s.url}
                    rel="noopener noreferrer"
                    target="_blank"
                    title={`Ouvrir la source : ${s.libelle}`}
                    className="text-primary-text underline underline-offset-2"
                  >
                    {s.libelle}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {references.length > 0 ? (
          <section aria-labelledby="references-titre" className="mt-8">
            <h2 id="references-titre" className="text-base font-semibold text-foreground">
              Références
            </h2>
            <ol className="mt-2 list-decimal space-y-2 rounded-xl border border-border bg-card py-3 pl-8 pr-4 text-sm text-foreground">
              {references.map((r) => (
                <li key={r.rang} id={`ref-${r.rang}`} className="scroll-mt-24">
                  {formaterReference(r, editorial.format_citation)}{" "}
                  {lienReference(r) ? (
                    <a
                      href={lienReference(r)}
                      rel="noopener noreferrer"
                      target="_blank"
                      title={`Ouvrir la référence ${r.rang}`}
                      className="text-primary-text underline underline-offset-2"
                    >
                      Lire
                    </a>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {post.liens_interets ? (
          <p className="mt-6 text-sm text-foreground">
            <span className="font-semibold">Liens d'intérêts : </span>
            {post.liens_interets}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2 print:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            title="Préparer la formule pour citer cet article"
            onClick={() =>
              setCitation(
                citerContenu(
                  {
                    titre: post.title,
                    auteur: auteur,
                    site: getSiteConfig().brand.name,
                    url: absoluteUrl(`/blog/${post.slug}`),
                    publie_le: post.published_at,
                  },
                  editorial.format_citation,
                  new Date(),
                ),
              )
            }
          >
            Citer cet article
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            title="Imprimer cet article"
            onClick={() => window.print()}
          >
            Imprimer
          </Button>
        </div>
        {citation ? (
          <div className="mt-3 rounded-xl border border-border bg-card p-4 text-sm text-foreground print:hidden">
            <p>{citation}</p>
            <Button
              type="button"
              size="sm"
              className="mt-2"
              title="Copier la formule de citation"
              onClick={() =>
                void navigator.clipboard
                  .writeText(citation)
                  .then(() => toast.success("Citation copiée."))
              }
            >
              Copier
            </Button>
          </div>
        ) : null}

        {editorial.avertissement ? (
          <p
            role="note"
            className="mt-8 rounded-md border border-info-border bg-info-soft px-3 py-2 text-sm text-info-text"
          >
            {editorial.avertissement}
          </p>
        ) : null}

        <AdSlot placement="blog-article" className="mt-8 print:hidden" />

        <div className="mt-8 border-t border-border pt-6 print:hidden">
          <ShareButtons path={`/blog/${post.slug}`} title={post.title} />
          <ReportButton contentType="article" contentId={post.id} className="mt-2" />
        </div>

        {related.length > 0 ? (
          <section className="mt-10 print:hidden">
            <h2 className="text-lg font-semibold text-foreground">À lire ensuite</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-3">
              {related.map((item) => (
                <li key={item.id} className="rounded-xl border border-border bg-card p-4">
                  <Link
                    to="/blog/$slug"
                    params={{ slug: item.slug }}
                    title={`Lire l'article : ${item.title}`}
                    className="text-sm font-semibold text-foreground hover:text-primary-text"
                  >
                    {item.title}
                  </Link>
                  <p className="mt-1.5 line-clamp-3 text-xs text-muted-foreground">
                    {item.excerpt}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-10 print:hidden">
          <h2 className="text-lg font-semibold text-foreground">
            Commentaires ({comments.length})
          </h2>

          {comments.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Personne n'a encore réagi. Votre point de vue ouvrira la discussion.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {comments.map((comment) => (
                <li key={comment.id} className="rounded-lg border border-border bg-card p-4">
                  <p className="text-sm font-medium text-foreground">{comment.author_name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(comment.created_at).toLocaleDateString("fr-FR")}
                  </p>
                  <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                    {comment.content}
                  </p>
                  <ModerationNote note={comment.moderation_note} at={comment.moderated_at} />
                  <ReportButton contentType="commentaire" contentId={comment.id} />
                </li>
              ))}
            </ul>
          )}

          {user ? (
            sent ? (
              <p className="mt-6 rounded-lg border border-border bg-muted p-4 text-sm text-foreground">
                Votre commentaire est enregistré et sera publié après relecture.
              </p>
            ) : (
              <form onSubmit={submitComment} className="mt-6 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="comment">Votre commentaire</Label>
                  <Textarea
                    id="comment"
                    name="content"
                    rows={4}
                    required
                    placeholder="Ce que cet article vous inspire…"
                  />
                </div>
                <Button type="submit" disabled={busy} title="Publier votre commentaire">
                  {busy ? "Envoi…" : "Publier mon commentaire"}
                </Button>
              </form>
            )
          ) : (
            <p className="mt-6 rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
              Vous souhaitez réagir ?{" "}
              <Link
                to="/login"
                title="Se connecter pour commenter"
                className="text-primary-text hover:underline"
              >
                Connectez-vous
              </Link>{" "}
              ou{" "}
              <Link
                to="/signup"
                title="Créer un compte pour commenter"
                className="text-primary-text hover:underline"
              >
                créez un compte
              </Link>
              , cela prend une minute.
            </p>
          )}
        </section>
      </article>
    </PageShell>
  );
}
