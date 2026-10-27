/**
 * CDS — Consensus Design System — Tokens TypeScript
 * VERSION  : 2.0.0
 * DATE     : 2026-10-27
 * SOURCE   : CDS_TOKENS.md (source de vérité unique)
 * USAGE    : import { cds } from '@/lib/cds-tokens'
 *
 * Pour du texte ou des icônes : `colors.text`, `colors.textMuted`, `colors.primaryText` et les
 * `state.*.text` (contraste WCAG AA vérifié par scripts/verifier-contrastes.mjs).
 */

export const cds = {
  colors: {
    primary: "#334155",
    primaryHover: "#1e293b",
    primaryText: "#334155",
    secondary: "#e4eaf1",
    text: "#131922",
    textMuted: "#525b69",
    textLight: "#525b69",
    bg: "#eaeff5",
    bgAlt: "#e4eaf1",
    surfaceRaised: "#ffffff",
    surfaceSunken: "#f1f5f9",
    border: "#d4dae1",
    borderStrong: "#94a3b8",
    input: "#cbd2da",
    white: "#ffffff",
  },

  /**
   * Couleurs d'état en quatre usages : `solid` (fond plein, texte blanc dessus), `soft` (fond
   * pâle), `text` (texte et icônes, sur `soft`, sur carte et sur fond de page), `border`.
   */
  state: {
    success: { solid: "#15803d", soft: "#dcfce7", text: "#166534", border: "#86efac" },
    warning: { solid: "#b45309", soft: "#fef3c7", text: "#92400e", border: "#fcd34d" },
    danger: { solid: "#c81e1e", soft: "#fee2e2", text: "#991b1b", border: "#fca5a5" },
    info: { solid: "#0e7490", soft: "#cffafe", text: "#155e75", border: "#67e8f9" },
    violet: { solid: "#6d28d9", soft: "#ede9fe", text: "#5b21b6", border: "#c4b5fd" },
    neutral: { solid: "#475569", soft: "#e2e8f0", text: "#334155", border: "#94a3b8" },
  },
  radius: {
    sm: "0.25rem",
    default: "0.375rem",
    md: "0.375rem",
    lg: "0.75rem",
    /** = lg : classe rounded-xl des cartes */
    xl: "0.75rem",
    full: "50%",
  },
  shadow: {
    xs: "0 1px 2px rgba(0, 0, 0, 0.04)",
    sm: "0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)",
    md: "0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)",
    lg: "0 8px 24px rgba(0, 0, 0, 0.12)",
    fieldInset: "inset 0 1px 2px rgba(15, 23, 42, 0.06)",
    cardTactile: "0 1px 2px rgba(15, 23, 42, 0.05), 0 6px 18px rgba(15, 23, 42, 0.06)",
    cardHover: "0 2px 4px rgba(15, 23, 42, 0.06), 0 12px 28px rgba(15, 23, 42, 0.09)",
  },
  transition: {
    fast: "150ms",
    default: "200ms",
    slow: "300ms",
  },
  layout: {
    sidebarWidth: "260px",
    headerHeight: "56px",
    maxContentWidth: "1200px",
  },
} as const;
