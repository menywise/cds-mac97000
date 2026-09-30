/**
 * CDS — Parcours cliqués (lot 9).
 *
 * Joue les parcours d'un vrai visiteur ou membre, du formulaire jusqu'au message de réussite :
 * inscription, contact (et son champ piège anti-robot), forum (sujet puis réponse), signalement,
 * inscription à une formation offerte et leçon terminée. Échec si une étape n'aboutit pas ou si
 * la console affiche une erreur.
 *
 * Données de test (décision du 30/09) : écrites dans la vraie base, marquées « [recette] »
 * (contact : adresse @example.invalid), puis retirées par la fonction `recette_purge` avant et
 * après le passage. Écriture réelle seulement si le compte admin de test est fourni (sans lui, pas
 * de nettoyage possible) : sinon l'envoi final est intercepté et la réponse de la base imitée.
 * Les parcours membre demandent le compte membre de test ; sans lui, ils sont ignorés.
 * L'inscription n'est jamais réelle : un e-mail de confirmation partirait vers une adresse
 * inexistante (les rebonds font suspendre les envois du projet).
 *
 * Utilisation :
 *   npm i --no-save playwright
 *   node tests/e2e/parcours.ts [--url http://localhost:8080] [--only forum] [--navigateur firefox]
 * Comptes : CDS_RECETTE_MEMBRE_EMAIL / _MDP, CDS_RECETTE_ADMIN_EMAIL / _MDP.
 * Rapport : tests/e2e/rapport/parcours.json et parcours.md.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, firefox, webkit, type Browser, type Page } from "playwright";
import {
  AUTH_STORAGE_KEY,
  BASE,
  CHROMIUM_ARGS,
  NAVIGATEUR,
  ROOT,
  SUPABASE_KEY,
  SUPABASE_URL,
  arg,
  moduleOn,
  modulesState,
  realSession,
  type Session,
} from "./commun.ts";

/** Marque des données écrites par les parcours (reconnue par recette_purge). */
const MARQUE = "[recette]";
const CONTACT_EMAIL = "recette-auto@example.invalid";
/** Contenus du seed de recette (supabase/seed/recette_seed.sql). */
const SEED = {
  sujet: "e7000000-0000-4000-8000-000000000010",
  formation: "exemple-formation-offerte",
};
const ONLY = arg("only");
const ATTENTE = 20_000;

type Statut = "ok" | "echec" | "ignore";
type Resultat = {
  id: string;
  label: string;
  statut: Statut;
  /** réel : écrit en base puis purgé ; simulé : envoi final intercepté. */
  mode: "réel" | "simulé" | "-";
  etapes: string[];
  problemes: string[];
  ms: number;
};

type Ctx = {
  page: Page;
  reel: boolean;
  etape: (nom: string) => void;
  modules: Record<string, boolean>;
};

type Parcours = {
  id: string;
  label: string;
  role: "visiteur" | "membre";
  module?: string;
  /** Écrit en base (réel seulement si la purge est possible). */
  ecrit: boolean;
  run: (ctx: Ctx) => Promise<void>;
};

const texte = (page: Page, t: string | RegExp) =>
  page.getByText(t).first().waitFor({ state: "visible", timeout: ATTENTE });

