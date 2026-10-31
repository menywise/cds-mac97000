// Règles ESLint locales de la charte de style (verrou B, 28/10/2026, docs/CHARTE_STYLE_CDS.md).
// Elles lisent les chaînes du code (className, cn(), clsx(), constantes de classes) :
// - couleurs-nommees : aucune couleur de la palette Tailwind en dur (préfixe simple ou composé),
//   aucune valeur arbitraire de couleur (text-[#…]), aucune variante « dark: » ;
// - intitule-lisible : un titre, une étiquette, un intitulé (h1-h6, label, legend, dt, th, thead,
//   caption) ne s'écrit pas en gris : le gris reste aux métadonnées. Classes lues en chaîne, en
//   gabarit et dans cn() / clsx() (en-tête shadcn TableHead, 31/10/2026).
const PALETTE =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
// Préfixe simple ou composé (text-, border-l-, ring-offset-…), puis teinte et nuance de la palette.
const COULEUR = new RegExp(`(^|[^a-zA-Z0-9_-])(?:[a-z]+-)+(${PALETTE})-[0-9]{2,3}(?![0-9])`);
// Valeur arbitraire de couleur : text-[#ea580c], bg-[rgb(…)], border-l-[oklch(…)]…
const ARBITRAIRE =
  /(^|[^a-zA-Z0-9_-])(?:bg|text|border(?:-[trblxyse])?|ring(?:-offset)?|outline|fill|stroke|from|via|to|decoration|divide|placeholder|caret|accent|shadow)-\[(?:#|rgba?\(|hsla?\(|oklch\(|color:)/;
const SOMBRE = /(^|[^a-zA-Z0-9_-])dark:[a-z]/;
const INTITULES = new Set([
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "label",
  "legend",
  "dt",
  "th",
  "thead",
  "caption",
]);
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
      const c = COULEUR.exec(t) ?? ARBITRAIRE.exec(t);
      if (c) {
        // Classe entière, variante comprise : « hover:bg-emerald-50 », « text-[#ea580c] ».
        const debut = t.lastIndexOf(" ", c.index + c[1].length) + 1;
        const fin = t.indexOf(" ", c.index + c[0].length);
        const classe = t.slice(debut, fin < 0 ? undefined : fin).replace(/^["'`]|["'`]$/g, "");
        context.report({ node, messageId: "couleur", data: { classe } });
      } else if (SOMBRE.test(t)) context.report({ node, messageId: "sombre" });
    };
    return { Literal: verifier, TemplateElement: verifier };
  },
};

/** Classes d'une expression : chaîne, gabarit, appel cn() / clsx(), ternaire, « a && b », objet. */
const classes = (e) => {
  if (!e) return "";
  if (e.type === "Literal") return typeof e.value === "string" ? e.value : "";
  if (e.type === "TemplateLiteral")
    return [...e.quasis.map((q) => q.value.cooked), ...e.expressions.map(classes)].join(" ");
  if (e.type === "CallExpression") return e.arguments.map(classes).join(" ");
  if (e.type === "ConditionalExpression") return `${classes(e.consequent)} ${classes(e.alternate)}`;
  if (e.type === "LogicalExpression") return `${classes(e.left)} ${classes(e.right)}`;
  if (e.type === "ArrayExpression") return e.elements.map(classes).join(" ");
  if (e.type === "ObjectExpression")
    return e.properties
      .map((p) =>
        p.type !== "Property"
          ? ""
          : p.key.type === "Identifier" && !p.computed
            ? p.key.name
            : classes(p.key),
      )
      .join(" ");
  return "";
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
              : v.type === "JSXExpressionContainer"
                ? classes(v.expression)
                : "";
          if (typeof chaine === "string" && GRIS.test(chaine))
            context.report({ node: attr, messageId: "gris", data: { balise } });
        }
      },
    };
  },
};

export { ARBITRAIRE, COULEUR, SOMBRE };

export default {
  meta: { name: "charte" },
  rules: { "couleurs-nommees": couleursNommees, "intitule-lisible": intituleLisible },
};
