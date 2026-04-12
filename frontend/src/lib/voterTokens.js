/**
 * Voter-portal design tokens — mirrors Admin tokens.js but for the voter UI.
 * Slightly warmer palette. Use VT.* throughout voter components.
 */
export const VT = {
  /* ── Surfaces ─────────────────────────────────────────────── */
  bg: "#F4F6FB",
  surface: "#FFFFFF",
  surfaceAlt: "#F8FAFD",
  surfaceSubtle: "#EEF1F6",

  /* ── Borders ──────────────────────────────────────────────── */
  border: "#E2E8F0",
  borderLight: "#EEF2F8",
  borderStrong: "#CBD5E1",
  borderHover: "#94A3B8",

  /* ── Brand / primary ──────────────────────────────────────── */
  navy: "#173B72",
  accent: "#2F6FED",
  accentLight: "#EAF2FF",
  accentHover: "#1D5BD4",
  accentMuted: "#93B4F6",

  /* ── Text ─────────────────────────────────────────────────── */
  text: "#0F172A",
  textSecondary: "#334155",
  muted: "#64748B",
  subtle: "#94A3B8",

  /* ── Level accent colors ──────────────────────────────────── */
  federal: {
    color: "#2F6FED",
    bg: "#EAF2FF",
    border: "#BFDBFE",
    hover: "#1D5BD4",
    bgStrong: "#DBEAFE",
    icon: "Landmark",
  },
  provincial: {
    color: "#7C3AED",
    bg: "#F3F0FF",
    border: "#DDD6FE",
    hover: "#6D28D9",
    bgStrong: "#EDE9FE",
    icon: "Building2",
  },
  local: {
    color: "#EA580C",
    bg: "#FFF5ED",
    border: "#FED7AA",
    hover: "#C2410C",
    bgStrong: "#FFEDD5",
    icon: "MapPin",
  },

  /* ── Election status ──────────────────────────────────────── */
  status: {
    DRAFT:                    { bg: "#F1F5F9", color: "#475569", border: "#E2E8F0",  label: "Draft" },
    CONFIGURED:               { bg: "#F5F3FF", color: "#7C3AED", border: "#DDD6FE",  label: "Configured" },
    NOMINATIONS_OPEN:         { bg: "#ECFEFF", color: "#0891B2", border: "#A5F3FC",  label: "Nominations Open" },
    NOMINATIONS_CLOSED:       { bg: "#E0F2FE", color: "#0284C7", border: "#BAE6FD",  label: "Nominations Closed" },
    CANDIDATE_LIST_PUBLISHED: { bg: "#DBEAFE", color: "#2563EB", border: "#BFDBFE",  label: "Candidates Published" },
    POLLING_OPEN:             { bg: "#DCFCE7", color: "#166534", border: "#BBF7D0",  label: "Polling Open" },
    POLLING_CLOSED:           { bg: "#FFFBEB", color: "#B45309", border: "#FDE68A",  label: "Polling Closed" },
    COUNTING:                 { bg: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE",  label: "Counting in Progress" },
    FINALIZED:                { bg: "#ECFDF5", color: "#047857", border: "#A7F3D0",  label: "Finalized" },
    ARCHIVED:                 { bg: "#F8FAFC", color: "#64748B", border: "#E2E8F0",  label: "Archived" },
  },

  /* ── Semantic colors ──────────────────────────────────────── */
  success: "#047857",
  successBg: "#ECFDF5",
  successBorder: "#A7F3D0",

  error: "#DC2626",
  errorBg: "#FEF2F2",
  errorBorder: "#FECACA",

  warn: "#B45309",
  warnBg: "#FFFBEB",
  warnBorder: "#FDE68A",

  /* ── Spacing (8-base) ─────────────────────────────────────── */
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, "2xl": 32, "3xl": 40, "4xl": 48 },

  /* ── Border radius ────────────────────────────────────────── */
  radius: { sm: 6, md: 8, lg: 12, xl: 16 },

  /* ── Elevation ────────────────────────────────────────────── */
  shadow: {
    sm: "0 1px 3px rgba(15,23,42,0.04)",
    md: "0 2px 8px rgba(15,23,42,0.08), 0 1px 3px rgba(15,23,42,0.04)",
    lg: "0 8px 24px rgba(15,23,42,0.10), 0 2px 6px rgba(15,23,42,0.04)",
    xl: "0 12px 36px rgba(15,23,42,0.12), 0 4px 12px rgba(15,23,42,0.06)",
  },

  /* ── Motion ───────────────────────────────────────────────── */
  transition: "0.18s ease",
  transitionSlow: "0.28s cubic-bezier(0.22, 1, 0.36, 1)",
  focusRing: "0 0 0 3px rgba(47,111,237,0.28)",
};
