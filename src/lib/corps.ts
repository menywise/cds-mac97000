/**
 * Texte des articles (socle 1.12.0) : analyse sans dépendance (ni base, ni écran), destinée à la
 * copie exacte dans les installations (docs/SYNCHRO.md). Le rendu est dans
 * src/components/cds/CorpsArticle.tsx. Aucun HTML n'est interprété : le texte reste du texte.
 *
 * Syntaxe :
 * - paragraphes séparés par une ligne vide ;
 * - « ## Intertitre » et « ### Sous-intertitre » : ancrés, repris dans le sommaire ;
 * - « - » ou « 1. » en début de ligne : liste à puces ou numérotée ;
 * - « > » : citation ;
 * - « ``` » : bloc de code ;
 * - « :::retenir » … « ::: » : encadré « À retenir » ;
 * - « :::faq » … « ::: » : questions-réponses, une ligne « Q : … » puis une ou plusieurs lignes
 *   « R : … » ou de suite de réponse ;
 * - dans le texte : **gras**, *italique*, `code`, [texte](/adresse ou https://…).
 */

export type Bloc =
  | { type: "h2" | "h3"; texte: string; ancre: string }
  | { type: "p" | "citation" | "code"; texte: string }
  | { type: "ul" | "ol"; items: string[] }
  | { type: "retenir"; lignes: string[] }
  | { type: "faq"; questions: { question: string; reponse: string }[] };

/** Ancre d'un intertitre : minuscules, sans accents, mots reliés par des tirets. */
export function ancreDe(texte: string): string {
  return (
    texte
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60)
      .replace(/-+$/, "") || "section"
  );
}

