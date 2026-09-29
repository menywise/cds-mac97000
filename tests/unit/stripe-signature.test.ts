/**
 * Vérification de la signature du webhook Stripe.
 * Lancer : node --test tests/unit/*.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifyStripeSignature } from "../../src/lib/stripe.server.ts";

const secret = "whsec_test_recette";
const payload = JSON.stringify({
  type: "checkout.session.completed",
  data: { object: { id: "cs_1" } },
});
const now = 1_790_000_000;
const sign = (t: number, body = payload, key = secret) =>
  createHmac("sha256", key).update(`${t}.${body}`).digest("hex");

test("signature valide acceptée", async () => {
  assert.equal(await verifyStripeSignature(payload, `t=${now},v1=${sign(now)}`, secret, now), true);
});

test("plusieurs signatures (rotation du secret) : une seule valide suffit", async () => {
  const header = `t=${now},v1=${sign(now, payload, "whsec_ancien")},v1=${sign(now)}`;
  assert.equal(await verifyStripeSignature(payload, header, secret, now), true);
});

test("corps modifié refusé", async () => {
  const header = `t=${now},v1=${sign(now)}`;
  assert.equal(
    await verifyStripeSignature(payload.replace("cs_1", "cs_2"), header, secret, now),
    false,
  );
});

test("mauvais secret refusé", async () => {
  const header = `t=${now},v1=${sign(now, payload, "whsec_pirate")}`;
  assert.equal(await verifyStripeSignature(payload, header, secret, now), false);
});

test("horodatage trop ancien refusé (rejeu)", async () => {
  const old = now - 301;
  assert.equal(
    await verifyStripeSignature(payload, `t=${old},v1=${sign(old)}`, secret, now),
    false,
  );
});

test("en-tête incomplet refusé", async () => {
  assert.equal(await verifyStripeSignature(payload, `v1=${sign(now)}`, secret, now), false);
  assert.equal(await verifyStripeSignature(payload, `t=${now}`, secret, now), false);
  assert.equal(await verifyStripeSignature(payload, "", secret, now), false);
});
