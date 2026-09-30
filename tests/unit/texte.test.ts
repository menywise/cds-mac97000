/**
 * Contrôle des textes : exemples de la charte (docs/redaction/CHARTE_REDACTION_CDS.md).
 * Lancer : node --test tests/unit/*.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { auditTexts, score, type PageTexts, type TextRules } from "../e2e/texte.ts";

const rules = JSON.parse(
  readFileSync(
    join(import.meta.dirname, "..", "..", "docs", "redaction", "text-rules.json"),
    "utf8",
  ),
) as TextRules;

const page = (p: Partial<PageTexts>): PageTexts => ({
  titre: "",
  description: "",
  h1: "",
  paragraphes: [],
  cta: [],
  ...p,
});
const ctaRules = (libelle: string) =>
  auditTexts(page({ cta: [{ libelle, role: "secondaire" }] }), rules).anomalies.map((a) => a.regle);

test("les 10 bons boutons de la charte passent", () => {
  for (const b of [
    "Demander mon devis gratuit",
    "Réserver mon créneau",
    "Recevoir le guide",
    "Voir mes disponibilités",
    "Obtenir mon chiffrage",
    "Découvrir les tarifs",
    "Parler à un artisan",
    "Comparer les formules",
    "Commencer mon projet",
    "Télécharger le catalogue",
  ]) {
    assert.deepEqual(ctaRules(b), [], b);
  }
});

test("les 10 mauvais boutons de la charte sont refusés", () => {
  for (const b of [
    "Cliquez ici",
    "En savoir plus",
    "Soumettre",
    "Valider",
    "N'attendez plus",
    "Ne manquez pas notre offre",
    "Accéder",
    "Contact",
    "Découvrez notre solution innovante de gestion tout-en-un",
    "OK",
  ]) {
    assert.ok(ctaRules(b).length > 0, b);
  }
  assert.deepEqual(ctaRules("Cliquez ici"), ["ctaFormuleInterdite"]);
  // Verbes pronominaux ou précédés d'un pronom : acceptés.
  assert.deepEqual(ctaRules("Se connecter"), []);
  assert.deepEqual(ctaRules("Nous contacter"), []);
  assert.ok(ctaRules("Réservez").includes("ctaImperatifNu"));
});

test("« Envoyer » seul est interdit, « Envoyer ma demande » est conforme", () => {
  assert.deepEqual(ctaRules("Envoyer"), ["ctaFormuleInterdite"]);
  assert.deepEqual(ctaRules("Envoyer ma demande"), []);
});

test("mots interdits entiers, jamais en sous-chaîne ; termes protégés écartés", () => {
  const r = (t: string) =>
    auditTexts(page({ paragraphes: [t] }), rules).anomalies.map((a) => a.regle);
  assert.deepEqual(r("Une solution innovante."), ["motInterdit"]);
  assert.deepEqual(r("Une micro-entreprise bien tenue."), []);
  assert.deepEqual(r("Votre newsletter part le lundi."), []);
  assert.deepEqual(r("Le leadership se travaille."), []);
  assert.deepEqual(r("Un workflow clair."), ["jargon"]);
  // Sigle : casse exacte (« cds » dans un mot ou en minuscules n'est pas le sigle).
  assert.deepEqual(r("Le socle CDS est prêt."), ["motInterdit"]);
  // Nom du site protégé.
  assert.deepEqual(
    auditTexts(page({ titre: "Accueil — CDS" }), rules, { protege: ["CDS"] }).anomalies,
    [],
  );
});

test("négations : en deux morceaux, gravité selon le contexte", () => {
  const a = auditTexts(
    page({
      h1: "Ne perdez plus de temps",
      paragraphes: ["Vous ne payez rien avant la livraison."],
    }),
    rules,
  ).anomalies.map((x) => x.regle);
  assert.ok(a.includes("negationDansTitre"));
  assert.ok(a.includes("negation"));
});

test("score : bloquant plafonne à 49, majeur −1/3 du bloc, mineur −1/10", () => {
  assert.equal(score([]), 100);
  assert.equal(
    score([{ texte: "", regle: "ctaFormuleInterdite", gravite: "bloquant", proposition: "" }]),
    49,
  );
  assert.equal(
    score([{ texte: "", regle: "motInterdit", gravite: "majeur", proposition: "" }]),
    93,
  );
  assert.equal(score([{ texte: "", regle: "jargon", gravite: "mineur", proposition: "" }]), 99);
});

test("exemple de sortie de la grille : 4 anomalies, score 49", () => {
  const a = auditTexts(
    page({
      h1: "Ne perdez plus de temps",
      paragraphes: ["Une solution innovante pour digitaliser votre activité", "Un workflow simple"],
      cta: [{ libelle: "Cliquez ici", role: "principal" }],
    }),
    rules,
  );
  assert.equal(a.score, 49);
  for (const r of ["ctaFormuleInterdite", "motInterdit", "negationDansTitre", "jargon"]) {
    assert.ok(
      a.anomalies.some((x) => x.regle === r),
      r,
    );
  }
});

test("un seul bouton principal par écran, pas par page", () => {
  const regles = (cta: PageTexts["cta"]) =>
    auditTexts(page({ cta }), rules).anomalies.map((a) => a.regle);
  // Deux principaux sur des écrans différents : conforme.
  assert.deepEqual(
    regles([
      { libelle: "Demander mon devis", role: "principal", ecran: 0 },
      { libelle: "Recevoir la lettre", role: "principal", ecran: 3 },
    ]),
    [],
  );
  // Deux principaux sur le même écran : refusé.
  assert.deepEqual(
    regles([
      { libelle: "Demander mon devis", role: "principal", ecran: 0 },
      { libelle: "Recevoir la lettre", role: "principal", ecran: 0 },
    ]),
    ["ctaPrincipalMultiple"],
  );
});
