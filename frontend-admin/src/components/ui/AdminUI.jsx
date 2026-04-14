/**
 * Shared admin UI primitives for election and candidate management pages.
 * Provides consistent, institutional components with responsive design.
 */
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Loader2, AlertTriangle, CheckCircle2, Info,
  Search, Clock, ChevronRight,
} from "lucide-react";
import { T } from "./tokens";

/* ── Utilities ───────────────────────────────────────────────── */

export function errMsg(err) {
  return err?.response?.data?.detail || err?.message || String(err);
}

export function imageUrl(path) {
  if (!path) return null;
  const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
  return `${base}/${path}`;
}

export function formatDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/* ── PageContainer ───────────────────────────────────────────── */

export function PageContainer({ children, narrow }) {
  return (
    <div style={{
      padding: "clamp(16px, 3vw, 40px) clamp(16px, 4vw, 48px)",
      maxWidth: narrow ? 1080 : 1360,
      margin: "0 auto",
      width: "100%",
      boxSizing: "border-box",
      minWidth: 0,
    }}>
      {children}
    </div>
  );
}

/* ── BackLink ────────────────────────────────────────────────── */

export function BackLink({ onClick, to, children = "Back", label }) {
  const navigate = useNavigate();
  const handleClick = () => {
    if (onClick) { onClick(); return; }
    if (to) {
      // Safe back: try history first, fallback to explicit route
      if (window.history.length > 2) {
        navigate(-1);
      } else {
        navigate(to);
      }
    } else {
      navigate(-1);
    }
  };
  return (
    <button
      onClick={handleClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        marginBottom: 20, padding: "6px 0",
        border: "none", background: "transparent",
        color: T.muted, fontSize: 13, fontWeight: 600,
        cursor: "pointer", transition: T.transition,
      }}
      onMouseEnter={e => { e.currentTarget.style.color = T.accent; }}
      onMouseLeave={e => { e.currentTarget.style.color = T.muted; }}
    >
      <ArrowLeft size={15} /> {label || children}
    </button>
  );
}

/* ── SummaryStrip ────────────────────────────────────────────── */

export function SummaryStrip({ children }) {
  return (
    <div className="admin-summary-strip" style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: T.space.lg,
      marginBottom: T.space.xl,
    }}>
      {children}
    </div>
  );
}

export function SummaryMetric({ label, value, description, color, icon: Icon }) {
  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: T.radius.lg, padding: "16px 20px",
      display: "flex", flexDirection: "column", gap: 4,
    }}>
      <span style={{
        fontSize: 11, fontWeight: 700, color: T.muted,
        textTransform: "uppercase", letterSpacing: "0.05em",
      }}>
        {label}
      </span>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        {Icon && <Icon size={18} color={color || T.accent} strokeWidth={2} />}
        <span style={{
          fontSize: 26, fontWeight: 800, color: color || T.text, lineHeight: 1,
        }}>
          {value}
        </span>
      </div>
      {description && (
        <span style={{ fontSize: 12, color: T.muted }}>{description}</span>
      )}
    </div>
  );
}

/* ── StatusBanner ────────────────────────────────────────────── */

export function StatusBanner({ variant = "info", icon: CustomIcon, children, action }) {
  const variants = {
    info: { bg: T.infoBg, border: T.infoBorder, color: T.info, Icon: Info },
    success: { bg: T.successBg, border: T.successBorder, color: T.success, Icon: CheckCircle2 },
    warning: { bg: T.warnBg, border: T.warnBorder, color: T.warn, Icon: AlertTriangle },
    error: { bg: T.errorBg, border: T.errorBorder, color: T.error, Icon: AlertTriangle },
  };
  const v = variants[variant] || variants.info;
  const Icon = CustomIcon || v.Icon;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
      padding: "14px 20px", borderRadius: T.radius.lg,
      background: v.bg, border: `1px solid ${v.border}`,
      marginBottom: T.space.xl,
    }}>
      <Icon size={18} color={v.color} strokeWidth={2.2} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: v.color, fontWeight: 600, lineHeight: 1.5 }}>
        {children}
      </div>
      {action}
    </div>
  );
}

/* ── SectionCard ─────────────────────────────────────────────── */

export function SectionCard({ children, style }) {
  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: T.radius.xl, overflow: "hidden",
      ...style,
    }}>
      {children}
    </div>
  );
}

