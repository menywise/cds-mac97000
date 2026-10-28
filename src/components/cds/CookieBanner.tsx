import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useHauteurReservee } from "@/hooks/useHauteurReservee";

const STORAGE_KEY = "cds.cookie-consent";
const OPEN_EVENT = "cds:cookie-banner-open";

export type CookieConsent = "accepted" | "refused";

export function getCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "accepted" || value === "refused" ? value : null;
  } catch {
    return null;
  }
}

/** Rouvre le bandeau pour modifier son choix (lien « Gérer les cookies »). */
export function openCookieBanner() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OPEN_EVENT));
}

/**
 * Bandeau de consentement aux cookies non essentiels (mesure d'audience).
 * Aucun traceur de ce type n'est déposé tant que le choix n'est pas « accepté ».
 * Il s'affiche au premier passage, puis à la demande via `openCookieBanner()`.
 */
export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const firstButton = useRef<HTMLButtonElement>(null);
  const reopened = useRef(false);
  const bandeau = useRef<HTMLDivElement>(null);
  // Fixé en bas : il ne recouvre jamais l'élément qui a le focus (WCAG 2.4.11).
  useHauteurReservee(bandeau, "--hauteur-bandeau", visible);

  useEffect(() => {
    setVisible(getCookieConsent() === null);
    function onOpen() {
      reopened.current = true;
      setVisible(true);
    }
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  // Rouvert à la demande : le focus passe dans le bandeau pour un usage au clavier.
  useEffect(() => {
    if (visible && reopened.current) {
      reopened.current = false;
      firstButton.current?.focus();
    }
  }, [visible]);

  function choose(value: CookieConsent) {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Stockage indisponible (navigation privée stricte) : le choix vaut pour cette visite.
    }
    window.dispatchEvent(new CustomEvent("cds:cookie-consent", { detail: value }));
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      ref={bandeau}
      role="dialog"
      aria-live="polite"
      aria-label="Consentement aux cookies"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]"
    >
      <div className="mx-auto flex max-w-[1200px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Ce site n'utilise que les cookies nécessaires à son fonctionnement. Aucun cookie de mesure
          d'audience ne sera déposé sans votre accord.{" "}
          <Link
            to="/legal/cookies"
            title="Lire la politique de gestion des cookies"
            className="font-medium text-primary-text underline underline-offset-2"
          >
            En savoir plus
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <Button
            ref={firstButton}
            variant="outline"
            title="Refuser les cookies non essentiels"
            onClick={() => choose("refused")}
          >
            Refuser
          </Button>
          <Button
            title="Accepter les cookies de mesure d'audience"
            onClick={() => choose("accepted")}
          >
            Accepter
          </Button>
        </div>
      </div>
    </div>
  );
}
