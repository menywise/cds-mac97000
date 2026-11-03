/**
 * Maillage interne (socle 1.11.0) : règles d'écran, miroir de la base.
 * Lancer : node --test tests/unit/*.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ancrePauvre,
  etiquetteIndexable,
  extraireLiens,
  lienMarkdown,
  slugArticleDuChemin,
  suggestionsDeLiens,
  type ContenuMaillage,
} from "../../src/lib/maillage.ts";

test("liens internes : ancre et adresse, sans ancre de page ni paramètres, liens externes ignorés", () => {
  assert.deepEqual(
    extraireLiens("Voir [le guide](/blog/guide/) et [ici](/blog/autre#x), [ext](https://a.fr)."),
    [
      { ancre: "le guide", chemin: "/blog/guide" },
      { ancre: "ici", chemin: "/blog/autre" },
    ],
  );
});

test("adresse d'article : une seule partie après /blog/", () => {
  assert.equal(slugArticleDuChemin("/blog/guide-seo"), "guide-seo");
  assert.equal(slugArticleDuChemin("/blog/rubrique/seo"), null);
  assert.equal(slugArticleDuChemin("/contact"), null);
});

test("ancres pauvres : insensibles à la casse et aux espaces", () => {
  assert.equal(ancrePauvre("  Cliquez ici "), true);
  assert.equal(ancrePauvre("le guide du maillage"), false);
});

test("lien à coller", () => {
  assert.equal(lienMarkdown("Le guide", "guide"), "[Le guide](/blog/guide)");
});

test("étiquette indexée à partir du seuil", () => {
  assert.equal(etiquetteIndexable(2, 3), false);
  assert.equal(etiquetteIndexable(3, 3), true);
});

const base = (o: Partial<ContenuMaillage>): ContenuMaillage => ({
  id: "x",
  slug: "x",
  titre: "Titre",
  corps: "",
  etiquettes: [],
  rubrique_id: null,
  pilier_id: null,
  est_pilier: false,
  en_ligne: true,
  ...o,
});

test("suggestions : pilier d'abord, déjà liés et hors ligne exclus", () => {
  const source = base({
    id: "s",
    slug: "satellite",
    titre: "Maillage des satellites",
    pilier_id: "p",
    etiquettes: ["SEO"],
    corps: "Déjà lié : [frère](/blog/frere-lie).",
  });
  const tous = [
    source,
    base({ id: "p", slug: "pilier", titre: "Guide complet", est_pilier: true }),
    base({ id: "f", slug: "frere-lie", titre: "Frère lié", pilier_id: "p" }),
    base({ id: "e", slug: "etiquette", titre: "Autre sujet", etiquettes: ["SEO"] }),
    base({ id: "h", slug: "hors-ligne", titre: "Maillage brouillon", en_ligne: false }),
    base({ id: "z", slug: "sans-rapport", titre: "Recette de cuisine" }),
  ];
  assert.deepEqual(
    suggestionsDeLiens(source, tous).map((s) => s.slug),
    ["pilier", "etiquette"],
  );
});