export function SectionHeader({ title, subtitle, icon: Icon, iconColor, action }) {
  return (
    <div className="admin-section-header" style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "16px 24px", borderBottom: `1px solid ${T.borderLight}`,
      gap: 12, flexWrap: "wrap",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        {Icon && <Icon size={18} color={iconColor || T.accent} strokeWidth={2} />}
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: T.navy }}>{title}</h3>
          {subtitle && <p style={{ margin: "2px 0 0", fontSize: 12, color: T.muted }}>{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

/* ── AdminBadge ──────────────────────────────────────────────── */

export function AdminBadge({ map, status, style: extra }) {
  const m = (map && map[status]) || { bg: "#F1F5F9", color: "#475569", label: status };
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 6,
      fontSize: 11, fontWeight: 700, background: m.bg, color: m.color,
      letterSpacing: "0.01em", lineHeight: 1.4, whiteSpace: "nowrap",
      ...extra,
    }}>
      {m.label}
    </span>
  );
}

/* ── Btn ─────────────────────────────────────────────────────── */

const BTN_VARIANTS = {
  primary: { bg: T.accent, color: "#fff", border: "none" },
  navy: { bg: T.navy, color: "#fff", border: "none" },
  danger: { bg: T.error, color: "#fff", border: "none" },
  secondary: { bg: "#FFFFFF", color: T.text, border: `1px solid ${T.border}` },
  success: { bg: T.success, color: "#fff", border: "none" },
  warn: { bg: T.warn, color: "#fff", border: "none" },
  ghost: { bg: "transparent", color: T.muted, border: "none" },
};

export function Btn({ children, onClick, disabled, loading, variant = "primary", small, style: extra }) {
  const base = BTN_VARIANTS[variant] || BTN_VARIANTS.primary;
  return (
    <button disabled={disabled || loading} onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: small ? "6px 12px" : "9px 18px",
      borderRadius: T.radius.md, border: base.border,
      fontSize: small ? 12 : 13, fontWeight: 600,
      cursor: (disabled || loading) ? "not-allowed" : "pointer",
      background: disabled ? "#F1F5F9" : base.bg,
      color: disabled ? T.subtle : base.color,
      opacity: loading ? 0.7 : 1,
      transition: T.transition, whiteSpace: "nowrap",
      ...extra,
    }}>
      {loading && <Loader2 size={14} style={{ animation: "adminSpin 0.8s linear infinite" }} />}
      {children}
    </button>
  );
}

/* ── SearchInput ─────────────────────────────────────────────── */

export function SearchInput({ value, onChange, placeholder = "Search..." }) {
  return (
    <div style={{ position: "relative", maxWidth: 300, width: "100%" }}>
      <Search size={15} style={{
        position: "absolute", left: 10, top: "50%",
        transform: "translateY(-50%)", color: T.subtle,
      }} />
      <input
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", padding: "8px 12px 8px 32px",
          borderRadius: T.radius.md, border: `1px solid ${T.border}`,
          fontSize: 13, outline: "none", boxSizing: "border-box",
          transition: T.transition, background: T.surface,
        }}
        onFocus={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.boxShadow = T.focusRing; }}
        onBlur={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = "none"; }}
      />
    </div>
  );
}

/* ── Toast ────────────────────────────────────────────────────── */

export function Toast({ msg, onClose }) {
  if (!msg) return null;
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [msg, onClose]);
  return (
    <div className="admin-toast" style={{
      position: "fixed", top: 20, right: 20, zIndex: 10000,
      padding: "12px 20px", borderRadius: T.radius.lg, fontSize: 13, fontWeight: 600,
      background: msg.type === "error" ? T.errorBg : T.successBg,
      color: msg.type === "error" ? T.error : T.success,
      border: `1px solid ${msg.type === "error" ? T.errorBorder : T.successBorder}`,
      boxShadow: T.shadow.lg, maxWidth: 420,
      animation: "adminToastIn 0.25s ease",
    }}>
      {msg.text}
    </div>
  );
}

/* ── WorkflowTimeline ────────────────────────────────────────── */

