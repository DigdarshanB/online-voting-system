import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Vote, Landmark, Building2, MapPin, ChevronRight, ArrowRight,
  Shield,
} from "lucide-react";
import { T } from "../components/ui/tokens";
import { PageContainer, AdminKeyframes } from "../components/ui/AdminUI";

/* ── Level card data ─────────────────────────────────────────── */
const LEVELS = [
  {
    key: "federal",
    label: "Federal Elections",
    description:
      "House of Representatives direct elections — nationwide FPTP and Proportional Representation contests.",
    icon: Landmark,
    color: T.accent,
    colorHover: T.accentHover,
    bg: T.accentLight,
    bgStrong: "#DBEAFE",
    borderAccent: T.borderFederal,
    to: "/admin/manage-elections/federal",
    ready: true,
    chips: ["275 seats", "165 FPTP", "110 PR"],
    cta: "Manage elections",
  },
  {
    key: "provincial",
    label: "Provincial Elections",
    description:
      "Provincial Assembly elections across all 7 provinces of Nepal — constituency and proportional seats.",
    icon: Building2,
    color: T.purple,
    colorHover: "#5B21B6",
    bg: T.purpleBg,
    bgStrong: "#EDE9FE",
    borderAccent: T.borderProvincial,
    to: "/admin/manage-elections/provincial",
    ready: false,
    chips: ["7 provinces", "Assembly seats"],
    cta: "View details",
  },
  {
    key: "local",
    label: "Local Elections",
    description:
      "Municipal and Rural Municipal elections — mayors, deputy mayors, ward chairs, and ward representatives.",
    icon: MapPin,
    color: T.orange,
    colorHover: "#9A3412",
    bg: T.orangeBg,
    bgStrong: "#FFEDD5",
    borderAccent: T.borderLocal,
    to: "/admin/manage-elections/local",
    ready: false,
    chips: ["753 local bodies"],
    cta: "View details",
  },
];

/* ── Process steps ───────────────────────────────────────────── */
const PROCESS_STEPS = [
  {
    label: "Define structure",
    description:
      "Create elections, generate contests from master geography, lock configuration.",
  },
  {
    label: "Manage candidates",
    description:
      "Register parties, nominate candidates per constituency, build PR lists.",
  },
  {
    label: "Control lifecycle",
    description:
      "Advance through nominations, polling open/close, and counting phases.",
  },
  {
    label: "Count & finalize",
    description:
      "Tally ballots, apply allocation rules, certify results per contest.",
  },
  {
    label: "Archive & audit",
    description:
      "Lock finalized elections, preserve institutional records for audit trail.",
  },
];

/* ══════════════════════════════════════════════════════════════ */
export default function ManageElectionsHubPage() {
  const navigate = useNavigate();

  return (
    <PageContainer>
      <AdminKeyframes />
      <HubStyles />

      {/* ── Hub intro banner ──────────────────────────────── */}
      <div
        role="banner"
        style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: T.radius.xl,
          padding: "24px 28px",
          marginBottom: T.space["2xl"],
          boxShadow: T.shadow.sm,
        }}
        className="hub-intro admin-intro-card"
      >
        {/* Left — icon tile */}
        <div
          className="admin-intro-icon"
          style={{
            width: 52,
            height: 52,
            borderRadius: T.radius.lg,
            background: T.accentLight,
            border: `1px solid ${T.accent}20`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Vote size={26} color={T.accent} strokeWidth={2.2} />
        </div>

        {/* Middle — title + descriptor */}
        <div style={{ minWidth: 0 }}>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(18px, 2.4vw, 28px)",
              fontWeight: 800,
              color: T.navy,
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
            }}
          >
            Election Administration
          </h1>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 14,
              color: T.muted,
              lineHeight: 1.45,
              maxWidth: 480,
            }}
          >
            Nepal's three-tier election system managed from a unified
            administrative platform.
          </p>
        </div>

        {/* Right — scope tags */}
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            alignSelf: "center",
          }}
          className="hub-intro-tags admin-intro-tags"
        >
          {[
            { label: "Federal", bg: T.accentLight, color: T.accent },
            { label: "Provincial", bg: T.purpleBg, color: T.purple },
            { label: "Local", bg: T.orangeBg, color: T.orange },
          ].map((tag) => (
            <span
              key={tag.label}
              style={{
                padding: "4px 12px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.02em",
                background: tag.bg,
                color: tag.color,
                border: `1px solid ${tag.color}18`,
                whiteSpace: "nowrap",
              }}
            >
              {tag.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Level cards (navigation group) ────────────────── */}
      <ul
        role="list"
        aria-label="Election levels"
        className="admin-level-cards"
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))",
          gap: 20,
          marginBottom: T.space["3xl"],
        }}
      >
        {LEVELS.map((level) => (
          <ElectionLevelCard
            key={level.key}
            level={level}
            onClick={() => navigate(level.to)}
          />
        ))}
      </ul>

      {/* ── Process workflow panel ─────────────────────────── */}
      <ProcessPanel steps={PROCESS_STEPS} />
    </PageContainer>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/*  Election Level Card                                          */
