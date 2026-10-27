/**
 * Couleur principale réglée en administration : validation et teintes au contraste AA.
 * Lancer : node --test tests/unit/*.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  contraste,
  cssCouleurPrincipale,
  normaliserCouleur,
  teintesPrincipales,
} from "../../src/lib/couleurs.ts";

test("seules les couleurs #rrggbb (ou #rgb) sont acceptées", () => {
  assert.equal(normaliserCouleur("#1D4ED8"), "#1d4ed8");
  assert.equal(normaliserCouleur("1d4ed8"), "#1d4ed8");
  assert.equal(normaliserCouleur("#abc"), "#aabbcc");
  for (const invalide of ["", "bleu", "#12345", "red;}body{x:y", "#1d4ed8;color:red"]) {
    assert.equal(normaliserCouleur(invalide), "", invalide);
  }
  // Aucune injection possible dans la feuille de styles.
  assert.equal(cssCouleurPrincipale("#000;}*{display:none"), "");
});

test("les teintes dérivées restent lisibles (AA 4,5:1)", () => {
  for (const couleur of [
    "#0d6efd",
    "#ffc107",
    "#22c55e",
    "#777777",
    "#f8fafc",
    "#000000",
    "#334155",
  ]) {
    const t = teintesPrincipales(couleur);
    assert.ok(t, couleur);
    assert.ok(contraste(t.surCouleur, t.principale) >= 4.5, `${couleur} : texte sur la couleur`);
    assert.ok(contraste(t.texte, "#eaeff5") >= 4.5, `${couleur} : couleur en texte`);
  }
});
