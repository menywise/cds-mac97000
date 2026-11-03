import { createServerFn } from "@tanstack/react-start";
import { publicClient } from "@/lib/supabase-public";
import { check } from "@/lib/check";
import { readingMinutes } from "@/lib/reading";
import { lireReglages } from "@/lib/editorial-regles";
import { etiquetteIndexable } from "@/lib/maillage";
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
        .select(
          `${COLONNES_ARTICLE}, content:corps, relu_le, sources, auteur_fonction, auteur_nom, rubrique_id, serie_id, serie_ordre`,
        )
        .eq("type", "article")
        .eq("publie", true)
        .eq("slug", input.slug)
        .maybeSingle(),
      { contexte: ARTICLES },
    );
    if (!post) return null;
    // Commentaires, suggestions de lecture, réglages et taxonomie : en parallèle.
    const [commentsRes, relatedRes, reglagesRes, etiquettesRes, rubriquesRes, serieRes] =
      await Promise.all([
        client
          .from("blog_comments")
          .select("id, author_name, content, created_at, moderation_note, moderated_at")
          .eq("post_id", post.id)
          .eq("approved", true)
          .order("created_at", { ascending: true }),
        client.rpc("lire_ensuite", { _id: post.id, _n: 3 }),
        client.from("site_settings").select("value").eq("key", "editorial").maybeSingle(),
        client
          .from("etiquettes")
          .select("slug, libelle")
          .in("libelle", post.tags ?? []),
        client.from("rubriques").select("id, slug, libelle, parent_id"),
        post.serie_id
          ? client
              .from(ARTICLES)
              .select("slug, titre, serie_ordre, serie:series(slug, titre)")
              .eq("type", "article")
              .eq("publie", true)
              .eq("serie_id", post.serie_id)
              .order("serie_ordre", { ascending: true, nullsFirst: false })
          : Promise.resolve({ data: [], error: null }),
      ]);
    const comments = check(commentsRes, { contexte: "blog_comments" });
    const related = (check(relatedRes, { contexte: "lire_ensuite" }) ?? []).map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.titre,
      excerpt: r.chapo,
    }));
    const reglages = lireReglages(check(reglagesRes, { contexte: "site_settings" })?.value);
    const etiquettes = check(etiquettesRes, { contexte: "etiquettes" }) ?? [];
    const rubriques = check(rubriquesRes, { contexte: "rubriques" }) ?? [];
    const rubrique = rubriques.find((r) => r.id === post.rubrique_id) ?? null;
    const parent = rubrique?.parent_id
      ? (rubriques.find((r) => r.id === rubrique.parent_id) ?? null)
      : null;
    const suite = check(serieRes, { contexte: "series" }) ?? [];
    const rang = suite.findIndex((a) => a.slug === post.slug);
    const serieInfo = suite[0]?.serie as { slug: string; titre: string } | null | undefined;
    return {
      post,
      comments: comments ?? [],
      related,
      editorial: { auteur_mode: reglages.auteur_mode, avertissement: reglages.avertissement },
      etiquettes: etiquettes.map((e) => ({ slug: e.slug, libelle: e.libelle })),
      fil: [parent, rubrique]
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .map((r) => ({ slug: r.slug, libelle: r.libelle })),
      serie:
        serieInfo && rang >= 0
          ? {
              slug: serieInfo.slug,
              titre: serieInfo.titre,
              rang: rang + 1,
              total: suite.length,
              precedent:
                rang > 0 ? { slug: suite[rang - 1]!.slug, titre: suite[rang - 1]!.titre } : null,
              suivant:
                rang < suite.length - 1
                  ? { slug: suite[rang + 1]!.slug, titre: suite[rang + 1]!.titre }
                  : null,
            }
          : null,
    };
  });

/** Ancienne adresse d'un article : nouvelle adresse, ou null (socle 1.11.0). */
export const trouverRedirection = createServerFn({ method: "GET" })
  .inputValidator((input: { chemin: string }) => ({
    chemin: String(input?.chemin ?? "").slice(0, 200),
  }))
  .handler(async ({ data: input }) => {
    const data = check(
      await publicClient().from("redirections").select("vers").eq("de", input.chemin).maybeSingle(),
      { contexte: "redirections" },
    );
    return data?.vers ?? null;
  });

/** Articles en ligne d'une liste, du plus récent au plus ancien, sans le texte. */
const LISTE_ARTICLE =
  "id, slug, title:titre, excerpt:chapo, published_at:publie_le, tags:etiquettes";

