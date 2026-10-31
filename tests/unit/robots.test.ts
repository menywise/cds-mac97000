/**
 * Indexation : robots.txt et consigne « noindex » du réglage « Fermé aux moteurs de recherche ».
 * Un clone reste indexable tant que son admin ne coche rien : aucun blocage hérité du socle.
 * Lancer : node --test tests/unit/*.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROBOTS_ENTRAINEMENT, texteRobots } from "../../src/lib/robots.ts";
import { normalizeBrand } from "../../src/lib/site-config.ts";

const DEPOT = join(import.meta.dirname, "..", "..");

/** Groupes de robots.txt : agents du groupe, puis ses règles. */
function groupes(texte: string) {
  const out: { agents: string[]; regles: string[] }[] = [];
  let courant: { agents: string[]; regles: string[] } | null = null;
  for (const ligne of texte.split("\n")) {
    const [cle, ...reste] = ligne.split(":");
    const valeur = reste.join(":").trim();
    if (cle === "User-agent") {
      if (!courant || courant.regles.length) out.push((courant = { agents: [], regles: [] }));
      courant.agents.push(valeur);
    } else if (courant && (cle === "Allow" || cle === "Disallow")) {
      courant.regles.push(`${cle}: ${valeur}`);
    }
  }
  return out;
}

test("site ouvert : sitemap annoncé, moteurs et IA de recherche admis", () => {
  const texte = texteRobots({ url: "https://exemple.fr", horsIndex: false });
  assert.match(texte, /^Sitemap: https:\/\/exemple\.fr\/sitemap\.xml$/m);
  const general = groupes(texte).find((g) => g.agents.includes("*"));
  assert.ok(general?.regles.includes("Allow: /"));
  assert.ok(!general?.regles.includes("Disallow: /"));
  // Robots de recherche des IA : aucun groupe propre, ils suivent la règle générale.
  for (const robot of [
    "Googlebot",
    "Bingbot",
    "OAI-SearchBot",
    "Claude-SearchBot",
    "PerplexityBot",
  ]) {
    assert.ok(!groupes(texte).some((g) => g.agents.includes(robot)), robot);
  }
});

test("robots d'entraînement des IA refusés partout", () => {
  const texte = texteRobots({ url: "https://exemple.fr", horsIndex: false });
  const groupe = groupes(texte).find((g) => g.agents.includes("GPTBot"));
  assert.deepEqual(groupe?.agents, [...ROBOTS_ENTRAINEMENT]);
  assert.deepEqual(groupe?.regles, ["Disallow: /"]);
});

test("site fermé : exploration permise (le noindex doit être lu), sitemap tu", () => {
  const texte = texteRobots({ url: "https://exemple.fr", horsIndex: true });
  assert.doesNotMatch(texte, /Sitemap:/);
  const general = groupes(texte).find((g) => g.agents.includes("*"));
  assert.ok(general?.regles.includes("Allow: /"));
});

test("adresse vide : pas de ligne Sitemap relative", () => {
  assert.doesNotMatch(texteRobots({ url: "", horsIndex: false }), /Sitemap:/);
});

test("réglage absent ou mal typé : site indexable", () => {
  assert.equal(normalizeBrand({}).horsIndex, false);
  assert.equal(normalizeBrand({ horsIndex: "true" }).horsIndex, false);
  assert.equal(normalizeBrand(null).horsIndex, false);
  assert.equal(normalizeBrand({ horsIndex: true }).horsIndex, true);
});

test("espace connecté : noindex envoyé par le serveur malgré ssr: false", () => {
  const route = readFileSync(join(DEPOT, "src/routes/_authenticated/route.tsx"), "utf8");
  assert.match(route, /ssr: false/);
  assert.match(route, /name: "robots", content: "noindex, nofollow"/);
  assert.match(route, /"X-Robots-Tag": "noindex, nofollow"/);
});

test("sitemap : aucune page marquée noindex", () => {
  const sitemap = readFileSync(join(DEPOT, "src/routes/sitemap[.]xml.tsx"), "utf8");
  const chemins = [...sitemap.matchAll(/\{ path: "([^"]+)"/g)].map((m) => m[1] ?? "");
  const fautifs = chemins.filter((chemin) => {
    const fichier = `src/routes/${chemin.slice(1).replace(/\//g, ".") || "index"}.tsx`;
    try {
      return /noindex: true/.test(readFileSync(join(DEPOT, fichier), "utf8"));
    } catch {
      return false;
    }
  });
  assert.deepEqual(fautifs, []);
});
