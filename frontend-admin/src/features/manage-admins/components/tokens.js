/**
 * Design tokens for Admin Management — derived from the shared T tokens.
 * All component files import from this file, so updating here
 * aligns the entire admin management UI with the global design system.
 */
import { T } from "../../../components/ui/tokens";

export const tokens = {
  // ── Core Palette ─────────────────────────────────────────────────
  pageBackground: T.bg,
  cardBackground: T.surface,
  cardBorder: T.border,
  background: T.surface,

  // ── Brand Colors ─────────────────────────────────────────────────
  brand: {
    primary: T.navy,
    primaryHover: T.accentHover,
    focusRing: T.focusRing,
  },

  colors: {
    accent: T.accent,
    success: T.success,
    danger: T.error,
    warning: T.warn,
    border: T.border,
    surface: T.surface,
    muted: T.muted,
    secondary: T.muted,
  },

  // ── Text Colors ──────────────────────────────────────────────────
  text: {
    primary: T.text,
    secondary: T.textSecondary,
    muted: T.muted,
    onBrand: "#FFFFFF",
  },

  // ── Input Control Styles ─────────────────────────────────────────
  input: {
    background: T.surfaceAlt,
    border: T.border,
    hoverBorder: T.borderHover,
  },

  // ── Button Colors ────────────────────────────────────────────────
  button: {
    primary: {
      background: T.navy,
      text: "#FFFFFF",
      hoverBackground: T.accentHover,
    },
    secondary: {
      background: T.surface,
      text: T.textSecondary,
      border: T.border,
      hoverBackground: T.surfaceAlt,
    },
  },

  // ── Semantic Status Colors ─────────────────────────────────────
  status: {
    info: {
      background: T.infoBg,
      text: T.info,
      border: T.infoBorder,
    },
    success: {
      background: T.successBg,
      text: T.success,
      border: T.successBorder,
    },
    warning: {
      background: T.warnBg,
      text: T.warn,
      border: T.warnBorder,
    },
    danger: {
      background: T.errorBg,
      text: T.error,
      border: T.errorBorder,
    },
    neutral: {
      background: T.surfaceAlt,
      text: T.textSecondary,
      border: T.border,
    },
  },

  // ── Spacing & Layout ─────────────────────────────────────────────
  spacing: {
    xxs: 2,
    xs: T.space.xs,
    sm: T.space.sm,
    md: T.space.md,
    lg: T.space.lg,
    xl: T.space.xl,
    xxl: T.space["2xl"],
    xxxl: T.space["3xl"],
  },

  // ── Font Sizes ─────────────────────────────────────────────────
  fontSizes: { xs: 12, sm: 13, base: 14, lg: 16, xl: 18, xxl: 24 },

  // ── Border Radius ────────────────────────────────────────────────
  borderRadius: {
    small: T.radius.sm,
    medium: T.radius.md,
    large: T.radius.lg,
    xlarge: T.radius.xl,
    full: 9999,
  },

  // ── Elevation & Shadows ──────────────────────────────────────────
  boxShadow: {
    sm: T.shadow.sm,
    md: T.shadow.md,
    lg: T.shadow.lg,
  },

  shadows: {
    sm: T.shadow.sm,
    md: T.shadow.md,
    lg: T.shadow.lg,
  },

  // ── Transitions ──────────────────────────────────────────────────
  transition: T.transition,
  transitionFast: T.transitionFast,
};
