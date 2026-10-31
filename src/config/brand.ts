/**
 * CDS — Valeurs de repli de la marque.
 *
 * La source unique est la table `site_settings` (clé « brand »), saisie dans
 * l'administration et lue côté serveur (voir `src/lib/site-config.ts`).
 * Ce fichier ne sert que si la base est vide ou injoignable : valeurs neutres,
 * aucune donnée propre à un projet.
 */

export const brandFallback = {
  /** Nom court affiché dans l'en-tête et le logo. */
  shortName: "Site",
  /** Nom complet utilisé dans les titres et métadonnées. */
  name: "Nouveau site",
  /** Signature affichée dans le pied de page. */
  tagline: "",
  /** URL publique du site (sans slash final) — vide tant qu'elle n'est pas saisie en admin. */
  url: "",
  /**
   * Site fermé aux moteurs de recherche (« noindex » partout, sitemap non annoncé). Faux par défaut :
   * un projet est indexable tant que son administrateur ne coche rien. Réglé en admin, jamais ici.
   */
  horsIndex: false,
  legal: {
    company: "",
    form: "",
    capital: "",
    rcs: "",
    address: "",
    country: "France",
    publisher: "",
  },
  host: {
    name: "",
    detail: "",
    address: "",
    phone: "",
  },
  /**
   * Envoi des e-mails (inscription, mot de passe oublié…) par le service de Lovable.
   * senderDomain : sous-domaine délégué à Lovable (ex. « notify.exemple.fr ») ;
   * fromDomain : domaine affiché dans l'expéditeur (ex. « exemple.fr »).
   */
  email: {
    senderDomain: "",
    fromDomain: "",
  },
  /**
   * Habillage du site. Vide = neutre : jetons de `src/styles.css`, initiale du nom court en guise de
   * logo, icônes et image de partage neutres de `public/`.
   * Images : adresse https (médiathèque) ou chemin commençant par « / ».
   */
  apparence: {
    /** Couleur principale (#rrggbb) : boutons, liens, focus. */
    couleurPrincipale: "",
    /** Couleur de la barre du navigateur sur mobile (#rrggbb). */
    couleurNavigateur: "",
    logo: "",
    /** Petite icône d'onglet (PNG carré, 64 px ou plus). */
    favicon: "",
    /** Icône d'application (PNG carré, 512 px) : écran d'accueil du téléphone. */
    icone: "",
    /** Image de partage sur les réseaux (1200 × 630). */
    imagePartage: "",
  },
  /** Accueil par défaut (tant qu'aucune page d'accueil n'est publiée par le module « pages »). */
  accueil: {
    titre: "",
    texte: "",
  },
};

/** Langue du document (multilingue hors périmètre). */
export const siteLocale = { locale: "fr-FR", lang: "fr", og: "fr_FR" } as const;
