# Cloner CDS pour un nouveau projet

CDS est le **socle**. Chaque projet (un annuaire, une vitrine, une boutique…) est un **clone** : il
part du socle, règle son identité, allume ses modules, puis ajoute ce qui lui est propre **dans son
propre dépôt**. Le socle ne contient jamais rien de propre à un projet : ni nom, ni domaine, ni
dépôt d'un projet réel. Les exemples de ce document sont fictifs (`exemple.fr`, « le premier
clone »).

Durée indicative : une heure, hors contenus.

## 1. Créer le clone

1. Dans Lovable, ouvrir le projet du socle → menu du projet → **Remix**. Nommer le clone
   (par exemple « Le premier clone »).
2. Dans le clone : **GitHub → Connect** pour créer son dépôt (`<organisation>/<nom>`).
3. Activer **Lovable Cloud** si ce n'est pas fait : le clone a sa propre base de données, vide.

## 2. Passer le SQL du socle

Le remix copie le code ; les données du socle ne suivent pas. Vérifier dans le clone (Cloud →
Database) si les tables existent déjà. Sinon, dans l'éditeur SQL du clone (Cloud → SQL), passer les
migrations de `supabase/migrations/` dans l'ordre des noms de fichiers. Pour les lots livrés en
blocs (`supabase/seed/<lot>/`), passer les blocs à la place de la migration, un par un.

Règles de l'éditeur de Lovable : il coupe le script à chaque ligne vide et refuse l'antislash et
l'opérateur « ? ». Les blocs du socle les respectent déjà.

## 3. Devenir administrateur

Créer son compte sur la prévisualisation du clone **avant de publier** : sur une base sans
administrateur, le premier compte qui se connecte devient administrateur, une seule fois. Les
suivants sont de simples membres ; un administrateur en nomme d'autres dans Administration →
Utilisateurs. Le dernier administrateur ne peut ni se retirer ni supprimer son compte.

## 4. Régler l'identité (Administration → Paramètres)

- Nom complet, nom court, signature.
- **Adresse publique** (`https://…`) : liens canoniques, plan du site, e-mails.
- Mentions légales (société, adresse, directeur de la publication) et hébergeur.
- **Apparence** : couleur principale, couleur de la barre du navigateur, logo, icône d'onglet,
  icône d'application et image de partage (déposées dans la médiathèque). Vide : habillage neutre.
- **Page d'accueil** : titre et texte de l'accueil par défaut, en attendant une page d'accueil du
  module « Pages ».
- **Envoi des e-mails** : sous-domaine délégué au service de Lovable (Cloud → Emails, par exemple
  `notify.exemple.fr`) et domaine de l'expéditeur (`exemple.fr`). Chaque site à domaine propre gère
  ses e-mails ; un site sans domaine propre peut utiliser le sous-domaine d'envoi d'un autre site de
  la même organisation, déjà validé chez le registraire.

## 5. Secrets d'environnement (Lovable → Cloud → Secrets)

| Secret | Quand | Rôle |
| --- | --- | --- |
| `LOVABLE_API_KEY` | toujours (fourni par Lovable) | service d'envoi des e-mails |
| `LOVABLE_CRON_SECRET` | conseillé | tâches planifiées (purge des messages de contact) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | paiement des formations ou Boutique | Stripe ; webhook vers `<adresse>/api/stripe-webhook` |
| `CDS_RECETTE_*` (secrets GitHub) | recette en écriture réelle | comptes de test du robot |
| `CDS_GEO_URL`, `CDS_GEO_CLE` | géographie du projet (socle 1.5.0) | adresse du référentiel géographique du Studio (GeoAnnonces) et clé d'accès propre au projet ; import par Administration → Géographie |
| `CDS_URL_PUBLIQUE` (variable GitHub) | recette du site public | adresse en ligne visée par le workflow « Recette du site public » (lancement manuel ; sur le poste : `scripts/recette-locale.ps1`) |