/* ══════════════════════════════════════════════════════════════ */
function ElectionLevelCard({ level, onClick }) {
  const Icon = level.icon;
  const isFeatured = level.ready;

  return (
    <li>
      <button
        onClick={onClick}
        className="level-card"
        data-featured={isFeatured || undefined}
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          padding: 0,
          borderRadius: T.radius.xl,
          border: `1.5px solid ${isFeatured ? level.borderAccent + "28" : T.border}`,
          background: T.surface,
          cursor: "pointer",
          textAlign: "left",
          overflow: "hidden",
          boxShadow: isFeatured ? T.shadow.md : T.shadow.sm,
          transition: `transform ${T.transitionSlow}, border-color ${T.transition}, box-shadow ${T.transitionSlow}`,
          outline: "none",
        }}
      >
        {/* Card body */}
        <div style={{ padding: "24px 24px 16px" }}>
          {/* Header row: icon badge + title + status */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 14,
              marginBottom: 14,
            }}
          >
            <div
              className="level-card-icon"
              style={{
                width: 48,
                height: 48,
                borderRadius: T.radius.lg,
                background: isFeatured ? level.bgStrong : level.bg,
                border: `1px solid ${level.color}15`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: `background ${T.transition}`,
              }}
            >
              <Icon
                size={24}
                color={level.color}
                strokeWidth={2.2}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span
                style={{
                  display: "block",
                  fontSize: "clamp(17px, 1.6vw, 20px)",
                  fontWeight: 800,
                  color: T.text,
                  lineHeight: 1.2,
                  letterSpacing: "-0.01em",
                }}
              >
                {level.label}
              </span>
              <span
                style={{
                  display: "inline-block",
                  marginTop: 7,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 9px",
                  borderRadius: 5,
                  letterSpacing: "0.03em",
                  textTransform: "uppercase",
                  background: level.ready ? T.successBg : T.surfaceSubtle,
                  color: level.ready ? T.success : T.muted,
                  border: `1px solid ${
                    level.ready ? T.successBorder : T.borderLight
                  }`,
                }}
              >
                {level.ready ? "Active" : "Planned"}
              </span>
            </div>
          </div>

          {/* Description */}
          <p
            style={{
              margin: "0 0 14px",
              fontSize: 14,
              color: T.textSecondary,
              lineHeight: 1.55,
              maxWidth: 380,
            }}
          >
            {level.description}
          </p>

          {/* Metadata chips */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {level.chips.map((chip) => (
              <span
                key={chip}
                style={{
                  padding: "3px 10px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  color: T.textSecondary,
                  background: T.surfaceSubtle,
                  border: `1px solid ${T.borderLight}`,
                }}
              >
                {chip}
              </span>
            ))}
          </div>
        </div>

        {/* Footer action row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 24px",
            borderTop: `1px solid ${T.borderLight}`,
            background: T.surfaceAlt,
          }}
        >
          <span
            className="level-card-cta"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              fontWeight: 700,
              color: level.color,
              transition: `gap ${T.transition}, color ${T.transition}`,
            }}
          >
            {level.cta}
            <ArrowRight
              size={15}
              className="level-card-arrow"
              style={{
                transition: `transform ${T.transition}`,
              }}
            />
          </span>
          <ChevronRight size={16} color={T.subtle} />
        </div>
      </button>
    </li>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/*  Process Workflow Panel                                        */
/* ══════════════════════════════════════════════════════════════ */
function ProcessPanel({ steps }) {
  return (
    <section
      aria-label="Election administration process"
      style={{
        background: T.surfaceAlt,
        border: `1px solid ${T.border}`,
        borderRadius: T.radius.xl,
        overflow: "hidden",
        boxShadow: T.shadow.sm,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "18px 28px",
          borderBottom: `1px solid ${T.borderLight}`,
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: T.surface,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: T.radius.md,
            background: T.surfaceSubtle,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Shield size={16} color={T.navy} strokeWidth={2.2} />
        </div>
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 800,
              color: T.navy,
              lineHeight: 1.2,
            }}
          >
            Election administration process
          </h2>
          <p
            style={{
              margin: "1px 0 0",
              fontSize: 12,
              color: T.muted,
            }}
          >
            Five-phase lifecycle from structure definition through certified
            archival
          </p>
        </div>
      </div>

      {/* Steps — desktop horizontal rail */}
      <div className="process-rail-hz" style={{ padding: "24px 28px 28px" }}>
        <div
          style={{
            display: "flex",
            gap: 12,
            position: "relative",
          }}
        >
          {steps.map((step, i) => {
            return (
              <React.Fragment key={i}>
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    background: T.surface,
                    border: `1px solid ${T.borderLight}`,
                    borderRadius: T.radius.lg,
                    padding: "18px 16px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    position: "relative",
                  }}
                >
                  {/* Number badge */}
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: T.accent,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 800,
                        color: "#fff",
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </div>
                  </div>
                  {/* Title */}
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 13,
                      fontWeight: 700,
                      color: T.text,
                      lineHeight: 1.3,
                    }}
                  >
                    {step.label}
                  </h3>
                  {/* Description */}
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: T.muted,
                      lineHeight: 1.5,
                    }}
                  >
                    {step.description}
                  </p>
                </div>
                {/* Connector */}
                {i < steps.length - 1 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      flexShrink: 0,
                      width: 16,
                    }}
                  >
                    <div
                      style={{
                        width: 16,
                        height: 2,
                        background: T.accentMuted,
                        borderRadius: 1,
                      }}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Steps — tablet/mobile stacked */}
      <div
        className="process-rail-vt"
        style={{
          display: "none",
          padding: "20px 24px 24px",
        }}
      >
        {steps.map((step, i) => {
          return (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 14,
                paddingBottom: i < steps.length - 1 ? 16 : 0,
                position: "relative",
              }}
            >
              {/* Vertical connector */}
              {i < steps.length - 1 && (
                <div
                  style={{
                    position: "absolute",
                    left: 13,
                    top: 34,
                    bottom: 0,
                    width: 2,
                    background: T.accentMuted,
                    borderRadius: 1,
                  }}
                />
              )}
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: T.accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#fff",
                  flexShrink: 0,
                  zIndex: 1,
                }}
              >
                {i + 1}
              </div>
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: T.radius.md,
                  padding: "12px 14px",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 4px",
                    fontSize: 13,
                    fontWeight: 700,
                    color: T.text,
                  }}
                >
                  {step.label}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    color: T.muted,
                    lineHeight: 1.5,
                  }}
                >
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/*  Scoped styles for hover, focus, responsive                    */
/* ══════════════════════════════════════════════════════════════ */
function HubStyles() {
  return (
    <style>{`
      /* ── Level card interactive states ─────────────── */
      .level-card:hover {
        transform: translateY(-3px);
        box-shadow: ${T.shadow.lg} !important;
      }
      .level-card:hover .level-card-icon {
        filter: saturate(1.3);
      }
      .level-card:hover .level-card-arrow {
        transform: translateX(3px);
      }
      .level-card:active {
        transform: translateY(-1px);
        box-shadow: ${T.shadow.md} !important;
      }
      .level-card[data-featured]:hover {
        border-color: ${T.borderFederal};
        box-shadow: ${T.shadow.xl} !important;
      }
      .level-card:not([data-featured]):hover {
        border-color: #7A8499;
      }

      /* ── Focus-visible ────────────────────────────── */
      .level-card:focus-visible {
        outline: none;
        box-shadow: ${T.focusRing}, ${T.shadow.md} !important;
        border-color: ${T.accent};
      }

      /* ── Intro banner responsive ──────────────────── */
      @media (max-width: 720px) {
        .hub-intro {
          grid-template-columns: auto 1fr !important;
        }
        .hub-intro-tags {
          grid-column: 1 / -1;
        }
      }

      /* ── Process panel responsive ─────────────────── */
      @media (max-width: 900px) {
        .process-rail-hz { display: none !important; }
        .process-rail-vt { display: block !important; }
      }

      /* ── Card grid responsive ─────────────────────── */
      @media (max-width: 480px) {
        .level-card {
          transform: none !important;
        }
      }

      /* ── Reduced motion ───────────────────────────── */
      @media (prefers-reduced-motion: reduce) {
        .level-card,
        .level-card:hover,
        .level-card:active,
        .level-card-arrow,
        .level-card-icon {
          transition: none !important;
          transform: none !important;
          filter: none !important;
        }
      }
    `}</style>
  );
}
