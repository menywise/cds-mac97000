/**
 * CDS — Ce qu'un projet peut déclarer dans sa prise de greffe (`src/greffe/index.ts`).
 *
 * Un projet est un clone du socle. Il ne modifie jamais un fichier du socle (Loi des Quatre
 * Interdits) : il ajoute ses modules, ses liens de menu, ses pages protégées, ses pages publiques
 * et ses pages de recette dans sa prise, que le socle lit partout où il avait une liste fermée.
 * Mode d'emploi : docs/CLONER.md, « Écrire une greffe ».
 *
 * Fichier sans alias « @/ » : lu aussi par Node (tests unitaires, robot de recette).
 */
import type { FeatureKey, GreffeKey } from "./modules.ts";
import type { QaPage } from "../lib/qa-plan.ts";
import type { NiveauAgent, NiveauCle } from "../lib/agents.ts";

/** Module propre au projet : éteint par défaut, allumé dans Administration → Modules. */
export type GreffeModule = {
  /** `greffe_<nom>` : minuscules, chiffres et soulignés, 40 caractères au plus après « greffe_ ». */
  key: GreffeKey;
  label: string;
  /** Une phrase : ce que le module fait pour le visiteur ou le client. */
  definition: string;
  /** Modules (du socle ou du projet) à allumer avec lui. */
  requires?: readonly FeatureKey[];
};

/** Lien de menu. Masqué quand son module est éteint (ou quand tous ceux d'`anyOf` le sont). */
export type GreffeLien = {
  to: string;
  label: string;
  title: string;
  module?: FeatureKey;
  anyOf?: readonly FeatureKey[];
};

/** Page publique : listée dans le plan du site et dans le sitemap. */
export type GreffePagePublique = {
  path: string;
  label: string;
  module?: FeatureKey;
  /** Faux : plan du site seulement, pas de sitemap (page sans intérêt pour les moteurs). */
  sitemap?: boolean;
};

/** Ce qu'une action reçoit : la clé authentifiée, ses paramètres, et de quoi journaliser. */
export type ContexteActionAgent = {
  agent: { id: string; nom: string; niveau: NiveauCle; usage_code: string | null };
  params: unknown;
  /** Toute écriture s'inscrit au journal des agents (table, ligne, champ, avant, après). */
  journaliser: (entree: {
    table_cible: string;
    ligne_id?: string | null;
    champ?: string | null;
    avant?: string | null;
    apres?: string | null;
  }) => Promise<void>;
};

/**
 * Action qu'un co-intervenant IA peut appeler sur /api/agent (socle 1.17.0). Elle exige soit un
 * niveau de l'échelle (`niveau` : lecture, completer ou corriger), soit un usage nommé (`usage`,
 * socle 1.21.0) : seules les clés de cet usage la font.
 */
export type ActionAgent = (
  { niveau: NiveauAgent; usage?: never } | { usage: string; niveau?: never }
) & {
  /** Une phrase, rendue par l'action « aide ». */
  description: string;
  executer: (contexte: ContexteActionAgent) => Promise<unknown>;
};

export type GreffeDeclaration = {
  modules?: readonly GreffeModule[];
  menuPublic?: readonly GreffeLien[];
  menuMembre?: readonly GreffeLien[];
  /** Lien ajouté à une colonne existante du pied de page. */
  piedDePage?: readonly (GreffeLien & { colonne: "Découvrir" | "Communauté" | "Aide" })[];
  menuAdmin?: readonly GreffeLien[];
  /** Pages renvoyées à l'accueil par le serveur quand tous leurs modules sont éteints. */
  pagesProtegees?: readonly { prefix: string; anyOf: readonly FeatureKey[] }[];
  pagesPubliques?: readonly GreffePagePublique[];
  /** Pages ouvertes par le robot de recette, comme celles du socle. */
  recette?: readonly QaPage[];
  /** Actions ouvertes aux co-intervenants IA par /api/agent ; la clé est authentifiée par le socle. */
  actionsAgent?: Readonly<Record<string, ActionAgent>>;
};