/** Retire la mise en forme en ligne : texte lisible pour le sommaire et les données structurées. */
export function texteSimple(texte: string): string {
  return texte
    .replace(/\[([^\]]+)\]\([^)\s]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

const REPONSE = /^r\s*:\s*/i;
const QUESTION = /^q\s*:\s*/i;

function analyserFaq(lignes: string[]): { question: string; reponse: string }[] {
  const out: { question: string; reponse: string }[] = [];
  for (const brute of lignes) {
    const ligne = brute.trim();
    if (!ligne) continue;
    if (QUESTION.test(ligne)) {
      out.push({ question: ligne.replace(QUESTION, ""), reponse: "" });
    } else if (out.length > 0) {
      const derniere = out[out.length - 1]!;
      const suite = ligne.replace(REPONSE, "");
      derniere.reponse = derniere.reponse ? `${derniere.reponse} ${suite}` : suite;
    }
  }
  return out.filter((q) => q.question && q.reponse);
}

/** Découpe le texte en blocs. Les ancres sont uniques dans l'article. */
export function analyserCorps(texte: string): Bloc[] {
  const lignes = (texte ?? "").replace(/\r\n/g, "\n").split("\n");
  const blocs: Bloc[] = [];
  const ancres = new Map<string, number>();
  let para: string[] = [];
  let liste: { type: "ul" | "ol"; items: string[] } | null = null;
  let citation: string[] = [];

  const ancreUnique = (t: string) => {
    const base = ancreDe(texteSimple(t));
    const n = (ancres.get(base) ?? 0) + 1;
    ancres.set(base, n);
    return n === 1 ? base : `${base}-${n}`;
  };
  const vider = () => {
    if (para.length) blocs.push({ type: "p", texte: para.join(" ") });
    if (liste) blocs.push(liste);
    if (citation.length) blocs.push({ type: "citation", texte: citation.join(" ") });
    para = [];
    liste = null;
    citation = [];
  };

  for (let i = 0; i < lignes.length; i++) {
    const ligne = lignes[i]!;
    const t = ligne.trim();
    if (t.startsWith("```") || /^:::(retenir|faq)\s*$/i.test(t)) {
      vider();
      const fin = t.startsWith("```") ? "```" : ":::";
      const contenu: string[] = [];
      let j = i + 1;
      while (j < lignes.length && lignes[j]!.trim() !== fin) {
        contenu.push(lignes[j]!);
        j++;
      }
      i = j;
      if (fin === "```") blocs.push({ type: "code", texte: contenu.join("\n") });
      else if (/retenir/i.test(t)) {
        blocs.push({ type: "retenir", lignes: contenu.map((l) => l.trim()).filter(Boolean) });
      } else {
        const questions = analyserFaq(contenu);
        if (questions.length) blocs.push({ type: "faq", questions });
      }
      continue;
    }
    if (t === "") {
      vider();
      continue;
    }
    const titre = /^(#{2,3})\s+(.+)$/.exec(t);
    if (titre) {
      vider();
      blocs.push({
        type: titre[1] === "##" ? "h2" : "h3",
        texte: titre[2]!.trim(),
        ancre: ancreUnique(titre[2]!),
      });
      continue;
    }
    const puce = /^[-*]\s+(.+)$/.exec(t);
    const numero = /^\d+[.)]\s+(.+)$/.exec(t);
    if (puce || numero) {
      const type = puce ? "ul" : "ol";
      if (para.length || citation.length || (liste && liste.type !== type)) vider();
      liste ??= { type, items: [] };
      liste.items.push((puce ?? numero)![1]!);
      continue;
    }
    if (t.startsWith(">")) {
      if (para.length || liste) vider();
      citation.push(t.replace(/^>\s?/, ""));
      continue;
    }
    if (liste || citation.length) vider();
    para.push(t);
  }
  vider();
  return blocs;
}

export type EntreeSommaire = { niveau: 2 | 3; texte: string; ancre: string };

/** Sommaire : les intertitres, dans l'ordre. */
export function sommaire(blocs: Bloc[]): EntreeSommaire[] {
  return blocs.flatMap((b) =>
    b.type === "h2" || b.type === "h3"
      ? [{ niveau: b.type === "h2" ? 2 : 3, texte: texteSimple(b.texte), ancre: b.ancre }]
      : [],
  ) as EntreeSommaire[];
}

/** Le sommaire s'affiche à partir de trois intertitres de premier niveau. */
export const SOMMAIRE_MIN = 3;
export const avecSommaire = (blocs: Bloc[]) =>
  blocs.filter((b) => b.type === "h2").length >= SOMMAIRE_MIN;

/** Questions-réponses de l'article, en texte simple : données structurées FAQPage. */
export function questionsReponses(blocs: Bloc[]): { question: string; reponse: string }[] {
  return blocs.flatMap((b) =>
    b.type === "faq"
      ? b.questions.map((q) => ({
          question: texteSimple(q.question),
          reponse: texteSimple(q.reponse),
        }))
      : [],
  );
}

/** Nombre de mots du texte, mise en forme retirée. */
export function nombreDeMots(texte: string): number {
  return texteSimple(texte.replace(/^[#>:`\-*\d.)\s]+/gm, " "))
    .split(/\s+/)
    .filter(Boolean).length;
}

export type Segment =
  | { type: "texte" | "gras" | "italique" | "code"; texte: string }
  | { type: "lien"; texte: string; href: string; externe: boolean };

const EN_LIGNE = /\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)/g;

/** Mise en forme en ligne. Un lien vers autre chose que « /… », « https://… » ou « mailto: » reste du texte. */
export function segmentsEnLigne(texte: string): Segment[] {
  const out: Segment[] = [];
  let dernier = 0;
  for (const m of texte.matchAll(EN_LIGNE)) {
    const debut = m.index ?? 0;
    if (debut > dernier) out.push({ type: "texte", texte: texte.slice(dernier, debut) });
    if (m[1] !== undefined) out.push({ type: "gras", texte: m[1] });
    else if (m[2] !== undefined) out.push({ type: "italique", texte: m[2] });
    else if (m[3] !== undefined) out.push({ type: "code", texte: m[3] });
    else if (m[5] !== undefined && /^(\/(?!\/)|https:\/\/|mailto:)/.test(m[5])) {
      out.push({ type: "lien", texte: m[4]!, href: m[5], externe: !m[5].startsWith("/") });
    } else out.push({ type: "texte", texte: m[0] });
    dernier = debut + m[0].length;
  }
  if (dernier < texte.length) out.push({ type: "texte", texte: texte.slice(dernier) });
  return out;
}