Les clés ne vont jamais dans le code ni en base.

## 6. Choisir les modules (Administration → Modules)

Les modules sont les briques facultatives du projet : **tous éteints au départ**. Allumer ceux dont le
projet a besoin, dépendances comprises, puis enregistrer ; enregistrer sans rien allumer vaut aussi
choix. L'écran Démarrage reste « à faire » tant qu'aucun choix n'est enregistré. Un module éteint ne
laisse aucune trace (pages, menus, plan du site, administration).

Le pilotage (conformité, recettage), la médiathèque (logo, icônes, image de partage) et la recherche
ne sont pas des modules : ce sont des outils d'administration du socle, toujours allumés.

## 7. Retirer la démonstration (Administration → Démarrage)

L'écran **Démarrage** liste ce qui reste à régler et retire, en deux gestes :

- les **exemples de la recette** (contenus « Exemple — » et leur membre fictif) ;
- les **contenus de démarrage** (FAQ, offres, article d'origine), sauf ceux déjà modifiés.

## 8. Ajouter ce qui est propre au projet : écrire une greffe

Une **greffe** est ce qu'un projet ajoute au socle : ses modules, ses pages, ses tables. Règle
(Loi des Quatre Interdits) : un projet ne modifie **jamais** un fichier ni une table du socle. Tout
ce qui lui appartient porte la marque `greffe` et vit dans des emplacements que le socle ne touche
pas. Depuis le socle 1.3.0, le socle lit ces ajouts lui-même.

| Quoi | Où | Forme |
| --- | --- | --- |
| Déclarations (modules, menus, pages) | `src/greffe/index.ts` | la « prise », livrée vide par le socle |
| Code (fonctions, composants) | `src/greffe/` | libre |
| Pages | `src/routes/(greffe)/` | le dossier entre parenthèses ne change pas les adresses |
| Pages connectées | `src/routes/(greffe)/_connecte/` | avec la mise en page ci-dessous |
| Tables, fonctions, politiques SQL | `supabase/greffe/` | objets nommés `greffe_<nom>`, blocs rejouables |
| Modules | dans la prise | clé `greffe_<nom>` (minuscules, chiffres, soulignés) |
| Tests | `tests/greffe/` | libre |

### La prise : `src/greffe/index.ts`

Le socle la livre vide et ne la modifie plus jamais : une mise à niveau n'y crée pas de conflit.
Ce qui peut y être déclaré est décrit dans `src/config/greffe.ts`. Exemple :

```ts
import type { GreffeDeclaration } from "../config/greffe.ts";

export const GREFFE: GreffeDeclaration = {
  modules: [
    {
      key: "greffe_veille",
      label: "Veille de sites",
      definition: "Le site découvre de nouveaux sites, les analyse et repère ceux qui ne répondent plus.",
      requires: ["directory"],
    },
  ],
  menuAdmin: [{ to: "/admin/veille", label: "Veille", title: "Découverte et surveillance des sites", module: "greffe_veille" }],
  menuMembre: [{ to: "/proposer-un-site", label: "Proposer un site", title: "Signaler un site à ajouter", module: "greffe_veille" }],
  pagesProtegees: [
    { prefix: "/admin/veille", anyOf: ["greffe_veille"] },
    { prefix: "/proposer-un-site", anyOf: ["greffe_veille"] },
  ],
  recette: [{ path: "/admin/veille", label: "Veille", role: "admin", module: "greffe_veille" }],
};
```

Effets : le module apparaît dans Administration → Modules, éteint par défaut, avec sa définition ;
les liens apparaissent dans les menus quand il est allumé ; ses pages renvoient à l'accueil quand il
est éteint ; le robot de recette les ouvre. Champs disponibles : `modules`, `menuPublic`,
`menuMembre`, `piedDePage` (avec `colonne`), `menuAdmin`, `pagesProtegees`, `pagesPubliques`
(plan du site et sitemap), `recette`.

Fichier sans alias `@/` : il est lu aussi par Node (tests, robot). Importer en chemin relatif avec
l'extension `.ts`.

### Pages

Page publique : `src/routes/(greffe)/ma-page.tsx`, adresse `/ma-page`. Si elle dépend d'un module :
`beforeLoad: () => requireFeature("greffe_x")`, et la déclarer dans `pagesPubliques` pour le plan
du site.

Lecture de la base dans une fonction serveur : chaque résultat `{ data, error }` passe par
`check()` (`src/lib/check.ts`), qui journalise la panne côté serveur et lève un message neutre, au
lieu de renvoyer une liste vide. La page déclare alors
`errorComponent: erreurChargement("Les fiches n'ont pas pu être chargées.")`
(`src/components/cds/ErreurChargement.tsx`) : état d'erreur et bouton « Réessayer ».

Pages connectées : une mise en page de quelques lignes, puis les pages dessous.

```tsx
// src/routes/(greffe)/_connecte/route.tsx
import { createFileRoute } from "@tanstack/react-router";
import { EspaceConnecte } from "@/components/cds/EspaceConnecte";

export const Route = createFileRoute("/(greffe)/_connecte")({ ssr: false, component: EspaceConnecte });
```

`src/routes/(greffe)/_connecte/admin.veille.tsx` répond à `/admin/veille`, avec `AdminShell` du
socle. Toute page connectée rattachée à un module se déclare dans `pagesProtegees` : un test
(`tests/unit/modules-pages-protegees.test.ts`) refuse l'oubli.

### Tables : étendre une fiche du socle sans toucher sa table

Une table de greffe est liée par id à la fiche du socle, supprimée avec elle, et reprend ses droits
avec les fonctions du socle (ici, une fiche de l'annuaire métier) :

```sql
CREATE TABLE IF NOT EXISTS public.greffe_sites (
  listing_id uuid PRIMARY KEY REFERENCES public.directory_listings(id) ON DELETE CASCADE,
  technologies text[] NOT NULL DEFAULT '{}'
);
ALTER TABLE public.greffe_sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY greffe_sites_lecture ON public.greffe_sites FOR SELECT TO anon, authenticated
  USING (public.directory_listing_visible(listing_id) AND public.module_enabled('greffe_veille'));
CREATE POLICY greffe_sites_ecriture ON public.greffe_sites FOR ALL TO authenticated
  USING (public.directory_listing_modifiable(listing_id))
  WITH CHECK (public.directory_listing_modifiable(listing_id));
```

Le SQL d'une greffe se range dans `supabase/greffe/` (le Remix retire `supabase/migrations`), en
blocs rejouables pour l'éditeur SQL de Lovable, comme ceux du socle.

### Grille de conformité

Une greffe ajoute ses points de contrôle à la grille avec ses modules (`modules = ARRAY['greffe_veille']`)
et un code qui commence par `GREFFE-`. Ils ne comptent dans le score que si le module est allumé
(socle 1.4.0).

### Ce que la greffe ne fait pas

- Modifier un fichier hors des emplacements ci-dessus, ou une table du socle (ni colonne, ni
  contrainte, ni politique).
- Nommer un objet sans la marque : un futur objet du socle pourrait porter le même nom.
- Réécrire le réglage « modules » en effaçant les clés `greffe_…`.

## 9. Recevoir les améliorations du socle

Le socle évolue (nouveaux modules, correctifs). Pour les reporter dans un clone : ajouter le dépôt du
socle comme source distante, fusionner sa branche `main` dans le clone (jamais de réécriture
d'historique), puis passer dans la base du clone les nouvelles migrations du socle. Garder les
ajouts du clone dans des fichiers à part limite les conflits.
Mode d'emploi détaillé et ordre des étapes : `docs/MISE_A_NIVEAU.md`.
