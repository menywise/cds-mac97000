import { useEffect, type RefObject } from "react";

/**
 * Réserve au défilement la hauteur d'un bandeau collant ou fixé (en-tête, bandeau cookies) :
 * l'élément qui reçoit le focus au clavier ne finit jamais dessous (WCAG 2.4.11).
 * La variable CSS `variable` de <html> suit la hauteur de l'élément ; src/styles.css en fait un
 * scroll-padding. Sans l'élément (bandeau fermé), la variable disparaît.
 */
export function useHauteurReservee(
  ref: RefObject<HTMLElement | null>,
  variable: `--${string}`,
  actif = true,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !actif || typeof ResizeObserver === "undefined") return;
    const racine = document.documentElement;
    const observer = new ResizeObserver(() =>
      racine.style.setProperty(variable, `${el.offsetHeight}px`),
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      racine.style.removeProperty(variable);
    };
  }, [ref, variable, actif]);
}