const PARCOURS: Parcours[] = [
  {
    id: "inscription",
    label: "Inscription (envoi simulé)",
    role: "visiteur",
    ecrit: false,
    async run({ page, etape }) {
      let envoi: Record<string, unknown> | null = null;
      await page.route(`${SUPABASE_URL}/auth/v1/signup**`, async (route) => {
        envoi = route.request().postDataJSON() as Record<string, unknown>;
        await route.fulfill({
          json: {
            id: "00000000-0000-4000-8000-00000000000e",
            aud: "authenticated",
            role: "",
            email: envoi["email"],
            identities: [{}],
            user_metadata: {},
            app_metadata: {},
            created_at: new Date().toISOString(),
          },
        });
      });
      await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
      const email = `recette-${Date.now()}@example.invalid`;
      await page.locator("#name").fill(`${MARQUE} Robot`);
      await page.locator("#email").fill(email);
      await page.locator("#password").fill("Recette-2026-parcours");
      await page.getByRole("button", { name: "Créer mon compte" }).click();
      await texte(page, "Vous devez accepter les conditions générales.");
      etape("conditions générales exigées");
      await page.locator("#cgu").click();
      await page.getByRole("button", { name: "Créer mon compte" }).click();
      await texte(page, "Vérifiez votre boîte mail");
      if ((envoi as Record<string, unknown> | null)?.["email"] !== email) {
        throw new Error("adresse e-mail absente de la demande d'inscription");
      }
      etape("compte demandé, e-mail de confirmation annoncé");
    },
  },
  {
    id: "contact-robot",
    label: "Contact : envoi automatique bloqué",
    role: "visiteur",
    module: "contact",
    ecrit: false,
    async run({ page, etape }) {
      let ecrit = false;
      await page.route(`${SUPABASE_URL}/rest/v1/contact_messages**`, async (route) => {
        ecrit = true;
        await route.fulfill({ status: 201, body: "" });
      });
      await page.goto(`${BASE}/contact`, { waitUntil: "networkidle" });
      await page.waitForTimeout(3000);
      await remplirContact(page, "Champ piège rempli");
      // Champ invisible « Société » : seul un robot le remplit.
      await page.locator("#company").evaluate((el) => {
        (el as HTMLInputElement).value = "Robot SARL";
      });
      await page.getByRole("button", { name: "Envoyer le message" }).click();
      await texte(page, "Envoi bloqué");
      if (ecrit) throw new Error("message envoyé malgré le champ piège");
      etape("champ piège rempli : envoi refusé sans écrire en base");
    },
  },
  {
    id: "contact",
    label: "Contact : message envoyé",
    role: "visiteur",
    module: "contact",
    ecrit: true,
    async run({ page, reel, etape }) {
      await page.goto(`${BASE}/contact`, { waitUntil: "networkidle" });
      // Piège anti-robot : un humain met plus de 2,5 s à remplir le formulaire.
      await page.waitForTimeout(3000);
      const objet = `${MARQUE} Parcours contact ${Date.now()}`;
      await remplirContact(page, objet);
      await page.getByRole("button", { name: "Envoyer le message" }).click();
      await texte(page, "Message envoyé");
      etape("message envoyé, confirmation affichée");
      if (reel) {
        const lignes = await adminSelect(
          `contact_messages?select=id&subject=eq.${encodeURIComponent(objet)}`,
        );
        if (lignes.length !== 1) throw new Error(`message absent de la base (${lignes.length})`);
        etape("message présent dans la boîte de réception");
      }
    },
  },
  {
    id: "forum",
    label: "Forum : ouvrir un sujet puis répondre",
    role: "membre",
    module: "forum",
    ecrit: true,
    async run({ page, etape }) {
      await page.goto(`${BASE}/forum`, { waitUntil: "networkidle" });
      const titre = `${MARQUE} Sujet automatique ${Date.now()}`;
      await page.locator("#topic-title").fill(titre);
      await page.locator("#topic-content").fill(`${MARQUE} Contenu du sujet.`);
      await page.getByRole("button", { name: "Publier ma question" }).click();
      await texte(page, "Votre sujet est ouvert.");
      etape("sujet publié");
      await page.getByTitle(`Ouvrir la discussion : ${titre}`).first().click();
      await page.waitForURL(/\/forum\/[0-9a-f-]{36}/, { timeout: ATTENTE });
      await page.locator("#reply").fill(`${MARQUE} Réponse automatique.`);
      await page.getByRole("button", { name: "Répondre", exact: true }).click();
      await texte(page, "Votre réponse est publiée.");
      await texte(page, `${MARQUE} Réponse automatique.`);
      etape("réponse publiée et affichée");
    },
  },
  {
    id: "signalement",
    label: "Signaler une discussion",
    role: "membre",
    module: "reports",
    ecrit: true,
    async run({ page, etape }) {
      const res = await page.goto(`${BASE}/forum/${SEED.sujet}`, { waitUntil: "networkidle" });
      if (res && res.status() === 404) throw new Error("sujet d'exemple absent (seed de recette)");
      await page.getByRole("button", { name: "Signaler", exact: true }).first().click();
      await page.getByLabel("Spam ou publicité non sollicitée").check();
      await page.locator("#report-details").fill(`${MARQUE} Signalement automatique.`);
      await page.getByRole("button", { name: "Envoyer le signalement" }).click();
      await texte(page, "Merci. L'équipe examine votre signalement");
      etape("signalement envoyé");
    },
  },
  {
    id: "formation",
    label: "Formation offerte : inscription et leçon terminée",
    role: "membre",
    module: "lms",
    ecrit: true,
    async run({ page, etape }) {
      const res = await page.goto(`${BASE}/formation/${SEED.formation}`, {
        waitUntil: "networkidle",
      });
      if (res && res.status() === 404) throw new Error("formation d'exemple absente (seed)");
      await page.getByRole("button", { name: "M'inscrire" }).click();
      await texte(page, "Vous êtes inscrit.");
      etape("inscription enregistrée");
      await page.getByRole("link", { name: "Reprendre la formation" }).click();
      await page.waitForURL(/\/lecon\//, { timeout: ATTENTE });
      await page.getByRole("button", { name: "Marquer comme terminée" }).click();
      await texte(page, "Leçon terminée.");
      etape("leçon terminée");
    },
  },
];

async function remplirContact(page: Page, objet: string) {
  await page.locator("#name").fill(`${MARQUE} Robot`);
  await page.locator("#email").fill(CONTACT_EMAIL);
  await page.locator("#subject").fill(objet);
  await page.locator("#message").fill("Message écrit par le robot de parcours, supprimé ensuite.");
}

let ADMIN: Session | null = null;

async function adminSelect(chemin: string): Promise<unknown[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${chemin}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${ADMIN!.access_token}` },
  });
  return res.ok ? ((await res.json()) as unknown[]) : [];
}

/** Retire les données marquées ; null si la purge est impossible (migration du lot 9 absente). */
async function purge(membre: string | null): Promise<Record<string, number> | null> {
  if (!ADMIN) return null;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/recette_purge`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${ADMIN.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ _membre: membre }),
  });
  return res.ok ? ((await res.json()) as Record<string, number>) : null;
}

