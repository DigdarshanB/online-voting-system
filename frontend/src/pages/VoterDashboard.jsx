// Voter command-center dashboard. Pulls eligible elections from
// GET /voter/elections (each row carries a has_voted flag) and renders
// status KPIs, charts, the next action panel, and quick links.

import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Vote, BarChart3, Receipt, CheckCircle2, AlertCircle,
  Users, HelpCircle, UserCircle2, ArrowRight, Info,
  Landmark, ShieldCheck,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from "recharts";
import apiClient from "../lib/apiClient";
import { useLanguage } from "../lib/LanguageContext";
import { VT } from "../lib/voterTokens";


function deriveStats(elections) {
  const eligible = elections.length;
  const open = elections.filter((e) => e.status === "POLLING_OPEN").length;
  const voted = elections.filter((e) => e.has_voted).length;
  const finalized = elections.filter(
    (e) => e.status === "FINALIZED" || e.status === "ARCHIVED"
  ).length;
  return { eligible, open, voted, finalized };
}

function deriveStatusDistribution(elections, t) {
  const counts = {};
  for (const e of elections) {
    const key = e.has_voted ? "VOTED" : e.status;
    counts[key] = (counts[key] || 0) + 1;
  }
  const STATUS_META = {
    POLLING_OPEN:   { color: "#16A34A", label: t("dash.status.polling_open") },
    POLLING_CLOSED: { color: "#D97706", label: t("dash.status.polling_closed") },
    COUNTING:       { color: "#2563EB", label: t("dash.status.counting") },
    FINALIZED:      { color: "#047857", label: t("dash.status.finalized") },
    ARCHIVED:       { color: "#64748B", label: t("dash.status.archived") },
    VOTED:          { color: "#7C3AED", label: t("dash.status.voted") },
  };
  return Object.entries(counts).map(([key, value]) => ({
    name: STATUS_META[key]?.label || key,
    value,
    color: STATUS_META[key]?.color || "#94A3B8",
  }));
}

function deriveTimeline(elections, t) {
  return elections
    .filter((e) => e.polling_start_at || e.polling_end_at)
    .sort((a, b) => {
      const da = a.polling_start_at || a.polling_end_at;
      const db = b.polling_start_at || b.polling_end_at;
      return new Date(da) - new Date(db);
    })
    .slice(0, 6)
    .map((e) => {
      const subtypeLabel = {
        HOR_DIRECT: "Federal HoR",
        PROVINCIAL_ASSEMBLY: "Provincial",
        LOCAL_MUNICIPAL: "Municipal",
        LOCAL_RURAL: "Rural",
      }[e.election_subtype] || e.government_level || "";
      const statusLabel = VT.status[e.status]?.label || e.status;
      const end = e.polling_end_at ? new Date(e.polling_end_at) : null;
      const start = e.polling_start_at ? new Date(e.polling_start_at) : null;
      const now = new Date();
      let dateLabel = "";
      if (e.status === "POLLING_OPEN" && end) {
        dateLabel = `${t("dash.closes")} ${end.toLocaleDateString()}`;
      } else if (end && end < now) {
        dateLabel = `${t("dash.ended")} ${end.toLocaleDateString()}`;
      } else if (start && start > now) {
        dateLabel = `${t("dash.starts")} ${start.toLocaleDateString()}`;
      } else if (end) {
        dateLabel = end.toLocaleDateString();
      }
      return {
        id: e.id,
        title: e.title,
        subtype: subtypeLabel,
        status: e.status,
        statusLabel,
        dateLabel,
        hasVoted: e.has_voted,
      };
    });
}

