/**
 * CDS — Recette automatisée (lot 7).
 *
 * Ouvre toutes les pages de `src/lib/qa-plan.ts` en visiteur, membre et admin, sur ordinateur
 * et sur mobile. Échec si : page blanche, erreur console ou JavaScript, erreur serveur (5xx),
 * débordement horizontal, pas de titre h1, page d'un module éteint encore accessible,
 * page protégée ouverte à un visiteur.
 *
 * Lecture seule : le robot ne clique sur rien et bloque toute écriture vers la base.
 *
 * Utilisation (Node 22, Chromium installé) :
 *   npm i --no-save playwright            # hors bun.lock
 *   npx vite dev --port 8080 &            # ou une adresse publiée
 *   node tests/e2e/recette.ts [--url http://localhost:8080] [--only /blog] [--roles visiteur,admin]
 *
 * Comptes (facultatifs) : CDS_RECETTE_MEMBRE_EMAIL / CDS_RECETTE_MEMBRE_MDP,
 * CDS_RECETTE_ADMIN_EMAIL / CDS_RECETTE_ADMIN_MDP. Sans compte, le rôle est « simulé » :
 * session et réponses de la base imitées dans le navigateur (données vides), ce qui vérifie
 * que chaque écran tient debout, pas le contenu réel.
 *
 * Rapport : tests/e2e/rapport/recette.json (à importer dans /admin/recettage) et recette.md.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  chromium,
  firefox,
  webkit,
  type Browser,
  type BrowserContext,
  type Page,
} from "playwright";
import {
  QA_PAGES,
  QA_VIEWPORTS,
  type QaPage,
  type QaReport,
  type QaResult,
  type QaRole,
  type QaViewport,
} from "../../src/lib/qa-plan.ts";
import { isModuleOn, normalizeModules, type FeatureKey } from "../../src/config/modules.ts";
import { auditTexts, type PageTexts, type TextRules } from "./texte.ts";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
/** Outils de test facultatifs (npm i --no-save axe-core html-validate) : absents = contrôle non évalué. */
function optional(name: string): string | null {
  try {
    return require.resolve(name);
  } catch {
    return null;
  }
}
const AXE = optional("axe-core/axe.min.js");
const HTML_VALIDATE = optional("html-validate");

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const args = process.argv.slice(2);
const arg = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

// Variables d'environnement : .env du projet (adresse et clé publique Supabase) puis environnement.
function loadEnv() {
  const env: Record<string, string> = {};
  const file = join(ROOT, ".env");
  if (existsSync(file)) {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/.exec(line);
      if (m) env[m[1]!] = m[2]!;
    }
  }
  return { ...env, ...process.env } as Record<string, string | undefined>;
}
const ENV = loadEnv();
/** Charte de rédaction contrôlable (docs/redaction/text-rules.json). */
const TEXT_RULES = JSON.parse(
  readFileSync(join(ROOT, "docs", "redaction", "text-rules.json"), "utf8"),
) as TextRules;
/** Nom du site (marque) : protégé, ce n'est pas du vocabulaire interne. */
let BRAND_NAMES: string[] = [];
const BASE = (arg("url") ?? ENV["CDS_RECETTE_URL"] ?? "http://localhost:8080").replace(/\/+$/, "");
const SUPABASE_URL = ENV["VITE_SUPABASE_URL"] ?? ENV["SUPABASE_URL"] ?? "";
const SUPABASE_KEY = ENV["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? ENV["SUPABASE_PUBLISHABLE_KEY"] ?? "";
const PROJECT_REF = /^https:\/\/([^.]+)\./.exec(SUPABASE_URL)?.[1] ?? "";
const ONLY = arg("only");
/** Moteur de rendu : chromium (défaut), firefox ou webkit (Safari). */
const NAVIGATEUR = (arg("navigateur") ?? "chromium") as "chromium" | "firefox" | "webkit";
const ROLES = (arg("roles") ?? "visiteur,membre,admin").split(",") as QaRole[];
const RANK: Record<QaRole, number> = { visiteur: 0, membre: 1, admin: 2 };
/** Liens internes rencontrés (adresse → première page où il apparaît), vérifiés en fin de passage. */
const LINKS = new Map<string, string>();
/** Titres et descriptions des pages publiques, comparés en fin de passage (doublons). */
const META: Array<{ url: string; title: string; description: string }> = [];

/** Même rendu que formatPrice (src/lib/format.ts), espaces normalisées. */
function formatPrice(cents: number, currency = "EUR") {
  if (!cents) return "Gratuit";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  })
    .format(cents / 100)
    .replace(/\s+/g, " ");
}

