import { Link2, Linkedin, Facebook } from "lucide-react";
import { toast } from "sonner";
import { absoluteUrl } from "@/lib/site-config";

/** Partage sur les réseaux sociaux + copie du lien. */
export function ShareButtons({ path, title }: { path: string; title: string }) {
  const url = absoluteUrl(path);
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const links = [
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      title: "Partager cet article sur LinkedIn",
      icon: Linkedin,
    },
    {
      label: "X",
      href: `https://x.com/intent/post?url=${encodedUrl}&text=${encodedTitle}`,
      title: "Partager cet article sur X",
      icon: Link2,
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      title: "Partager cet article sur Facebook",
      icon: Facebook,
    },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Lien copié.", { description: "Vous pouvez le coller où vous voulez." });
    } catch {
      toast.error("Copie impossible.", {
        description: "Copiez l'adresse depuis la barre du navigateur.",
      });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">Partager :</span>
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          title={link.title}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex max-md:min-h-11 items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <link.icon className="size-3.5" aria-hidden="true" />
          {link.label}
        </a>
      ))}
      <button
        type="button"
        onClick={copy}
        title="Copier le lien de cet article"
        className="inline-flex max-md:min-h-11 items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Link2 className="size-3.5" aria-hidden="true" />
        Copier le lien
      </button>
    </div>
  );
}
