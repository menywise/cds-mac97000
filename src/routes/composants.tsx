import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/cds/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { toast } from "sonner";

import { seo } from "@/lib/seo";
import { requireFeature } from "@/config/features";

export const Route = createFileRoute("/composants")({
  beforeLoad: () => requireFeature("showcase"),
  head: () =>
    seo({
      title: "Composants",
      description:
        "Composants du Consensus Design System : boutons, champs, tableaux, badges, alertes, onglets, pagination, fenêtres modales et chargement.",
      path: "/composants",
      type: "website",
    }),
  component: ComposantsPage,
});

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-4 rounded-xl border border-border bg-card p-6">{children}</div>
    </section>
  );
}

const rows = [
  { name: "Facture 2026-014", status: "Payée", amount: "1 240,00 €", variant: "default" as const },
  {
    name: "Facture 2026-015",
    status: "En attente",
    amount: "860,00 €",
    variant: "secondary" as const,
  },
  {
    name: "Facture 2026-016",
    status: "Impayée",
    amount: "320,00 €",
    variant: "destructive" as const,
  },
];

function ComposantsPage() {
  return (
    <PageShell>
      <h1 className="text-3xl font-bold text-foreground">Composants</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Composants shadcn/ui rendus avec les tokens CDS.
      </p>

      <Block title="Boutons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Principal</Button>
          <Button variant="secondary">Secondaire</Button>
          <Button variant="outline">Contour</Button>
          <Button variant="ghost">Discret</Button>
          <Button variant="destructive">Supprimer</Button>
          <Button size="sm">Petit</Button>
          <Button disabled>Désactivé</Button>
        </div>
      </Block>

      <Block title="Champs de formulaire">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="c-email">E-mail</Label>
            <Input id="c-email" placeholder="nom@exemple.fr" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-pass">Mot de passe</Label>
            <Input id="c-pass" type="password" placeholder="••••••••" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="c-msg">Message</Label>
            <Textarea id="c-msg" placeholder="Votre message…" />
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox id="c-check" />{" "}
              <Label htmlFor="c-check" className="font-normal">
                Case à cocher
              </Label>
            </span>
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Switch id="c-switch" />{" "}
              <Label htmlFor="c-switch" className="font-normal">
                Interrupteur
              </Label>
            </span>
          </div>
        </div>
      </Block>

      <Block title="Badges">
        <div className="flex flex-wrap gap-2">
          <Badge>Par défaut</Badge>
          <Badge variant="secondary">Secondaire</Badge>
          <Badge variant="outline">Contour</Badge>
          <Badge variant="destructive">Erreur</Badge>
        </div>
      </Block>

      <Block title="Cartes">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Titre de carte</CardTitle>
              <CardDescription>Description courte de la carte.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Contenu de la carte, rayon 12px et ombre douce.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Statistique</CardTitle>
              <CardDescription>Ce mois-ci</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">1 248</p>
            </CardContent>
          </Card>
        </div>
      </Block>

      <Block title="Alertes">
        <div className="space-y-3">
          <Alert>
            <AlertTitle>Information</AlertTitle>
            <AlertDescription>Message neutre à destination de l'utilisateur.</AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>Identifiants incorrects, veuillez réessayer.</AlertDescription>
          </Alert>
        </div>
      </Block>

      <Block title="Fil d'Ariane">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/" title="Revenir à la page d'accueil">
                Accueil
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Composants</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </Block>

      <Block title="Onglets">
        <Tabs defaultValue="apercu">
          <TabsList>
            <TabsTrigger value="apercu">Aperçu</TabsTrigger>
            <TabsTrigger value="details">Détails</TabsTrigger>
            <TabsTrigger value="historique">Historique</TabsTrigger>
          </TabsList>
          <TabsContent value="apercu" className="pt-4 text-sm text-muted-foreground">
            Contenu de l'onglet Aperçu.
          </TabsContent>
          <TabsContent value="details" className="pt-4 text-sm text-muted-foreground">
            Contenu de l'onglet Détails.
          </TabsContent>
          <TabsContent value="historique" className="pt-4 text-sm text-muted-foreground">
            Contenu de l'onglet Historique.
          </TabsContent>
        </Tabs>
      </Block>

      <Block title="Tableau">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Montant</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.name}>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell>
                  <Badge variant={row.variant}>{row.status}</Badge>
                </TableCell>
                <TableCell className="text-right">{row.amount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Block>

      <Block title="Pagination">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" title="Page précédente" />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#" isActive title="Page 1">
                1
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#" title="Page 2">
                2
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#" title="Page 3">
                3
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#" title="Page suivante" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </Block>

      <Block title="Liste vide">
        <div className="rounded-lg border border-dashed border-border p-10 text-center">
          <p className="text-sm font-medium text-foreground">Aucun élément pour le moment</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Les éléments que vous créerez apparaîtront ici.
          </p>
          <Button className="mt-4" size="sm">
            Créer un élément
          </Button>
        </div>
      </Block>

      <Block title="Chargement">
        <div className="space-y-3">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      </Block>

      <Block title="Fenêtre modale">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" title="Ouvrir la fenêtre de confirmation">
              Ouvrir la fenêtre
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmer la suppression</DialogTitle>
              <DialogDescription>
                Cette action est définitive et ne peut pas être annulée.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline">Annuler</Button>
              <Button variant="destructive">Supprimer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Block>

      <Block title="Notifications">
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => toast.success("Modification enregistrée.")}>
            Succès
          </Button>
          <Button variant="outline" onClick={() => toast.error("Une erreur est survenue.")}>
            Erreur
          </Button>
          <Button variant="outline" onClick={() => toast("Information enregistrée.")}>
            Information
          </Button>
        </div>
      </Block>
    </PageShell>
  );
}
