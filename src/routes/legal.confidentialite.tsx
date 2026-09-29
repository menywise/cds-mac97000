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
      description:
        `Politique de confidentialité ${editorName(getSiteConfig().brand)} : données collectées, finalités, durées de conservation et droits RGPD.`,
      path: "/legal/confidentialite",
      type: "article",
    }),
  component: ConfidentialitePage,
});

function ConfidentialitePage() {
  const { settings } = useBrandSettings();
  const { legal, host } = settings;
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
          <li>Données d'usage : pages consultées, journaux techniques, adresse IP.</li>
          <li>Données transmises volontairement (formulaires, messages, contributions).</li>
        </ul>
      </Section>
      <Section title="Finalités et bases légales">
        <ul>
          <li>Fourniture du service et gestion du compte — exécution du contrat.</li>
          <li>Sécurité, prévention des abus — intérêt légitime.</li>
          <li>Communications marketing — consentement.</li>
        </ul>
      </Section>
      <Section title="Durée de conservation">
        <p>
          Les données de compte sont conservées pendant la durée d'utilisation du service. Quand
          vous supprimez votre compte, elles sont effacées immédiatement ; vos contributions
          publiques restent en ligne sous le nom « Ancien membre ». Les journaux techniques sont conservés 12 mois. Les messages de
          contact sont conservés 3 ans à compter du dernier échange, puis effacés automatiquement.
          {isFeatureOn("payments")
            ? " Les paiements (montant, date, formation, accord sur la rétractation) sont conservés 10 ans, obligation comptable ; ils sont anonymisés si vous supprimez votre compte."
            : ""}
          {isFeatureOn("reports")
            ? " Un signalement de contenu est conservé le temps de son traitement ; son auteur n'est jamais révélé à la personne signalée."
            : ""}
        </p>
      </Section>
      <Section title="Destinataires et sous-traitants">
        <p>
          {host.name ? `Les données sont hébergées par ${host.name}. ` : ""}D'autres prestataires
          (envoi d'e-mails, mesure d'audience{isFeatureOn("payments") ? ", paiement par carte avec Stripe" : ""}) peuvent intervenir, encadrés par des clauses
          contractuelles conformes au RGPD.
        </p>
      </Section>
      <Section title="Vos droits">
        <p>
          Vous disposez des droits d'accès, de rectification, d'effacement, de limitation,
          d'opposition et de portabilité. Exercez-les via <ContactChannel />. Vous pouvez également introduire une réclamation auprès de la CNIL.
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
