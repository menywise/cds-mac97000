/**
 * Lot 13 a, étendu par le socle 1.6.1 : le socle ne contient rien de propre à un projet. Chaque clone
 * règle son nom, son adresse et son domaine d'envoi dans l'administration ; ni le code, ni les
 * documents, ni le SQL, ni les tests n'en gardent de trace : aucun domaine, aucun dépôt, aucun prénom,
 * aucun nom de projet réel, aucun chemin de disque.
 * Socle 1.15.7 : le même test tourne dans chaque clone (le remix le copie). Un clone se reconnaît à
 * sa prise de greffe remplie. Ses emplacements de greffe (docs/greffe/ compris) lui appartiennent :
 * ils peuvent nommer le projet, ils sont exclus. Un clone n'a pas non plus de supabase/migrations.
 * Dans le socle, rien ne change : tout est lu, migrations comprises.
 * Lancer : node --test tests/unit/*.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const DEPOT = join(import.meta.dirname, "..", "..");
const SRC = join(DEPOT, "src");

// Motifs interdits partout dans le socle : domaines, dépôts, prénoms, projets réels, chemins de disque.
// Les exemples neutres (exemple.fr, « le premier clone ») sont les seuls admis dans les documents.
const FORBIDDEN: { motif: RegExp; raison: string }[] = [
  { motif: /manuelrohaut/i, raison: "domaine d'un projet réel" },
  { motif: /mac97000/i, raison: "suffixe des dépôts d'un studio réel" },
  { motif: /menywise/i, raison: "organisation GitHub d'un studio réel" },
  { motif: /\bManu\b/, raison: "prénom" },
  { motif: /\bRohaut\b/i, raison: "nom de famille" },
  { motif: /goldwing/i, raison: "nom d'un autre projet" },
  { motif: /kairognosia|skiagnosia/i, raison: "nom d'un autre projet" },
  { motif: /holokai/i, raison: "nom d'un autre projet (coffre de notes)" },
  { motif: /\bunuhi\b/i, raison: "nom d'un outil d'un autre projet" },
  { motif: /annuaire-lovable-cds/i, raison: "dépôt d'un clone réel" },
  { motif: /community\.cube\.fr/i, raison: "site de référence d'un autre projet" },
  { motif: /\/Users\/|\/home\/[a-z]/, raison: "chemin de disque" },
  { motif: /\b[A-Z]:\\[A-Za-z_]/, raison: "chemin de disque Windows" },
];

// Dossiers du socle passés au peigne fin, depuis la racine du dépôt.
const DOSSIERS = ["src", "docs", "supabase", "tests", ".github", ".lovable", "public"];
// Dossiers jamais lus : dépendances, builds, historique git, rapports du robot.
const DOSSIERS_IGNORES = new Set([
  "node_modules",
  "dist",
  ".output",
  ".vinxi",
  ".nitro",
  ".git",
  "rapport",
]);
// Fichiers propres à l'installation (Lovable les écrit), fichiers générés et fichiers binaires.
const EXEMPTES = new Set([
  ".env",
  "bun.lock",
  "supabase/config.toml",
  ".lovable/mcp/manifest.json",
  "src/routeTree.gen.ts",
  // Ce test lui-même porte la liste des motifs.
  "tests/unit/socle-neutre.test.ts",
  // Migration publiée (lot 11) : une ligne de commentaire nomme le clone dont le modèle de données
  // a été repris. Une migration publiée ne se modifie plus ; le texte reste dans l'historique.
  "supabase/migrations/20260930190000_v0_lot11_geographie.sql",
]);
const BINAIRES = /\.(png|jpe?g|gif|webp|ico|svg|woff2?|ttf|pdf|zip)$/i;

// Emplacements de greffe (docs/CLONER.md, « Écrire une greffe ») : propres à un clone.
const EMPLACEMENTS_GREFFE = [
  "src/greffe",
  "src/routes/(greffe)",
  "supabase/greffe",
  "tests/greffe",
  "docs/greffe",
];

/** Le socle livre sa prise vide ; un clone la remplit (règle de AGENTS.md). */
export function estUnClone(prise: string): boolean {
  return !/export const GREFFE: GreffeDeclaration = \{\};/.test(prise);
}

export function dansUneGreffe(rel: string): boolean {
  const chemin = rel.split(sep).join("/");
  return EMPLACEMENTS_GREFFE.some((e) => chemin === e || chemin.startsWith(`${e}/`));
}

