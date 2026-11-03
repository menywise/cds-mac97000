import { Link } from "@tanstack/react-router";

export type ArticleListe = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  published_at: string | null;
};

/** Liste d'articles d'une page de rubrique, d'étiquette ou de série (socle 1.11.0). */
export function ListeArticles({
  posts,
  vide,
  numeros = false,
}: {
  posts: ArticleListe[];
  vide: string;
  /** Série : articles numérotés dans l'ordre de lecture. */
  numeros?: boolean;
}) {
  if (posts.length === 0) {
    return (
      <p className="mt-8 rounded-lg border border-dashed border-border p-8 text-center text-sm text-foreground">
        {vide}
      </p>
    );
  }
  return (
    <ol className="mt-8 space-y-4 rounded-xl border border-border bg-card p-2">
      {posts.map((post, i) => (
        <li key={post.id} className="rounded-lg p-4">
          <h2 className="text-lg font-semibold text-foreground">
            <Link
              to="/blog/$slug"
              params={{ slug: post.slug }}
              title={`Lire l'article : ${post.title}`}
              className="hover:text-primary-text"
            >
              {numeros ? `${i + 1}. ` : ""}
              {post.title}
            </Link>
          </h2>
          {post.published_at ? (
            <p className="mt-1 text-xs text-foreground">
              {new Date(post.published_at).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          ) : null}
          {post.excerpt ? <p className="mt-2 text-sm text-foreground">{post.excerpt}</p> : null}
        </li>
      ))}
    </ol>
  );
}