async function pricingPlans(): Promise<
  Array<{ name: string; price_cents: number; currency: string }>
> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/pricing_plans?select=name,price_cents,currency`,
    {
      headers: { apikey: SUPABASE_KEY },
    },
  ).catch(() => null);
  return ((await res?.json().catch(() => [])) ?? []) as Array<{
    name: string;
    price_cents: number;
    currency: string;
  }>;
}

/** Résultat de contrôle transversal (liens, plan du site, doublons, en-têtes). */
function transversal(label: string, problems: string[], warnings: string[] = []): QaResult {
  return {
    path: `(${label})`,
    url: label,
    label,
    role: "visiteur",
    viewport: "ordinateur",
    status: problems.length ? "echec" : "ok",
    problems,
    warnings,
    ms: 0,
  };
}

/** Fonctions de la base qui ne font que lire : les seules permises au robot. */
const READ_ONLY_RPC = new Set([
  "has_role",
  "module_enabled",
  "module_defaults",
  "lms_lesson_content",
  "admin_list_users",
  "can_access_lesson",
]);

type Auth = { mode: "réel" | "simulé"; session: Record<string, unknown>; userId: string };

async function brandNames(): Promise<string[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/site_settings?select=value&key=eq.brand`, {
    headers: { apikey: SUPABASE_KEY },
  }).catch(() => null);
  const rows = ((await res?.json().catch(() => [])) ?? []) as Array<{
    value: Record<string, unknown>;
  }>;
  const v = rows[0]?.value ?? {};
  return [v["name"], v["shortName"]].filter(
    (x): x is string => typeof x === "string" && x.length > 0,
  );
}

async function modulesState(): Promise<Record<string, boolean>> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/site_settings?select=value&key=eq.modules`, {
    headers: { apikey: SUPABASE_KEY },
  });
  const rows = (await res.json()) as Array<{ value: Record<string, boolean> }>;
  return rows[0]?.value ?? {};
}

/** Même règle que le site : valeurs par défaut pour les clés absentes, dépendances respectées. */
function moduleOn(states: Record<string, boolean>, key: string): boolean {
  return isModuleOn(normalizeModules(states), key as FeatureKey);
}

function fakeJwt(sub: string, email: string) {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub, email, role: "authenticated", aud: "authenticated", exp })}.simule`;
}

async function signIn(role: "membre" | "admin"): Promise<Auth> {
  const email = ENV[`CDS_RECETTE_${role.toUpperCase()}_EMAIL`];
  const password = ENV[`CDS_RECETTE_${role.toUpperCase()}_MDP`];
  if (email && password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error(`Connexion ${role} refusée (${res.status})`);
    const session = (await res.json()) as Record<string, unknown> & { user: { id: string } };
    return { mode: "réel", session, userId: session.user.id };
  }
  const userId =
    role === "admin"
      ? "00000000-0000-4000-8000-0000000000ad"
      : "00000000-0000-4000-8000-0000000000ae";
  const mail = `${role}@recette.invalid`;
  const user = {
    id: userId,
    aud: "authenticated",
    role: "authenticated",
    email: mail,
    email_confirmed_at: new Date().toISOString(),
    app_metadata: { provider: "email" },
    user_metadata: { full_name: `Recette ${role}` },
    created_at: new Date().toISOString(),
  };
  const session = {
    access_token: fakeJwt(userId, mail),
    refresh_token: "recette",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user,
  };
  return { mode: "simulé", session, userId };
}

