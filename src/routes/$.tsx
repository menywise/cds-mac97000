/**
 * Toute adresse inconnue du site (socle 1.23.0) : une ancienne adresse redirigée part, en
 * redirection permanente, vers sa nouvelle adresse ; sinon, page introuvable. Sert aux
 * installations qui remplacent un ancien site : liens envoyés par e-mail, positions dans les moteurs
 * de recherche. Les anciennes adresses vivent en base (table `redirections`, Admin → Tables).
 */
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { trouverRedirection } from "@/lib/content.functions";

export const Route = createFileRoute("/$")({
  loader: async ({ location }) => {
    const vers = await trouverRedirection({ data: { chemin: location.pathname } });
    if (vers) throw redirect({ href: vers, statusCode: 301 });
    throw notFound();
  },
});
