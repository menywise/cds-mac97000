/**
 * Registre de l'application (socle 1.16.0, src/lib/registre.ts).
 * Garde-fou du dépôt : chaque entrée du dossier scripts/ a sa ligne au registre, écrite dans le SQL
 * versionné (`registre_inscrire('script', 'scripts/<nom>', …)`, dans supabase/migrations, les blocs
 * supabase/seed/ ou supabase/greffe/). Aucune base ne voit le dossier scripts/ : ce test le fait.
 * Les modules et tâches planifiées se contrôlent en base (registre_manquants, test de base).
 * Lancer : node --test tests/unit/*.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  ETATS_REGISTRE,
  TYPES_REGISTRE,
  elementsManquants,
  estARevoir,
  inscriptionsSql,
  scriptsAttendus,
  trierRegistre,
  type LigneRegistre,
} from "../../src/lib/registre.ts";

const RACINE = join(import.meta.dirname, "..", "..");

/** Tous les fichiers .sql sous supabase/ (migrations, blocs, greffe). */
function sqlVersionne(dossier = join(RACINE, "supabase")): string[] {
  if (!existsSync(dossier)) return [];
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) return sqlVersionne(chemin);
    return nom.endsWith(".sql") ? [readFileSync(chemin, "utf8")] : [];
  });
}

const INSCRIPTIONS = sqlVersionne().flatMap(inscriptionsSql);

test("chaque entrée de scripts/ a sa ligne au registre", () => {
  const attendus = scriptsAttendus(readdirSync(join(RACINE, "scripts"))).map((identifiant) => ({
    type: "script",
    identifiant,
  }));
  const manquants = elementsManquants(attendus, INSCRIPTIONS).map((m) => m.identifiant);
  assert.deepEqual(
    manquants,
    [],
    `Script sans ligne au registre : ${manquants.join(", ")}. Ajouter dans le SQL versionné ` +
      "SELECT public.registre_inscrire('script', 'scripts/<nom>', '<à quoi>', '<qui>', '<état>', <date>);",
  );
});

test("contre-épreuve : un script ajouté sans ligne est refusé", () => {
  const attendus = scriptsAttendus(["nouveau.mjs", "LISEZMOI.md", ".cache"]).map((identifiant) => ({
    type: "script",
    identifiant,
  }));
  assert.deepEqual(elementsManquants(attendus, INSCRIPTIONS), [
    { type: "script", identifiant: "scripts/nouveau.mjs" },
  ]);
});

test("les listes du code et les contraintes de la base concordent", () => {
  const sql = sqlVersionne().join("\n");
  const liste = (contrainte: string) => {
    const m = new RegExp(`${contrainte} CHECK \\(\\w+ IN \\(([^)]*)\\)`).exec(sql);
    assert.ok(m, `contrainte ${contrainte} introuvable`);
    return [...m[1]!.matchAll(/'([a-z_]+)'/g)].map((x) => x[1]).sort();
  };
  assert.deepEqual(liste("registre_type_check"), [...TYPES_REGISTRE].sort());
  assert.deepEqual(liste("registre_etat_check"), [...ETATS_REGISTRE].sort());
});

test("inscriptionsSql lit type et identifiant, apostrophes comprises", () => {
  assert.deepEqual(
    inscriptionsSql(
      "SELECT public.registre_inscrire('script', 'scripts/a.sh', 'x');\nregistre_inscrire( 'module' , 'l''outil', 'y')",
    ),
    [
      { type: "script", identifiant: "scripts/a.sh" },
      { type: "module", identifiant: "l'outil" },
    ],
  );
});

const ligne = (
  identifiant: string,
  etat: LigneRegistre["etat"],
  a_revoir_le: string | null,
): LigneRegistre => ({
  type: "script",
  identifiant,
  usage: "u",
  utilisateur: "q",
  etat,
  a_revoir_le,
  decision: null,
});

test("à revoir : date atteinte ou dépassée, jamais un abandonné", () => {
  assert.equal(estARevoir(ligne("a", "en_service", "2026-11-11"), "2026-11-11"), true);
  assert.equal(estARevoir(ligne("a", "en_service", "2026-11-12"), "2026-11-11"), false);
  assert.equal(estARevoir(ligne("a", "abandonne", "2026-01-01"), "2026-11-11"), false);
});

test("tri : à revoir en tête (plus ancien d'abord), abandonnés en dernier", () => {
  const tries = trierRegistre(
    [
      ligne("abandonne", "abandonne", null),
      ligne("plus-tard", "en_service", "2027-05-01"),
      ligne("echu-recent", "en_service", "2026-11-01"),
      ligne("echu-ancien", "a_confirmer", "2026-09-01"),
    ],
    "2026-11-11",
  ).map((l) => l.identifiant);
  assert.deepEqual(tries, ["echu-ancien", "echu-recent", "plus-tard", "abandonne"]);
});