/** Page de rubrique : rubrique, sous-rubriques, articles en ligne (sous-rubriques comprises). */
export const getRubrique = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => input)
  .handler(async ({ data: input }) => {
    const client = publicClient();
    const rubriques =
      check(await client.from("rubriques").select("id, slug, libelle, intro, parent_id, ordre"), {
        contexte: "rubriques",
      }) ?? [];
    const rubrique = rubriques.find((r) => r.slug === input.slug);
    if (!rubrique) return null;
    const enfants = rubriques
      .filter((r) => r.parent_id === rubrique.id)
      .sort((a, b) => a.ordre - b.ordre || a.libelle.localeCompare(b.libelle, "fr"));
    const parent = rubriques.find((r) => r.id === rubrique.parent_id) ?? null;
    const posts =
      check(
        await client
          .from(ARTICLES)
          .select(LISTE_ARTICLE)
          .eq("type", "article")
          .eq("publie", true)
          .in("rubrique_id", [rubrique.id, ...enfants.map((e) => e.id)])
          .order("publie_le", { ascending: false })
          .limit(100),
        { contexte: ARTICLES },
      ) ?? [];
    return {
      rubrique: { slug: rubrique.slug, libelle: rubrique.libelle, intro: rubrique.intro },
      parent: parent ? { slug: parent.slug, libelle: parent.libelle } : null,
      enfants: enfants.map((e) => ({ slug: e.slug, libelle: e.libelle })),
      posts,
    };
  });

/** Page d'étiquette : définition, articles en ligne, et indexation selon le seuil réglé. */
export const getEtiquette = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => input)
  .handler(async ({ data: input }) => {
    const client = publicClient();
    const etiquette = check(
      await client
        .from("etiquettes")
        .select("slug, libelle, definition")
        .eq("slug", input.slug)
        .maybeSingle(),
      { contexte: "etiquettes" },
    );
    if (!etiquette) return null;
    const [postsRes, reglagesRes] = await Promise.all([
      client
        .from(ARTICLES)
        .select(LISTE_ARTICLE)
        .eq("type", "article")
        .eq("publie", true)
        .contains("etiquettes", [etiquette.libelle])
        .order("publie_le", { ascending: false })
        .limit(100),
      client.from("site_settings").select("value").eq("key", "editorial").maybeSingle(),
    ]);
    const posts = check(postsRes, { contexte: ARTICLES }) ?? [];
    const reglages = lireReglages(check(reglagesRes, { contexte: "site_settings" })?.value);
    return {
      etiquette,
      posts,
      indexable: etiquetteIndexable(posts.length, reglages.seuil_etiquette),
    };
  });

/** Page de série : présentation et articles en ligne, dans l'ordre de la série. */
export const getSerie = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => input)
  .handler(async ({ data: input }) => {
    const client = publicClient();
    const serie = check(
      await client
        .from("series")
        .select("id, slug, titre, description")
        .eq("slug", input.slug)
        .maybeSingle(),
      { contexte: "series" },
    );
    if (!serie) return null;
    const posts =
      check(
        await client
          .from(ARTICLES)
          .select(LISTE_ARTICLE)
          .eq("type", "article")
          .eq("publie", true)
          .eq("serie_id", serie.id)
          .order("serie_ordre", { ascending: true, nullsFirst: false }),
        { contexte: ARTICLES },
      ) ?? [];
    return {
      serie: { slug: serie.slug, titre: serie.titre, description: serie.description },
      posts,
    };
  });

/** Plan du site : rubriques et séries ayant un article en ligne, étiquettes au-delà du seuil. */
export const listSitemapTaxonomie = createServerFn({ method: "GET" }).handler(async () => {
  const client = publicClient();
  const [postsRes, rubriquesRes, etiquettesRes, seriesRes, reglagesRes] = await Promise.all([
    client
      .from(ARTICLES)
      .select("rubrique_id, serie_id, etiquettes, updated_at")
      .eq("type", "article")
      .eq("publie", true)
      .limit(SITEMAP_POSTS_LIMIT),
    client.from("rubriques").select("id, slug, parent_id"),
    client.from("etiquettes").select("slug, libelle"),
    client.from("series").select("id, slug"),
    client.from("site_settings").select("value").eq("key", "editorial").maybeSingle(),
  ]);
  const posts = check(postsRes, { contexte: ARTICLES }) ?? [];
  const rubriques = check(rubriquesRes, { contexte: "rubriques" }) ?? [];
  const reglages = lireReglages(check(reglagesRes, { contexte: "site_settings" })?.value);
  const derniere = (filtre: (p: (typeof posts)[number]) => boolean) =>
    posts
      .filter(filtre)
      .reduce<string | null>((max, p) => (!max || p.updated_at > max ? p.updated_at : max), null);
  const out: { path: string; lastmod: string }[] = [];
  for (const r of rubriques) {
    const ids = [r.id, ...rubriques.filter((x) => x.parent_id === r.id).map((x) => x.id)];
    const d = derniere((p) => !!p.rubrique_id && ids.includes(p.rubrique_id));
    if (d) out.push({ path: `/blog/rubrique/${r.slug}`, lastmod: d });
  }
  for (const e of check(etiquettesRes, { contexte: "etiquettes" }) ?? []) {
    const avec = posts.filter((p) => (p.etiquettes ?? []).includes(e.libelle));
    if (etiquetteIndexable(avec.length, reglages.seuil_etiquette)) {
      const d = derniere((p) => (p.etiquettes ?? []).includes(e.libelle));
      if (d) out.push({ path: `/blog/etiquette/${e.slug}`, lastmod: d });
    }
  }
  for (const se of check(seriesRes, { contexte: "series" }) ?? []) {
    const d = derniere((p) => p.serie_id === se.id);
    if (d) out.push({ path: `/blog/serie/${se.slug}`, lastmod: d });
  }
  return out;
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
