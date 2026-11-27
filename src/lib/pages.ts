/**
 * CDS — Pages libres par sections (module « pages »).
 *
 * Le contenu d'une page suit le format de données de Puck (éditeur de pages React, licence MIT) :
 *   { root: { props: {} }, content: [{ type: "Hero", props: { id: "Hero-ab12", title: "…" } }] }
 * La description des sections (`SECTIONS`) reprend la forme d'une configuration Puck
 * (`fields`, `defaultProps`) : l'éditeur Puck pourra se brancher plus tard sans migrer les pages.
 * Aujourd'hui, l'édition passe par des formulaires (`/admin/pages`) et le rendu par nos composants CDS.
 * Règles d'accès et contrôle du format : migration `20260929200000_v0_lot5c_pages.sql`.
 */
import { jsonLdScript } from "./seo.ts";

export type SectionProps = Record<string, unknown> & { id: string };
export type Section = { type: string; props: SectionProps };
export type PageData = { root: { props: Record<string, unknown> }; content: Section[] };

export type PageRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  data: PageData;
  is_home: boolean;
  /** Satellite d'une campagne : noindex, hors plan du site et recherche (socle 1.22.0). */
  hors_index: boolean;
  published: boolean;
  published_at: string | null;
  updated_at: string;
};

/** Types de champs : ceux de Puck (`text`, `textarea`, `select`, `array`) + `image` et `link` (champs personnalisés). */
export type Field =
  | { type: "text"; label: string }
  | { type: "textarea"; label: string }
  | { type: "image"; label: string }
  | { type: "link"; label: string }
  | { type: "select"; label: string; options: ReadonlyArray<{ label: string; value: string }> }
  | {
      type: "array";
      label: string;
      itemLabel: string;
      arrayFields: Record<string, Field>;
      max: number;
    };

export type SectionDef = {
  label: string;
  description: string;
  fields: Record<string, Field>;
  defaultProps: Record<string, unknown>;
};

export const SECTIONS = {
  Hero: {
    label: "Bandeau d'accueil",
    description: "Grand titre, phrase d'accroche, image et boutons.",
    fields: {
      eyebrow: { type: "text", label: "Surtitre" },
      title: { type: "text", label: "Titre" },
      subtitle: { type: "textarea", label: "Accroche" },
      image: { type: "image", label: "Image" },
      imageAlt: { type: "text", label: "Description de l'image" },
      ctaLabel: { type: "text", label: "Bouton principal : texte" },
      ctaHref: { type: "link", label: "Bouton principal : lien" },
      secondaryLabel: { type: "text", label: "Bouton secondaire : texte" },
      secondaryHref: { type: "link", label: "Bouton secondaire : lien" },
    },
    defaultProps: { eyebrow: "", title: "Votre titre", subtitle: "", image: "", imageAlt: "" },
  },
  Text: {
    label: "Texte",
    description: "Un titre et un texte enrichi (gras, italique, liens, listes).",
    fields: {
      title: { type: "text", label: "Titre" },
      body: { type: "textarea", label: "Texte" },
    },
    defaultProps: { title: "", body: "" },
  },
  ImageText: {
    label: "Image et texte",
    description: "Une image à côté d'un texte, avec un bouton.",
    fields: {
      title: { type: "text", label: "Titre" },
      body: { type: "textarea", label: "Texte" },
      image: { type: "image", label: "Image" },
      imageAlt: { type: "text", label: "Description de l'image" },
      imageSide: {
        type: "select",
        label: "Position de l'image",
        options: [
          { label: "À gauche", value: "left" },
          { label: "À droite", value: "right" },
        ],
      },
      ctaLabel: { type: "text", label: "Bouton : texte" },
      ctaHref: { type: "link", label: "Bouton : lien" },
    },
    defaultProps: { title: "", body: "", image: "", imageAlt: "", imageSide: "left" },
  },
  Features: {
    label: "Points forts",
    description: "Une grille de 2 à 6 atouts, chacun avec un titre et un texte.",
    fields: {
      title: { type: "text", label: "Titre" },
      intro: { type: "textarea", label: "Introduction" },
      items: {
        type: "array",
        label: "Atouts",
        itemLabel: "Atout",
        max: 12,
        arrayFields: {
          title: { type: "text", label: "Titre" },
          text: { type: "textarea", label: "Texte" },
        },
      },
    },
    defaultProps: { title: "", intro: "", items: [{ title: "", text: "" }] },
  },
  Image: {
    label: "Image seule",
    description: "Une image pleine largeur avec une légende.",
    fields: {
      image: { type: "image", label: "Image" },
      imageAlt: { type: "text", label: "Description de l'image" },
      caption: { type: "text", label: "Légende" },
    },
    defaultProps: { image: "", imageAlt: "", caption: "" },
  },
  Faq: {
    label: "Questions fréquentes",
    description: "Une liste de questions et réponses dépliables.",
    fields: {
      title: { type: "text", label: "Titre" },
      items: {
        type: "array",
        label: "Questions",
        itemLabel: "Question",
        max: 30,
        arrayFields: {
          question: { type: "text", label: "Question" },
          answer: { type: "textarea", label: "Réponse" },
        },
      },
    },
    defaultProps: { title: "Questions fréquentes", items: [{ question: "", answer: "" }] },
  },
  CallToAction: {
    label: "Appel à l'action",
    description: "Un encadré qui invite à passer à l'action.",
    fields: {
      title: { type: "text", label: "Titre" },
      text: { type: "textarea", label: "Texte" },
      ctaLabel: { type: "text", label: "Bouton : texte" },
      ctaHref: { type: "link", label: "Bouton : lien" },
    },
    defaultProps: { title: "", text: "", ctaLabel: "", ctaHref: "" },
  },
} as const satisfies Record<string, SectionDef>;

