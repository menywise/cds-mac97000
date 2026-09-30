/**
 * CDS — Contrôle de la qualité des textes (charte docs/redaction/CHARTE_REDACTION_CDS.md).
 * Applique docs/redaction/text-rules.json dans l'ordre imposé par AUDIT_TEXTE_CDS.md et
 * calcule le score sur 100. Module sans dépendance : utilisé par le robot et les tests.
 *
 * Choix d'application (voir V0.md, lot 7) :
 * - le nom du site (marque) est ajouté aux termes protégés : ce n'est pas du vocabulaire interne ;
 * - longueur minimale du h1 et marqueur de cible : pages vitrines seulement (accueil, tarifs…),
 *   une page de connexion ou une page légale n'a pas à nommer « artisan » en 40 caractères ;
 * - Kandel-Moles : pas de compteur de syllabes fiable, contrôle noté « non évalué ».
 */

export type Gravite = "bloquant" | "majeur" | "mineur";

export type TextRules = {
  version: number;
  motsInterdits: Array<{ mot: string; raison: string; remplacement: string }>;
  jargon: Array<{ terme: string; equivalentSimple: string }>;
  termesProteges: string[];
  negationsAEviter: string[];
  cta: {
    longueurMin: number;
    longueurMax: number;
    verbesAutorises: string[];
    formulesInterdites: string[];
    imperatifNuInterdit: boolean;
    principalParEcranMax: number;
  };
  titres: {
    h1LongueurMin: number;
    h1LongueurMax: number;
    descriptionLongueurMax: number;
    marqueurCibleObligatoire: boolean;
    marqueursCible: string[];
  };
  lisibilite: {
    motsParPhraseMax: number;
    scoreKandelMolesMin: number;
    motsParParagrapheMax: number;
  };
  gravite: Record<string, Gravite>;
};

export type PageTexts = {
  titre: string;
  description: string;
  h1: string;
  paragraphes: string[];
  /** `ecran` : numéro de la hauteur d'écran où se trouve le bouton (0 = visible au chargement). */
  cta: Array<{ libelle: string; role: "principal" | "secondaire"; ecran?: number }>;
};

export type TextAnomaly = { texte: string; regle: string; gravite: Gravite; proposition: string };

export type TextAudit = { score: number; anomalies: TextAnomaly[]; nonEvalue: string[] };

const BLOCS: Record<string, { poids: number; regles: string[] }> = {
  cta: {
    poids: 30,
    regles: [
      "ctaFormuleInterdite",
      "ctaHorsRegles",
      "ctaImperatifNu",
      "ctaPrincipalMultiple",
      "negationDansCta",
    ],
  },
  motsInterdits: { poids: 20, regles: ["motInterdit", "negation"] },
  lisibilite: {
    poids: 20,
    regles: ["phraseTropLongue", "paragrapheTropLong", "lisibiliteInsuffisante"],
  },
  titres: { poids: 15, regles: ["h1HorsFormat", "descriptionHorsFormat", "negationDansTitre"] },
  jargon: { poids: 10, regles: ["jargon"] },
  cible: { poids: 5, regles: ["marqueurCibleAbsent"] },
};

// Caractères qui font partie d'un mot : lettres, chiffres, apostrophe, trait d'union.
const W = "[\\p{L}\\p{N}'’-]";
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Recherche d'un terme entier (jamais une sous-chaîne) ; sigles en capitales : casse exacte. */
function termRegex(term: string) {
  const caseSensitive = term.length > 1 && term === term.toUpperCase() && /\p{Lu}/u.test(term);
  // Mot simple en minuscules : accords usuels acceptés (innovant → innovante, innovants…).
  const accords = !caseSensitive && /^\p{Ll}+$/u.test(term) ? "(?:e|s|es|x|aux)?" : "";
  return new RegExp(`(?<!${W})${esc(term)}${accords}(?!${W})`, caseSensitive ? "gu" : "giu");
}

