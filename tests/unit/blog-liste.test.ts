/**
 * Liste des articles (/blog) : paramètres d'adresse nettoyés avant d'être envoyés à la base.
 * Lancer : node --test tests/unit/*.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BLOG_PAGE_SIZE,
  BLOG_SEARCH_MAX_LENGTH,
  cleanBlogPage,
  cleanBlogSearch,
  cleanBlogTag,
  ARTICLE_LONGUEURS,
  borneSlug,
  descriptionDepuis,
  decouperExtrait,
  cleanBlogSlug,
} from "../../src/lib/blog.ts";

test("la liste est paginée par 12", () => {
  assert.equal(BLOG_PAGE_SIZE, 12);
});

test("numéro de page : entier à partir de 1, sinon 1", () => {
  assert.equal(cleanBlogPage(undefined), 1);
  assert.equal(cleanBlogPage("abc"), 1);
  assert.equal(cleanBlogPage(0), 1);
  assert.equal(cleanBlogPage(-3), 1);
  assert.equal(cleanBlogPage("2"), 2);
  assert.equal(cleanBlogPage(2.9), 2);
  assert.equal(cleanBlogPage(Infinity), 1);
  assert.equal(cleanBlogPage(1e12), 100000);
});

test("recherche : jokers et parenthèses neutralisés, guillemets et tiret gardés, longueur bornée", () => {
  assert.equal(cleanBlogSearch(undefined), "");
  assert.equal(cleanBlogSearch("  référencement   local "), "référencement local");
  assert.equal(cleanBlogSearch("a%b_c*d"), "a b c d");
  assert.equal(cleanBlogSearch('x,y(z)"w\\v'), 'x y z "w v');
  assert.equal(cleanBlogSearch('"lien interne" -ancre'), '"lien interne" -ancre');
  assert.equal(cleanBlogSearch("a".repeat(500)).length, BLOG_SEARCH_MAX_LENGTH);
  assert.equal(cleanBlogSearch("%,()"), "");
});

test("étiquette : sans virgule, accolade, guillemet ni barre oblique inverse", () => {
  assert.equal(cleanBlogTag(undefined), "");
  assert.equal(cleanBlogTag(" conformité "), "conformité");
  assert.equal(cleanBlogTag('a,b{c}"d\\e'), "a b c d e");
  assert.equal(cleanBlogTag("t".repeat(100)).length, 60);
});

test("description : le résumé court est repris tel quel", () => {
  assert.equal(descriptionDepuis("  Un résumé court.  "), "Un résumé court.");
});

test("description : un résumé long est coupé sur un mot entier, 160 caractères au plus", () => {
  const resume = "mot ".repeat(80);
  const description = descriptionDepuis(resume);
  assert.ok(description.length <= ARTICLE_LONGUEURS.description);
  assert.ok(description.endsWith("mot…"));
});

test("adresse : bornée à 80 caractères, sans tiret final", () => {
  const slug = borneSlug(`${"a".repeat(79)}-suite`);
  assert.equal(slug, "a".repeat(79));
  assert.equal(borneSlug("article-court"), "article-court");
});

test("extrait de recherche : mots trouvés repérés, marques retirées du texte", () => {
  assert.deepEqual(decouperExtrait("La ⟦pince⟧ sert … une ⟦pince⟧ fine"), [
    { texte: "La ", trouve: false },
    { texte: "pince", trouve: true },
    { texte: " sert … une ", trouve: false },
    { texte: "pince", trouve: true },
    { texte: " fine", trouve: false },
  ]);
  assert.deepEqual(decouperExtrait("orphelin ⟧ seul"), [
    { texte: "orphelin  seul", trouve: false },
  ]);
});

test("filtre de rubrique ou de série : adresse valide seulement", () => {
  assert.equal(cleanBlogSlug(" Materiel "), "materiel");
  assert.equal(cleanBlogSlug("a b"), "");
  assert.equal(cleanBlogSlug(undefined), "");
});
