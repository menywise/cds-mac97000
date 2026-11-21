/**
 * Tables (socle 1.18.0, src/lib/tables.ts) : conversions texte ↔ base, lecture d'un CSV,
 * préparation d'un import. Lancer : node --test tests/unit/*.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clePrimaire,
  colonnesSaisies,
  depuisTexte,
  filtreRecherche,
  lignesExport,
  lireCsv,
  preparerImport,
  versTexte,
  type ColonneCatalogue,
  type TableCatalogue,
} from "../../src/lib/tables.ts";

const col = (
  nom: string,
  type: string,
  extra: Partial<ColonneCatalogue> = {},
): ColonneCatalogue => ({
  nom,
  type,
  nullable: true,
  defaut: null,
  cle_primaire: false,
  reference: null,
  enum: null,
  commentaire: null,
  ...extra,
});
const TABLE: TableCatalogue = {
  nom: "essai",
  commentaire: null,
  lignes_environ: 0,
  rls: true,
  colonnes: [
    col("id", "uuid", { cle_primaire: true, defaut: "gen_random_uuid()", nullable: false }),
    col("nom", "text", { nullable: false }),
    col("actif", "boolean"),
    col("ordre", "integer"),
    col("prix", "numeric(10,2)"),
    col("etat", "text", { enum: ["brouillon", "publie"] }),
    col("options", "jsonb"),
    col("mots", "text[]"),
    col("le", "date"),
    col("created_at", "timestamp with time zone", { defaut: "now()" }),
  ],
};

test("la fiche propose les colonnes saisies, pas la clé automatique ni les dates de la base", () => {
  assert.deepEqual(
    colonnesSaisies(TABLE).map((c) => c.nom),
    ["nom", "actif", "ordre", "prix", "etat", "options", "mots", "le"],
  );
  assert.equal(clePrimaire(TABLE), "id");
});

test("texte → valeur : chaque famille convertit, et refuse avec un message lisible", () => {
  const c = (n: string) => TABLE.colonnes.find((x) => x.nom === n)!;
  assert.deepEqual(depuisTexte("oui", c("actif")), { ok: true, valeur: true });
  assert.deepEqual(depuisTexte("12", c("ordre")), { ok: true, valeur: 12 });
  assert.equal(depuisTexte("douze", c("ordre")).ok, false);
  assert.deepEqual(depuisTexte("3,50", c("prix")), { ok: true, valeur: 3.5 });
  assert.deepEqual(depuisTexte("publie", c("etat")), { ok: true, valeur: "publie" });
  assert.equal(depuisTexte("archive", c("etat")).ok, false);
  assert.deepEqual(depuisTexte('{"a":1}', c("options")), { ok: true, valeur: { a: 1 } });
  assert.deepEqual(depuisTexte("a, b", c("mots")), { ok: true, valeur: ["a", "b"] });
  assert.deepEqual(depuisTexte('["x"]', c("mots")), { ok: true, valeur: ["x"] });
  assert.deepEqual(depuisTexte("2026-11-21", c("le")), { ok: true, valeur: "2026-11-21" });
  assert.equal(depuisTexte("21/11/2026", c("le")).ok, false);
  assert.deepEqual(depuisTexte("", c("actif")), { ok: true, valeur: null });
  assert.equal(depuisTexte("", c("nom")).ok, false);
  assert.equal(versTexte({ a: 1 }, c("options")), '{"a":1}');
  assert.equal(versTexte(null, c("nom")), "");
});

test("lireCsv : séparateur deviné, guillemets, saut de ligne entre guillemets, lignes vides ignorées", () => {
  const csv = lireCsv(
    'nom;actif;"options"\n"Dupont; Jean";oui;"{""a"":1}"\n\n"Deux\nlignes";non;\n',
  );
  assert.deepEqual(csv.entetes, ["nom", "actif", "options"]);
  assert.deepEqual(csv.lignes, [
    ["Dupont; Jean", "oui", '{"a":1}'],
    ["Deux\nlignes", "non", ""],
  ]);
  assert.deepEqual(lireCsv("a,b\n1,2").lignes, [["1", "2"]]);
});

test("preparerImport : lignes converties, erreurs numérotées, colonnes inconnues signalées", () => {
  const prep = preparerImport(lireCsv("nom;ordre;inconnue\nA;1;x\nB;un;y\n;3;z"), TABLE);
  assert.deepEqual(prep.colonnesInconnues, ["inconnue"]);
  assert.deepEqual(prep.colonnesLues, ["nom", "ordre"]);
  assert.deepEqual(prep.lignes, [{ nom: "A", ordre: 1 }]);
  assert.deepEqual(
    prep.erreurs.map((e) => e.ligne),
    [3, 4],
  );
});

test("export et recherche", () => {
  assert.deepEqual(lignesExport([{ nom: "A", actif: true }], TABLE)[0]!["actif"], "true");
  assert.equal(filtreRecherche(TABLE, "du(pont)"), "nom.ilike.*du pont*,etat.ilike.*du pont*");
  assert.equal(filtreRecherche(TABLE, "  "), null);
});
