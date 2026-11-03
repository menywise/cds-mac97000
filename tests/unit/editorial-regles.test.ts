/**
 * Circuit de rédaction (socle 1.10.0) : règles d'écran, miroir de la base.
 * Lancer : node --test tests/unit/*.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  REGLAGES_PAR_DEFAUT,
  actionsPossibles,
  auteurAffiche,
  lireReglages,
  lireSources,
  manquesSaisie,
} from "../../src/lib/editorial-regles.ts";

const article = {
  type: "article" as const,
  titre: "Le maillage interne sans effort",
  description:
    "Relier ses contenus entre eux aide le lecteur et les moteurs de recherche à comprendre ce qui compte.",
  corps: "Texte.",
  auteur_fonction: "Rédactrice",
  auteur_nom: "",
  sources: "Guide — https://exemple.fr/guide",
  relu_le: "2026-11-03",
};

test("réglages : valeurs par défaut, valeurs étrangères ignorées", () => {
  assert.deepEqual(lireReglages(null), REGLAGES_PAR_DEFAUT);
  const r = lireReglages({ circuit: "simple", delai_relecture_mois: 99, exiger_sources: "non" });
  assert.equal(r.circuit, "simple");
  assert.equal(r.delai_relecture_mois, 12);
  assert.equal(r.exiger_sources, true);
});

test("circuit complet : une rédaction part en relecture, jamais en ligne directement", () => {
  const vers = actionsPossibles({ type: "article", statut_lu: "redaction" }).map((a) => a.vers);
  assert.deepEqual(vers, ["a_relire", "idee"]);
});

test("circuit simple : l'admin publie une rédaction directement", () => {
  const actions = actionsPossibles({ type: "article", statut_lu: "redaction" }, "simple");
  assert.equal(actions[0]?.vers, "publie");
  assert.equal(actions[0]?.admin, true);
});

test("motif exigé pour renvoyer en rédaction et pour signaler à actualiser", () => {
  const relire = actionsPossibles({ type: "article", statut_lu: "a_relire" });
  assert.equal(relire.find((a) => a.vers === "redaction")?.motif, true);
  const publie = actionsPossibles({ type: "article", statut_lu: "publie" });
  assert.equal(publie.find((a) => a.vers === "a_actualiser")?.motif, true);
});

test("une page va de rédaction à publié, et retour", () => {
  const vers = actionsPossibles({ type: "page", statut_lu: "redaction" }).map((a) => a.vers);
  assert.deepEqual(vers, ["publie", "programme"]);
});

test("manques : article complet, aucun manque", () => {
  assert.deepEqual(manquesSaisie(article, REGLAGES_PAR_DEFAUT), []);
});

test("manques : exigences coupées par réglage", () => {
  const vide = {
    ...article,
    titre: "Court",
    description: "",
    sources: "",
    auteur_fonction: "",
    relu_le: null,
  };
  assert.deepEqual(
    manquesSaisie(vide, REGLAGES_PAR_DEFAUT).map((m) => m.code),
    ["titre", "description", "auteur", "sources", "relecture"],
  );
  const souple = {
    ...REGLAGES_PAR_DEFAUT,
    longueurs_seo: false,
    exiger_sources: false,
    exiger_relecture: false,
    exiger_auteur: false,
  };
  assert.deepEqual(manquesSaisie(vide, souple), []);
});

test("manques : auteur nommé exigé quand le site montre les noms", () => {
  const r = { ...REGLAGES_PAR_DEFAUT, auteur_mode: "nomme" as const };
  assert.deepEqual(
    manquesSaisie(article, r).map((m) => m.code),
    ["auteur"],
  );
  assert.equal(auteurAffiche({ ...article, auteur_nom: "Dr Exemple" }, "nomme"), "Dr Exemple");
  assert.equal(auteurAffiche(article, "fonction"), "Rédactrice");
});

test("sources : libellé et adresse, ligne sans adresse ignorée", () => {
  assert.deepEqual(
    lireSources("Guide — https://exemple.fr/a\nsans adresse\nhttps://exemple.fr/b"),
    [
      { libelle: "Guide", url: "https://exemple.fr/a" },
      { libelle: "https://exemple.fr/b", url: "https://exemple.fr/b" },
    ],
  );
});
