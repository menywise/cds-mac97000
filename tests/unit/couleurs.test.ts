/**
 * Couleur principale réglée en administration : validation et teintes au contraste AA.
 * Lancer : node --test tests/unit/*.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BLANC,
  contraste,
  couleurLisible,
  cssCouleurPrincipale,
  FOND,
  melanger,
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

test("une couleur de données devient lisible en texte, sur blanc, fond de page et fond pâle", () => {
  // Teintes de la palette Tailwind trouvées en base et dans le code (audit du 28/10/2026).
  for (const couleur of [
    "#0891b2",
    "#16a34a",
    "#ea580c",
    "#a8a29e",
    "#f59e0b",
    "#10b981",
    "#6366f1",
  ]) {
    const t = couleurLisible(couleur);
    for (const fond of [BLANC, FOND, melanger(couleur, FOND, 0.1)]) {
      assert.ok(contraste(t, fond) >= 4.5, `${couleur} → ${t} sur ${fond}`);
    }
    // Fond plein sous un texte blanc : même exigence.
    assert.ok(contraste(BLANC, t) >= 4.5, `${couleur} → ${t} sous du blanc`);
  }
});

test("une couleur déjà lisible ne change pas ; une couleur invalide donne l'encre", () => {
  assert.equal(couleurLisible("#475569"), "#475569");
  assert.equal(couleurLisible("rouge"), "#0f172a");
  assert.equal(melanger("#000000", "#ffffff", 0.5), "#808080");
});
