#!/usr/bin/env node
// Radar des installations (socle 1.20.0, docs/RADAR.md). Le socle et ses installations avancent
// chacun de leur côté : le radar dit où chacune en est, dans les deux sens, et propose une action par
// écart. Il constate et propose, il ne corrige rien : toutes ses lectures de base sont en lecture seule.
//
// Ce script ne connaît aucune installation réelle. La session qui passe le radar recense les
// installations (empreinte : docs/RADAR.md), les observe, écrit ses observations dans un fichier JSON
// hors du dépôt, puis demande le rapport ici. Logique pure exportée : tests/unit/radar-socle.test.ts.
//
// Usage : node scripts/radar-socle.mjs sonde               requête de lecture d'une base (une ligne)
//         node scripts/radar-socle.mjs chemins <version>   fichiers du socle livrés par cette version
//         node scripts/radar-socle.mjs empreintes          empreinte des fichiers du socle (copies exactes)
//         node scripts/radar-socle.mjs rapport <obs.json>  rapport en Markdown ; 1re ligne : « Écarts : N »
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const RACINE = join(import.meta.dirname, "..");

// --- Versions --------------------------------------------------------------------------------------

/** Compare deux versions « 1.15.7 » : négatif, zéro ou positif. */
export function comparer(a, b) {
  const [x, y] = [a.split(".").map(Number), b.split(".").map(Number)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return (x[i] ?? 0) - (y[i] ?? 0);
  return 0;
}

const plusHaute = (versions) => [...versions].sort(comparer).at(-1) ?? null;

/** Version portée par le nom d'une migration (« _v1_16_0_ ») ; avant le scellement : 1.0.0. */
export function versionDeMigration(nom) {
  const m = /_v(\d+)_(\d+)_(\d+)_/.exec(nom);
  return m ? `${m[1]}.${m[2]}.${m[3]}` : "1.0.0";
}

/** Versions publiées, lues dans les INSERT INTO socle_versions des migrations. */
export function versionsPubliees(migrations) {
  const vues = new Map();
  const motif =
    /\('(\d+\.\d+\.\d+)',\s*'(palier|brique|correctif|initial)',\s*'[^']*',\s*'((?:[^']|'')*)'/g;
  for (const { texte } of migrations) {
    if (!/INSERT INTO public\.socle_versions/.test(texte)) continue;
    for (const m of texte.matchAll(motif)) {
      if (!vues.has(m[1]))
        vues.set(m[1], { version: m[1], niveau: m[2], resume: m[3].replaceAll("''", "'") });
    }
  }
  return [...vues.values()].sort((a, b) => comparer(a.version, b.version));
}

/** Versions strictement après « depuis », jusqu'à « jusqua » compris. */
export function versionsEntre(publiees, depuis, jusqua) {
  return publiees.filter(
    (v) => comparer(v.version, depuis) > 0 && comparer(v.version, jusqua) <= 0,
  );
}

// --- Témoins en base -------------------------------------------------------------------------------

const MAX_TEMOINS = 4;

/**
 * Objets témoins de chaque version : tables et fonctions du schéma public créées pour la première
 * fois par cette version, et jamais supprimées ni renommées ensuite. Une base qui les a reçues a passé
 * la version ; une version sans témoin (correctif de droits, par exemple) ne se mesure pas ainsi.
 */
export function temoinsParVersion(migrations) {
  const premiere = new Map();
  const retires = new Set();
  const tries = [...migrations].sort((a, b) => a.nom.localeCompare(b.nom));
  for (const { nom, texte } of tries) {
    const version = versionDeMigration(nom);
    const noter = (type, objet) => {
      // Un objet greffe_* appartient à l'installation, jamais au socle.
      if (/^greffe_/i.test(objet)) return;
      const cle = `${type}:${objet.toLowerCase()}`;
      if (!premiere.has(cle)) premiere.set(cle, { version, type, nom: objet.toLowerCase() });
    };
    for (const m of texte.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?public\.(\w+)/gi))
      noter("table", m[1]);
    for (const m of texte.matchAll(/CREATE (?:OR REPLACE )?FUNCTION public\.(\w+)\s*\(/gi))
      noter("fonction", m[1]);
    for (const m of texte.matchAll(/DROP (TABLE|VIEW|FUNCTION) (?:IF EXISTS )?public\.(\w+)/gi)) {
      retires.add(
        `${m[1].toUpperCase() === "FUNCTION" ? "fonction" : "table"}:${m[2].toLowerCase()}`,
      );
    }
    for (const m of texte.matchAll(/ALTER TABLE (?:IF EXISTS )?public\.(\w+) RENAME TO (\w+)/gi)) {
      retires.add(`table:${m[1].toLowerCase()}`);
      noter("table", m[2]);
    }
  }
  const parVersion = new Map();
  for (const [cle, t] of premiere) {
    if (retires.has(cle)) continue;
    if (!parVersion.has(t.version)) parVersion.set(t.version, []);
    parVersion.get(t.version).push({ type: t.type, nom: t.nom });
  }
  return [...parVersion.entries()]
    .sort(([a], [b]) => comparer(a, b))
    .map(([version, objets]) => ({
      version,
      objets: objets.sort((a, b) => a.nom.localeCompare(b.nom)).slice(0, MAX_TEMOINS),
    }));
}

/**
 * Requête de lecture seule d'une base : une ligne, une colonne « sonde » (JSON). Elle ne casse pas sur
 * une base qui n'a pas site_settings ni socle_installation (lecture par query_to_xml sous condition).
 */
export function sondeSql(temoins) {
  const valeurs = temoins
    .flatMap((t) => t.objets.map((o) => `('${t.version}', '${o.type}', '${o.nom}')`))
    .join(",\n    ");
  const lire = (table, requete) =>
    `CASE WHEN to_regclass('public.${table}') IS NOT NULL THEN ` +
    `(xpath('/row/v/text()', query_to_xml($q$${requete}$q$, false, true, '')))[1]::text END`;
  return `WITH t(version, type, nom) AS (VALUES
    ${valeurs}
)
SELECT jsonb_build_object(
  'reglage', ${lire("site_settings", "SELECT value ->> 'version' AS v FROM public.site_settings WHERE key = 'socle'")},
  'installation', ${lire("socle_installation", "SELECT string_agg(version, ',') AS v FROM public.socle_installation")},
  'temoins', (SELECT jsonb_object_agg(version, jsonb_build_array(presents, total)) FROM (
    SELECT version, count(*) FILTER (WHERE CASE type
        WHEN 'table' THEN to_regclass('public.' || nom) IS NOT NULL
        ELSE EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                     WHERE n.nspname = 'public' AND p.proname = nom) END) AS presents,
      count(*) AS total
    FROM t GROUP BY version) s)
) AS sonde;`;
}

/** Lecture d'une sonde : version estimée de la base et versions dont un témoin manque. */
export function lireSonde(sonde) {
  const temoins = sonde?.temoins ?? {};
  const versions = Object.keys(temoins).sort(comparer);
  const completes = versions.filter((v) => temoins[v][0] === temoins[v][1]);
  const manquantes = versions.filter((v) => temoins[v][0] < temoins[v][1]);
  const installees = (sonde?.installation ?? "").split(",").filter(Boolean);
  return {
    reglage: sonde?.reglage ?? null,
    installation: plusHaute(installees),
    estimee: plusHaute(completes),
    manquantes,
  };
}

// --- Code ------------------------------------------------------------------------------------------

/** Version du code d'une installation née d'un Remix : son dernier dossier supabase/seed/vX_Y_Z. */
export function versionDepuisChemins(chemins) {
  const versions = chemins
    .map((c) => /^supabase\/seed\/v(\d+)_(\d+)_(\d+)\//.exec(c))
    .filter(Boolean)
    .map((m) => `${m[1]}.${m[2]}.${m[3]}`);
  return plusHaute(versions);
}

const GREFFE =
  /^(src\/greffe|src\/routes\/\(greffe\)|supabase\/greffe|tests\/greffe|docs\/greffe)\//;
// Le Remix retire supabase/migrations ; .lovable/ porte les notes de la plateforme.
const HORS_COMPARAISON = /^(supabase\/migrations\/|\.lovable\/)/;

/** Fichiers ajoutés par l'installation hors des emplacements de greffe : candidats à remonter. */
export function ajoutsHorsGreffe(cheminsSite, cheminsSocle) {
  const socle = new Set(cheminsSocle);
  return cheminsSite
    .filter((c) => !socle.has(c) && !GREFFE.test(c) && !HORS_COMPARAISON.test(c))
    .sort();
}

/** Même calcul que scripts/verifier-socle.mjs des installations : sha256, fins de ligne ignorées. */
export const empreinteTexte = (texte) =>
  createHash("sha256").update(texte.replace(/\r\n/g, "\n")).digest("hex").slice(0, 16);

/** Copies exactes que le socle a changées depuis la copie notée dans socle.json. */
export function copiesAReprendre(manifeste, empreintesSocle) {
  return Object.entries(manifeste?.fichiers ?? {})
    .filter(([f, e]) => empreintesSocle[f] !== undefined && empreintesSocle[f] !== e)
    .map(([f]) => f)
    .sort();
}

/** Lignes du registre de synchronisation encore ouvertes dans le sens installation → socle. */
export function remonteesOuvertes(synchro) {
  return synchro
    .split("\n")
    .filter((l) => l.startsWith("|"))
    .map((l) => l.split("|").map((c) => c.trim()))
    .filter((c) => c.length > 6 && /^C\d+→S|^⇄/.test(c[5]) && /^(écart|à décider)$/.test(c[4]))
    .map((c) => ({ fonction: c[1], etat: c[4], sens: c[5] }));
}

// --- Écarts ----------------------------------------------------------------------------------------

const JOURS_DORMANCE = 30;

const listeVersions = (vs) => vs.map((v) => `${v.version} (${v.niveau})`).join(", ");

/**
 * Écarts d'une installation. Chaque écart : { sens, constat, action }. sens : « socle en avance »,
 * « base en retard », « site en avance », « dormante ». Une action proposée par écart, jamais faite.
 */
export function ecarts(inst, socle) {
  const sortie = [];
  const code = inst.code_version;
  const base = lireSonde(inst.sonde);
  const porter =
    inst.lien === "copie"
      ? "fonction par fonction (docs/SYNCHRO.md, colonne de l'installation)"
      : "par la fusion du socle (docs/MISE_A_NIVEAU.md)";

  if (!code) {
    sortie.push({
      sens: "à vérifier",
      constat: "Version du code introuvable.",
      action: "Lire à la main la version du socle reçue ; le radar ne mesure rien sans elle.",
    });
  } else if (comparer(code, socle.version) < 0) {
    const vs = versionsEntre(socle.publiees, code, socle.version);
    sortie.push({
      sens: "socle en avance",
      constat: `Code en ${code}, socle en ${socle.version} : ${vs.length} version(s) à porter, ${listeVersions(vs)}.`,
      action: `Porter les versions ${porter}.`,
    });
  } else if (comparer(code, socle.version) > 0) {
    sortie.push({
      sens: "à vérifier",
      constat: `Code en ${code}, plus récent que le socle (${socle.version}).`,
      action: "Vérifier la version déclarée : une installation ne précède pas le socle.",
    });
  }

  if (inst.sonde === null || inst.sonde === undefined) {
    sortie.push({
      sens: "à vérifier",
      constat: "Base non lue.",
      action: "Relancer la sonde sur la base.",
    });
  } else {
    const enregistree = base.reglage ?? base.installation;
    // Une copie porte les fonctions sous ses propres noms : les témoins du socle n'y valent rien.
    const mesure =
      inst.lien === "copie"
        ? "fonctions portées sous d'autres noms, témoins du socle non applicables"
        : `témoins complets jusqu'à ${base.estimee ?? "aucun"}`;
    if (!enregistree) {
      sortie.push({
        sens: "base en retard",
        constat: `Aucune version du socle enregistrée en base (${mesure}).`,
        action:
          "Enregistrer la version en base (réglage « socle » ou équivalent) : sans elle, un retard de la base ne se voit pas.",
      });
    } else if (code && comparer(enregistree, code) < 0) {
      sortie.push({
        sens: "base en retard",
        constat: `Base enregistrée en ${enregistree}, code en ${code}.`,
        action: `Passer les blocs supabase/seed/ des versions ${listeVersions(versionsEntre(socle.publiees, enregistree, code))}.`,
      });
    } else if (code && comparer(enregistree, code) > 0) {
      sortie.push({
        sens: "base en retard",
        constat: `Base enregistrée en ${enregistree}, code publié en ${code} : le code est en retard sur la base.`,
        action: "Publier le code de la même version.",
      });
    }
    const absents =
      code && inst.lien !== "copie" ? base.manquantes.filter((v) => comparer(v, code) <= 0) : [];
    if (absents.length) {
      sortie.push({
        sens: "base en retard",
        constat: `Objets en base absents pour ${absents.join(", ")} (version ≤ code).`,
        action: `Contrôler la base avec les blocs supabase/seed/ de ${absents.join(", ")} (bloc de contrôle d'abord).`,
      });
    }
  }

  const reprendre = copiesAReprendre(inst.manifeste, socle.empreintes);
  if (reprendre.length) {
    sortie.push({
      sens: "socle en avance",
      constat: `${reprendre.length} copie(s) exacte(s) changée(s) dans le socle : ${reprendre.join(", ")}.`,
      action:
        "Dans l'installation : node scripts/verifier-socle.mjs --copier, puis npm run verifier.",
    });
  }

  for (const f of inst.ajouts ?? []) {
    sortie.push({
      sens: "site en avance",
      constat: `Fichier ajouté hors greffe : ${f}.`,
      action:
        "Question : est-il générique (à remonter au socle, docs/REMONTEES.md) ou propre au projet (à ranger dans la greffe) ?",
    });
  }

  if (inst.derniere_modif && code && comparer(code, socle.version) < 0) {
    const jours = Math.floor(
      (Date.parse(socle.date) - Date.parse(inst.derniere_modif)) / 86_400_000,
    );
    if (jours >= JOURS_DORMANCE) {
      sortie.push({
        sens: "dormante",
        constat: `Aucune modification depuis ${jours} jours, en retard sur le socle.`,
        action: "Question : la mettre à niveau, ou l'archiver et la retirer du suivi ?",
      });
    }
  }
  return sortie;
}

/** Rapport en Markdown. Première ligne : « Écarts : N », lue pour décider d'une notification. */
export function rapport(observations, socle) {
  const lignes = [];
  const parInstallation = observations.installations.map((i) => ({ i, e: ecarts(i, socle) }));
  const remontees = socle.remontees ?? [];
  const total = parInstallation.reduce((n, x) => n + x.e.length, 0) + (remontees.length ? 1 : 0);
  lignes.push(`Écarts : ${total}`, "");
  lignes.push(`# Radar des installations du ${socle.date}`, "");
  lignes.push(
    `Socle en ${socle.version}. ${observations.installations.length} installation(s) recensée(s) par leur empreinte.`,
    "",
  );
  lignes.push("| Installation | Lien | Code | Base | Dernière modification | Écarts |");
  lignes.push("| --- | --- | --- | --- | --- | --- |");
  for (const { i, e } of parInstallation) {
    const b = i.sonde ? lireSonde(i.sonde) : null;
    const base = b
      ? (b.reglage ??
        b.installation ??
        (i.lien === "copie" ? "non enregistrée" : `non enregistrée (≈ ${b.estimee ?? "?"})`))
      : "non lue";
    lignes.push(
      `| ${i.nom} | ${i.lien} | ${i.code_version ?? "?"} | ${base} | ${i.derniere_modif ?? "?"} | ${e.length} |`,
    );
  }
  for (const { i, e } of parInstallation) {
    lignes.push("", `## ${i.nom}`, "");
    if (!e.length) {
      lignes.push("Aucun écart.");
      continue;
    }
    lignes.push("| Sens | Constat | Action proposée |", "| --- | --- | --- |");
    for (const x of e) lignes.push(`| ${x.sens} | ${x.constat} | ${x.action} |`);
  }
  if (remontees.length) {
    lignes.push("", "## Remontées ouvertes au registre de synchronisation", "");
    lignes.push(
      "Question pour chacune : la remonter au socle maintenant, la reporter, ou la classer propre au projet ?",
      "",
    );
    lignes.push("| Fonction | État | Sens |", "| --- | --- | --- |");
    for (const r of remontees) lignes.push(`| ${r.fonction} | ${r.etat} | ${r.sens} |`);
  }
  lignes.push("", "Le radar constate et propose. Il n'a rien corrigé.");
  return lignes.join("\n") + "\n";
}

// --- Lecture du dépôt du socle ---------------------------------------------------------------------

function migrationsDuSocle(racine = RACINE) {
  const dossier = join(racine, "supabase", "migrations");
  if (!existsSync(dossier)) return [];
  return readdirSync(dossier)
    .filter((n) => n.endsWith(".sql"))
    .map((nom) => ({ nom, texte: readFileSync(join(dossier, nom), "utf8") }));
}

const git = (...args) => execFileSync("git", ["-C", RACINE, ...args], { encoding: "utf8" }).trim();

/** Fichiers du socle tels que livrés par une version : arbre juste avant la version suivante. */
export function cheminsDeVersion(version, publiees) {
  const suivante = publiees.find((v) => comparer(v.version, version) > 0);
  let commit = "HEAD";
  if (suivante) {
    const dossier = `supabase/seed/v${suivante.version.replaceAll(".", "_")}`;
    const ajout = git("log", "--diff-filter=A", "--format=%H", "--reverse", "--", dossier).split(
      "\n",
    )[0];
    if (ajout) commit = `${ajout}^`;
  }
  return git("ls-tree", "-r", "--name-only", commit).split("\n").filter(Boolean);
}

function empreintesDuSocle() {
  return Object.fromEntries(
    git("ls-files")
      .split("\n")
      .filter((f) => /\.(ts|tsx|js|mjs|json|css|sql|md)$/.test(f))
      .map((f) => [f, empreinteTexte(readFileSync(join(RACINE, f), "utf8"))]),
  );
}

export function etatDuSocle(date) {
  const publiees = versionsPubliees(migrationsDuSocle());
  const guide = readFileSync(join(RACINE, "docs", "MISE_A_NIVEAU.md"), "utf8");
  const version = /Version courante : \*\*(\d+\.\d+\.\d+)\*\*/.exec(guide)?.[1];
  return {
    date,
    version,
    publiees,
    empreintes: empreintesDuSocle(),
    remontees: remonteesOuvertes(readFileSync(join(RACINE, "docs", "SYNCHRO.md"), "utf8")),
  };
}

if (process.argv[1] && import.meta.filename === process.argv[1]) {
  const [action, arg] = process.argv.slice(2);
  if (action === "sonde") {
    console.log(sondeSql(temoinsParVersion(migrationsDuSocle())));
  } else if (action === "chemins" && arg) {
    console.log(cheminsDeVersion(arg, versionsPubliees(migrationsDuSocle())).join("\n"));
  } else if (action === "empreintes") {
    console.log(JSON.stringify(empreintesDuSocle(), null, 2));
  } else if (action === "rapport" && arg) {
    const obs = JSON.parse(readFileSync(arg, "utf8"));
    const socle = etatDuSocle(obs.date ?? new Date().toISOString().slice(0, 10));
    for (const i of obs.installations) {
      if (i.chemins && !i.ajouts && i.code_version) {
        i.ajouts = ajoutsHorsGreffe(i.chemins, cheminsDeVersion(i.code_version, socle.publiees));
      }
    }
    process.stdout.write(rapport(obs, socle));
  } else {
    console.log("Usage : sonde | chemins <version> | empreintes | rapport <observations.json>");
    process.exit(2);
  }
}
