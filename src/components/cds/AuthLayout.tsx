import { Link } from "@tanstack/react-router";
import { PiedDePageReduit } from "@/components/cds/PiedDePageReduit";
import { useBrandSettings } from "@/hooks/useSiteSettings";

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { settings } = useBrandSettings();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <Link
        to="/"
        title={`${settings.name} — accueil`}
        className="mb-6 flex items-center gap-2 text-sm font-semibold text-foreground"
      >
        <span className="grid size-7 place-items-center rounded bg-primary text-xs font-bold text-primary-foreground">
          {settings.shortName.slice(0, 1).toUpperCase()}
        </span>
        {settings.shortName}
      </Link>

      <div className="w-full max-w-[400px] rounded-xl border border-border bg-card p-8 shadow-[0_4px_12px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04)]">
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>

      {footer && <div className="mt-5 text-sm text-muted-foreground">{footer}</div>}

      <PiedDePageReduit className="mt-8" />
    </div>
  );
}