function deriveNextAction(elections, t) {
  const openUnvoted = elections.filter(
    (e) => e.status === "POLLING_OPEN" && !e.has_voted
  );
  if (openUnvoted.length > 0) {
    return {
      type: "vote",
      message: t("dash.action.vote_now"),
      link: "/elections",
      cta: t("dash.go_to_elections"),
      accent: VT.accent,
      bg: VT.accentLight,
      border: VT.federal.border,
      icon: Vote,
    };
  }
  const openAll = elections.filter((e) => e.status === "POLLING_OPEN");
  if (openAll.length > 0 && openAll.every((e) => e.has_voted)) {
    return {
      type: "done",
      message: t("dash.action.all_voted"),
      link: "/receipt",
      cta: t("dash.vote_receipt"),
      accent: VT.success,
      bg: VT.successBg,
      border: VT.successBorder,
      icon: CheckCircle2,
    };
  }
  const results = elections.filter(
    (e) => e.status === "FINALIZED" || e.status === "ARCHIVED"
  );
  if (results.length > 0) {
    return {
      type: "results",
      message: t("dash.action.check_results"),
      link: "/results",
      cta: t("dash.view_results"),
      accent: "#D97706",
      bg: VT.warnBg,
      border: VT.warnBorder,
      icon: BarChart3,
    };
  }
  return {
    type: "none",
    message: t("dash.action.no_elections"),
    link: "/elections",
    cta: t("dash.view_elections"),
    accent: VT.muted,
    bg: VT.surfaceSubtle,
    border: VT.border,
    icon: Info,
  };
}


/* ── Skeleton placeholder ─────────────────────────────────── */

function DashboardSkeleton() {
  const bar = (w, h = 14) => (
    <div
      className="voter-skeleton"
      style={{ width: w, height: h, borderRadius: 6 }}
    />
  );
  return (
    <div style={{ padding: "clamp(16px, 3vw, 40px) clamp(16px, 4vw, 48px)", maxWidth: 1140, margin: "0 auto" }}>
      {/* Header skeleton */}
      <div style={{ background: VT.surfaceSubtle, borderRadius: VT.radius.xl, padding: "32px 36px", marginBottom: VT.space["2xl"] }}>
        {bar("60%", 22)}
        <div style={{ marginTop: 10 }}>{bar("40%", 14)}</div>
      </div>
      {/* Stat skeletons */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: VT.space.lg, marginBottom: VT.space["2xl"] }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ background: VT.surface, borderRadius: VT.radius.lg, border: `1px solid ${VT.border}`, padding: "20px 24px", display: "flex", alignItems: "center", gap: 16 }}>
            <div className="voter-skeleton" style={{ width: 44, height: 44, borderRadius: 12 }} />
            <div style={{ flex: 1 }}>
              {bar("70%", 10)}
              <div style={{ marginTop: 8 }}>{bar("40%", 20)}</div>
            </div>
          </div>
        ))}
      </div>
      {/* Chart skeletons */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: VT.space.lg, marginBottom: VT.space["2xl"] }}>
        <div className="voter-skeleton" style={{ height: 260, borderRadius: VT.radius.lg }} />
        <div className="voter-skeleton" style={{ height: 260, borderRadius: VT.radius.lg }} />
      </div>
    </div>
  );
}


/* ── Main Dashboard ───────────────────────────────────────── */

