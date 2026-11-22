/** Signalements (ouverts aux visiteurs en 1.7.0) : types de contenus, motifs et statuts. Mêmes listes qu'en base. */

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
  { value: "page", label: "Page du site" },
  { value: "autre", label: "Autre" },
] as const;

export const REPORT_REASONS = [
  { value: "information_erronee", label: "Une information est erronée" },
  { value: "oubli", label: "Une information manque" },
  { value: "correction", label: "Je propose une correction" },
  { value: "affichage", label: "La page s'affiche mal" },
  { value: "spam", label: "Spam ou publicité non sollicitée" },
  { value: "contenu_inapproprie", label: "Contenu inapproprié" },
  { value: "harcelement", label: "Harcèlement ou propos injurieux" },
  { value: "fraude", label: "Arnaque ou contenu frauduleux" },
  { value: "doublon", label: "Doublon" },
  { value: "droit_auteur", label: "Atteinte au droit d'auteur ou à l'image" },
  { value: "contenu_illegal", label: "Contenu illégal" },
  { value: "autre", label: "Autre" },
] as const;

/** Motifs d'amélioration, en tête de la fenêtre : ceux que la page des améliorations met en avant. */
export const REPORT_IMPROVEMENT_REASONS = [
  "information_erronee",
  "oubli",
  "correction",
  "affichage",
] as const;

export const REPORT_STATUSES = [
  { value: "en_attente", label: "À examiner" },
  { value: "examine", label: "Examiné" },
  { value: "action_prise", label: "Action prise" },
  { value: "classe", label: "Écarté" },
] as const;

/** Le même statut, dit au visiteur qui suit son signalement. */
export const REPORT_PUBLIC_STATUSES = [
  { value: "en_attente", label: "Reçu : l'équipe va l'examiner" },
  { value: "examine", label: "Examiné par l'équipe" },
  { value: "action_prise", label: "Pris en compte : la page a été corrigée" },
  { value: "classe", label: "Examiné : aucune modification retenue" },
] as const;

export type ReportContentType = (typeof REPORT_CONTENT_TYPES)[number]["value"];
export type ReportReason = (typeof REPORT_REASONS)[number]["value"];
export type ReportStatus = (typeof REPORT_STATUSES)[number]["value"];

const labelOf = (list: ReadonlyArray<{ value: string; label: string }>, value: string | null) =>
  list.find((item) => item.value === value)?.label ?? value ?? "—";

export const reportContentTypeLabel = (v: string | null) => labelOf(REPORT_CONTENT_TYPES, v);
export const reportReasonLabel = (v: string | null) => labelOf(REPORT_REASONS, v);
export const reportStatusLabel = (v: string | null) => labelOf(REPORT_STATUSES, v);
export const reportPublicStatusLabel = (v: string | null) => labelOf(REPORT_PUBLIC_STATUSES, v);

/** Message lisible pour une erreur rendue par report_submit (codes posés par la base). */
export function reportErrorMessage(error: { code?: string; message: string }): string {
  if (error.code === "23505") return "Vous avez déjà signalé ce contenu : l'équipe l'examine.";
  if (error.code === "CDS04")
    return "Beaucoup de signalements reçus pour le moment : réessayez dans une heure, votre texte reste affiché.";
  if (error.code === "CDS05")
    return "Plusieurs signalements ont déjà été envoyés avec cette adresse aujourd'hui : réessayez demain.";
  if (error.code === "CDS06") return "Ce signalement a déjà été reçu : l'équipe l'examine, merci.";
  if (error.code === "54000") return "Trop de signalements aujourd'hui : réessayez demain.";
  if (error.code === "23514") {
    if (error.message.includes("correction")) return "Indiquez la correction que vous proposez.";
    if (error.message.includes("5 caractères"))
      return "Décrivez ce que vous avez vu en quelques mots.";
    return "Vérifiez votre saisie : un seul lien au plus, adresse e-mail valide.";
  }
  return "Envoi impossible pour le moment : réessayez dans un instant.";
}
