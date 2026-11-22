import { createFileRoute } from "@tanstack/react-router";
import { isFeatureOn } from "@/config/features";
import { ContactChannel, LegalPage, Section, editorName } from "@/components/cds/LegalPage";
import { useBrandSettings } from "@/hooks/useSiteSettings";
import { getSiteConfig } from "@/lib/site-config";

import { seo } from "@/lib/seo";

export const Route = createFileRoute("/legal/confidentialite")({
  head: () =>
    seo({
      title: "Politique de confidentialité",
      description: `Politique de confidentialité ${editorName(getSiteConfig().brand)} : données collectées, finalités, durées de conservation et droits RGPD.`,
      path: "/legal/confidentialite",
      type: "article",
    }),
  component: ConfidentialitePage,
});

function ConfidentialitePage() {
  const { settings } = useBrandSettings();
  const { legal, host } = settings;
  // Chaque finalité et chaque durée ne s'affichent que si le module concerné est allumé.
  const contact = isFeatureOn("contact");
  const newsletter = isFeatureOn("newsletter");
  const payments = isFeatureOn("payments");
  const shop = isFeatureOn("shop");
  const sales = payments || shop;
  const identity = [
    legal.form ? `${editorName(settings)} (${legal.form})` : editorName(settings),
    legal.address,
    legal.country,
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <LegalPage title="Politique de confidentialité" updatedAt="17 septembre 2026">
      <Section title="Responsable du traitement">
        <p>
          {identity}.{legal.publisher ? ` Responsable : ${legal.publisher}.` : ""} Pour toute
          demande, utilisez <ContactChannel />.
        </p>
      </Section>
      <Section title="Données collectées">
        <ul>
          <li>Données de compte : nom, adresse e-mail, mot de passe chiffré.</li>
          <li>Données techniques : journaux du serveur, adresse IP.</li>
          <li>Données transmises volontairement (formulaires, messages, contributions).</li>
          {newsletter ? <li>Adresse e-mail d'abonnement à la lettre d'information.</li> : null}
          {sales ? (
            <li>Données de commande : article acheté, montant, date, adresse de livraison.</li>
          ) : null}
        </ul>
      </Section>
      <Section title="Finalités et bases légales">
        <ul>
          <li>Fourniture du service et gestion du compte — exécution du contrat.</li>
          <li>Sécurité, prévention des abus — intérêt légitime.</li>
          {contact ? <li>Réponse à vos messages de contact — intérêt légitime.</li> : null}
          {newsletter ? <li>Envoi de la lettre d'information — consentement.</li> : null}
          {sales ? (
            <li>
              Gestion des commandes et des paiements — exécution du contrat ; conservation des
              pièces comptables — obligation légale.
            </li>
          ) : null}
        </ul>
      </Section>
      <Section title="Durée de conservation">
        <p>
          Les données de compte sont conservées pendant la durée d'utilisation du service. Quand
          vous supprimez votre compte, elles sont effacées immédiatement ; vos contributions
          publiques restent en ligne sous le nom « Ancien membre ». Les journaux techniques sont
          conservés 12 mois.
          {contact
            ? " Les messages de contact sont conservés 3 ans à compter du dernier échange, puis effacés automatiquement."
            : ""}
          {newsletter
            ? " L'adresse d'abonnement à la lettre d'information est conservée jusqu'à votre désinscription, que vous pouvez demander à tout moment."
            : ""}
          {payments
            ? " Les paiements (montant, date, formation, accord sur la rétractation) sont conservés 10 ans, obligation comptable ; ils sont anonymisés si vous supprimez votre compte."
            : ""}
          {shop
            ? " Les commandes de la boutique sont conservées 10 ans, obligation comptable."
            : ""}
          {isFeatureOn("reports")
            ? " Un signalement est conservé le temps de son traitement ; son auteur n'est jamais révélé à la personne signalée. L'adresse e-mail facultative d'un visiteur qui signale est effacée 3 mois après le traitement (12 mois au plus sans traitement) ; aucune adresse IP n'est enregistrée. Une capture d'écran jointe à un signalement est facultative : elle n'est vue que des administrateurs, ses métadonnées sont retirées avant l'envoi, et elle est effacée 3 mois après le traitement (12 mois au plus sans traitement), ou aussitôt avec le signalement."
            : ""}
        </p>
      </Section>
      <Section title="Destinataires et sous-traitants">
        <p>
          {host.name ? `Les données sont hébergées par ${host.name}. ` : ""}D'autres prestataires
          (envoi d'e-mails{sales ? ", paiement par carte avec Stripe" : ""}) peuvent intervenir,
          encadrés par des clauses contractuelles conformes au RGPD. Aucun outil de mesure
          d'audience ni de publicité ciblée ne reçoit vos données.
        </p>
      </Section>
      <Section title="Vos droits">
        <p>
          Vous disposez des droits d'accès, de rectification, d'effacement, de limitation,
          d'opposition et de portabilité. Exercez-les via <ContactChannel />. Vous pouvez également
          introduire une réclamation auprès de la CNIL.
        </p>
      </Section>
      <Section title="Sécurité">
        <p>
          Chiffrement des échanges (HTTPS), mots de passe hachés, accès restreints et journalisés.
        </p>
      </Section>
    </LegalPage>
  );
}