export default function VoterDashboard({ user }) {
  const { t } = useLanguage();
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiClient
      .get("/voter/elections")
      .then((res) => setElections(res.data || []))
      .catch(() => setError(t("dash.err.load")))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => deriveStats(elections), [elections]);
  const statusData = useMemo(() => deriveStatusDistribution(elections, t), [elections, t]);
  const timeline = useMemo(() => deriveTimeline(elections, t), [elections, t]);
  const nextAction = useMemo(() => deriveNextAction(elections, t), [elections, t]);

  if (loading) return <DashboardSkeleton />;

  return (
    <div style={{
      padding: "clamp(16px, 3vw, 40px) clamp(16px, 4vw, 48px)",
      maxWidth: 1140,
      margin: "0 auto",
    }}>
      {/* ── 1. Welcome Header ──────────────────────────────── */}
      <div style={{
        background: `linear-gradient(135deg, ${VT.navy} 0%, #2F6FED 100%)`,
        borderRadius: VT.radius.xl,
        padding: "clamp(24px, 3vw, 36px) clamp(24px, 4vw, 44px)",
        color: "#FFF",
        marginBottom: VT.space.xl,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: VT.space.lg,
        position: "relative",
        overflow: "hidden",
      }}>
        {/* decorative circle */}
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
        <div style={{ flex: "1 1 300px", minWidth: 0, position: "relative" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            marginBottom: 10, padding: "4px 12px", borderRadius: 20,
            background: "rgba(16,185,129,0.22)",
            fontSize: 11, fontWeight: 700, color: "#A7F3D0",
            letterSpacing: "0.04em", textTransform: "uppercase",
          }}>
            <ShieldCheck size={12} /> Voter Portal — Secure Session
          </div>
          <h2 style={{
            margin: 0, fontSize: "clamp(20px, 2.5vw, 26px)", fontWeight: 800,
            letterSpacing: "-0.02em", lineHeight: 1.25,
          }}>
            {t("dash.welcome")}{user?.full_name ? `, ${user.full_name}` : ""}
          </h2>
          <p style={{ margin: "8px 0 0", fontSize: 14, opacity: 0.80, fontWeight: 500, lineHeight: 1.5 }}>
            {t("dash.ready_to_vote")}
          </p>
        </div>
        {/* Primary CTA */}
        <Link to="/elections" style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "13px 28px", borderRadius: VT.radius.lg,
          background: "rgba(255,255,255,0.16)", backdropFilter: "blur(6px)",
          color: "#FFF", fontWeight: 700, fontSize: 14,
          textDecoration: "none", border: "1px solid rgba(255,255,255,0.28)",
          transition: VT.transition, flexShrink: 0, position: "relative",
          letterSpacing: "-0.01em",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.26)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.45)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.16)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.28)"; }}
        >
          {t("dash.go_to_elections")} <ArrowRight size={16} />
        </Link>
      </div>

      {/* ── 2. KPI Stat Cards ──────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: VT.space.lg,
        marginBottom: VT.space.xl,
      }}>
        <StatCard
          icon={<Landmark size={20} />}
          label={t("dash.eligible_elections")}
          value={stats.eligible}
          accent={VT.accent}
        />
        <StatCard
          icon={<Vote size={20} />}
          label={t("dash.open_voting")}
          value={stats.open}
          accent="#16A34A"
        />
        <StatCard
          icon={<CheckCircle2 size={20} />}
          label={t("dash.votes_cast")}
          value={stats.voted}
          accent="#7C3AED"
        />
        <StatCard
          icon={<BarChart3 size={20} />}
          label={t("dash.finalized")}
          value={stats.finalized}
          accent="#D97706"
        />
      </div>

      {/* ── 3. Charts Row ──────────────────────────────────── */}
      <div className="voter-dash-chart-row" style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: VT.space.lg,
        marginBottom: VT.space.xl,
      }}>
        {/* Chart 1: Election Status Donut */}
        <ChartCard title={t("dash.status_chart_title")}>
          {statusData.length === 0 ? (
            <EmptyChart message={t("dash.chart_no_data")} />
          ) : (
            <DonutWithLegend data={statusData} />
          )}
        </ChartCard>

        {/* Chart 2: Election Timeline Bar */}
        <ChartCard title={t("dash.timeline_title")}>
          {timeline.length === 0 ? (
            <EmptyChart message={t("dash.timeline_no_data")} />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "4px 0" }}>
                {timeline.map((item) => {
                  const statusStyle = VT.status[item.status] || VT.status.DRAFT;
                  return (
                    <div key={item.id} style={{
                      display: "flex", alignItems: "center", gap: VT.space.md,
                      padding: "10px 14px", borderRadius: VT.radius.md,
                      background: VT.surfaceAlt, border: `1px solid ${VT.borderLight}`,
                      transition: VT.transition,
                    }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: statusStyle.color, flexShrink: 0,
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 13, fontWeight: 700, color: VT.text,
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: 11, color: VT.muted, fontWeight: 500, marginTop: 1 }}>
                          {item.subtype}{item.dateLabel ? ` · ${item.dateLabel}` : ""}
                        </div>
                      </div>
                      <div style={{
                        padding: "3px 10px", borderRadius: 12,
                        background: statusStyle.bg, color: statusStyle.color,
                        fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
                        border: `1px solid ${statusStyle.border}`,
                      }}>
                        {item.hasVoted ? `✓ ${t("dash.status.voted")}` : item.statusLabel}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      {/* ── 4. Next Action Panel ───────────────────────────── */}
      <NextActionPanel action={nextAction} />

      {/* ── 5. Quick Actions Grid ──────────────────────────── */}
      <SectionHeading>{t("dash.quick_actions")}</SectionHeading>
      <div className="voter-dash-qa-grid" style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: VT.space.lg,
        marginBottom: VT.space["2xl"],
      }}>
        <QuickActionCard to="/elections" icon={Vote} color={VT.accent} title={t("dash.view_elections")} desc={t("dash.view_elections_desc")} />
        <QuickActionCard to="/candidates" icon={Users} color="#7C3AED" title={t("dash.view_candidates")} desc={t("dash.view_candidates_desc")} />
        <QuickActionCard to="/results" icon={BarChart3} color="#D97706" title={t("dash.view_results")} desc={t("dash.view_results_desc")} />
        <QuickActionCard to="/receipt" icon={Receipt} color="#16A34A" title={t("dash.vote_receipt")} desc={t("dash.vote_receipt_desc")} />
        <QuickActionCard to="/account" icon={UserCircle2} color={VT.navy} title={t("dash.account_security")} desc={t("dash.account_security_desc")} />
        <QuickActionCard to="/guide" icon={HelpCircle} color="#0891B2" title={t("dash.voter_guide")} desc={t("dash.voter_guide_desc")} />
      </div>

      {/* ── Error state ────────────────────────────────────── */}
      {error && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "14px 20px", background: VT.errorBg, borderRadius: VT.radius.md,
          border: `1px solid ${VT.errorBorder}`, color: VT.error,
          fontSize: 14, fontWeight: 500, marginTop: VT.space.lg,
        }}>
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* ── Responsive overrides ───────────────────────────── */}
      <style>{`
        @media (max-width: 900px) {
          .voter-dash-chart-row { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 860px) {
          .voter-dash-qa-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 520px) {
          .voter-dash-qa-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════════════════ */

function SectionHeading({ children }) {
  return (
    <h3 style={{
      fontSize: 15, fontWeight: 750, color: VT.navy,
      marginBottom: VT.space.md, letterSpacing: "-0.01em",
    }}>
      {children}
    </h3>
  );
}

/* ── Stat card ─────────────────────────────────────────────── */

function StatCard({ icon, label, value, accent }) {
  return (
    <div style={{
      background: VT.surface, borderRadius: VT.radius.lg,
      border: `1px solid ${VT.border}`, padding: "18px 22px",
      display: "flex", alignItems: "center", gap: 14,
      transition: VT.transition, boxShadow: VT.shadow.sm,
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: VT.radius.md,
        background: `${accent}14`, display: "flex",
        alignItems: "center", justifyContent: "center", flexShrink: 0,
        color: accent,
      }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: 11, color: VT.muted, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.06em",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {label}
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: VT.navy, marginTop: 2, lineHeight: 1.1 }}>
          {value}
        </div>
      </div>
    </div>
  );
}


/* ── Chart card wrapper ────────────────────────────────────── */

function ChartCard({ title, children }) {
  return (
    <div style={{
      background: VT.surface, borderRadius: VT.radius.lg,
      border: `1px solid ${VT.border}`, padding: "20px 22px",
      boxShadow: VT.shadow.sm, display: "flex", flexDirection: "column",
    }}>
      <h4 style={{
        margin: 0, fontSize: 14, fontWeight: 750, color: VT.navy,
        marginBottom: VT.space.md, letterSpacing: "-0.01em",
      }}>
        {title}
      </h4>
      <div style={{ flex: 1, minHeight: 0 }}>
        {children}
      </div>
    </div>
  );
}


/* ── Empty chart placeholder ───────────────────────────────── */

function EmptyChart({ message }) {
  return (
    <div style={{
      height: 200, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 8,
    }}>
      <BarChart3 size={32} color={VT.subtle} />
      <p style={{ color: VT.muted, fontSize: 13, fontWeight: 500, margin: 0, textAlign: "center" }}>
        {message}
      </p>
    </div>
  );
}


/* ── Next Action panel ─────────────────────────────────────── */

function NextActionPanel({ action }) {
  const IconComp = action.icon;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: VT.space.lg,
      padding: "18px 24px", borderRadius: VT.radius.lg,
      background: action.bg, border: `1px solid ${action.border}`,
      marginBottom: VT.space.xl, flexWrap: "wrap",
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: VT.radius.md,
        background: `${action.accent}1A`, display: "flex",
        alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <IconComp size={20} color={action.accent} />
      </div>
      <div style={{ flex: "1 1 260px", minWidth: 0 }}>
        <div style={{
          fontSize: 10, fontWeight: 800, color: action.accent,
          textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3,
        }}>
          Next Action
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: VT.text }}>
          {action.message}
        </div>
      </div>
      <Link to={action.link} style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "10px 22px", borderRadius: VT.radius.md,
        background: action.accent, color: "#FFF",
        fontWeight: 700, fontSize: 13, textDecoration: "none",
        transition: VT.transition, flexShrink: 0,
        boxShadow: `0 2px 8px ${action.accent}30`,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.08)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.filter = "none"; }}
      >
        {action.cta} <ArrowRight size={14} />
      </Link>
    </div>
  );
}


/* ── Quick action card ─────────────────────────────────────── */

function QuickActionCard({ to, icon: IconComp, color, title, desc }) {
  return (
    <Link
      to={to}
      className="voter-dash-qcard"
      style={{
        background: VT.surface, borderRadius: VT.radius.lg,
        border: `1px solid ${VT.border}`,
        padding: "22px 22px 20px",
        textDecoration: "none", display: "flex", flexDirection: "column",
        transition: VT.transition, boxShadow: VT.shadow.sm,
        minHeight: 160,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = color;
        e.currentTarget.style.boxShadow = VT.shadow.md;
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = VT.border;
        e.currentTarget.style.boxShadow = VT.shadow.sm;
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Icon */}
      <div style={{
        width: 40, height: 40, borderRadius: VT.radius.md,
        background: `${color}12`, display: "flex",
        alignItems: "center", justifyContent: "center",
        marginBottom: 14,
      }}>
        <IconComp size={19} color={color} />
      </div>
      {/* Title */}
      <div style={{
        fontWeight: 750, fontSize: 14, color: VT.navy,
        marginBottom: 6, lineHeight: 1.3,
      }}>
        {title}
      </div>
      {/* Description */}
      <div style={{
        fontSize: 12, color: VT.muted, fontWeight: 500,
        lineHeight: 1.55, flex: 1,
      }}>
        {desc}
      </div>
      {/* Arrow CTA */}
      <div style={{
        display: "flex", alignItems: "center", gap: 4,
        fontSize: 12, fontWeight: 700, color,
        marginTop: 14, paddingTop: 12,
        borderTop: `1px solid ${VT.borderLight}`,
      }}>
        <ArrowRight size={13} />
      </div>
    </Link>
  );
}


/* ── Donut chart with custom legend ────────────────────────── */

function DonutWithLegend({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Donut */}
      <div style={{ position: "relative" }}>
        <ResponsiveContainer width="100%" height={190}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={80}
              paddingAngle={data.length > 1 ? 3 : 0}
              dataKey="value"
              stroke="none"
              startAngle={90}
              endAngle={-270}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: VT.radius.md, border: `1px solid ${VT.border}`,
                fontSize: 13, fontWeight: 600, boxShadow: VT.shadow.md,
                padding: "8px 14px",
              }}
              formatter={(value, name) => [`${value} election${value !== 1 ? "s" : ""}`, name]}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Centre label */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
        }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: VT.navy, lineHeight: 1 }}>{total}</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: VT.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 3 }}>Elections</div>
        </div>
      </div>
      {/* Custom legend */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: "8px 20px",
        justifyContent: "center", paddingTop: 12, paddingBottom: 4,
      }}>
        {data.map((entry, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 10, height: 10, borderRadius: 3,
              background: entry.color, flexShrink: 0,
            }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: VT.textSecondary }}>
              {entry.name}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 750, color: entry.color,
              background: `${entry.color}12`, padding: "1px 7px",
              borderRadius: 10,
            }}>
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
