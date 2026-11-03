/**
 * Socle 1.14.0 : bibliographie, appels [n], citation, manques d'une société savante.
 * Lancer : node --test tests/unit/*.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  appelsDuTexte,
  citerContenu,
  formaterReference,
  lienReference,
  type Reference,
} from "../../src/lib/bibliographie.ts";
import { segmentsEnLigne } from "../../src/lib/corps.ts";
import {
  REGLAGES_PAR_DEFAUT,
  lireReglages,
  manquesSaisie,
} from "../../src/lib/editorial-regles.ts";

const ref: Reference = {
  rang: 1,
  auteurs: "Dupont A, Martin B",
  titre: "Un essai",
  revue: "Revue exemple",
  annee: 2024,
  doi: "10.1234/abcd",
  pmid: "123",
  url: "",
};

test("référence : Vancouver et APA, DOI prioritaire", () => {
  assert.equal(
    formaterReference(ref, "vancouver"),
    "Dupont A, Martin B. Un essai. Revue exemple. 2024. doi:10.1234/abcd",
  );
  assert.equal(
    formaterReference(ref, "apa"),
    "Dupont A, Martin B. (2024). Un essai. Revue exemple. doi:10.1234/abcd",
  );
  assert.equal(lienReference(ref), "https://doi.org/10.1234/abcd");
  assert.equal(
    lienReference({ doi: "", pmid: "123", url: "" }),
    "https://pubmed.ncbi.nlm.nih.gov/123/",
  );
});

test("appels : [n] hors liens, sans doublon, triés", () => {
  assert.deepEqual(appelsDuTexte("Voir [2], [1] et [2]. Lien [1](/blog/a)."), [1, 2]);
  assert.deepEqual(
    segmentsEnLigne("Selon [3].").map((s) => s.type),
    ["texte", "appel", "texte"],
  );
});

test("citer ce contenu : auteur ou site, date de consultation", () => {
  const c = {
    titre: "Le guide",
    auteur: "",
    site: "Exemple",
    url: "https://exemple.fr/blog/guide",
    publie_le: "2026-10-01T08:00:00Z",
  };
  const v = citerContenu(c, "vancouver", new Date("2026-11-03T12:00:00Z"));
  assert.match(
    v,
    /^Exemple\. Le guide\. Exemple \[Internet\]\. 2026 \[consulté le 3 novembre 2026\]/,
  );
  assert.match(
    citerContenu(c, "apa", new Date("2026-11-03T12:00:00Z")),
    /^Exemple\. \(2026\)\. Le guide\./,
  );
});

test("réglages savants : valeurs par défaut et lecture", () => {
  assert.equal(REGLAGES_PAR_DEFAUT.exiger_liens_interets, false);
  const r = lireReglages({ niveaux_preuve: ["A", "", 3], format_citation: "apa" });
  assert.deepEqual(r.niveaux_preuve, ["A"]);
  assert.equal(r.format_citation, "apa");
});

test("manques savants : liens d'intérêts exigés, compte rendu sans événement", () => {
  const base = {
    type: "article" as const,
    titre: "Le maillage interne sans effort",
    description:
      "Relier ses contenus entre eux aide le lecteur et les moteurs de recherche à comprendre ce qui compte.",
    corps: "Texte.",
    auteur_fonction: "Rédactrice",
    auteur_nom: "",
    sources: "https://exemple.fr",
    relu_le: "2026-11-03",
  };
  const r = { ...REGLAGES_PAR_DEFAUT, exiger_liens_interets: true };
  assert.deepEqual(
    manquesSaisie(
      { ...base, genre: "compte_rendu", evenement: "", evenement_le: null, liens_interets: "" },
      r,
    ).map((m) => m.code),
    ["liens_interets", "evenement"],
  );
  assert.deepEqual(manquesSaisie({ ...base, liens_interets: "Aucun" }, r), []);
});
