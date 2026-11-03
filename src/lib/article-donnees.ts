/**
 * Données structurées d'un article (schema.org, JSON-LD), socle 1.12.0. Fichier sans dépendance,
 * destiné à la copie exacte dans les installations (docs/SYNCHRO.md). Repris de C1 et complété :
 * dates de publication, de modification et de relecture ; auteur par sa fonction ou son nom ;
 * rubrique, étiquettes, série ; sources citées ; questions-réponses ; type de page réglable
 * (WebPage ou MedicalWebPage).
 */

export type ArticlePourDonnees = {
  slug: string;
  titre: string;
  description: string;
  publie_le: string | null;
  updated_at: string | null;
  relu_le: string | null;
  auteur_fonction: string;
  auteur_nom: string;
  image_url: string | null;
  rubrique: string | null;
  etiquettes: string[];
  serie: { titre: string; slug: string } | null;
  sources: string[];
  questions: { question: string; reponse: string }[];
  mots: number;
};

export type SitePourDonnees = {
  /** Adresse absolue du site, sans barre finale. */
  url: string;
  nom: string;
  /** Image par défaut, adresse absolue. */
  image: string;
  auteurMode: "fonction" | "nomme";
  typePage: "WebPage" | "MedicalWebPage";
};

/** Adresse absolue d'une image : telle quelle si absolue, sinon rattachée au site. */
export const imageAbsolue = (image: string | null, site: SitePourDonnees) =>
  !image
    ? site.image
    : /^https:\/\//.test(image)
      ? image
      : `${site.url}${image.startsWith("/") ? "" : "/"}${image}`;

/** Dernière modification : la plus récente de la correction et de la relecture. */
export function dateModification(
  a: Pick<ArticlePourDonnees, "updated_at" | "relu_le" | "publie_le">,
) {
  return (
    [a.updated_at, a.relu_le, a.publie_le]
      .filter((d): d is string => !!d)
      .sort()
      .at(-1) ?? null
  );
}

export function donneesStructureesArticle(a: ArticlePourDonnees, site: SitePourDonnees) {
  const url = `${site.url}/blog/${a.slug}`;
  const organisation = {
    "@type": "Organization",
    "@id": `${site.url}/#organisation`,
    name: site.nom,
  };
  const nom = a.auteur_nom.trim();
  const fonction = a.auteur_fonction.trim();
  const personne =
    site.auteurMode === "nomme" && nom
      ? { "@type": "Person", name: nom, ...(fonction ? { jobTitle: fonction } : {}) }
      : fonction
        ? { "@type": "Person", jobTitle: fonction }
        : null;
  const modifie = dateModification(a);

  const page: Record<string, unknown> = {
    "@type": site.typePage,
    "@id": url,
    url,
    name: a.titre,
    inLanguage: "fr-FR",
    isPartOf: { "@type": "WebSite", "@id": `${site.url}/#site`, url: site.url, name: site.nom },
  };
  if (a.relu_le) page["lastReviewed"] = a.relu_le;
  if (a.relu_le && personne) page["reviewedBy"] = personne;

  const article: Record<string, unknown> = {
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    headline: a.titre.slice(0, 110),
    inLanguage: "fr-FR",
    mainEntityOfPage: { "@id": url },
    author: personne ?? organisation,
    publisher: organisation,
    image: imageAbsolue(a.image_url, site),
  };
  if (a.description) article["description"] = a.description;
  if (a.publie_le) article["datePublished"] = a.publie_le;
  if (modifie) article["dateModified"] = modifie;
  if (a.rubrique) article["articleSection"] = a.rubrique;
  if (a.etiquettes.length) article["keywords"] = a.etiquettes.join(", ");
  if (a.serie) {
    article["isPartOf"] = {
      "@type": "CreativeWorkSeries",
      name: a.serie.titre,
      url: `${site.url}/blog/serie/${a.serie.slug}`,
    };
  }
  if (a.sources.length) article["citation"] = a.sources;
  if (a.mots > 0) article["wordCount"] = a.mots;

  const graphe: Record<string, unknown>[] = [page, article];
  // Questions-réponses : l'affichage enrichi chez les moteurs dépend de leurs propres règles ;
  // la description reste exacte quoi qu'il arrive.
  if (a.questions.length) {
    graphe.push({
      "@type": "FAQPage",
      "@id": `${url}#questions`,
      mainEntity: a.questions.map((q) => ({
        "@type": "Question",
        name: q.question,
        acceptedAnswer: { "@type": "Answer", text: q.reponse },
      })),
    });
  }
  return { "@context": "https://schema.org", "@graph": graphe };
}

/** Balises d'article (Open Graph) : dates, rubrique, étiquettes. */
export function balisesArticle(
  a: Pick<ArticlePourDonnees, "publie_le" | "updated_at" | "relu_le" | "rubrique" | "etiquettes">,
): Array<Record<string, string>> {
  const modifie = dateModification(a);
  return [
    ...(a.publie_le ? [{ property: "article:published_time", content: a.publie_le }] : []),
    ...(modifie ? [{ property: "article:modified_time", content: modifie }] : []),
    ...(a.rubrique ? [{ property: "article:section", content: a.rubrique }] : []),
    ...a.etiquettes.map((e) => ({ property: "article:tag", content: e })),
  ];
}

/** Search Console : performances filtrées sur l'adresse de l'article. Un lien, aucun chiffre importé. */
export function lienSearchConsole(siteUrl: string, chemin: string): string {
  const hote = new URL(siteUrl).hostname;
  return `https://search.google.com/search-console/performance/search-analytics?resource_id=${encodeURIComponent(
    `sc-domain:${hote}`,
  )}&page=${encodeURIComponent(`!${siteUrl}${chemin}`)}`;
}
