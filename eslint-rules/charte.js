// Règles ESLint locales de la charte de style (verrou B, 28/10/2026, docs/CHARTE_STYLE_CDS.md).
// Elles lisent les chaînes du code (className, cn(), clsx(), constantes de classes) :
// - couleurs-nommees : aucune couleur de la palette Tailwind en dur, aucune variante « dark: » ;
// - intitule-lisible : un titre, une étiquette, un intitulé (h1-h6, label, legend, dt, th) ne
//   s'écrit pas en gris : le gris reste aux métadonnées.
const PALETTE =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const COULEUR = new RegExp(`(^|[^a-zA-Z0-9_-])[a-z]+-(${PALETTE})-[0-9]{2,3}(?![0-9])`);
const SOMBRE = /(^|[^a-zA-Z0-9_-])dark:[a-z]/;
const INTITULES = new Set(["h1", "h2", "h3", "h4", "h5", "h6", "label", "legend", "dt", "th"]);
const GRIS = /(^|\s)text-muted-foreground(\s|$)/;

/** Texte brut d'une chaîne ou d'un morceau de gabarit. */
const texte = (node) =>
  node.type === "Literal" && typeof node.value === "string"
    ? node.value
    : node.type === "TemplateElement"
      ? (node.value.cooked ?? "")
      : null;

const couleursNommees = {
  meta: {
    type: "problem",
    docs: { description: "Couleurs nommées de la charte, thème clair seul" },
    messages: {
      couleur:
        "Couleur Tailwind en dur « {{classe}} » : utiliser une couleur nommée (bg-success-soft, text-warning-text, border-danger-border…).",
      sombre: "Variante sombre « dark: » : la charte est en thème clair seul.",
    },
    schema: [],
  },
  create(context) {
    const verifier = (node) => {
      const t = texte(node);
      if (!t) return;
      const c = COULEUR.exec(t);
      if (c) context.report({ node, messageId: "couleur", data: { classe: c[0].trim() } });
      else if (SOMBRE.test(t)) context.report({ node, messageId: "sombre" });
    };
    return { Literal: verifier, TemplateElement: verifier };
  },
};

const intituleLisible = {
  meta: {
    type: "problem",
    docs: { description: "Titres, étiquettes et intitulés en texte principal" },
    messages: {
      gris: "<{{balise}}> en text-muted-foreground : un intitulé s'écrit en texte principal ; le gris reste aux métadonnées.",
    },
    schema: [],
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        const balise = node.name.type === "JSXIdentifier" ? node.name.name : "";
        if (!INTITULES.has(balise.toLowerCase())) return;
        for (const attr of node.attributes) {
          if (attr.type !== "JSXAttribute" || attr.name.name !== "className" || !attr.value)
            continue;
          const v = attr.value;
          const chaine =
            v.type === "Literal"
              ? v.value
              : v.type === "JSXExpressionContainer" && v.expression.type === "TemplateLiteral"
                ? v.expression.quasis.map((q) => q.value.cooked).join(" ")
                : v.type === "JSXExpressionContainer" && v.expression.type === "Literal"
                  ? v.expression.value
                  : "";
          if (typeof chaine === "string" && GRIS.test(chaine))
            context.report({ node: attr, messageId: "gris", data: { balise } });
        }
      },
    };
  },
};

export default {
  meta: { name: "charte" },
  rules: { "couleurs-nommees": couleursNommees, "intitule-lisible": intituleLisible },
};