async function jouer(
  browser: Browser,
  p: Parcours,
  modules: Record<string, boolean>,
  membre: Session | null,
  reel: boolean,
): Promise<Resultat> {
  const started = Date.now();
  const base = { id: p.id, label: p.label, etapes: [] as string[], problemes: [] as string[] };
  if (p.module && !moduleOn(modules, p.module)) {
    return {
      ...base,
      statut: "ignore",
      mode: "-",
      problemes: [`module « ${p.module} » éteint`],
      ms: 0,
    };
  }
  if (p.role === "membre" && !membre) {
    return {
      ...base,
      statut: "ignore",
      mode: "-",
      problemes: ["compte membre de test absent"],
      ms: 0,
    };
  }
  if (p.role === "membre" && !reel) {
    return {
      ...base,
      statut: "ignore",
      mode: "-",
      problemes: ["compte admin de test absent ou purge indisponible : écriture non nettoyable"],
      ms: 0,
    };
  }
  const context = await browser.newContext({
    locale: "fr-FR",
    viewport: { width: 1366, height: 900 },
  });
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem("cds.cookie-consent", "refused");
    } catch {
      /* stockage indisponible */
    }
  });
  if (p.role === "membre" && membre) {
    await context.addInitScript(
      ([key, value]) => window.localStorage.setItem(key!, value!),
      [AUTH_STORAGE_KEY, JSON.stringify(membre)],
    );
  }
  // Sans purge possible, l'envoi final est intercepté : réponse de la base imitée.
  if (p.ecrit && !reel) {
    await context.route(`${SUPABASE_URL}/rest/v1/**`, async (route) => {
      const m = route.request().method();
      if (m === "POST" || m === "PATCH" || m === "DELETE") {
        return route.fulfill({ status: 201, body: "" });
      }
      return route.continue();
    });
  }
  const page = await context.newPage();
  const erreurs: string[] = [];
  page.on("pageerror", (e) => erreurs.push(`JS : ${e.message.slice(0, 200)}`));
  page.on("console", (m) => {
    if (m.type() === "error") erreurs.push(`console : ${m.text().slice(0, 200)}`);
  });
  try {
    await p.run({ page, reel: reel && p.ecrit, modules, etape: (n) => base.etapes.push(n) });
  } catch (err) {
    base.problemes.push((err as Error).message.split("\n")[0]!);
  }
  base.problemes.push(...erreurs);
  await context.close();
  return {
    ...base,
    statut: base.problemes.length ? "echec" : "ok",
    mode: p.ecrit ? (reel ? "réel" : "simulé") : "simulé",
    ms: Date.now() - started,
  };
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY)
    throw new Error("Adresse ou clé publique Supabase absente (.env)");
  const modules = await modulesState();
  ADMIN = await realSession("admin");
  const membre = await realSession("membre");
  const membreId = membre?.user.id ?? null;
  // Purge de départ : restes d'un passage interrompu. Échec = migration du lot 9 absente.
  const avant = await purge(membreId);
  const reel = avant !== null;
  console.log(
    reel
      ? "Écritures réelles, marquées « [recette] » et purgées avant et après."
      : `Écritures simulées (${ADMIN ? "fonction recette_purge indisponible" : "compte admin de test absent"}).`,
  );

  const engine = { chromium, firefox, webkit }[NAVIGATEUR];
  const browser = await engine.launch(NAVIGATEUR === "chromium" ? { args: CHROMIUM_ARGS } : {});
  const resultats: Resultat[] = [];
  try {
    for (const p of PARCOURS.filter((x) => !ONLY || x.id.startsWith(ONLY))) {
      const r = await jouer(browser, p, modules, membre, reel);
      resultats.push(r);
      const mark = r.statut === "ok" ? "✔" : r.statut === "ignore" ? "·" : "✘";
      console.log(
        `${mark} ${r.label}${r.mode !== "-" ? ` (${r.mode})` : ""}` +
          (r.problemes.length ? `\n    ${r.problemes.join("\n    ")}` : ""),
      );
    }
  } finally {
    await browser.close();
    const apres = await purge(membreId);
    if (reel) {
      if (!apres) console.log("✘ purge finale impossible : données « [recette] » restées en base");
      else console.log(`Purge : ${JSON.stringify(apres)}`);
    }
  }

  const dir = join(ROOT, "tests", "e2e", "rapport");
  mkdirSync(dir, { recursive: true });
  const rapport = {
    version: 1,
    date: new Date().toISOString(),
    baseUrl: BASE,
    navigateur: NAVIGATEUR,
    reel,
    resultats,
  };
  writeFileSync(join(dir, "parcours.json"), JSON.stringify(rapport, null, 2));
  writeFileSync(
    join(dir, "parcours.md"),
    [
      `# Parcours cliqués — ${rapport.date}`,
      "",
      `Site : ${BASE} · navigateur : ${NAVIGATEUR} · écritures ${reel ? "réelles (purgées)" : "simulées"}`,
      "",
      "| Parcours | Résultat | Mode | Étapes | Problèmes |",
      "| --- | --- | --- | --- | --- |",
      ...resultats.map(
        (r) =>
          `| ${r.label} | ${r.statut} | ${r.mode} | ${r.etapes.join(" ; ")} | ${r.problemes.join(" ; ")} |`,
      ),
      "",
    ].join("\n"),
  );
  const echecs = resultats.filter((r) => r.statut === "echec").length;
  console.log(
    `\n${resultats.filter((r) => r.statut === "ok").length} réussis · ${echecs} en échec · ` +
      `${resultats.filter((r) => r.statut === "ignore").length} ignorés · rapport : tests/e2e/rapport/`,
  );
  process.exit(echecs ? 1 : 0);
}

await main();