export function WorkflowTimeline({ steps, activeStep, compact }) {
  return (
    <>
      {/* Desktop: horizontal */}
      <div className="admin-workflow-hz" style={{
        display: "flex", gap: 0, overflowX: "auto",
        padding: "4px 0",
      }}>
        {steps.map((step, i) => {
          const isActive = step.key === activeStep;
          const isPast = activeStep
            ? steps.findIndex(s => s.key === activeStep) > i
            : false;
          return (
            <div key={step.key} style={{
              display: "flex", alignItems: "center",
              flex: compact ? "0 0 auto" : 1, minWidth: compact ? "auto" : 0,
            }}>
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: 6, padding: compact ? "8px 10px" : "8px 6px", textAlign: "center",
                flex: 1, minWidth: 0,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 800,
                  background: isActive ? T.accent : isPast ? T.success : T.borderLight,
                  color: isActive || isPast ? "#fff" : T.muted,
                  border: isActive ? `2px solid ${T.accent}` : isPast ? `2px solid ${T.success}` : `2px solid ${T.border}`,
                  transition: T.transition, flexShrink: 0,
                }}>
                  {isPast ? "✓" : i + 1}
                </div>
                <span style={{
                  fontSize: compact ? 10 : 11, fontWeight: isActive ? 700 : 600,
                  color: isActive ? T.text : isPast ? T.success : T.muted,
                  lineHeight: 1.3, maxWidth: 100,
                  overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div style={{
                  height: 2, flex: "0 0 16px", minWidth: 8,
                  background: isPast ? T.success : T.border,
                  alignSelf: "flex-start", marginTop: 14, borderRadius: 1,
                }} />
              )}
            </div>
          );
        })}
      </div>
      {/* Mobile: vertical (shown via CSS media query) */}
      <div className="admin-workflow-vt" style={{ display: "none" }}>
        {steps.map((step, i) => {
          const isActive = step.key === activeStep;
          const isPast = activeStep
            ? steps.findIndex(s => s.key === activeStep) > i
            : false;
          return (
            <div key={step.key} style={{
              display: "flex", gap: 12, paddingBottom: i < steps.length - 1 ? 12 : 0,
              position: "relative",
            }}>
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div style={{
                  position: "absolute", left: 13, top: 30, bottom: 0, width: 2,
                  background: isPast ? T.success : T.border,
                }} />
              )}
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 800, zIndex: 1,
                background: isActive ? T.accent : isPast ? T.success : T.surface,
                color: isActive || isPast ? "#fff" : T.muted,
                border: isActive ? `2px solid ${T.accent}` : isPast ? `2px solid ${T.success}` : `2px solid ${T.border}`,
              }}>
                {isPast ? "✓" : i + 1}
              </div>
              <div style={{ paddingTop: 2 }}>
                <span style={{
                  fontSize: 13, fontWeight: isActive ? 700 : 600,
                  color: isActive ? T.text : isPast ? T.success : T.muted,
                }}>
                  {step.label}
                </span>
                {step.description && (
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: T.muted, lineHeight: 1.4 }}>
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ── PlannedBanner ───────────────────────────────────────────── */

export function PlannedBanner({ icon: Icon, color, bgColor, title = "Planned — next phase", description }) {
  return (
    <div style={{
      padding: "32px", borderRadius: T.radius.xl,
      background: bgColor || T.surfaceAlt,
      border: `1px solid ${color || T.accent}20`,
      textAlign: "center", marginBottom: T.space.xl,
    }}>
      {Icon && <Icon size={36} color={color || T.accent} style={{ margin: "0 auto 14px", opacity: 0.6 }} />}
      <p style={{ fontSize: 17, fontWeight: 800, color: T.text, margin: "0 0 6px" }}>
        {title}
      </p>
      {description && (
        <p style={{ fontSize: 14, color: T.muted, maxWidth: 540, margin: "0 auto", lineHeight: 1.5 }}>
          {description}
        </p>
      )}
    </div>
  );
}

/* ── Shared Form Styles ──────────────────────────────────────── */

export const labelStyle = {
  display: "flex", flexDirection: "column", gap: 4,
  fontSize: 12, fontWeight: 600, color: T.textSecondary,
};

export const inputStyle = {
  padding: "8px 12px", borderRadius: T.radius.md,
  border: `1px solid ${T.border}`, fontSize: 13,
  outline: "none", width: "100%", boxSizing: "border-box",
  transition: T.transition, background: T.surface,
  color: T.text,
};

export const thStyle = {
  padding: "10px 14px", fontSize: 11, fontWeight: 700,
  color: T.muted, textTransform: "uppercase", letterSpacing: "0.04em",
  textAlign: "left",
};

export const tdStyle = { padding: "12px 14px", fontSize: 13 };

/* ── AdminPortalHero — premium gradient hero matching voter PortalHero ── */

export const ADMIN_HERO_TINTS = {
  federal:    { bg: "rgba(191,219,254,0.18)", text: "#BFDBFE", border: "rgba(191,219,254,0.35)" },
  provincial: { bg: "rgba(196,181,253,0.18)", text: "#C4B5FD", border: "rgba(196,181,253,0.35)" },
  local:      { bg: "rgba(253,186,116,0.18)", text: "#FED7AA", border: "rgba(253,186,116,0.35)" },
  success:    { bg: "rgba(167,243,208,0.18)", text: "#A7F3D0", border: "rgba(167,243,208,0.35)" },
  info:       { bg: "rgba(165,243,252,0.18)", text: "#A5F3FC", border: "rgba(165,243,252,0.35)" },
  warn:       { bg: "rgba(253,224,71,0.18)", text: "#FDE047", border: "rgba(253,224,71,0.35)" },
  danger:     { bg: "rgba(252,165,165,0.18)", text: "#FCA5A5", border: "rgba(252,165,165,0.35)" },
  default:    { bg: "rgba(255,255,255,0.12)", text: "rgba(255,255,255,0.88)", border: "rgba(255,255,255,0.22)" },
};