/** « ne ... pas » : négation en deux morceaux dans la même phrase ; sinon terme entier. */
function negationRegex(pattern: string) {
  const [a, b] = pattern.split("...").map((p) => p.trim());
  if (a && b) {
    const head = a === "ne" ? "(?:ne\\s|n['’])" : esc(a);
    return new RegExp(`(?<!${W})${head}[^.!?]{0,60}?(?<!${W})${esc(b)}(?!${W})`, "giu");
  }
  return new RegExp(`(?<!${W})${esc(pattern)}`, "giu");
}

const words = (s: string) => s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w));
const norm = (s: string) => s.replace(/\s+/g, " ").trim();

function withoutProtected(text: string, protectedTerms: string[]) {
  let out = text;
  for (const t of protectedTerms) out = out.replace(termRegex(t), " ");
  return out;
}

export function auditTexts(
  page: PageTexts,
  rules: TextRules,
  opts: { vitrine?: boolean; protege?: string[] } = {},
): TextAudit {
  const anomalies: TextAnomaly[] = [];
  const g = (regle: string): Gravite => rules.gravite[regle] ?? "mineur";
  const add = (texte: string, regle: string, proposition: string) =>
    anomalies.push({ texte: norm(texte).slice(0, 200), regle, gravite: g(regle), proposition });
  const protege = [...rules.termesProteges, ...(opts.protege ?? []).filter(Boolean)];

  // Tous les textes, avec leur contexte (titre, bouton, corps).
  const titres = [page.titre, page.h1].filter(Boolean);
  const ctas = page.cta.map((c) => ({ ...c, libelle: norm(c.libelle) })).filter((c) => c.libelle);
  const corps = [page.description, ...page.paragraphes].filter(Boolean);
  const all = [
    ...titres.map((t) => ({ t, ctx: "titre" as const })),
    ...ctas.map((c) => ({ t: c.libelle, ctx: "cta" as const })),
    ...corps.map((t) => ({ t, ctx: "corps" as const })),
  ];

  // 1-2. Boutons : formule interdite (libellé entier), longueur, verbe en tête, principal unique.
  const verbes = new Set(rules.cta.verbesAutorises.map((v) => v.toLowerCase()));
  const interdites = new Set(rules.cta.formulesInterdites.map((f) => f.toLowerCase()));
  for (const c of ctas) {
    const label = c.libelle
      .toLowerCase()
      .replace(/[.!…→›»]+$/u, "")
      .trim();
    if (interdites.has(label)) {
      add(c.libelle, "ctaFormuleInterdite", "Verbe + bénéfice, ex. « Demander mon devis gratuit »");
      continue;
    }
    const n = words(label).length;
    if (n < rules.cta.longueurMin || n > rules.cta.longueurMax) {
      add(
        c.libelle,
        "ctaHorsRegles",
        `Entre ${rules.cta.longueurMin} et ${rules.cta.longueurMax} mots, verbe en tête`,
      );
    }
    // Verbe pronominal ou précédé d'un pronom : « Se connecter », « Nous contacter ».
    const all = words(label);
    const w = /^(se|s'|s’|nous|vous|me|m'|m’)$/u.test(all[0] ?? "") && all[1] ? all.slice(1) : all;
    const head = all[0] === "je" && all[1] ? `je ${all[1]}` : (w[0] ?? "");
    if (rules.cta.imperatifNuInterdit && /ez$/u.test(w[0] ?? "") && !verbes.has(head)) {
      add(c.libelle, "ctaImperatifNu", "Verbe à l'infinitif ou à la première personne");
    } else if (!verbes.has(head) && !/(er|ir|re|oir)$/u.test(w[0] ?? "") && all[0] !== "je") {
      add(c.libelle, "ctaHorsRegles", "Commencer par un verbe d'action");
    }
  }
  // Un seul bouton principal par écran (charte § 8.6) : comparaison hauteur d'écran par hauteur.
  const parEcran = new Map<number, Set<string>>();
  for (const c of ctas.filter((x) => x.role === "principal")) {
    const e = c.ecran ?? 0;
    parEcran.set(e, (parEcran.get(e) ?? new Set()).add(c.libelle));
  }
  for (const labels of parEcran.values()) {
    if (labels.size > rules.cta.principalParEcranMax) {
      add(
        [...labels].join(" | "),
        "ctaPrincipalMultiple",
        "Un seul bouton principal, les autres en secondaire",
      );
    }
  }

  // 3-5. Mots interdits, jargon, négations (termes protégés écartés d'abord).
  for (const { t, ctx } of all) {
    const text = withoutProtected(t, protege);
    for (const m of rules.motsInterdits) {
      if (termRegex(m.mot).test(text)) add(t, "motInterdit", `« ${m.mot} » → ${m.remplacement}`);
    }
    for (const j of rules.jargon) {
      if (termRegex(j.terme).test(text)) add(t, "jargon", `« ${j.terme} » → ${j.equivalentSimple}`);
    }
    for (const n of rules.negationsAEviter) {
      if (negationRegex(n).test(text)) {
        const regle =
          ctx === "cta" ? "negationDansCta" : ctx === "titre" ? "negationDansTitre" : "negation";
        add(t, regle, "Tournure positive : dire ce que le visiteur obtient");
        break;
      }
    }
  }

  // 6. Formats : h1, description, phrases, paragraphes.
  const h1 = norm(page.h1);
  if (
    h1 &&
    (h1.length > rules.titres.h1LongueurMax ||
      (opts.vitrine && h1.length < rules.titres.h1LongueurMin))
  ) {
    add(
      h1,
      "h1HorsFormat",
      `Entre ${rules.titres.h1LongueurMin} et ${rules.titres.h1LongueurMax} caractères`,
    );
  }
  if (page.description && norm(page.description).length > rules.titres.descriptionLongueurMax) {
    add(
      page.description,
      "descriptionHorsFormat",
      `${rules.titres.descriptionLongueurMax} caractères au plus`,
    );
  }
  for (const p of page.paragraphes) {
    if (words(p).length > rules.lisibilite.motsParParagrapheMax) {
      add(
        p,
        "paragrapheTropLong",
        `${rules.lisibilite.motsParParagrapheMax} mots au plus par paragraphe`,
      );
    }
    for (const s of p.split(/(?<=[.!?…])\s+/u)) {
      if (words(s).length > rules.lisibilite.motsParPhraseMax) {
        add(
          s,
          "phraseTropLongue",
          `${rules.lisibilite.motsParPhraseMax} mots au plus : couper en deux phrases`,
        );
      }
    }
  }

  // 7. Marqueur de cible (h1 ou description), pages vitrines.
  if (opts.vitrine && rules.titres.marqueurCibleObligatoire) {
    const zone = `${page.h1} ${page.description}`;
    if (!rules.titres.marqueursCible.some((m) => termRegex(m).test(zone))) {
      add(
        page.h1 || page.description,
        "marqueurCibleAbsent",
        "Nommer la cible : artisan, indépendant ou le métier",
      );
    }
  }

  return {
    score: score(anomalies),
    anomalies,
    nonEvalue: ["lisibiliteInsuffisante (Kandel-Moles)"],
  };
}

/** Grille AUDIT_TEXTE_CDS.md : bloc à 0 et plafond 49 si bloquant, −1/3 si majeur, −1/10 si mineur. */
export function score(anomalies: TextAnomaly[]) {
  let total = 0;
  let bloquant = false;
  for (const bloc of Object.values(BLOCS)) {
    let v = bloc.poids;
    for (const a of anomalies.filter((x) => bloc.regles.includes(x.regle))) {
      if (a.gravite === "bloquant") {
        v = 0;
        bloquant = true;
      } else v -= bloc.poids * (a.gravite === "majeur" ? 1 / 3 : 1 / 10);
    }
    total += Math.max(0, v);
  }
  const s = Math.round(total);
  return bloquant ? Math.min(s, 49) : s;
}