const CLONE = estUnClone(readFileSync(join(SRC, "greffe", "index.ts"), "utf8"));

function fichiers(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return DOSSIERS_IGNORES.has(name) ? [] : fichiers(path);
    return [path];
  });
}

function fichiersDuSocle(): string[] {
  const racine = readdirSync(DEPOT)
    .map((name) => join(DEPOT, name))
    .filter((path) => !statSync(path).isDirectory());
  const dossiers = DOSSIERS.filter((d) => existsSync(join(DEPOT, d))).flatMap((d) =>
    fichiers(join(DEPOT, d)),
  );
  return [...racine, ...dossiers].filter((path) => {
    const rel = relative(DEPOT, path);
    if (CLONE && dansUneGreffe(rel)) return false;
    return !EXEMPTES.has(rel) && !BINAIRES.test(rel);
  });
}

function occurrences(paths: string[]): string[] {
  const hits: string[] = [];
  for (const file of paths) {
    const text = readFileSync(file, "utf8");
    for (const { motif, raison } of FORBIDDEN) {
      if (motif.test(text)) hits.push(`${relative(DEPOT, file)} : ${motif} (${raison})`);
    }
  }
  return hits;
}

test("aucune identité de projet réel dans le socle (racine, src/, docs/, supabase/, tests/)", () => {
  const paths = fichiersDuSocle();
  assert.ok(
    paths.some((p) => p.endsWith(join("docs", "CLONER.md"))),
    "docs/ est bien parcouru",
  );
  // Le remix retire supabase/migrations : seul le socle doit le porter.
  if (!CLONE) {
    assert.ok(
      paths.some((p) => p.includes(join("supabase", "migrations"))),
      "supabase/migrations/ est bien parcouru",
    );
  }
  assert.ok(
    paths.some((p) => p.endsWith("README.md")),
    "la racine est bien parcourue",
  );
  assert.deepEqual(occurrences(paths), []);
});

test("les motifs interdits détectent bien une identité glissée dans un texte", () => {
  const essais = [
    "voir https://cds-mac97000.lovable.app",
    "dépôt menywise/annuaire-mac97000",
    "validé par Manu le 30/09",
    "repris de Goldwing",
    "destination vault : _HOLOKAI\\03_PROJETS\\CDS",
    "copié depuis C:\\Projets\\site",
    "copié depuis /Users/quelquun/site",
  ];
  for (const texte of essais) {
    assert.ok(
      FORBIDDEN.some(({ motif }) => motif.test(texte)),
      `non détecté : ${texte}`,
    );
  }
  // Les exemples neutres passent.
  for (const texte of [
    "exemple.fr",
    "le premier clone",
    "premier-clone.lovable.app",
    "mode manuel",
    "Manuel d'utilisation",
  ]) {
    assert.ok(!FORBIDDEN.some(({ motif }) => motif.test(texte)), `faux positif : ${texte}`);
  }
});

test("clone : prise remplie, emplacements de greffe hors du contrôle d'identité", () => {
  assert.equal(estUnClone("export const GREFFE: GreffeDeclaration = {};"), false);
  assert.equal(estUnClone("export const GREFFE: GreffeDeclaration = {\n  modules: [],\n};"), true);
  for (const rel of [
    "docs/greffe/cadrage/D11.md",
    "src/routes/(greffe)/_connecte/x.tsx",
    "tests/greffe/db/run.sh",
    "supabase/greffe/001.sql",
    "src/greffe/index.ts",
  ]) {
    assert.ok(dansUneGreffe(rel.split("/").join(sep)), `greffe non reconnue : ${rel}`);
  }
  for (const rel of ["docs/CLONER.md", "docs/greffes.md", "src/greffes/x.ts", "README.md"]) {
    assert.ok(!dansUneGreffe(rel.split("/").join(sep)), `faux emplacement de greffe : ${rel}`);
  }
});

test("les e-mails lisent leur identité dans les réglages", () => {
  for (const file of [
    "routes/lovable/email/auth/webhook.ts",
    "lib/email-templates/send-email.ts",
  ]) {
    const text = readFileSync(join(SRC, file), "utf8");
    assert.match(text, /emailIdentity\(/, file);
    assert.doesNotMatch(text, /const SENDER_DOMAIN\s*=/, file);
  }
});