export function AdminHeroChip({ label, tint }) {
  const s = (typeof tint === "string" ? ADMIN_HERO_TINTS[tint] : tint) || ADMIN_HERO_TINTS.default;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "6px 16px", borderRadius: 20,
      background: s.bg, border: `1px solid ${s.border}`,
      color: s.text, fontSize: 12, fontWeight: 700,
      letterSpacing: "0.01em", whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}

export function AdminPortalHero({ eyebrow, title, subtitle, rightContent, gradient }) {
  return (
    <div style={{
      background: gradient || "linear-gradient(135deg, #152D58 0%, #2563EB 100%)",
      borderRadius: T.radius.xl,
      padding: "clamp(22px, 3vw, 34px) clamp(22px, 4vw, 44px)",
      color: "#FFF",
      marginBottom: T.space.xl,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: T.space.lg,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Decorative circles */}
      <div style={{
        position: "absolute", right: -60, top: -60,
        width: 240, height: 240, borderRadius: "50%",
        background: "rgba(255,255,255,0.05)", pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", right: 80, bottom: -80,
        width: 180, height: 180, borderRadius: "50%",
        background: "rgba(255,255,255,0.04)", pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", left: -30, bottom: -50,
        width: 140, height: 140, borderRadius: "50%",
        background: "rgba(255,255,255,0.03)", pointerEvents: "none",
      }} />

      {/* Left: text */}
      <div style={{ flex: "1 1 300px", minWidth: 0, position: "relative" }}>
        {eyebrow && (
          <div style={{
            display: "inline-flex", alignItems: "center",
            marginBottom: 10, padding: "4px 12px", borderRadius: 20,
            background: "rgba(255,255,255,0.14)",
            fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.88)",
            letterSpacing: "0.05em", textTransform: "uppercase",
          }}>
            {eyebrow}
          </div>
        )}
        <h1 style={{
          margin: 0, fontSize: "clamp(20px, 2.5vw, 26px)", fontWeight: 800,
          letterSpacing: "-0.02em", lineHeight: 1.25, color: "#FFF",
        }}>
          {title}
        </h1>
        <p style={{
          margin: "8px 0 0", fontSize: 14, color: "rgba(255,255,255,0.80)",
          fontWeight: 500, lineHeight: 1.55, maxWidth: 540,
        }}>
          {subtitle}
        </p>
      </div>

      {/* Right: chips / badges */}
      {rightContent && (
        <div className="admin-hero-chips" style={{
          display: "flex", flexWrap: "wrap", gap: 8,
          alignSelf: "center", flexShrink: 0,
          position: "relative", justifyContent: "flex-end",
        }}>
          {rightContent}
        </div>
      )}
    </div>
  );
}

/* ── AdminPageHeader — compact top bar above hero ────────────── */

export function AdminPageHeader({ icon: Icon, title, subtitle, action }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      marginBottom: T.space.lg, gap: 16, flexWrap: "wrap",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        {Icon && (
          <div style={{
            width: 40, height: 40, borderRadius: T.radius.md,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: `${T.accent}12`, border: `1.5px solid ${T.accent}25`,
            flexShrink: 0,
          }}>
            <Icon size={20} color={T.accent} strokeWidth={2.2} />
          </div>
        )}
        <div>
          <h2 style={{
            margin: 0, fontSize: 18, fontWeight: 800, color: T.text,
            letterSpacing: "-0.02em", lineHeight: 1.2,
          }}>
            {title}
          </h2>
          {subtitle && (
            <p style={{ margin: "2px 0 0", fontSize: 13, color: T.muted, fontWeight: 500 }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}

/* ── Global keyframes (inject once) ──────────────────────────── */

export function AdminKeyframes() {
  return (
    <style>{`
      @keyframes adminSpin { to { transform: rotate(360deg); } }
      @keyframes adminToastIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
      @keyframes adminFadeIn {
        from { opacity: 0; transform: translateY(6px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .admin-page-enter { animation: adminFadeIn 0.30s ease both; }

      /* Card hover lift */
      .admin-level-card:hover {
        transform: translateY(-2px);
        box-shadow: ${T.shadow.lg} !important;
      }
      .admin-level-card:focus-visible {
        outline: none;
        box-shadow: ${T.focusRing} !important;
      }

      /* Hero chips responsive */
      @media (max-width: 767px) {
        .admin-hero-chips { display: none !important; }
        .admin-summary-strip { grid-template-columns: 1fr 1fr !important; }
      }

      @media (max-width: 768px) {
        .admin-workflow-hz { display: none !important; }
        .admin-workflow-vt { display: block !important; }
      }
    `}</style>
  );
}
