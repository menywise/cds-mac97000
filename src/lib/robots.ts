// Chemins relatifs : le fichier est aussi chargé tel quel par les tests unitaires (node --test).

/**
 * Robots d'entraînement des modèles d'IA : ils copient les pages pour entraîner un modèle, sans
 * citer ni renvoyer de visiteurs. Refusés partout.
 * Les robots de recherche des IA (OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Claude-User,
 * PerplexityBot…) citent la page et envoient des visiteurs : ils suivent la règle générale, comme
 * Googlebot et Bingbot. Google-Extended ne touche ni la recherche Google ni ses aperçus IA.
 */
export const ROBOTS_ENTRAINEMENT = [
  "GPTBot",
  "ClaudeBot",
  "anthropic-ai",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "Meta-ExternalAgent",
  "Bytespider",
] as const;

/** Espaces privés : rien à explorer, les pages y portent déjà « noindex ». */
const CHEMINS_FERMES = [
  "/admin",
  "/compte",
  "/profil",
  "/reset-password",
  "/merci",
  "/maintenance",
] as const;

/**
 * Texte de robots.txt.
 * Site fermé aux moteurs (`horsIndex`) : l'exploration reste permise, pour que les moteurs lisent
 * le « noindex » des pages et les retirent ; seul le sitemap n'est plus annoncé.
 */
export function texteRobots({ url, horsIndex }: { url: string; horsIndex: boolean }): string {
  const lignes = [
    "User-agent: *",
    "Allow: /",
    ...CHEMINS_FERMES.map((chemin) => `Disallow: ${chemin}`),
    "",
    ...ROBOTS_ENTRAINEMENT.map((robot) => `User-agent: ${robot}`),
    "Disallow: /",
    "",
    ...(url && !horsIndex ? [`Sitemap: ${url}/sitemap.xml`] : []),
  ];
  return `${lignes.join("\n").trimEnd()}\n`;
}
