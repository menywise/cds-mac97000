import { Link } from "@tanstack/react-router";

/**
 * Renonciation au droit de rétractation pour un contenu numérique fourni immédiatement
 * (art. L221-28 13° du Code de la consommation). Case obligatoire avant tout paiement.
 * Repris de Goldwing (retraction-waiver.tsx).
 */
export function RetractionWaiver({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="mt-4 flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-primary"
      />
      <span>
        Je demande l'accès immédiat à cette formation et je renonce à mon droit de rétractation de
        14 jours dès que l'accès est ouvert (article L221-28 13° du Code de la consommation) —{" "}
        <Link to="/legal/cgv" title="Lire les conditions générales de vente" className="underline">
          voir les CGV
        </Link>
        .
      </span>
    </label>
  );
}
