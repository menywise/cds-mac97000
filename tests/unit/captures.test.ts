/**
 * Capture d'écran jointe à un signalement (socle 1.19.0, src/lib/captures.ts) : nom du fichier,
 * types et tailles admis, réduction des dimensions. Mêmes bornes que la migration 1.19.0.
 * Lancer : node --test tests/unit/*.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CAPTURE_DELAI_MINUTES,
  CAPTURE_DOSSIER,
  CAPTURE_TAILLE_MAX,
  CAPTURE_TYPES,
  cheminCapture,
  codeDeCapture,
  dimensionsReduites,
  refusCapture,
  tailleLisible,
} from "../../src/lib/captures.ts";

const MIGRATION = readFileSync(
  join(
    import.meta.dirname,
    "..",
    "..",
    "supabase",
    "migrations",
    "20261121120000_v1_19_0_captures_signalements.sql",
  ),
  "utf8",
);

test("le nom du fichier suit le code de suivi, et seulement lui", () => {
  assert.equal(cheminCapture("0A1B2C3D4E"), "0A1B2C3D4E/capture");
  assert.equal(cheminCapture("0a1b2c3d4e"), null);
  assert.equal(cheminCapture("0A1B2C3D4"), null);
  assert.equal(cheminCapture("../0A1B2C3D"), null);
  assert.equal(codeDeCapture("0A1B2C3D4E/capture"), "0A1B2C3D4E");
  assert.equal(codeDeCapture("0A1B2C3D4E/autre"), null);
  assert.equal(codeDeCapture("0A1B2C3D4E/capture/x"), null);
  // Installation dont les signalements portent un UUID (depuis le 22/11/2026).
  const id = "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c";
  assert.equal(cheminCapture(id), `${id}/capture`);
  assert.equal(codeDeCapture(`${id}/capture`), id);
  assert.equal(cheminCapture(id.toUpperCase()), null);
  assert.equal(cheminCapture(`${id}x`), null);
});

test("types et tailles admis", () => {
  assert.equal(refusCapture({ type: "image/png", size: 500_000 }), null);
  assert.equal(refusCapture({ type: "image/webp", size: 1 }), null);
  assert.match(refusCapture({ type: "image/svg+xml", size: 100 }) ?? "", /PNG, JPEG ou WebP/);
  assert.match(refusCapture({ type: "application/pdf", size: 100 }) ?? "", /PNG/);
  assert.match(refusCapture({ type: "image/png", size: 16 * 1024 * 1024 }) ?? "", /15 Mo/);
  assert.match(refusCapture({ type: "image/png", size: 0 }) ?? "", /vide/);
});

test("le plus grand côté est ramené à 2000 pixels, proportions gardées", () => {
  assert.deepEqual(dimensionsReduites(1280, 720), { largeur: 1280, hauteur: 720 });
  assert.deepEqual(dimensionsReduites(4000, 2000), { largeur: 2000, hauteur: 1000 });
  assert.deepEqual(dimensionsReduites(1170, 2532), { largeur: 924, hauteur: 2000 });
});

test("taille lisible", () => {
  assert.equal(tailleLisible(850 * 1024), "850 Ko");
  assert.equal(tailleLisible(1.4 * 1024 * 1024), "1,4 Mo");
});

test("mêmes bornes que la base", () => {
  assert.match(
    MIGRATION,
    new RegExp(`'${CAPTURE_DOSSIER}', '${CAPTURE_DOSSIER}', false, ${CAPTURE_TAILLE_MAX}`),
  );
  assert.match(
    MIGRATION,
    new RegExp(`ARRAY\\[${CAPTURE_TYPES.map((t) => `'${t}'`).join(", ")}\\]`),
  );
  assert.match(MIGRATION, new RegExp(`interval '${CAPTURE_DELAI_MINUTES} minutes'`));
});