/** Garde-fous réseau : jamais d'écriture ; en mode simulé, la base est imitée. */
async function guardNetwork(context: BrowserContext, role: QaRole, auth: Auth | null) {
  if (!SUPABASE_URL) return;
  await context.route(`${SUPABASE_URL}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    const rpc = /\/rest\/v1\/rpc\/([^/?]+)/.exec(url.pathname)?.[1];

    if (auth?.mode === "simulé") {
      if (url.pathname.startsWith("/auth/v1/user")) {
        return route.fulfill({ json: auth.session["user"] });
      }
      if (url.pathname.startsWith("/auth/v1/token")) return route.fulfill({ json: auth.session });
      if (url.pathname.startsWith("/auth/v1/logout")) return route.fulfill({ status: 204 });
      if (rpc === "has_role") return route.fulfill({ json: role === "admin" });
      if (url.pathname.startsWith("/rest/v1/") && (method === "GET" || method === "HEAD" || rpc)) {
        const single = (req.headers()["accept"] ?? "").includes("vnd.pgrst.object");
        if (single) {
          return route.fulfill({
            status: 406,
            json: {
              code: "PGRST116",
              message: "Aucune ligne (recette simulée)",
              details: null,
              hint: null,
            },
          });
        }
        return route.fulfill({ json: [], headers: { "content-range": "*/0" } });
      }
      if (url.pathname.startsWith("/storage/v1/")) return route.fulfill({ json: [] });
    }

    const write = method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
    const allowed =
      url.pathname.startsWith("/auth/v1/token") || (rpc !== undefined && READ_ONLY_RPC.has(rpc));
    if (write && !allowed) {
      // Écriture bloquée (compteur de vues, profil…) : réponse vide, la page continue.
      return route.fulfill({ status: 200, json: rpc ? null : [] });
    }
    return route.continue();
  });
}

async function newContext(browser: Browser, viewport: QaViewport, role: QaRole, auth: Auth | null) {
  const context = await browser.newContext({
    viewport: QA_VIEWPORTS[viewport],
    // Firefox ne gère pas l'émulation mobile : la largeur d'écran suffit à tester la mise en page.
    ...(NAVIGATEUR === "firefox" ? {} : { isMobile: viewport === "mobile" }),
    hasTouch: viewport === "mobile",
    locale: "fr-FR",
  });
  // Bandeau cookies déjà réglé : il ne masque pas la page.
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem("cds.cookie-consent", "refused");
    } catch {
      /* stockage indisponible */
    }
  });
  if (auth && PROJECT_REF) {
    await context.addInitScript(
      ([key, value]) => {
        window.localStorage.setItem(key!, value!);
      },
      [`sb-${PROJECT_REF}-auth-token`, JSON.stringify(auth.session)],
    );
  }
  await guardNetwork(context, role, auth);
  return context;
}

/** Remplace les « :param » par une vraie adresse trouvée sur la page source. */
async function discover(page: Page, qa: QaPage, resolved: Map<string, string>) {
  if (!qa.discover) return qa.path;
  const known = resolved.get(qa.path);
  if (known) return known;
  const from = qa.discover.from.includes(":") ? resolved.get(qa.discover.from) : qa.discover.from;
  if (!from) return null;
  await page.goto(BASE + from, { waitUntil: "networkidle", timeout: 30000 }).catch(() => null);
  const hrefs = await page.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href") ?? ""));
  const re = new RegExp(qa.discover.match);
  const hit = hrefs.map((h) => h.split("#")[0]!.split("?")[0]!).find((h) => re.test(h));
  if (hit) resolved.set(qa.path, hit);
  return hit ?? null;
}

let htmlValidator: {
  validateString: (
    s: string,
  ) => Promise<{ results: Array<{ messages: Array<{ ruleId: string; severity: number }> }> }>;
} | null = null;
async function validateHtml(html: string): Promise<string[]> {
  if (!htmlValidator) {
    const mod = (await import(HTML_VALIDATE!)) as {
      HtmlValidate: new (c: unknown) => typeof htmlValidator;
    };
    htmlValidator = new mod.HtmlValidate({
      extends: ["html-validate:standard"],
      // Attributs posés par les outils de développement (data-tsd-source) : tolérés.
      rules: { "no-unknown-elements": "off" },
    });
  }
  const report = await htmlValidator!.validateString(html);
  return report.results.flatMap((r) =>
    r.messages.filter((m) => m.severity === 2).map((m) => m.ruleId),
  );
}

async function checkPage(
  page: Page,
  qa: QaPage,
  url: string,
  role: QaRole,
  viewport: QaViewport,
  states: Record<string, boolean>,
  simulated: boolean,
): Promise<QaResult> {
  const started = Date.now();
  const problems: string[] = [];
  const warnings: string[] = [];
  let textAudit: QaResult["texte"];
  const consoleErrors: string[] = [];
  const onConsole = (msg: import("playwright").ConsoleMessage) => {
    if (msg.type() !== "error") return;
    const loc = msg.location().url ?? "";
    // En mode simulé, les réponses 406 imitées de la base ne sont pas des défauts.
    if (simulated && SUPABASE_URL && loc.startsWith(SUPABASE_URL)) return;
    if (simulated && /status of 406/.test(msg.text())) return;
    // Page introuvable attendue : le navigateur signale la réponse 404 du document lui-même.
    if (qa.expectStatus === 404 && /status of 404/.test(msg.text()) && loc.startsWith(BASE + url))
      return;
    consoleErrors.push(msg.text().slice(0, 300));
  };
  const onPageError = (err: Error) => consoleErrors.push(`JS : ${err.message.slice(0, 300)}`);
  const failed: string[] = [];
  const onResponse = (res: import("playwright").Response) => {
    if (res.status() >= 500) failed.push(`${res.status()} ${res.url().slice(0, 160)}`);
  };
  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("response", onResponse);

  const moduleOff = qa.module !== undefined && !moduleOn(states, qa.module);
  const needsLogin = RANK[qa.role] > RANK[role];
  let status = 0;
  try {
    if (qa.raw) {
      // Fichier brut (XML, manifeste) : Firefox le télécharge au lieu de l'afficher,
      // on lit donc la réponse HTTP directement.
      status = (await page.request.get(BASE + url, { timeout: 45000 })).status();
    } else {
      const res = await page.goto(BASE + url, { waitUntil: "networkidle", timeout: 45000 });
      status = res?.status() ?? 0;
      // Laisse le temps aux écrans rendus dans le navigateur (espace membre, admin).
      await page.waitForTimeout(800);
    }
  } catch (err) {
    problems.push(`chargement impossible : ${(err as Error).message.split("\n")[0]}`);
  }

  const finalPath = new URL(page.url()).pathname;
  if (qa.raw) {
    if (status !== 200 && !(moduleOff && status < 400)) problems.push(`réponse ${status}`);
  } else if (moduleOff) {
    // Éteint : retour à l'accueil (ou à la connexion d'abord, pour une page protégée).
    const ok = finalPath === "/" || (needsLogin && finalPath.startsWith("/login"));
    if (!ok) problems.push(`module « ${qa.module} » éteint mais page accessible (${finalPath})`);
  } else if (needsLogin) {
    if (qa.role === "membre" || role === "visiteur") {
      if (!finalPath.startsWith("/login"))
        problems.push(`page protégée ouverte sans connexion (${finalPath})`);
    } else {
      const denied = await page.getByText("Accès réservé").count();
      if (!denied) problems.push("écran admin sans message « Accès réservé » pour un membre");
    }
  } else {
    const expected = qa.expectStatus ?? 200;
    if (status >= 500) problems.push(`erreur serveur ${status}`);
    else if (expected === 404 && status !== 404)
      warnings.push(`page introuvable servie en ${status}`);
    else if (expected === 404 && status === 404) {
      /* attendu */
    } else if (expected === 200 && status >= 400) problems.push(`réponse ${status}`);
    if (!problems.length) {
      const facts = await page.evaluate(() => {
        const visible = (el: Element) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
        };
        // Cibles tactiles : boutons et champs (les liens dans un paragraphe sont exclus).
        const small = [
          ...document.querySelectorAll("button, [role=button], input:not([type=hidden]), select"),
        ].filter((el) => {
          // Champ piège anti-robot (hors tabulation) : pas une cible pour un humain.
          if (!visible(el) || el.getAttribute("tabindex") === "-1") return false;
          const r = el.getBoundingClientRect();
          return (
            r.height < 44 &&
            !(el as HTMLInputElement).matches("input[type=checkbox], input[type=radio]")
          );
        }).length;
        const heavy = performance
          .getEntriesByType("resource")
          .filter(
            (e) =>
              (e as PerformanceResourceTiming).initiatorType === "img" &&
              (e as PerformanceResourceTiming).encodedBodySize > 300_000,
          ).length;
        return {
          text: document.body?.innerText.trim().length ?? 0,
          h1: document.querySelectorAll("h1").length,
          title: document.title.trim(),
          description:
            document.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() ??
            "",
          noindex: /noindex/i.test(
            document.querySelector('meta[name="robots"]')?.getAttribute("content") ?? "",
          ),
          noAlt: [...document.images].filter((img) => visible(img) && !img.hasAttribute("alt"))
            .length,
          small,
          heavy,
          overflow: document.documentElement.scrollWidth - window.innerWidth,
          canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? "",
          // Bouton principal visible sans défiler (premier bouton plein dans le contenu).
          ctaTop: (() => {
            const main = document.querySelector("main") ?? document.body;
            const el = [...main.querySelectorAll("a, button")].find((e) =>
              (e.getAttribute("class") ?? "").includes("bg-primary "),
            );
            return el ? el.getBoundingClientRect().top : null;
          })(),
          bodyText: document.body?.innerText ?? "",
          errorPage: /Something went wrong|Une erreur est survenue/i.test(
            document.body?.innerText ?? "",
          ),
          links: [...document.querySelectorAll("a[href]")]
            .map((a) => a.getAttribute("href") ?? "")
            .filter((h) => h.startsWith("/") && !h.startsWith("//")),
        };
      });
      if (facts.text < 40) problems.push("page blanche");
      if (facts.errorPage) problems.push("page d'erreur affichée");
      if (facts.h1 === 0 && !qa.noH1) problems.push("aucun titre h1");
      if (facts.overflow > 1) problems.push(`débordement horizontal de ${facts.overflow} px`);
      if (role === "visiteur" && RANK[qa.role] === 0 && qa.expectStatus !== 404) {
        // [s2] Adresse canonique : présente et identique à la page (hors paramètres).
        if (!facts.noindex) {
          const canon = facts.canonical
            ? new URL(facts.canonical, BASE).pathname.replace(/\/$/, "")
            : "";
          if (!canon) warnings.push("[s2] pas d'adresse canonique");
          else if (canon !== (url.replace(/\/$/, "") || ""))
            warnings.push(`[s2] canonique ${canon} ≠ ${url}`);
        }
        // [l1] Pages légales remplies : aucun champ vide ou technique.
        if (
          url.startsWith("/legal/") &&
          /\bundefined\b|\bnull\b|à compléter|\[.*?\]|XXX/i.test(facts.bodyText)
        ) {
          problems.push(
            "[l1] page légale incomplète (champ vide, « à compléter » ou valeur technique)",
          );
        }
        // [prix] Offres en base affichées au bon prix sur la page Tarifs.
        if (url === "/tarifs" && viewport === "ordinateur") {
          const txt = facts.bodyText.replace(/\s+/g, " ");
          for (const plan of await pricingPlans()) {
            const price = formatPrice(plan.price_cents, plan.currency);
            if (!txt.includes(price))
              problems.push(`[prix] « ${plan.name} » : ${price} absent de la page`);
          }
        }
        // [c2] Page vitrine : bouton principal visible sans défiler.
        if (qa.vitrine && (facts.ctaTop === null || facts.ctaTop > QA_VIEWPORTS[viewport].height)) {
          warnings.push(`[c2] aucun bouton principal visible sans défiler (${viewport})`);
        }
        if (viewport === "ordinateur")
          META.push({ url, title: facts.title, description: facts.description });
      }
      // Contrôles du catalogue d'audit (agents-mac97000, src/lib/audit-offer.ts) : remarques.
      if (facts.h1 > 1) warnings.push(`[s3] ${facts.h1} titres h1`);
      if (!facts.title) warnings.push("[s1] balise <title> vide");
      else if (facts.title.length > 60)
        warnings.push(`[s1] titre de ${facts.title.length} caractères (> 60)`);
      if (!facts.noindex && RANK[qa.role] === 0) {
        if (!facts.description) warnings.push("[s1] pas de méta-description");
        else if (facts.description.length > 160)
          warnings.push(`[s1] méta-description de ${facts.description.length} caractères (> 160)`);
      }
      if (facts.noAlt) warnings.push(`[l3] ${facts.noAlt} image(s) sans attribut alt`);
      if (facts.heavy) warnings.push(`[p2] ${facts.heavy} image(s) de plus de 300 Ko`);
      if (viewport === "mobile" && facts.small)
        warnings.push(`[r3] ${facts.small} bouton(s) ou champ(s) de moins de 44 px de haut`);
      // Qualité des textes : pages publiques, en visiteur, une fois (sur ordinateur).
      if (
        role === "visiteur" &&
        viewport === "ordinateur" &&
        RANK[qa.role] === 0 &&
        qa.expectStatus !== 404 &&
        !qa.sansTexte
      ) {
        const texts: PageTexts = await page.evaluate(() => {
          const main = document.querySelector("main") ?? document.body;
          const outside = (el: Element) =>
            Boolean(el.closest("nav, [role=dialog], footer, header"));
          const seen = (el: Element) => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
          };
          const text = (el: Element) =>
            ((el as HTMLElement).innerText ?? "").replace(/\s+/g, " ").trim();
          const cta = [...main.querySelectorAll("button, a")]
            .filter((el) => seen(el) && !outside(el) && text(el))
            .map((el) => ({ el, c: el.getAttribute("class") ?? "" }))
            .filter(({ c }) => c.includes("inline-flex") && c.includes("rounded-md"))
            .flatMap(({ el, c }) =>
              c.includes("bg-primary ")
                ? [
                    {
                      libelle: text(el),
                      role: "principal" as const,
                      ecran: Math.floor(
                        (el.getBoundingClientRect().top + window.scrollY) / window.innerHeight,
                      ),
                    },
                  ]
                : c.includes("border border-input") || c.includes("bg-secondary")
                  ? [{ libelle: text(el), role: "secondaire" as const }]
                  : [],
            );
          return {
            titre: document.title.trim(),
            description:
              document.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() ??
              "",
            h1: text(document.querySelector("h1") ?? document.createElement("h1")),
            paragraphes: [...main.querySelectorAll("p, li")]
              .filter((el) => seen(el) && !outside(el) && !el.querySelector("p, li"))
              .map(text)
              .filter((t) => t.length > 0),
            cta,
          };
        });
        const res = auditTexts(texts, TEXT_RULES, { vitrine: qa.vitrine, protege: BRAND_NAMES });
        textAudit = res;
        if (res.score < 50) warnings.push(`[texte] score ${res.score}/100 (refusé sous 50)`);
      }
      // Accessibilité (axe-core, WCAG 2.1 A et AA) : une fois par page et par rôle, sur ordinateur.
      if (AXE && viewport === "ordinateur") {
        await page.addScriptTag({ path: AXE }).catch(() => null);
        const found = await page
          .evaluate(async () => {
            const axe = (window as unknown as { axe?: { run: (o: unknown) => Promise<unknown> } })
              .axe;
            if (!axe) return null;
            const res = (await axe.run({
              runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
            })) as { violations: Array<{ id: string; impact: string | null; nodes: unknown[] }> };
            return res.violations.map((v) => ({
              id: v.id,
              impact: v.impact ?? "minor",
              n: v.nodes.length,
            }));
          })
          .catch(() => null);
        for (const v of found ?? []) {
          const code = v.id === "color-contrast" ? "l2" : "a11y";
          const line = `[${code}] ${v.id} (${v.impact}) : ${v.n} élément(s)`;
          // Critique ou sérieux : bloquant (le site n'en a plus aucun depuis le lot 8).
          if (v.impact === "critical" || v.impact === "serious") problems.push(line);
        }
      }
      // HTML valide (html-validate, règles de la norme) : pages publiques, rendu serveur, une fois.
      if (
        HTML_VALIDATE &&
        role === "visiteur" &&
        viewport === "ordinateur" &&
        RANK[qa.role] === 0
      ) {
        const html = await fetch(BASE + url)
          .then((r) => r.text())
          .catch(() => "");
        const errors = html ? await validateHtml(html) : [];
        if (errors.length) {
          const rules = [...new Set(errors)].slice(0, 5).join(", ");
          warnings.push(`[w3c] ${errors.length} erreur(s) HTML (${rules})`);
        }
      }
      for (const href of facts.links) {
        const clean = href.split("#")[0]!.split("?")[0]!;
        if (clean && !clean.startsWith("/api/")) LINKS.set(clean, LINKS.get(clean) ?? url);
      }
    }
  }
  if (consoleErrors.length)
    problems.push(...[...new Set(consoleErrors)].map((e) => `console : ${e}`));
  if (failed.length) problems.push(...[...new Set(failed)].map((f) => `requête en erreur : ${f}`));

  page.off("console", onConsole);
  page.off("pageerror", onPageError);
  page.off("response", onResponse);
  return {
    path: qa.path,
    url,
    label: qa.label,
    role,
    viewport,
    status: problems.length ? "echec" : "ok",
    problems,
    warnings,
    ms: Date.now() - started,
    ...(textAudit ? { texte: textAudit } : {}),
  };
}

/**
 * Serveur de développement local (vite dev) : Vite découvre certaines dépendances à la première
 * ouverture d'une page et recharge alors le navigateur (« optimized dependencies changed »).
 * Un chargement pris au milieu de ce rechargement échoue (« Importing a module script failed »)
 * sans que l'application soit en cause. Premier passage à blanc, sans contrôle, pour stabiliser.
 */
async function warmUp(browser: Browser, pages: typeof QA_PAGES) {
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) return;
  const context = await browser.newContext();
  const page = await context.newPage();
  for (const qa of pages) {
    if (qa.discover || qa.raw) continue;
    await page
      .goto(`${BASE}${qa.path}`, { waitUntil: "load", timeout: 30_000 })
      .then(() => page.waitForLoadState("networkidle", { timeout: 5_000 }))
      .catch(() => undefined);
  }
  await context.close();
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY)
    throw new Error("Adresse ou clé publique Supabase absente (.env)");
  const states = await modulesState();
  BRAND_NAMES = await brandNames();
  // Options Chromium facultatives, ex. derrière un proxy d'entreprise :
  // CDS_RECETTE_CHROMIUM_ARGS="--ignore-certificate-errors-spki-list=<empreinte du certificat du proxy>"
  const extra = (ENV["CDS_RECETTE_CHROMIUM_ARGS"] ?? "").split(" ").filter(Boolean);
  const engine = { chromium, firefox, webkit }[NAVIGATEUR];
  // Les options Chromium (proxy, certificats) ne s'appliquent qu'à Chromium.
  const browser = await engine.launch(NAVIGATEUR === "chromium" ? { args: extra } : {});
  const auths: Partial<Record<QaRole, Auth | null>> = { visiteur: null };
  const report: QaReport = {
    version: 1,
    startedAt: new Date().toISOString(),
    baseUrl: BASE,
    auth: { membre: "absent", admin: "absent" },
    results: [],
  };
  for (const role of ["membre", "admin"] as const) {
    if (!ROLES.includes(role)) continue;
    auths[role] = await signIn(role);
    report.auth[role] = auths[role]!.mode;
  }

  const pages = QA_PAGES.filter((p) => !ONLY || p.path.startsWith(ONLY));
  await warmUp(browser, pages);
  const resolved = new Map<string, string>();
  for (const viewport of Object.keys(QA_VIEWPORTS) as QaViewport[]) {
    for (const role of ROLES) {
      const auth = auths[role] ?? null;
      const context = await newContext(browser, viewport, role, auth);
      const page = await context.newPage();
      for (const qa of pages) {
        // Le visiteur teste tout (y compris les redirections), les rôles connectés leurs pages
        // et les pages publiques dynamiques (boutons réservés aux membres).
        if (role !== "visiteur" && RANK[qa.role] === 0 && !qa.discover && qa.path !== "/") continue;
        if (role === "membre" && qa.role === "admin" && auth?.mode === "simulé") continue;
        if (auth?.mode === "simulé" && qa.discover && RANK[qa.role] === 0) continue;
        const moduleOff = qa.module !== undefined && !moduleOn(states, qa.module);
        let url: string | null = qa.path;
        let probe = false;
        if (qa.discover) {
          url = moduleOff ? null : await discover(page, qa, resolved);
          // Aucun contenu publié : on vérifie au moins la page « introuvable » de cette adresse.
          if (!url && !moduleOff) {
            url = qa.path.replace(/:[A-Za-z]+/g, (m) =>
              /Id$/.test(m) ? "00000000-0000-4000-8000-000000000000" : "recette-introuvable",
            );
            probe = true;
          }
          if (!url) {
            report.results.push({
              path: qa.path,
              url: qa.path,
              label: qa.label,
              role,
              viewport,
              status: "ignore",
              problems: [],
              warnings: [moduleOff ? "module éteint" : "aucun contenu publié à ouvrir"],
              ms: 0,
            });
            console.log(
              `· [${viewport} · ${role}] ${qa.path} ignorée : ${moduleOff ? "module éteint" : "aucun contenu à ouvrir"}`,
            );
            continue;
          }
        }
        const result = await checkPage(
          page,
          probe ? { ...qa, label: `${qa.label} (introuvable)`, noH1: true, expectStatus: 404 } : qa,
          url,
          role,
          viewport,
          states,
          auth?.mode === "simulé",
        );
        report.results.push(result);
        const mark = result.status === "ok" ? "✔" : "✘";
        console.log(
          `${mark} [${viewport} · ${role}] ${url}${result.problems.length ? "\n    " + result.problems.join("\n    ") : ""}`,
        );
      }
      await context.close();
    }
  }
  await browser.close();

  // [s1] Titres et descriptions en double entre pages publiques.
  const dup = (key: "title" | "description") => {
    const seen = new Map<string, string[]>();
    for (const m of META) if (m[key]) seen.set(m[key], [...(seen.get(m[key]) ?? []), m.url]);
    return [...seen]
      .filter(([, urls]) => urls.length > 1)
      .map(
        ([v, urls]) =>
          `[s1] ${key === "title" ? "titre" : "description"} en double « ${v.slice(0, 60)} » : ${urls.join(", ")}`,
      );
  };
  if (META.length)
    report.results.push(
      transversal("Titres et descriptions uniques", [], [...dup("title"), ...dup("description")]),
    );

  // [s2] Plan du site : chaque adresse du sitemap répond.
  const sitemap = await fetch(`${BASE}/sitemap.xml`)
    .then((r) => r.text())
    .catch(() => "");
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]!).pathname);
  const deadLocs: string[] = [];
  for (const path of [...new Set(locs)]) {
    const res = await fetch(BASE + path, { redirect: "manual" }).catch(() => null);
    if (!res || res.status !== 200) deadLocs.push(`[s2] ${path} (${res?.status ?? "injoignable"})`);
  }
  report.results.push(transversal(`Plan du site (${locs.length} adresses)`, deadLocs));

  // [secu] En-têtes de sécurité : évalués sur un site publié (https) seulement.
  if (BASE.startsWith("https://")) {
    const h = (await fetch(`${BASE}/`).catch(() => null))?.headers;
    const miss = [
      ["strict-transport-security", "HSTS"],
      ["x-content-type-options", "X-Content-Type-Options"],
      ["referrer-policy", "Referrer-Policy"],
      ["content-security-policy", "Content-Security-Policy"],
    ]
      .filter(([k]) => !h?.get(k!))
      .map(([, n]) => `[secu] en-tête ${n} absent`);
    if (
      !h?.get("x-frame-options") &&
      !/frame-ancestors/.test(h?.get("content-security-policy") ?? "")
    )
      miss.push(
        "[secu] protection contre l'intégration en cadre absente (X-Frame-Options ou frame-ancestors)",
      );
    report.results.push(transversal("En-têtes de sécurité", [], miss));
  }

  // [r1] Liens internes morts : chaque adresse rencontrée est demandée une fois au serveur.
  const dead: string[] = [];
  for (const [href, from] of LINKS) {
    const res = await fetch(BASE + href, { redirect: "manual" }).catch(() => null);
    const code = res?.status ?? 0;
    if (code === 0 || code === 404 || code >= 500)
      dead.push(`${href} (${code || "injoignable"}, vu sur ${from})`);
  }
  report.results.push({
    path: "(liens internes)",
    url: `${LINKS.size} liens`,
    label: "Liens internes morts",
    role: "visiteur",
    viewport: "ordinateur",
    status: dead.length ? "echec" : "ok",
    problems: dead.map((d) => `[r1] lien mort : ${d}`),
    warnings: [],
    ms: 0,
  });
  console.log(
    `${dead.length ? "✘" : "✔"} [r1] ${LINKS.size} liens internes vérifiés, ${dead.length} mort(s)`,
  );

  const dir = join(ROOT, "tests", "e2e", "rapport");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "recette.json"), JSON.stringify(report, null, 2));
  const fails = report.results.filter((r) => r.status === "echec");
  const oks = report.results.filter((r) => r.status === "ok");
  // Remarques groupées par contrôle du catalogue d'audit.
  const byCode = new Map<string, number>();
  for (const r of report.results.filter((x) => x.status !== "ignore"))
    for (const w of r.warnings) {
      const code = /^\[([a-z0-9]+)\]/.exec(w)?.[1] ?? "autre";
      byCode.set(code, (byCode.get(code) ?? 0) + 1);
    }
  const md = [
    `# Recette automatisée — ${report.startedAt}`,
    "",
    `Adresse : ${BASE} · navigateur : ${NAVIGATEUR} · membre : ${report.auth.membre} · admin : ${report.auth.admin}`,
    "",
    `**${oks.length} pages conformes, ${fails.length} en échec, ${report.results.length - oks.length - fails.length} ignorées.**`,
    "",
    ...fails.map((r) => `- ✘ ${r.viewport} · ${r.role} · \`${r.url}\` : ${r.problems.join(" ; ")}`),
    "",
    "## Qualité des textes (charte docs/redaction, score sur 100)",
    "",
    ...report.results
      .filter((r) => r.texte)
      .sort((a, b) => a.texte!.score - b.texte!.score)
      .map(
        (r) =>
          `- ${r.texte!.score}/100 \`${r.url}\` : ${
            r
              .texte!.anomalies.map((a) => `${a.regle} (${a.gravite}) « ${a.texte.slice(0, 60)} »`)
              .join(" ; ") || "aucune anomalie"
          }`,
      ),
    "",
    "## Remarques (non bloquantes) par contrôle d'audit",
    "",
    ...[...byCode].map(([code, n]) => `- ${code} : ${n}`),
    "",
    ...report.results
      .filter((r) => r.warnings.length && r.status !== "ignore")
      .map((r) => `- ${r.viewport} · ${r.role} · \`${r.url}\` : ${r.warnings.join(" ; ")}`),
  ].join("\n");
  writeFileSync(join(dir, "recette.md"), md + "\n");
  console.log(
    `\n${oks.length} conformes · ${fails.length} en échec · rapport : tests/e2e/rapport/`,
  );
  process.exitCode = fails.length ? 1 : 0;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 2;
});
