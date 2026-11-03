/**
 * Socle 1.12.0 : texte des articles, données structurées, adresses de sources vérifiables.
 * Lancer : node --test tests/unit/*.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  analyserCorps,
  avecSommaire,
  nombreDeMots,
  questionsReponses,
  segmentsEnLigne,
  sommaire,
} from "../../src/lib/corps.ts";
import {
  balisesArticle,
  dateModification,
  donneesStructureesArticle,
  lienSearchConsole,
  type ArticlePourDonnees,
  type SitePourDonnees,
} from "../../src/lib/article-donnees.ts";
import { adresseVerifiable, etatDepuisReponse } from "../../src/lib/sources-verif.ts";

const TEXTE = [
  "Introduction **en gras**.",
  "",
  "## Pourquoi relier ses articles",
  "Un paragraphe.",
  "",
  "## Comment faire",
  "- premier point",
  "- second point",
  "",
  "1. étape une",
  "2. étape deux",
  "",
  "### Détail",
  "> Une citation.",
  "",
  ":::retenir",
  "Un lien utile vaut mieux que dix liens vagues.",
  ":::",
  "",
  "## Comment faire",
  ":::faq",
  "Q : Combien de liens par article ?",
  "R : Autant que d'idées utiles",
  "au lecteur.",
  ":::",
].join("\n");

test("blocs : intertitres ancrés et uniques, listes, citation, encadré, questions", () => {
  const blocs = analyserCorps(TEXTE);
  assert.deepEqual(
    blocs.map((b) => b.type),
    ["p", "h2", "p", "h2", "ul", "ol", "h3", "citation", "retenir", "h2", "faq"],
  );
  assert.deepEqual(
    sommaire(blocs).map((e) => e.ancre),
    ["pourquoi-relier-ses-articles", "comment-faire", "detail", "comment-faire-2"],
  );
  assert.equal(avecSommaire(blocs), true);
  assert.deepEqual(questionsReponses(blocs), [
    {
      question: "Combien de liens par article ?",
      reponse: "Autant que d'idées utiles au lecteur.",
    },
  ]);
});

test("sommaire : absent sous trois intertitres", () => {
  assert.equal(avecSommaire(analyserCorps("## Un\n\n## Deux")), false);
});

test("en ligne : un lien hors /, https:// ou mailto: reste du texte", () => {
  const s = segmentsEnLigne("[ok](/blog/a) [ext](https://a.fr) [non](javascript:alert(1))");
  assert.deepEqual(
    s.filter((x) => x.type === "lien").map((x) => (x.type === "lien" ? [x.href, x.externe] : [])),
    [
      ["/blog/a", false],
      ["https://a.fr", true],
    ],
  );
});

test("nombre de mots : mise en forme retirée", () => {
  assert.equal(nombreDeMots("## Titre court\n\n- **un** [deux](/x)"), 4);
});

const site: SitePourDonnees = {
  url: "https://exemple.fr",
  nom: "Exemple",
  image: "https://exemple.fr/image-partage.png",
  auteurMode: "fonction",
  typePage: "MedicalWebPage",
};
const article: ArticlePourDonnees = {
  slug: "guide",
  titre: "Le guide",
  description: "Description.",
  publie_le: "2026-10-01T08:00:00Z",
  updated_at: "2026-10-02T08:00:00Z",
  relu_le: "2026-11-01",
  auteur_fonction: "Rédactrice",
  auteur_nom: "Dr Exemple",
  image_url: "/couverture.png",
  rubrique: "Référencement",
  etiquettes: ["Maillage", "SEO"],
  serie: { titre: "Débuter", slug: "debuter" },
  sources: ["https://exemple.fr/source"],
  questions: [{ question: "Q", reponse: "R" }],
  mots: 1200,
};

test("données structurées : page, article, questions", () => {
  const graphe = donneesStructureesArticle(article, site)["@graph"] as Record<string, unknown>[];
  assert.deepEqual(
    graphe.map((g) => g["@type"]),
    ["MedicalWebPage", "BlogPosting", "FAQPage"],
  );
  const a = graphe[1]!;
  assert.deepEqual(a["author"], { "@type": "Person", jobTitle: "Rédactrice" });
  assert.equal(a["dateModified"], "2026-11-01");
  assert.equal(a["image"], "https://exemple.fr/couverture.png");
  assert.equal(a["keywords"], "Maillage, SEO");
  assert.equal(a["articleSection"], "Référencement");
  assert.deepEqual(a["citation"], ["https://exemple.fr/source"]);
  assert.equal(graphe[0]!["lastReviewed"], "2026-11-01");
});

test("données structurées : auteur nommé selon le réglage, organisation à défaut", () => {
  const nomme = donneesStructureesArticle(article, { ...site, auteurMode: "nomme" })[
    "@graph"
  ] as Record<string, unknown>[];
  assert.deepEqual(nomme[1]!["author"], {
    "@type": "Person",
    name: "Dr Exemple",
    jobTitle: "Rédactrice",
  });
  const sansAuteur = donneesStructureesArticle(
    { ...article, auteur_fonction: "", auteur_nom: "" },
    site,
  )["@graph"] as Record<string, unknown>[];
  assert.equal((sansAuteur[1]!["author"] as Record<string, unknown>)["@type"], "Organization");
});

test("balises d'article et date de modification", () => {
  assert.equal(
    dateModification({ updated_at: "2026-10-02", relu_le: null, publie_le: "2026-10-01" }),
    "2026-10-02",
  );
  assert.deepEqual(
    balisesArticle(article).map((b) => b["property"]),
    [
      "article:published_time",
      "article:modified_time",
      "article:section",
      "article:tag",
      "article:tag",
    ],
  );
});

test("Search Console : propriété de domaine et page filtrée", () => {
  const url = lienSearchConsole("https://exemple.fr", "/blog/guide");
  assert.match(url, /resource_id=sc-domain%3Aexemple\.fr/);
  assert.match(url, /page=!https%3A%2F%2Fexemple\.fr%2Fblog%2Fguide/);
});

test("adresses vérifiables : https publique seulement", () => {
  assert.equal(adresseVerifiable("https://www.has-sante.fr/guide"), true);
  for (const url of [
    "http://exemple.fr",
    "https://localhost/a",
    "https://192.168.1.10/a",
    "https://[::1]/a",
    "https://serveur.local/a",
    "https://intranet/a",
    "https://exemple.fr:8443/a",
    "https://moi:secret@exemple.fr/a",
    "pas une adresse",
  ]) {
    assert.equal(adresseVerifiable(url), false, url);
  }
});

test("état d'un lien depuis la réponse", () => {
  assert.equal(etatDepuisReponse("https://a.fr", 200).ok, true);
  assert.equal(etatDepuisReponse("https://a.fr", 404).erreur, "Page introuvable");
  assert.equal(etatDepuisReponse("https://a.fr", 403).ok, false);
});
