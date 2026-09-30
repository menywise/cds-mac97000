/**
 * CDS — Consensus Design System — Tokens TypeScript
 * VERSION  : 1.1.0
 * DATE     : 2026-09-17
 * SOURCE   : CDS_TOKENS.md (source de vérité unique)
 * USAGE    : import { cds } from '@/lib/cds-tokens'
 *
 * Les couleurs suffixées « Text » sont les seules autorisées pour du texte
 * ou des icônes sur fond clair (contraste WCAG AA vérifié).
 */

export const cds = {
  colors: {
    primary: "#0d6efd",
    primaryHover: "#0a58ca",
    primaryText: "#0a58ca",
    success: "#198754",
    successText: "#15803d",
    warning: "#ffc107",
    warningText: "#b45200",
    danger: "#dc3545",
    info: "#0dcaf0",
    infoText: "#0891b2",
    secondary: "#6c757d",
    purple: "#7c3aed",
    purpleLight: "#ede9fe",
    text: "#1e293b",
    textMuted: "#5d6b80",
    textLight: "#5b6472",
    bg: "#f8fafc",
    bgAlt: "#f3f4f6",
    surfaceRaised: "#ffffff",
    surfaceSunken: "#f1f5f9",
    border: "#e5e7eb",
    borderStrong: "#cbd5e1",
    white: "#ffffff",
  },

  subtle: {
    blue: { bg: "#dbeafe", text: "#205ee6" },
    green: { bg: "#dcfce7", text: "#008229" },
    amber: { bg: "#fef3c7", text: "#b45200" },
    red: { bg: "#fee2e2", text: "#cf1919" },
    cyan: { bg: "#cffafe", text: "#007899" },
    purple: { bg: "#ede9fe", text: "#7c3aed" },
    gray: { bg: "#f3f4f6", text: "#687179" },
  },
  radius: {
    sm: "0.25rem",
    default: "0.375rem",
    md: "0.5rem",
    lg: "0.75rem",
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

export type CdsColors = keyof typeof cds.colors;
export type CdsSubtle = keyof typeof cds.subtle;
