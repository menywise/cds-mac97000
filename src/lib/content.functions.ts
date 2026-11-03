import { createServerFn } from "@tanstack/react-start";
import { publicClient } from "@/lib/supabase-public";
import { check } from "@/lib/check";
import { readingMinutes } from "@/lib/reading";
import {
  BLOG_PAGE_SIZE,
  cleanBlogPage,
  cleanBlogSearch,
  cleanBlogTag,
  type BlogListInput,
  type BlogListPost,
} from "@/lib/blog";

export const listFaq = createServerFn({ method: "GET" }).handler(async () => {
  const data = check(
    await publicClient()
      .from("faq_items")
      .select("id, question, answer, category, position")
      .eq("published", true)
      .order("position", { ascending: true }),
    { contexte: "faq_items" },
  );
  return data ?? [];
});

export const listPlans = createServerFn({ method: "GET" }).handler(async () => {
  const data = check(
    await publicClient()
      .from("pricing_plans")
      .select(
        "id, name, tagline, price_cents, currency, period, features, cta_label, highlighted, position",
      )
      .eq("active", true)
      .order("position", { ascending: true }),
    { contexte: "pricing_plans" },
  );
  return data ?? [];
});

/**
 * Articles du blog : lignes « article » de contenus_publics (modèle commun, socle 1.9.0). Les
 * colonnes sont renommées à la lecture (title, excerpt…) : les pages gardent leurs noms.
 */
const ARTICLES = "contenus_publics";
const COLONNES_ARTICLE =
  "id, slug, title:titre, excerpt:chapo, cover_url:image_url, published_at:publie_le, tags:etiquettes";

/** Articles au plus dans le flux RSS : les plus récents. */
const FEED_LIMIT = 50;
/** Adresses d'articles au plus dans le plan du site. */
const SITEMAP_POSTS_LIMIT = 5000;

/**
 * Page de la liste des articles : filtrée et paginée en base (recherche dans le titre, le
 * résumé et le texte, étiquette exacte), sans jamais envoyer le texte complet au navigateur.
 * `tags` : toutes les étiquettes des articles publiés, pour le filtre, quelle que soit la page.
 */
export const listBlogPage = createServerFn({ method: "GET" })
  .inputValidator((input: Partial<BlogListInput>): BlogListInput => ({
    page: cleanBlogPage(input?.page),
    q: cleanBlogSearch(input?.q),
    tag: cleanBlogTag(input?.tag),
  }))
  .handler(async ({ data: input }) => {
    const client = publicClient();
    /** Mêmes filtres pour le décompte et pour la page : publié, étiquette, recherche. */
    const filtered = <
      T extends { contains(column: "etiquettes", value: string[]): T; or(filters: string): T },
    >(
      query: T,
    ): T => {
      let result = query;
      if (input.tag) result = result.contains("etiquettes", [input.tag]);
      if (input.q) {
        const motif = `%${input.q}%`;
        result = result.or(`titre.ilike.${motif},chapo.ilike.${motif},corps.ilike.${motif}`);
      }
      return result;
    };
    // Décompte d'abord : une page au-delà de la dernière est ramenée à la dernière, sans erreur
    // (PostgREST refuse un décalage supérieur au nombre de lignes).
    const [countRes, tagsRes] = await Promise.all([
      filtered(
        client
          .from(ARTICLES)
          .select("id", { count: "exact", head: true })
          .eq("type", "article")
          .eq("publie", true),
      ),
      client.from(ARTICLES).select("tags:etiquettes").eq("type", "article").eq("publie", true),
    ]);
    check(countRes, { contexte: ARTICLES });
    const tagRows = check(tagsRes, { contexte: ARTICLES }) ?? [];
    const total = countRes.count ?? 0;
    const pageCount = Math.max(1, Math.ceil(total / BLOG_PAGE_SIZE));
    const page = Math.min(input.page, pageCount);
    const from = (page - 1) * BLOG_PAGE_SIZE;
    const rows =
      total === 0
        ? []
        : (check(
            await filtered(
              client
                .from(ARTICLES)
                .select(`${COLONNES_ARTICLE}, content:corps`)
                .eq("type", "article")
                .eq("publie", true),
            )
              .order("publie_le", { ascending: false })
              .range(from, from + BLOG_PAGE_SIZE - 1),
            { contexte: ARTICLES },
          ) ?? []);
    const posts: BlogListPost[] = rows.map(({ content, ...post }) => ({
      ...post,
      reading_minutes: readingMinutes(content),
    }));
    return {
      posts,
      total,
      page,
      pageCount,
      tags: [...new Set(tagRows.flatMap((row) => row.tags ?? []))].sort((a, b) =>
        a.localeCompare(b, "fr"),
      ),
    };
  });

