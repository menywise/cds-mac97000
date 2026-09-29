/**
 * CDS — Module D « Paiement » : appels à Stripe côté serveur uniquement.
 * Repris de Goldwing (create-checkout-session, stripe-webhook), sans SDK : l'API REST suffit.
 *
 * Secrets lus dans l'environnement du serveur, jamais en base, jamais dans le code, jamais logués :
 * - STRIPE_SECRET_KEY : clé secrète (sk_test_… ou sk_live_…)
 * - STRIPE_WEBHOOK_SECRET : secret de signature du webhook (whsec_…)
 */

const STRIPE_API = "https://api.stripe.com/v1";
/** Écart maximal accepté entre l'horodatage signé et l'horloge du serveur. */
const SIGNATURE_TOLERANCE_SECONDS = 300;

export function stripeSecretKey() {
  return process.env["STRIPE_SECRET_KEY"] ?? "";
}

export function stripeWebhookSecret() {
  return process.env["STRIPE_WEBHOOK_SECRET"] ?? "";
}

/** Mode du compte déduit de la clé : utile à l'admin, sans jamais montrer la clé. */
export function stripeMode(): "absent" | "test" | "live" {
  const key = stripeSecretKey();
  if (!key) return "absent";
  return key.startsWith("sk_live_") || key.startsWith("rk_live_") ? "live" : "test";
}

export type CheckoutInput = {
  paymentId: string;
  label: string;
  amountCents: number;
  currency: string;
  email: string | null;
  successUrl: string;
  cancelUrl: string;
};

/** Crée une session Stripe Checkout (paiement unique). Le montant vient de la base. */
export async function createCheckoutSession(input: CheckoutInput) {
  const params = new URLSearchParams({
    mode: "payment",
    locale: "fr",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": input.currency,
    "line_items[0][price_data][unit_amount]": String(input.amountCents),
    "line_items[0][price_data][product_data][name]": input.label,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    client_reference_id: input.paymentId,
    "metadata[payment_id]": input.paymentId,
    "payment_intent_data[metadata][payment_id]": input.paymentId,
  });
  if (input.email) params.set("customer_email", input.email);

  const res = await fetch(`${STRIPE_API}/checkout/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
      // Un double clic ne crée pas deux sessions pour la même tentative.
      "Idempotency-Key": `cds-checkout-${input.paymentId}`,
    },
    body: params.toString(),
  });
  if (!res.ok) return null;
  const session = (await res.json()) as { id?: string; url?: string };
  return session.id && session.url ? { id: session.id, url: session.url } : null;
}

function toHex(buf: ArrayBuffer) {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Vérifie l'en-tête `Stripe-Signature` (HMAC SHA-256 de « horodatage.corps »). */
export async function verifyStripeSignature(
  payload: string,
  header: string,
  secret: string,
  nowSeconds = Date.now() / 1000,
) {
  let timestamp = "";
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const [k, v] = part.trim().split("=", 2);
    if (k === "t") timestamp = v ?? "";
    else if (k === "v1" && v) signatures.push(v);
  }
  const ts = Number(timestamp);
  if (!timestamp || !Number.isFinite(ts) || signatures.length === 0) return false;
  if (Math.abs(nowSeconds - ts) > SIGNATURE_TOLERANCE_SECONDS) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${payload}`),
  );
  const expected = toHex(sig);
  return signatures.some((s) => safeEqual(s, expected));
}
