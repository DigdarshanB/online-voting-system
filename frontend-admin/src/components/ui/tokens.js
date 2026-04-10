/**
 * Shared design tokens for the admin election/candidate management pages.
 * Provides a consistent, institutional visual language.
 */
export const T = {
  /* ── Surface system (4-tier) ───────────────────────────── */
  bg: '#F0F2F7',           // canvas — page background
  surface: '#FFFFFF',       // normal card background
  surfaceRaised: '#FFFFFF', // stronger card (uses shadow.md + border.strong)
  surfaceAlt: '#F6F8FB',   // chips, icon containers, process-step interiors
  surfaceSubtle: '#EEF1F6', // subtle inner grouping backgrounds

  /* ── Borders (3-tier) ──────────────────────────────────── */
  border: '#D8DEE9',        // default visible border
  borderLight: '#E8ECF2',   // soft internal dividers
  borderStrong: '#B0BAC9',  // featured/hover cards
  borderHover: '#94A3B8',

  /* ── Level accent borders ──────────────────────────────── */
  borderFederal: '#2F6FED',
  borderProvincial: '#7C3AED',
  borderLocal: '#EA580C',

  /* ── Brand / primary ───────────────────────────────────── */
  navy: '#152D58',
  accent: '#2563EB',
  accentLight: '#EBF2FF',
  accentHover: '#1D4ED8',
  accentMuted: '#93B4F6',

  /* ── Text (stronger hierarchy) ─────────────────────────── */
  text: '#0C1222',           // primary headings — deep neutral
  textSecondary: '#3B4963',  // secondary text — medium neutral
  muted: '#5E6D85',          // tertiary/helper — cooler muted
  subtle: '#8896AB',         // placeholder/disabled

  /* ── Semantic colors ───────────────────────────────────── */
  success: '#047857',
  successBg: '#ECFDF5',
  successBorder: '#A7F3D0',

  error: '#DC2626',
  errorBg: '#FEF2F2',
  errorBorder: '#FECACA',

  warn: '#B45309',
  warnBg: '#FFFBEB',
  warnBorder: '#FDE68A',

  info: '#0E7490',
  infoBg: '#ECFEFF',
  infoBorder: '#A5F3FC',

  /* ── Level accent colors ───────────────────────────────── */
  purple: '#6D28D9',
  purpleBg: '#F3F0FF',
  purpleBorder: '#DDD6FE',

  orange: '#C2410C',
  orangeBg: '#FFF5ED',
  orangeBorder: '#FED7AA',

  teal: '#0D9488',
  tealBg: '#F0FDFA',

  /* ── Spacing scale (8-based) ───────────────────────────── */
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, '2xl': 32, '3xl': 40, '4xl': 48 },

  /* ── Border radius ─────────────────────────────────────── */
  radius: { sm: 6, md: 8, lg: 12, xl: 14 },

  /* ── Tokenized elevation ───────────────────────────────── */
  shadow: {
    sm: '0 1px 2px rgba(12,18,34,0.04)',
    md: '0 2px 8px rgba(12,18,34,0.07), 0 1px 3px rgba(12,18,34,0.04)',
    lg: '0 8px 24px rgba(12,18,34,0.10), 0 2px 6px rgba(12,18,34,0.04)',
    xl: '0 12px 36px rgba(12,18,34,0.12), 0 4px 12px rgba(12,18,34,0.06)',
  },

  /* ── Focus ─────────────────────────────────────────────── */
  focusRing: '0 0 0 3px rgba(37,99,235,0.35)',

  /* ── Transition ────────────────────────────────────────── */
  transition: '0.18s ease',
  transitionFast: '0.12s ease',
  transitionSlow: '0.28s cubic-bezier(0.22, 1, 0.36, 1)',
};

/* ── Election status badge map ───────────────────────────── */
export const STATUS_MAP = {
  DRAFT: { bg: '#F1F5F9', color: '#475569', label: 'Draft' },
  CONFIGURED: { bg: '#F5F3FF', color: '#7C3AED', label: 'Configured' },
  NOMINATIONS_OPEN: { bg: '#ECFEFF', color: '#0891B2', label: 'Nominations open' },
  NOMINATIONS_CLOSED: { bg: '#E0F2FE', color: '#0284C7', label: 'Nominations closed' },
  CANDIDATE_LIST_PUBLISHED: { bg: '#DBEAFE', color: '#2563EB', label: 'Candidates published' },
  POLLING_OPEN: { bg: '#ECFDF5', color: '#059669', label: 'Polling open' },
  POLLING_CLOSED: { bg: '#FFFBEB', color: '#D97706', label: 'Polling closed' },
  COUNTING: { bg: '#FFF7ED', color: '#EA580C', label: 'Counting' },
  FINALIZED: { bg: '#ECFDF5', color: '#047857', label: 'Finalized' },
  ARCHIVED: { bg: '#F3F4F6', color: '#6B7280', label: 'Archived' },
};

export const CONTEST_COLORS = {
  FPTP: { bg: '#DBEAFE', color: '#2563EB' },
  PR: { bg: '#F5F3FF', color: '#7C3AED' },
  MAYOR: { bg: '#ECFDF5', color: '#059669' },
  DEPUTY_MAYOR: { bg: '#FFF7ED', color: '#EA580C' },
};

export const NOM_STATUS_MAP = {
  PENDING: { bg: '#FEF3C7', color: '#92400E', label: 'Pending' },
  APPROVED: { bg: '#D1FAE5', color: '#065F46', label: 'Approved' },
  REJECTED: { bg: '#FEE2E2', color: '#991B1B', label: 'Rejected' },
  WITHDRAWN: { bg: '#F3F4F6', color: '#6B7280', label: 'Withdrawn' },
};

export const PR_STATUS_MAP = {
  DRAFT: { bg: '#F1F5F9', color: '#475569', label: 'Draft' },
  SUBMITTED: { bg: '#DBEAFE', color: '#2563EB', label: 'Submitted' },
  VALIDATED: { bg: '#D1FAE5', color: '#065F46', label: 'Validated' },
  INVALID: { bg: '#FEE2E2', color: '#991B1B', label: 'Invalid' },
  APPROVED: { bg: '#D1FAE5', color: '#047857', label: 'Approved' },
  REJECTED: { bg: '#FEE2E2', color: '#7F1D1D', label: 'Rejected' },
};
