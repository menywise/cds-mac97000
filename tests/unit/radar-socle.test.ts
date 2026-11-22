/**
 * Radar des installations (socle 1.20.0, docs/RADAR.md, scripts/radar-socle.mjs) : logique pure.
 * Versions publiées et témoins tirés des vraies migrations ; écarts dans les deux sens sur des
 * installations fictives.
 * Lancer : node --test tests/unit/*.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ajoutsHorsGreffe,
  comparer,
  copiesAReprendre,
  ecarts,
  lireSonde,
  rapport,
  remonteesOuvertes,
  sondeSql,
  temoinsParVersion,
  versionDepuisChemins,
  versionsPubliees,
  // @ts-expect-error script Node sans déclaration de types
} from "../../scripts/radar-socle.mjs";

const RACINE = join(import.meta.dirname, "..", "..");
const DOSSIER = join(RACINE, "supabase", "migrations");
// Un clone par Remix n'a pas de supabase/migrations : les tests tirés des migrations y sont sautés.
const MIGRATIONS = existsSync(DOSSIER)
  ? readdirSync(DOSSIER)
      .filter((n) => n.endsWith(".sql"))
      .map((nom) => ({ nom, texte: readFileSync(join(DOSSIER, nom), "utf8") }))
  : [];
const SANS_MIGRATIONS = { skip: MIGRATIONS.length === 0 };

type Version = { version: string; niveau: string };
type Temoin = { version: string; objets: { nom: string }[] };
type Ecart = { sens: string; constat: string; action: string };

test("versions comparées nombre par nombre, pas en texte", () => {
  assert.ok(comparer("1.9.0", "1.15.0") < 0);
  assert.ok(comparer("1.15.7", "1.15.10") < 0);
  assert.equal(comparer("1.20.0", "1.20.0"), 0);
});

test("versions publiées lues dans les migrations, dans l'ordre", SANS_MIGRATIONS, () => {
  const publiees = versionsPubliees(MIGRATIONS);
  const versions = publiees.map((v: Version) => v.version);
  assert.deepEqual(versions, [...versions].sort(comparer));
  assert.equal(publiees.find((v: Version) => v.version === "1.4.1")?.niveau, "correctif");
  assert.equal(publiees.find((v: Version) => v.version === "1.17.0")?.niveau, "brique");
  assert.ok(versions.includes("1.20.0"));
});

test(
  "témoins : première création, jamais un objet retiré ni un objet de greffe",
  SANS_MIGRATIONS,
  () => {
    const temoins = temoinsParVersion(MIGRATIONS);
    const de = (v: string) =>
      temoins.find((t: Temoin) => t.version === v)?.objets.map((o: { nom: string }) => o.nom) ?? [];
    assert.ok(de("1.16.0").includes("registre"));
    assert.ok(de("1.17.0").includes("agent_cles"));
    assert.ok(de("1.19.0").includes("report_captures_a_effacer"));
    const tous = temoins.flatMap((t: Temoin) => t.objets.map((o: { nom: string }) => o.nom));
    // blog_posts renommée en 1.9.0, puis vue retirée en 1.10.0 : jamais témoin.
    assert.ok(!tous.includes("blog_posts"));
    assert.ok(tous.every((n: string) => !n.startsWith("greffe_")));
    assert.equal(new Set(tous).size, tous.length, "un objet témoigne d'une seule version");
  },
);

test("sonde : lecture seule, et ne casse pas sans site_settings", SANS_MIGRATIONS, () => {
  const sql = sondeSql(temoinsParVersion(MIGRATIONS));
  assert.doesNotMatch(sql, /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|GRANT|TRUNCATE)\b/i);
  assert.match(sql, /to_regclass\('public\.site_settings'\) IS NOT NULL THEN/);
  assert.match(sql, /\('1\.16\.0', 'table', 'registre'\)/);
});

test("lecture d'une sonde : version estimée et témoins manquants", () => {
  const b = lireSonde({
    reglage: null,
    installation: "1.15.3,1.15.10,1.15.7",
    temoins: { "1.15.0": [1, 1], "1.16.0": [0, 4], "1.9.0": [2, 2] },
  });
  assert.equal(b.installation, "1.15.10");
  assert.equal(b.estimee, "1.15.0");
  assert.deepEqual(b.manquantes, ["1.16.0"]);
});

test("version du code d'un Remix : dernier dossier de blocs", () => {
  const chemins = [
    "supabase/seed/v1_9_0/1.sql",
    "supabase/seed/v1_15_7/LISEZMOI.md",
    "supabase/seed/v1_15_10/1.sql",
    "supabase/seed/boutique/1.sql",
  ];
  assert.equal(versionDepuisChemins(chemins), "1.15.10");
  assert.equal(versionDepuisChemins(["src/main.tsx"]), null);
});

test("ajouts hors greffe : ni greffe, ni migrations retirées, ni notes de la plateforme", () => {
  const socle = ["src/main.tsx", "supabase/migrations/a.sql"];
  const site = [
    "src/main.tsx",
    "src/greffe/index.ts",
    "src/routes/(greffe)/_connecte/x.tsx",
    "docs/greffe/D1.md",
    ".lovable/plan/note.md",
    "src/lib/generique.ts",
  ];
  assert.deepEqual(ajoutsHorsGreffe(site, socle), ["src/lib/generique.ts"]);
});

test("copies exactes à reprendre : empreinte du socle changée depuis la copie", () => {
  const manifeste = { fichiers: { "a.ts": "111", "b.ts": "222", "absent.ts": "333" } };
  assert.deepEqual(copiesAReprendre(manifeste, { "a.ts": "111", "b.ts": "999" }), ["b.ts"]);
  assert.deepEqual(copiesAReprendre(null, {}), []);
});

test("remontées ouvertes : sens installation → socle, état écart ou à décider", () => {
  const synchro = [
    "| Fonction | Réf. | Niveau | État | Sens | Note |",
    "| Composants | C1 | portée | à décider | C1→S | x |",
    "| Recherche | S | portée | écart | S→C1 | x |",
    "| FAQ | ⇄ | portée | écart | ⇄ | x |",
    "| Circuit | C1 | portée | aligné | C1→S | x |",
  ].join("\n");
  assert.deepEqual(
    remonteesOuvertes(synchro).map((r: { fonction: string }) => r.fonction),
    ["Composants", "FAQ"],
  );
});

const SOCLE = {
  date: "2026-11-22",
  version: "1.19.0",
  publiees: [
    { version: "1.15.7", niveau: "correctif", resume: "" },
    { version: "1.16.0", niveau: "brique", resume: "" },
    { version: "1.19.0", niveau: "brique", resume: "" },
  ],
  empreintes: { "src/lib/registre.ts": "nouvelle" },
  remontees: [],
};

test("écarts : socle en avance et Remix dormant", () => {
  const e = ecarts(
    {
      nom: "Un remix",
      lien: "remix",
      code_version: "1.15.7",
      derniere_modif: "2026-10-01",
      sonde: { reglage: "1.15.7", installation: null, temoins: { "1.15.7": [1, 1] } },
    },
    SOCLE,
  );
  assert.deepEqual(
    e.map((x: Ecart) => x.sens),
    ["socle en avance", "dormante"],
  );
  assert.match(e[0].constat, /2 version\(s\) à porter, 1\.16\.0 \(brique\), 1\.19\.0 \(brique\)/);
});

test("écarts : base en retard sur le code (réglage, puis témoins d'un Remix)", () => {
  const e = ecarts(
    {
      nom: "Socle",
      lien: "socle",
      code_version: "1.19.0",
      sonde: {
        reglage: "1.16.0",
        installation: null,
        temoins: { "1.16.0": [4, 4], "1.19.0": [0, 2] },
      },
    },
    SOCLE,
  );
  assert.deepEqual(
    e.map((x: Ecart) => x.sens),
    ["base en retard", "base en retard"],
  );
  assert.match(e[0].action, /1\.19\.0/);
});

test("écarts : une copie sans version en base, sans faux témoins, copie à reprendre", () => {
  const e = ecarts(
    {
      nom: "Une copie",
      lien: "copie",
      code_version: "1.19.0",
      sonde: { reglage: null, installation: null, temoins: { "1.19.0": [0, 2] } },
      manifeste: { fichiers: { "src/lib/registre.ts": "ancienne" } },
    },
    SOCLE,
  );
  assert.deepEqual(
    e.map((x: Ecart) => x.sens),
    ["base en retard", "socle en avance"],
  );
  assert.match(e[0].constat, /Aucune version du socle enregistrée/);
});

test("écarts : un ajout hors greffe est une question, jamais un portage", () => {
  const e = ecarts(
    {
      nom: "Un remix",
      lien: "remix",
      code_version: "1.19.0",
      sonde: { reglage: "1.19.0", installation: null, temoins: {} },
      ajouts: ["src/lib/generique.ts"],
    },
    SOCLE,
  );
  assert.equal(e.length, 1);
  assert.equal(e[0].sens, "site en avance");
  assert.match(e[0].action, /^Question/);
});

test("rapport : première ligne lue pour la notification", () => {
  const aligne = {
    nom: "Aligné",
    lien: "remix",
    code_version: "1.19.0",
    sonde: { reglage: "1.19.0", installation: null, temoins: {} },
  };
  assert.match(rapport({ installations: [aligne] }, SOCLE), /^Écarts : 0\n/);
  const enRetard = { ...aligne, code_version: "1.16.0" };
  assert.match(rapport({ installations: [enRetard] }, SOCLE), /^Écarts : [1-9]/);
});
