/**
 * Garde-fous de la charte face aux fautes de l'audit du 28/10/2026 (test par mutation) : chaque
 * faute qui passait le hook pre-commit doit maintenant être vue par ESLint ou par le cliquet.
 * Lancer : node --test tests/unit/*.test.ts
 */
/* eslint-disable charte/couleurs-nommees -- fautes plantées exprès */
import { test } from "node:test";
import assert from "node:assert/strict";

// @ts-expect-error module ESLint local sans déclaration de types
import { ARBITRAIRE, COULEUR, SOMBRE } from "../../eslint-rules/charte.js";
// @ts-expect-error script Node sans déclaration de types
import { compter } from "../../scripts/cliquet-charte.mjs";

const vu = (classes: string) =>
  COULEUR.test(classes) || ARBITRAIRE.test(classes) || SOMBRE.test(classes);

test("ESLint et verifier-couleurs voient les couleurs en dur, préfixe composé compris", () => {
  for (const faute of [
    "text-orange-600",
    "border-l-amber-500",
    "ring-offset-slate-200",
    "hover:bg-emerald-50",
    "text-[#ea580c]",
    "bg-[rgb(245,158,11)]",
    "border-t-[oklch(0.7_0.1_250)]",
    "dark:bg-card",
  ]) {
    assert.ok(vu(`p-4 ${faute} rounded`), faute);
  }
});

test("les couleurs nommées et les ombres arbitraires restent permises", () => {
  for (const permis of [
    "bg-success-soft text-warning-text border-danger-border",
    "text-violet-text bg-neutral-soft",
    "shadow-[0_4px_12px_rgba(0,0,0,0.08)]",
    "shadow-[var(--shadow-field-inset)]",
    "border-l-4 border-module-strong",
  ]) {
    assert.ok(!vu(permis), permis);
  }
});

test("le cliquet compte couleurs en dur, styles en ligne et opacité par modificateur", () => {
  const c = compter(`
    const TEINTES = { orange: "#ea580c", vert: '#16a34a' };
    <p style={{ color: "rgb(245,158,11)" }}>a</p>
    <span style={{ borderColor: category.color, color: category.color }}>b</span>
    <p className="text-foreground/50">c</p>
    <button className="focus-visible:ring-2 focus-visible:ring-ring/30">d</button>
    <button className="disabled:text-foreground/50">e</button>
  `);
  assert.equal(c.couleurs, 3, "deux hexadécimaux et un rgb()");
  assert.equal(c.styles, 3, "color, puis borderColor et color");
  assert.equal(c.opacite, 2, "text-foreground/50 et ring-ring/30 ; disabled: reste permis");
});

test("une ancre ou un numéro n'est pas une couleur", () => {
  const c = compter(`<a href="#contenu">x</a> <p>Demande #123</p> <a href="#add">y</a>`);
  assert.equal(c.couleurs, 0);
});
