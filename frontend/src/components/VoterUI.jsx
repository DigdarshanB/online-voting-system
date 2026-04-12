/**
 * Shared voter UI primitives — mirrors AdminUI.jsx pattern.
 * All voter election/results pages import from here for visual consistency.
 */
import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import { VT } from "../lib/voterTokens";

/* ── Global keyframes injected once ─────────────────────────── */
export function VoterKeyframes() {
  return (
    <style>{`
      @keyframes voterFadeIn {
        from { opacity: 0; transform: translateY(6px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes voterPulse {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0.45; }
      }
      .voter-page-enter { animation: voterFadeIn 0.30s ease both; }

      /* Level card hover lift */
      .voter-level-card:hover {
        transform: translateY(-2px);
        box-shadow: ${VT.shadow.lg} !important;
      }
      .voter-level-card:focus-visible {
        outline: none;
        box-shadow: ${VT.focusRing} !important;
      }
      .voter-level-card:hover .voter-level-cta-arrow {
        transform: translateX(3px);
      }

      /* Election card hover */
      .voter-election-card:hover {
        border-color: ${VT.accent} !important;
        box-shadow: 0 4px 16px rgba(47,111,237,0.10) !important;
        transform: translateY(-1px);
      }
      .voter-election-card { transition: transform 0.20s ease, border-color 0.18s ease, box-shadow 0.20s ease; }

      /* Result card hover */
      .voter-result-card:hover {
        border-color: ${VT.accent} !important;
        box-shadow: 0 3px 12px rgba(47,111,237,0.09) !important;
        transform: translateY(-1px);
      }
      .voter-result-card { transition: transform 0.20s ease, border-color 0.18s ease, box-shadow 0.20s ease; }

      /* Skeleton pulse */
      .voter-skeleton {
        background: linear-gradient(90deg, #EEF2F8 25%, #F8FAFD 50%, #EEF2F8 75%);
        background-size: 200% 100%;
        animation: voterSkeletonShimmer 1.6s ease infinite;
        border-radius: 6px;
      }
      @keyframes voterSkeletonShimmer {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }

      /* Summary strip responsive */
      @media (max-width: 767px) {
        .voter-hub-grid { grid-template-columns: 1fr !important; }
        .voter-summary-strip { grid-template-columns: 1fr 1fr !important; }
        .voter-process-rail { flex-direction: column !important; }
        .voter-intro-tags { display: none !important; }
      }
      @media (min-width: 768px) and (max-width: 1279px) {
        .voter-hub-grid { grid-template-columns: repeat(2, 1fr) !important; }
      }
    `}</style>
  );
}

/* ── Page container ──────────────────────────────────────────── */
export function VoterPageContainer({ children }) {
  return (
    <div
      className="voter-page-enter"
      style={{
        padding: "clamp(16px, 3vw, 40px) clamp(16px, 4vw, 48px)",
        maxWidth: 1280,
        margin: "0 auto",
        width: "100%",
        boxSizing: "border-box",
        minWidth: 0,
      }}
    >
      {children}
    </div>
  );
}

/* ── Back link ───────────────────────────────────────────────── */
export function VoterBackLink({ to, children = "Back" }) {
  const navigate = useNavigate();
  const handleClick = () => {
    if (window.history.length > 2) navigate(-1);
    else navigate(to || "/dashboard");
  };
  return (
    <button
      onClick={handleClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        marginBottom: 20,
        padding: "6px 0",
        border: "none",
        background: "transparent",
        color: VT.muted,
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        transition: VT.transition,
        fontFamily: "inherit",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = VT.accent; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = VT.muted; }}
    >
      <ArrowLeft size={15} />
      {children}
    </button>
  );
}

