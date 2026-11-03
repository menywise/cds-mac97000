/**
 * Socle 1.15.0 : calendrier et santé du contenu.
 * Lancer : node --test tests/unit/*.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { calendrier, lundiDe, santeContenu } from "../../src/lib/pilotage.ts";
import { lireReglages } from "../../src/lib/editorial-regles.ts";

test("lundi de la semaine", () => {
  assert.equal(lundiDe("2026-11-03"), "2026-11-02");
  assert.equal(lundiDe("2026-11-08"), "2026-11-02");
  assert.equal(lundiDe("2026-11-09"), "2026-11-09");
});

test("calendrier : publication d'abord, puis date prévue ; sans date, absent", () => {
  const semaines = calendrier([
    {
      id: "a",
      titre: "B",
      statut_lu: "publie",
      publie_le: "2026-11-04T08:00:00Z",
      date_prevue: "2026-12-01",
    },
    { id: "b", titre: "A", statut_lu: "redaction", publie_le: null, date_prevue: "2026-11-03" },
    { id: "c", titre: "C", statut_lu: "idee", publie_le: null, date_prevue: null },
  ]);
  assert.deepEqual(
    semaines.map((s) => [s.semaine, s.elements.map((e) => e.id)]),
    [["2026-11-02", ["b", "a"]]],
  );
});

test("santé : un nombre par point de vigilance", () => {
  const s = santeContenu(
    [
      { id: "a", statut_lu: "publie", date_prevue: null, sources_mortes: 1 },
      { id: "b", statut_lu: "a_actualiser", date_prevue: null, sources_mortes: 0 },
      { id: "c", statut_lu: "redaction", date_prevue: "2026-10-01", sources_mortes: 0 },
      { id: "d", statut_lu: "programme", date_prevue: "2026-10-01", sources_mortes: 0 },
    ],
    [
      { id: "a", orphelin: true, liens_casses: [], requete_en_double: ["X"] },
      { id: "b", orphelin: false, liens_casses: ["/blog/x"], requete_en_double: [] },
    ],
    4,
    "2026-11-03",
  );
  assert.deepEqual(s, {
    enLigne: 2,
    relecturesDues: 1,
    enRetard: 1,
    orphelins: 1,
    liensCasses: 1,
    sourcesInjoignables: 1,
    requetesEnDouble: 1,
    recherchesSansResultat: 4,
  });
});

test("appel à l'action par défaut : identifiant valide seulement", () => {
  assert.equal(lireReglages({ appel_action_defaut: "x" }).appel_action_defaut, "");
  const id = "00000000-0000-0000-0000-0000000000e1";
  assert.equal(lireReglages({ appel_action_defaut: id }).appel_action_defaut, id);
});
