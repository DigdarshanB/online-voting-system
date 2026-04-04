export const tokens = {
  // ── Core Palette ─────────────────────────────────────────────────
  pageBackground: "#F8FAFC",    // Light gray for the overall page
  cardBackground: "#FFFFFF",    // Pure white for card surfaces
  cardBorder: "#E2E8F0",        // A light, neutral border color
  
  // ── Brand Colors ─────────────────────────────────────────────────
  brand: {
    primary: "#1D4ED8",         // A strong, institutional blue
    primaryHover: "#1E40AF",    // A slightly darker blue for interaction
    focusRing: "rgba(59, 130, 246, 0.4)", // A soft blue glow for focus states
  },

  // ── Text Colors ──────────────────────────────────────────────────
  text: {
    primary: "#0F172A",         // Very dark blue/black for primary text
    secondary: "#475569",       // Gray for secondary, less important text
    muted: "#64748B",           // Lighter gray for placeholder or disabled text
    onBrand: "#FFFFFF",         // White text for use on brand-colored backgrounds
  },

  // ── Input Control Styles ─────────────────────────────────────────
  input: {
    background: "#FFFFFF",
    border: "#CBD5E1",          // A slightly stronger border for inputs
    hoverBorder: "#94A3B8",
  },

  // ── Button Colors ────────────────────────────────────────────────
  button: {
    primary: {
      background: "#1D4ED8",
      text: "#FFFFFF",
      hoverBackground: "#1E40AF",
    },
    secondary: {
      background: "#FFFFFF",
      text: "#334155",
      border: "#CBD5E1",
      hoverBackground: "#F8FAFC",
    },
  },

  // ── Semantic Status Colors ─────────────────────────────────────
  status: {
    info: {
      background: "#EFF6FF",
      text: "#1E40AF",
      border: "#BFDBFE",
    },
    success: {
      background: "#F0FDF4",
      text: "#15803D",
      border: "#BBF7D0",
    },
    warning: {
      background: "#FFFBEB",
      text: "#B45309",
      border: "#FDE68A",
    },
    danger: {
      background: "#FEF2F2",
      text: "#B91C1C",
      border: "#FECACA",
    },
    neutral: {
      background: "#F8FAFC",
      text: "#475569",
      border: "#E2E8F0",
    },
  },

  // ── Spacing & Layout ─────────────────────────────────────────────
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24, // Increased from 20
    xxl: 32, // Increased from 24
    xxxl: 40, // Increased from 32
  },

  // ── Border Radius ────────────────────────────────────────────────
  borderRadius: {
    small: "4px",
    medium: "6px",
    large: "8px",
    xlarge: "12px", // New, larger radius for main cards
  },

  // ── Elevation & Shadows ──────────────────────────────────────────
  boxShadow: {
    // A very subtle shadow for a slight lift
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.03)", 
    // Standard shadow for cards
    md: "0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.04)",
    // A more pronounced shadow for interactive states or modals
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.07), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
  },
};