export type SectionType = keyof typeof SECTIONS;

export function isSectionType(type: string): type is SectionType {
  return Object.prototype.hasOwnProperty.call(SECTIONS, type);
}

export const emptyPageData = (): PageData => ({ root: { props: {} }, content: [] });

/** Lit une valeur venue de la base : toujours un PageData exploitable (sections inconnues gardées, ignorées au rendu). */
export function normalizePageData(value: unknown): PageData {
  const v = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const content = Array.isArray(v["content"]) ? v["content"] : [];
  const root = v["root"] && typeof v["root"] === "object" ? (v["root"] as PageData["root"]) : null;
  return {
    root: { props: root?.props && typeof root.props === "object" ? root.props : {} },
    content: content
      .filter(
        (s): s is { type: string; props: Record<string, unknown> } =>
          !!s &&
          typeof s === "object" &&
          typeof (s as Section).type === "string" &&
          !!(s as Section).props &&
          typeof (s as Section).props === "object",
      )
      .map((s, index) => ({
        type: s.type,
        props: {
          ...s.props,
          id: typeof s.props["id"] === "string" ? (s.props["id"] as string) : `${s.type}-${index}`,
        },
      })),
  };
}

/** Ligne lue en base (contenu brut) → page exploitable. */
export function toPageRow<T extends Omit<PageRow, "data"> & { data: unknown }>(
  row: T | null,
): PageRow | null {
  return row ? { ...row, data: normalizePageData(row.data) } : null;
}

export function newSection(type: SectionType): Section {
  const id = `${type}-${crypto.randomUUID().slice(0, 8)}`;
  return { type, props: { ...structuredClone(SECTIONS[type].defaultProps), id } as SectionProps };
}

/** Texte d'un réglage (chaîne attendue, sinon vide). */
export function str(props: Record<string, unknown>, key: string) {
  const value = props[key];
  return typeof value === "string" ? value : "";
}

/** Liste d'éléments d'un réglage `array`. */
export function items(props: Record<string, unknown>, key: string): Array<Record<string, unknown>> {
  const value = props[key];
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    : [];
}

/** Lien sûr : chemin interne, https, mailto, tel. Sinon `null` (le bouton n'est pas affiché). */
export function safeHref(url: string) {
  const clean = url.trim();
  return /^(\/(?!\/)|https:\/\/|mailto:|tel:|#)/i.test(clean) ? clean : null;
}

/** Image sûre : https ou chemin interne. */
export function safeImage(url: string) {
  const clean = url.trim();
  return /^(https:\/\/|\/(?!\/))/i.test(clean) ? clean : null;
}

/** Texte brut pour la description SEO par défaut (premier texte rencontré). */
export function pageExcerpt(data: PageData) {
  for (const section of data.content) {
    for (const key of ["subtitle", "body", "text", "intro"]) {
      const value = str(section.props, key)
        .replace(/[*_`#>[\]()]/g, "")
        .trim();
      if (value) return value.slice(0, 160);
    }
  }
  return "";
}

/** Données structurées FAQPage si la page contient des questions (référencement). */
export function pageFaqJsonLd(data: PageData) {
  const questions = data.content
    .filter((s) => s.type === "Faq")
    .flatMap((s) => items(s.props, "items"))
    .filter((item) => str(item, "question") && str(item, "answer"));
  if (!questions.length) return null;
  return jsonLdScript({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((item) => ({
      "@type": "Question",
      name: str(item, "question"),
      acceptedAnswer: { "@type": "Answer", text: str(item, "answer") },
    })),
  });
}
