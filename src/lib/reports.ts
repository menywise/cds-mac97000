/** Signalements (repris de Goldwing) : types de contenus, motifs et statuts. Mêmes listes qu'en base. */

export const REPORT_CONTENT_TYPES = [
  { value: "article", label: "Article" },
  { value: "commentaire", label: "Commentaire" },
  { value: "sujet", label: "Discussion du forum" },
  { value: "reponse", label: "Réponse du forum" },
  { value: "avis", label: "Avis" },
  { value: "fiche", label: "Fiche de l'annuaire" },
  { value: "avis_fiche", label: "Avis de l'annuaire" },
  { value: "annonce", label: "Petite annonce" },
  { value: "temoignage", label: "Témoignage" },
  { value: "membre", label: "Profil de membre" },
  { value: "formation", label: "Formation" },
  { value: "autre", label: "Autre" },
] as const;

export const REPORT_REASONS = [
  { value: "spam", label: "Spam ou publicité non sollicitée" },
  { value: "contenu_inapproprie", label: "Contenu inapproprié" },
  { value: "harcelement", label: "Harcèlement ou propos injurieux" },
  { value: "fraude", label: "Arnaque ou contenu frauduleux" },
  { value: "information_erronee", label: "Information erronée" },
  { value: "doublon", label: "Doublon" },
  { value: "droit_auteur", label: "Atteinte au droit d'auteur ou à l'image" },
  { value: "contenu_illegal", label: "Contenu illégal" },
  { value: "autre", label: "Autre" },
] as const;

export const REPORT_STATUSES = [
  { value: "en_attente", label: "À examiner" },
  { value: "examine", label: "Examiné" },
  { value: "action_prise", label: "Action prise" },
  { value: "classe", label: "Écarté" },
] as const;

export type ReportContentType = (typeof REPORT_CONTENT_TYPES)[number]["value"];
export type ReportReason = (typeof REPORT_REASONS)[number]["value"];
export type ReportStatus = (typeof REPORT_STATUSES)[number]["value"];

const labelOf = (list: ReadonlyArray<{ value: string; label: string }>, value: string | null) =>
  list.find((item) => item.value === value)?.label ?? value ?? "—";

export const reportContentTypeLabel = (v: string | null) => labelOf(REPORT_CONTENT_TYPES, v);
export const reportReasonLabel = (v: string | null) => labelOf(REPORT_REASONS, v);
export const reportStatusLabel = (v: string | null) => labelOf(REPORT_STATUSES, v);