/** Flux RSS : titre, résumé, date et adresse des articles les plus récents, sans le texte. */
export const listFeedPosts = createServerFn({ method: "GET" }).handler(async () => {
  const data = check(
    await publicClient()
      .from(ARTICLES)
      .select("slug, title:titre, excerpt:chapo, published_at:publie_le")
      .eq("type", "article")
      .eq("publie", true)
      .order("publie_le", { ascending: false })
      .limit(FEED_LIMIT),
    { contexte: ARTICLES },
  );
  return data ?? [];
});

/** Plan du site : adresse et date réelle de modification de chaque article publié. */
export const listSitemapPosts = createServerFn({ method: "GET" }).handler(async () => {
  const data = check(
    await publicClient()
      .from(ARTICLES)
      .select("slug, updated_at, published_at:publie_le")
      .eq("type", "article")
      .eq("publie", true)
      .order("publie_le", { ascending: false })
      .limit(SITEMAP_POSTS_LIMIT),
    { contexte: ARTICLES },
  );
  return data ?? [];
});

export const getPost = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => input)
  .handler(async ({ data: input }) => {
    const client = publicClient();
    const post = check(
      await client
        .from(ARTICLES)
        .select(`${COLONNES_ARTICLE}, content:corps`)
        .eq("type", "article")
        .eq("publie", true)
        .eq("slug", input.slug)
        .maybeSingle(),
      { contexte: ARTICLES },
    );
    if (!post) return null;
    // Commentaires et articles voisins ne dépendent que de l'article : en parallèle.
    const [commentsRes, othersRes] = await Promise.all([
      client
        .from("blog_comments")
        .select("id, author_name, content, created_at, moderation_note, moderated_at")
        .eq("post_id", post.id)
        .eq("approved", true)
        .order("created_at", { ascending: true }),
      client
        .from(ARTICLES)
        .select("id, slug, title:titre, excerpt:chapo, published_at:publie_le, tags:etiquettes")
        .eq("type", "article")
        .eq("publie", true)
        .neq("id", post.id)
        .order("publie_le", { ascending: false })
        .limit(12),
    ]);
    const comments = check(commentsRes, { contexte: "blog_comments" });
    const others = check(othersRes, { contexte: ARTICLES });
    const tags = post.tags ?? [];
    const related = (others ?? [])
      .map((item) => ({
        item,
        shared: (item.tags ?? []).filter((tag) => tags.includes(tag)).length,
      }))
      .sort((a, b) => b.shared - a.shared)
      .slice(0, 3)
      .map((entry) => entry.item);
    return { post, comments: comments ?? [], related };
  });

/** Grille de conformité du modèle : sert au pilotage et aux audits. */
export const listTemplateChecks = createServerFn({ method: "GET" }).handler(async () => {
  const data = check(
    await publicClient()
      .from("template_checks")
      .select(
        "id, code, area, label, requirement, status, severity, evidence, position, updated_at",
      )
      .order("position", { ascending: true }),
    { contexte: "template_checks" },
  );
  return data ?? [];
});

export const listReviews = createServerFn({ method: "GET" }).handler(async () => {
  const data = check(
    await publicClient()
      .from("reviews")
      .select("id, author_name, rating, title, content, created_at, moderation_note, moderated_at")
      .eq("approved", true)
      .order("created_at", { ascending: false }),
    { contexte: "reviews" },
  );
  return data ?? [];
});

/** Adresses de sujets au plus dans le plan du site. */
const SITEMAP_TOPICS_LIMIT = 5000;

/** Plan du site : identifiant et date réelle de dernière activité de chaque sujet du forum. */
export const listSitemapTopics = createServerFn({ method: "GET" }).handler(async () => {
  const data = check(
    await publicClient()
      .from("forum_topics")
      .select("id, created_at, updated_at, last_activity_at")
      .order("created_at", { ascending: false })
      .limit(SITEMAP_TOPICS_LIMIT),
    { contexte: "forum_topics" },
  );
  return data ?? [];
});

/* Pages libres (module « pages ») : la base ne renvoie que les pages publiées, module allumé.
   Le contenu brut (`data`) est normalisé par `toPageRow` (src/lib/pages.ts) côté route. */
const PAGE_COLUMNS =
  "id, slug, title, description, data, is_home, published, published_at, updated_at";

export const getHomePage = createServerFn({ method: "GET" }).handler(async () => {
  return check(
    await publicClient()
      .from("pages")
      .select(PAGE_COLUMNS)
      .eq("is_home", true)
      .eq("published", true)
      .maybeSingle(),
    { contexte: "pages" },
  );
});

export const getPublicPage = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => input)
  .handler(async ({ data: input }) => {
    return check(
      await publicClient()
        .from("pages")
        .select(PAGE_COLUMNS)
        .eq("slug", input.slug)
        .eq("published", true)
        .maybeSingle(),
      { contexte: "pages" },
    );
  });

export const listPublicPages = createServerFn({ method: "GET" }).handler(async () => {
  const data = check(
    await publicClient()
      .from("pages")
      .select("slug, title, is_home, updated_at")
      .eq("published", true)
      .order("title", { ascending: true }),
    { contexte: "pages" },
  );
  return data ?? [];
});