/* ── Hub banner ──────────────────────────────────────────────── */
export function VoterHubBanner({ icon: Icon, title, subtitle, badge }) {
  return (
    <div
      style={{
        background: VT.surface,
        border: `1px solid ${VT.border}`,
        borderRadius: VT.radius.xl,
        padding: "22px 28px",
        marginBottom: VT.space["2xl"],
        boxShadow: VT.shadow.sm,
        display: "flex",
        alignItems: "center",
        gap: 20,
        flexWrap: "wrap",
      }}
    >
      {/* Icon tile */}
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: VT.radius.lg,
          background: VT.accentLight,
          border: `1px solid ${VT.accent}20`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={26} color={VT.accent} strokeWidth={2.2} />
      </div>

      {/* Title + subtitle */}
      <div style={{ flex: 1, minWidth: 160 }}>
        <h1
          style={{
            margin: 0,
            fontSize: "clamp(18px, 2.2vw, 26px)",
            fontWeight: 800,
            color: VT.navy,
            lineHeight: 1.2,
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: VT.muted, lineHeight: 1.45 }}>
          {subtitle}
        </p>
      </div>

      {/* Right: level chips + optional badge */}
      <div
        className="voter-intro-tags"
        style={{ display: "flex", gap: 6, flexWrap: "wrap", alignSelf: "center" }}
      >
        {[
          { label: "Federal",    bg: VT.federal.bg,    color: VT.federal.color },
          { label: "Provincial", bg: VT.provincial.bg, color: VT.provincial.color },
          { label: "Local",      bg: VT.local.bg,      color: VT.local.color },
        ].map((t) => (
          <span
            key={t.label}
            style={{
              padding: "4px 12px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.02em",
              background: t.bg,
              color: t.color,
              border: `1px solid ${t.color}22`,
              whiteSpace: "nowrap",
            }}
          >
            {t.label}
          </span>
        ))}
        {badge && (
          <span
            style={{
              padding: "4px 12px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              background: VT.successBg,
              color: VT.success,
              border: `1px solid ${VT.successBorder}`,
              whiteSpace: "nowrap",
            }}
          >
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Level card ──────────────────────────────────────────────── */
export function VoterLevelCard({ icon: Icon, title, description, chips, cta, ctaColor, dimmed, onClick }) {
  return (
    <button
      onClick={onClick}
      className="voter-level-card"
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        padding: 0,
        borderRadius: VT.radius.xl,
        border: `1.5px solid ${VT.border}`,
        background: dimmed ? VT.surfaceAlt : VT.surface,
        cursor: dimmed ? "default" : "pointer",
        textAlign: "left",
        overflow: "hidden",
        boxShadow: VT.shadow.md,
        transition: `transform ${VT.transitionSlow}, border-color ${VT.transition}, box-shadow ${VT.transitionSlow}`,
        outline: "none",
        opacity: dimmed ? 0.75 : 1,
        fontFamily: "inherit",
      }}
    >
      {/* Card body */}
      <div style={{ padding: "24px 24px 16px" }}>
        {/* Icon + title row */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: VT.radius.lg,
              background: chips?.[0]?.bg || VT.accentLight,
              border: `1px solid ${ctaColor}18`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon size={24} color={ctaColor} strokeWidth={2.2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span
              style={{
                display: "block",
                fontSize: "clamp(16px, 1.5vw, 19px)",
                fontWeight: 800,
                color: VT.text,
                lineHeight: 1.2,
                letterSpacing: "-0.01em",
              }}
            >
              {title}
            </span>
          </div>
        </div>

        {/* Description */}
        <p
          style={{
            margin: "0 0 14px",
            fontSize: 14,
            color: VT.textSecondary,
            lineHeight: 1.55,
          }}
        >
          {description}
        </p>

        {/* Chips */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {chips?.map((chip) => (
            <span
              key={chip.label}
              style={{
                padding: "3px 10px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                color: chip.color || VT.textSecondary,
                background: chip.bg || VT.surfaceSubtle,
                border: `1px solid ${chip.border || VT.borderLight}`,
                whiteSpace: "nowrap",
              }}
            >
              {chip.label}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 24px",
          borderTop: `1px solid ${VT.borderLight}`,
          background: VT.surfaceAlt,
          marginTop: "auto",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            fontWeight: 700,
            color: dimmed ? VT.muted : ctaColor,
          }}
        >
          {cta}
          <span
            className="voter-level-cta-arrow"
            style={{
              display: "inline-block",
              transition: `transform ${VT.transition}`,
            }}
          >
            →
          </span>
        </span>
      </div>
    </button>
  );
}

/* ── Summary strip + metric card ─────────────────────────────── */
export function VoterSummaryStrip({ children }) {
  return (
    <div
      className="voter-summary-strip"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: VT.space.lg,
        marginBottom: VT.space.xl,
      }}
    >
      {children}
    </div>
  );
}

export function VoterMetricCard({ label, value, description, color, icon: Icon }) {
  return (
    <div
      style={{
        background: VT.surface,
        border: `1px solid ${VT.border}`,
        borderRadius: VT.radius.lg,
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        boxShadow: VT.shadow.sm,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: VT.muted,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </span>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        {Icon && <Icon size={18} color={color || VT.accent} strokeWidth={2} />}
        <span
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: color || VT.text,
            lineHeight: 1,
          }}
        >
          {value}
        </span>
      </div>
      {description && (
        <span style={{ fontSize: 12, color: VT.muted }}>{description}</span>
      )}
    </div>
  );
}

/* ── Status badge ─────────────────────────────────────────────── */
export function VoterStatusBadge({ status }) {
  const STATUS_STYLE = VT.status[status] || { bg: VT.surfaceSubtle, color: VT.muted, border: VT.border, label: status };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 700,
        background: STATUS_STYLE.bg,
        color: STATUS_STYLE.color,
        border: `1px solid ${STATUS_STYLE.border}`,
        letterSpacing: "0.01em",
        whiteSpace: "nowrap",
        lineHeight: 1.5,
      }}
    >
      {STATUS_STYLE.label}
    </span>
  );
}

/* ── Election card ────────────────────────────────────────────── */
export function VoterElectionCard({ election, levelColor, onVote, onResults }) {
  const {
    id, title, description, status, has_voted, polling_start_at, polling_end_at,
    government_level, province_code, municipality_name, ward_number,
  } = election;

  const isOpen = status === "POLLING_OPEN";
  const isDone = status === "FINALIZED" || status === "ARCHIVED";

  const fmt = (iso) =>
    iso
      ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : null;

  return (
    <div
      className="voter-election-card"
      style={{
        background: VT.surface,
        border: `1.5px solid ${VT.border}`,
        borderLeft: `4px solid ${levelColor}`,
        borderRadius: VT.radius.lg,
        padding: "20px 24px",
        boxShadow: VT.shadow.sm,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {/* Title row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: VT.text, lineHeight: 1.3 }}>
            {title}
          </h3>
          {description && (
            <p style={{ margin: "4px 0 0", fontSize: 13, color: VT.muted, lineHeight: 1.5 }}>
              {description}
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <VoterStatusBadge status={status} />
          {has_voted && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 10px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                background: VT.successBg,
                color: VT.success,
                border: `1px solid ${VT.successBorder}`,
              }}
            >
              <CheckCircle2 size={12} strokeWidth={2.5} />
              Ballot Cast
            </span>
          )}
        </div>
      </div>

      {/* Meta chips */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {fmt(polling_start_at) && (
          <span style={{ fontSize: 12, color: VT.muted, background: VT.surfaceSubtle, border: `1px solid ${VT.borderLight}`, borderRadius: 5, padding: "2px 8px", fontWeight: 500 }}>
            Opens {fmt(polling_start_at)}
          </span>
        )}
        {fmt(polling_end_at) && (
          <span style={{ fontSize: 12, color: VT.muted, background: VT.surfaceSubtle, border: `1px solid ${VT.borderLight}`, borderRadius: 5, padding: "2px 8px", fontWeight: 500 }}>
            Closes {fmt(polling_end_at)}
          </span>
        )}
        {government_level === "PROVINCIAL" && province_code && (
          <span style={{ fontSize: 12, color: VT.provincial.color, background: VT.provincial.bg, border: `1px solid ${VT.provincial.border}`, borderRadius: 5, padding: "2px 8px", fontWeight: 600 }}>
            Province {province_code}
          </span>
        )}
        {government_level === "LOCAL" && municipality_name && (
          <span style={{ fontSize: 12, color: VT.local.color, background: VT.local.bg, border: `1px solid ${VT.local.border}`, borderRadius: 5, padding: "2px 8px", fontWeight: 600 }}>
            {municipality_name}{ward_number ? ` · Ward ${ward_number}` : ""}
          </span>
        )}
      </div>

      {/* Action row */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        {has_voted ? (
          <span
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "9px 20px", borderRadius: VT.radius.md,
              fontSize: 14, fontWeight: 700,
              background: VT.successBg, color: VT.success,
              border: `1px solid ${VT.successBorder}`,
            }}
          >
            <CheckCircle2 size={15} strokeWidth={2.5} />
            Ballot Cast
          </span>
        ) : isOpen ? (
          <button
            onClick={() => onVote?.(id)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "9px 22px", borderRadius: VT.radius.md,
              fontSize: 14, fontWeight: 700,
              background: VT.accent, color: "#fff", border: "none", cursor: "pointer",
              transition: VT.transition, fontFamily: "inherit",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = VT.accentHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = VT.accent; }}
          >
            Cast Your Vote →
          </button>
        ) : isDone ? (
          <button
            onClick={() => onResults?.(id)}
            style={{
              padding: "9px 22px", borderRadius: VT.radius.md,
              fontSize: 14, fontWeight: 700,
              background: VT.surface, color: VT.accent,
              border: `1.5px solid ${VT.accent}`, cursor: "pointer",
              transition: VT.transition, fontFamily: "inherit",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = VT.accentLight; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = VT.surface; }}
          >
            View Results
          </button>
        ) : status === "COUNTING" ? (
          <span
            style={{
              padding: "9px 20px", borderRadius: VT.radius.md,
              fontSize: 14, fontWeight: 600,
              background: VT.status.COUNTING.bg, color: VT.status.COUNTING.color,
              border: `1px solid ${VT.status.COUNTING.border}`,
            }}
          >
            Counting in Progress
          </span>
        ) : (
          <span
            style={{
              padding: "9px 20px", borderRadius: VT.radius.md,
              fontSize: 14, fontWeight: 600, color: VT.subtle,
              background: VT.surfaceSubtle, border: `1px solid ${VT.border}`,
            }}
          >
            Polling Closed
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Result card ──────────────────────────────────────────────── */
export function VoterResultCard({ election, onClick }) {
  return (
    <button
      onClick={onClick}
      className="voter-result-card"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        width: "100%",
        background: VT.surface,
        border: `1.5px solid ${VT.border}`,
        borderRadius: VT.radius.lg,
        padding: "18px 22px",
        cursor: "pointer",
        textAlign: "left",
        boxShadow: VT.shadow.sm,
        fontFamily: "inherit",
        outline: "none",
      }}
      onFocus={(e) => { e.currentTarget.style.boxShadow = VT.focusRing; }}
      onBlur={(e) => { e.currentTarget.style.boxShadow = VT.shadow.sm; }}
    >
      {/* Icon */}
      <div
        style={{
          width: 40, height: 40,
          borderRadius: VT.radius.md,
          background: VT.accentLight,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={VT.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: VT.navy, marginBottom: 2 }}>
          {election.title}
        </div>
        <div style={{ fontSize: 12, color: VT.muted, fontWeight: 500 }}>
          {election.election_subtype || "General"} Election
        </div>
      </div>

      {/* Status badge */}
      <VoterStatusBadge status={election.status} />

      {/* Chevron */}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={VT.subtle} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
}

/* ── Empty state ──────────────────────────────────────────────── */
export function VoterEmptyState({ icon: Icon, title, message }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "48px 24px",
        background: VT.surface,
        borderRadius: VT.radius.xl,
        border: `1px solid ${VT.border}`,
      }}
    >
      {Icon && (
        <div
          style={{
            width: 56, height: 56, borderRadius: "50%",
            background: VT.accentLight,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <Icon size={26} color={VT.accent} strokeWidth={2} />
        </div>
      )}
      <p style={{ fontSize: 15, fontWeight: 700, color: VT.text, margin: "0 0 6px" }}>{title}</p>
      <p style={{ fontSize: 13, color: VT.muted, margin: 0 }}>{message}</p>
    </div>
  );
}

/* ── Skeleton card ────────────────────────────────────────────── */
export function VoterSkeletonCard() {
  return (
    <div
      style={{
        background: VT.surface,
        border: `1px solid ${VT.border}`,
        borderRadius: VT.radius.lg,
        padding: "20px 24px",
        display: "flex", flexDirection: "column", gap: 12,
        boxShadow: VT.shadow.sm,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="voter-skeleton" style={{ width: "55%", height: 18 }} />
        <div className="voter-skeleton" style={{ width: 90, height: 22 }} />
      </div>
      <div className="voter-skeleton" style={{ width: "80%", height: 13 }} />
      <div style={{ display: "flex", gap: 8 }}>
        <div className="voter-skeleton" style={{ width: 100, height: 22 }} />
        <div className="voter-skeleton" style={{ width: 130, height: 22 }} />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div className="voter-skeleton" style={{ width: 130, height: 36 }} />
      </div>
    </div>
  );
}

/* ── Progress steps ───────────────────────────────────────────── */
export function VoterProgressSteps({ steps }) {
  return (
    <section
      aria-label="How to vote"
      style={{
        background: VT.surfaceAlt,
        border: `1px solid ${VT.border}`,
        borderRadius: VT.radius.xl,
        overflow: "hidden",
        boxShadow: VT.shadow.sm,
        marginTop: VT.space["3xl"],
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 24px",
          borderBottom: `1px solid ${VT.borderLight}`,
          background: VT.surface,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 30, height: 30,
            borderRadius: VT.radius.md,
            background: VT.accentLight,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <AlertCircle size={15} color={VT.accent} strokeWidth={2.2} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: VT.navy, lineHeight: 1.2 }}>
            How to cast your vote
          </h2>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: VT.muted }}>
            Three simple steps to participate in Nepal's elections
          </p>
        </div>
      </div>

      {/* Steps */}
      <div
        className="voter-process-rail"
        style={{ padding: "20px 24px 24px", display: "flex", gap: 12 }}
      >
        {steps.map((step, i) => (
          <div
            key={i}
            style={{
              flex: 1, minWidth: 0,
              background: VT.surface,
              border: `1px solid ${VT.borderLight}`,
              borderRadius: VT.radius.lg,
              padding: "18px 16px 16px",
              display: "flex", flexDirection: "column", gap: 10,
            }}
          >
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div
                style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: step.done ? VT.success : VT.accent,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 800, color: "#fff",
                }}
              >
                {step.done ? "✓" : i + 1}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: VT.text, textAlign: "center", marginBottom: 4 }}>
                {step.label}
              </div>
              <div style={{ fontSize: 12, color: VT.muted, lineHeight: 1.5, textAlign: "center" }}>
                {step.description}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
