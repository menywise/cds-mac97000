/**
 * Maillage interne (socle 1.11.0) : règles lues par l'écran. Fichier sans dépendance (ni base, ni
 * écran) : destiné à être copié tel quel dans les installations (docs/SYNCHRO.md, copie exacte).
 * La base reste juge : extraire_liens, liens_du_texte, maillage_etat, lire_ensuite.
 */

/** Lien interne du texte : ancre et adresse, sans ancre de page ni paramètres. */
export type LienInterne = { ancre: string; chemin: string };

/** Liens internes [texte](/adresse) d'un texte, dans l'ordre. Même règle que extraire_liens. */
export function extraireLiens(corps: string): LienInterne[] {
  return [...corps.matchAll(/\[([^\]]+)\]\((\/[^)\s]*)\)/g)].map((m) => ({
    ancre: m[1]!.trim(),
    chemin: m[2]!.split("#")[0]!.split("?")[0]!.replace(/\/+$/, ""),
  }));
}

/** Adresse d'article visée par /blog/<adresse>, sinon null. Même règle que slug_article_du_chemin. */
export function slugArticleDuChemin(chemin: string): string | null {
  const m = /^\/blog\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(chemin);
  return m ? m[1]! : null;
}

const ANCRES_PAUVRES = new Set([
  "ici",
  "cliquez ici",
  "cliquer ici",
  "ce lien",
  "lien",
  "cet article",
  "cette page",
  "en savoir plus",
  "lire la suite",
  "la suite",
  "voir",
  "voir plus",
  "plus",
  "là",
  "article",
]);

/** Ancre qui ne dit rien de la page visée. Même liste que ancre_pauvre. */
export const ancrePauvre = (ancre: string) => ANCRES_PAUVRES.has(ancre.trim().toLowerCase());

/** Lien à coller dans un texte : [titre](/blog/adresse). */
export const lienMarkdown = (titre: string, slug: string) => `[${titre}](/blog/${slug})`;

const MOTS_VIDES = new Set(
  "le la les un une des de du d l et ou en au aux a à pour par sur dans avec sans ce ces cet cette son sa ses leur leurs que qui quoi comment est sont plus moins votre vos notre nos".split(
    " ",
  ),
);

/** Mots porteurs d'un texte : minuscules, sans accents, sans mots vides, trois lettres au moins. */
export function motsCles(texte: string): Set<string> {
  return new Set(
    texte
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((m) => m.length >= 3 && !MOTS_VIDES.has(m)),
  );
}

export type ContenuMaillage = {
  id: string;
  slug: string;
  titre: string;
  corps: string;
  etiquettes: string[];
  rubrique_id: string | null;
  pilier_id: string | null;
  est_pilier: boolean;
  en_ligne: boolean;
};

export type Suggestion = { id: string; slug: string; titre: string; raison: string };

/**
 * Contenus vers lesquels un lien serait utile : en ligne, pas encore liés, classés par proximité
 * (pilier et frères, étiquettes communes, rubrique, mots du titre). Le rédacteur choisit : rien
 * n'est inséré sans lui.
 */
export function suggestionsDeLiens(
  source: ContenuMaillage,
  tous: ContenuMaillage[],
  n = 5,
): Suggestion[] {
  const dejaLies = new Set(
    extraireLiens(source.corps)
      .map((l) => slugArticleDuChemin(l.chemin))
      .filter(Boolean),
  );
  const motsSource = motsCles(`${source.titre} ${source.corps}`);
  return tous
    .filter((c) => c.id !== source.id && c.en_ligne && !dejaLies.has(c.slug))
    .map((c) => {
      const raisons: string[] = [];
      let score = 0;
      if (c.id === source.pilier_id) {
        score += 100;
        raisons.push("son pilier");
      } else if (c.pilier_id && c.pilier_id === source.id) {
        score += 90;
        raisons.push("un de ses satellites");
      } else if (source.pilier_id && c.pilier_id === source.pilier_id) {
        score += 50;
        raisons.push("même pilier");
      }
      const communes = c.etiquettes.filter((e) => source.etiquettes.includes(e));
      if (communes.length) {
        score += 10 * communes.length;
        raisons.push(`étiquettes : ${communes.join(", ")}`);
      }
      if (source.rubrique_id && c.rubrique_id === source.rubrique_id) {
        score += 5;
        raisons.push("même rubrique");
      }
      const mots = [...motsCles(c.titre)].filter((m) => motsSource.has(m));
      if (mots.length) {
        score += 2 * mots.length;
        raisons.push(`mots : ${mots.slice(0, 3).join(", ")}`);
      }
      return { c, score, raison: raisons.join(" · ") };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.c.titre.localeCompare(b.c.titre, "fr"))
    .slice(0, n)
    .map(({ c, raison }) => ({ id: c.id, slug: c.slug, titre: c.titre, raison }));
}

/** Une page d'étiquette n'est indexée qu'à partir d'un seuil d'articles : pas de pages pauvres. */
export const etiquetteIndexable = (nombreArticles: number, seuil: number) =>
  nombreArticles >= Math.max(1, seuil);
