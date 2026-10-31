import { createFileRoute } from "@tanstack/react-router";
import { EspaceConnecte } from "@/components/cds/EspaceConnecte";

/**
 * Espace connecté du socle : la garde vit dans `EspaceConnecte`, partagée avec les greffes.
 * Rendu dans le navigateur seul (`ssr: false`) : le serveur n'exécute pas le `head` des pages
 * filles et renverrait une coquille vide sans consigne. Ce `head` et l'en-tête `X-Robots-Tag`,
 * eux, partent du serveur : aucun moteur n'indexe une page de l'espace connecté.
 */
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }),
  headers: () => ({ "X-Robots-Tag": "noindex, nofollow" }),
  component: EspaceConnecte,
});
