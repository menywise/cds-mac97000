import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Adresse publique du site : celle saisie en admin, sinon celle de la requête. */
async function siteOrigin() {
  const { loadSiteConfig } = await import("@/lib/site-config.functions");
  const site = await loadSiteConfig().catch(() => null);
  if (site?.brand.url && /^https?:\/\//.test(site.brand.url)) return site.brand.url;
  return new URL(getRequest().url).origin;
}

/**
 * Démarre le paiement d'une formation : contrôles en base (module allumé, formation publiée et
 * payante, pas déjà réglée, renonciation cochée), puis session Stripe Checkout.
 * Renvoie l'adresse de la page de paiement Stripe.
 */
export const startCourseCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { courseId: string; waiver: boolean }) => {
    if (!UUID.test(String(input?.courseId ?? ""))) throw new Error("Formation inconnue.");
    return { courseId: String(input.courseId), waiver: input?.waiver === true };
  })
  .handler(async ({ data, context }) => {
    const { stripeSecretKey, createCheckoutSession, expireCheckoutSession } =
      await import("@/lib/stripe.server");
    if (!stripeSecretKey()) throw new Error("Le paiement en ligne n'est pas encore configuré.");
    if (!data.waiver) throw new Error("Cochez la renonciation au droit de rétractation.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.rpc("payment_start_course", {
      _user_id: context.userId,
      _course_id: data.courseId,
      _waiver: data.waiver,
    });
    const payment = rows?.[0];
    if (error || !payment) throw new Error(error?.message ?? "Paiement impossible.");

    // Tentatives précédentes (autre onglet, nouvel essai) : leurs sessions Stripe sont fermées
    // avant d'en ouvrir une nouvelle, pour qu'un membre ne puisse jamais payer deux fois.
    for (const old of payment.superseded_sessions ?? []) {
      if ((await expireCheckoutSession(old)) === "paid") {
        await supabaseAdmin.from("payments").update({ status: "failed" }).eq("id", payment.id);
        throw new Error(
          "Votre paiement précédent vient d'être reçu : l'accès s'ouvre dans un instant.",
        );
      }
    }

    const origin = await siteOrigin();
    const back = `${origin}/formation/${encodeURIComponent(payment.course_slug)}`;
    const email = typeof context.claims.email === "string" ? context.claims.email : null;
    const session = await createCheckoutSession({
      paymentId: payment.id,
      label: payment.product_label,
      amountCents: payment.amount_cents,
      currency: payment.currency,
      email,
      successUrl: `${back}?paiement=reussi`,
      cancelUrl: `${back}?paiement=annule`,
    });
    if (!session) {
      await supabaseAdmin.from("payments").update({ status: "failed" }).eq("id", payment.id);
      throw new Error("Stripe n'a pas pu ouvrir la page de paiement. Réessayez dans un instant.");
    }
    await supabaseAdmin.rpc("payment_attach_session", {
      _payment_id: payment.id,
      _session_id: session.id,
    });
    return { url: session.url };
  });

/** État de la configuration Stripe pour l'admin (jamais la clé elle-même). */
export const paymentsConfigStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Réservé aux administrateurs.");
    const { stripeMode, stripeWebhookSecret } = await import("@/lib/stripe.server");
    return { mode: stripeMode(), webhook: Boolean(stripeWebhookSecret()) };
  });
