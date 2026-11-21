/**
 * Co-intervenants IA (socle 1.17.0, src/lib/agents.ts) : règles pures d'une clé.
 * Lancer : node --test tests/unit/*.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  NIVEAUX_AGENT,
  cleUtilisable,
  genererCle,
  hacherCle,
  jourParis,
  niveauSuffit,
  trierCles,
} from "../../src/lib/agents.ts";

test("une clé sert si elle est active et si son dernier jour n'est pas passé (heure de Paris)", () => {
  const soir = new Date("2026-11-21T22:30:00Z"); // 23 h 30 à Paris, encore le 21
  assert.equal(cleUtilisable({ actif: true, expire_le: "2026-11-21" }, soir), true);
  assert.equal(cleUtilisable({ actif: true, expire_le: "2026-11-20" }, soir), false);
  assert.equal(cleUtilisable({ actif: false, expire_le: "2026-12-31" }, soir), false);
  assert.equal(cleUtilisable({ actif: true, expire_le: null }, soir), false);
  const nuit = new Date("2026-11-21T23:30:00Z"); // 0 h 30 à Paris, déjà le 22
  assert.equal(jourParis(nuit), "2026-11-22");
  assert.equal(cleUtilisable({ actif: true, expire_le: "2026-11-21" }, nuit), false);
});

test("les niveaux s'emboîtent : corriger fait tout, lecture ne fait que lire", () => {
  assert.deepEqual([...NIVEAUX_AGENT], ["lecture", "completer", "corriger"]);
  assert.equal(niveauSuffit("corriger", "completer"), true);
  assert.equal(niveauSuffit("completer", "completer"), true);
  assert.equal(niveauSuffit("completer", "corriger"), false);
  assert.equal(niveauSuffit("lecture", "completer"), false);
});

test("les clés utilisables passent en tête, puis l'ordre des noms", () => {
  const maintenant = new Date("2026-11-21T12:00:00Z");
  const cles = [
    {
      nom: "Zoé",
      niveau: "lecture",
      actif: true,
      usage: null,
      utilisateur: null,
      expire_le: "2026-12-31",
      last_used_at: null,
    },
    {
      nom: "Alpha",
      niveau: "lecture",
      actif: false,
      usage: null,
      utilisateur: null,
      expire_le: "2026-12-31",
      last_used_at: null,
    },
    {
      nom: "Émile",
      niveau: "lecture",
      actif: true,
      usage: null,
      utilisateur: null,
      expire_le: "2026-12-31",
      last_used_at: null,
    },
  ] as const;
  assert.deepEqual(
    trierCles(cles, maintenant).map((c) => c.nom),
    ["Émile", "Zoé", "Alpha"],
  );
});

test("une clé neuve fait 43 caractères sûrs pour une adresse, son empreinte 64 hexadécimaux", async () => {
  const cle = genererCle((n) => new Uint8Array(n).map((_, i) => (i * 37) % 256));
  assert.equal(cle.length, 43);
  assert.match(cle, /^[A-Za-z0-9_-]+$/);
  const empreinte = await hacherCle("abc");
  assert.equal(empreinte, "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  assert.notEqual(await hacherCle(genererCle()), await hacherCle(genererCle()));
});
