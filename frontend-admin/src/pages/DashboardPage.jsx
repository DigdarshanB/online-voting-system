import React, { useState } from "react";
import { Link } from "react-router-dom";
import DashboardCard from "../components/dashboard/DashboardCard";
import { BarChart3, ShieldCheck, Users, Vote } from "lucide-react";
import PremiumMetricCard from "../components/dashboard/PremiumMetricCard";
import PremiumChartPanel from "../components/dashboard/PremiumChartPanel";
import ElectionStatusDistributionDonut from "../components/charts/ElectionStatusDistributionDonut";
import RegistrationActivityAreaChart from "../components/charts/RegistrationActivityAreaChart";
import useDashboardAnalytics from "../hooks/useDashboardAnalytics";
import useDashboardSummary from "../hooks/useDashboardSummary";

export default function DashboardPage() {
  const { data, loading, error } = useDashboardSummary();
  const [registrationRange, setRegistrationRange] = useState("6m");
  const { statusDistribution, registrationActivity, loading: analyticsLoading, error: analyticsError, reload } = useDashboardAnalytics(registrationRange);
  const activeElections = Number(data?.active_elections ?? 0) || 0;
  const registeredVoters = Number(data?.registered_voters ?? 0) || 0;
  const pendingVerifications = Number(data?.pending_verifications ?? 0) || 0;
  const totalVotesCast = Number(data?.total_votes_cast ?? 0) || 0;

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="dashboard-page-shell">
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 20,
          marginBottom: 32,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "var(--dashboard-text)", letterSpacing: "-0.02em" }}>
              Election Command Center
            </h2>
            <span className="dashboard-chip">
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--dashboard-success)" }} />
              Operational
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: "var(--dashboard-text-soft)", fontWeight: 500 }}>
            {dateStr} &nbsp;·&nbsp; System Status: <span style={{ color: "var(--dashboard-success)" }}>{loading ? "Checking..." : error ? "Unavailable" : "Normal"}</span>
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link
            to="/admin/elections"
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              background: "var(--dashboard-accent)",
              color: "#FFF",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 600,
              boxShadow: "0 4px 12px rgba(47, 111, 237, 0.2)",
              transition: "transform 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
          >
            Create Election
          </Link>
          <Link
            to="/admin/voter-verifications"
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              background: "#FFF",
              color: "var(--dashboard-text)",
              border: "1px solid var(--dashboard-border)",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 600,
              boxShadow: "0 2px 6px rgba(15, 23, 42, 0.04)",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--dashboard-accent-soft)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#FFF")}
          >
            Review Queue
          </Link>
        </div>
      </header>

      <div
        className="dashboard-grid-kpi"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 24,
          marginBottom: 32,
        }}
      >
        <PremiumMetricCard
          title="Active Elections"
          value={activeElections}
          helperText="2 Federal · 1 Local"
          statusLabel={activeElections > 0 ? "Live" : "No open election"}
          statusTone={activeElections > 0 ? "info" : "neutral"}
          icon={<Vote size={20} strokeWidth={2} />}
          loading={loading}
          error={Boolean(error)}
          empty={activeElections === 0}
          emptyMessage="No elections are currently open"
        />
        <PremiumMetricCard
          title="Registered Voters"
          value={registeredVoters}
          helperText="Verified accounts in system"
          statusLabel="Updated today"
          statusTone="info"
          icon={<Users size={20} strokeWidth={2} />}
          loading={loading}
          error={Boolean(error)}
        />
        <PremiumMetricCard
          title="Pending Verification"
          value={pendingVerifications}
          helperText="Awaiting admin validation"
          statusLabel={
            pendingVerifications === 0
              ? "Queue clear"
              : pendingVerifications > 25
                ? "Urgent review"
                : "Review pending"
          }
          statusTone={
            pendingVerifications === 0
              ? "success"
              : pendingVerifications > 25
                ? "danger"
                : "warning"
          }
          icon={<ShieldCheck size={20} strokeWidth={2} />}
          loading={loading}
          error={Boolean(error)}
          empty={pendingVerifications === 0}
          emptyMessage="Verification queue is clear"
        />
        <PremiumMetricCard
          title="Total Votes Cast"
          value={totalVotesCast}
          helperText="Across all open elections"
          statusLabel={totalVotesCast > 0 ? "Live count" : "No active voting"}
          statusTone={totalVotesCast > 0 ? "info" : "neutral"}
          icon={<BarChart3 size={20} strokeWidth={2} />}
          loading={loading}
          error={Boolean(error)}
          empty={totalVotesCast === 0}
          emptyMessage="Voting has not started"
        />
      </div>

      <div
        className="dashboard-grid"
        style={{
          display: "grid",
          gap: 24,
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))",
          marginBottom: 32,
        }}
      >
        <div style={{ minWidth: 0, maxWidth: "100%" }}>
          <PremiumChartPanel
            title="Election Status Distribution"
            subtitle="Global overview of electoral events"
            loading={analyticsLoading}
            error={Boolean(analyticsError)}
            empty={!analyticsLoading && !analyticsError && (!statusDistribution?.items || statusDistribution.items.length === 0)}
            emptyMessage="No election data available"
          >
            <ElectionStatusDistributionDonut items={statusDistribution?.items || []} />
          </PremiumChartPanel>
        </div>
        <div style={{ minWidth: 0, maxWidth: "100%" }}>
          <PremiumChartPanel
            title="Registration Activity"
            subtitle="New voter registrations over time"
            loading={analyticsLoading}
            error={Boolean(analyticsError)}
            empty={!analyticsLoading && !analyticsError && (!registrationActivity?.items || registrationActivity.items.length === 0)}
            emptyMessage="No registration data available"
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#475569" }}>
                <span>Range</span>
                <select
                  value={registrationRange}
                  onChange={(event) => setRegistrationRange(event.target.value)}
                  style={{
                    height: 32,
                    borderRadius: 8,
                    border: "1px solid #DCE3EC",
                    background: "#FFFFFF",
                    color: "#0F172A",
                    fontSize: 13,
                    fontWeight: 600,
                    padding: "0 10px",
                  }}
                >
                  <option value="30d">30d</option>
                  <option value="90d">90d</option>
                  <option value="6m">6m</option>
                  <option value="12m">12m</option>
                </select>
              </label>
              <button
                type="button"
                onClick={reload}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#2F6FED",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Refresh
              </button>
            </div>
            <RegistrationActivityAreaChart items={registrationActivity?.items || []} />
          </PremiumChartPanel>
        </div>
      </div>

      <div className="dashboard-grid-panels">
        <DashboardCard
          title="Scheduled Elections"
          actions={
            <Link
              to="/admin/elections"
              style={{ fontSize: 13, fontWeight: 600, color: "var(--dashboard-accent)", textDecoration: "none" }}
            >
              View All
            </Link>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { name: "2026 Federal General", date: "Nov 04, 2026", type: "Federal", status: "Active" },
              { name: "Provincial Assembly (Bagmati)", date: "Dec 12, 2026", type: "Provincial", status: "Draft" },
              { name: "Local Government (Kathmandu)", date: "Jan 15, 2027", type: "Local", status: "Scheduled" },
            ].map((el) => (
              <div
                key={el.name}
                style={{
                  padding: "14px",
                  borderRadius: 12,
                  border: "1px solid var(--dashboard-border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--dashboard-text)" }}>{el.name}</div>
                  <div style={{ fontSize: 12, color: "var(--dashboard-text-muted)", marginTop: 2 }}>{el.type} · {el.date}</div>
                </div>
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.02em",
                    background: el.status === "Active" ? "var(--dashboard-success-soft)" : "var(--dashboard-accent-soft)",
                    color: el.status === "Active" ? "var(--dashboard-success)" : "var(--dashboard-text-soft)",
                  }}
                >
                  {el.status}
                </span>
              </div>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard title="Core Administration">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { to: "/admin/manage-voters", label: "Manage Voters", color: "var(--dashboard-accent)", bg: "var(--dashboard-accent-soft)", icon: "👤" },
              { to: "/admin/candidates", label: "Candidates", color: "#10B981", bg: "#ECFDF5", icon: "⭐" },
              { to: "/admin/voter-verifications", label: "Review Queue", color: "#F59E0B", bg: "#FFFBEB", icon: "🔍" },
              { to: "/superadmin/manage-admins", label: "Admin Staff", color: "#6366F1", bg: "#F5F3FF", icon: "🛡️" },
            ].map((action) => (
              <Link
                key={action.label}
                to={action.to}
                style={{
                  padding: "16px",
                  borderRadius: 12,
                  background: action.bg,
                  textDecoration: "none",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "transform 0.2s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
              >
                <span style={{ fontSize: 24 }} aria-hidden="true">{action.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: action.color }}>{action.label}</span>
              </Link>
            ))}
          </div>

          <div
            style={{
              marginTop: 24,
              padding: "16px",
              borderRadius: 12,
              background: "var(--dashboard-danger-soft)",
              border: "1px solid rgba(220, 38, 38, 0.13)",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--dashboard-danger)", marginBottom: 4 }}>
              Security Alert
            </div>
            <div style={{ fontSize: 12, color: "var(--dashboard-danger)", opacity: 0.8, lineHeight: 1.5 }}>
              There are 12 unassigned security logs from the last 24 hours. Administrator review is required.
            </div>
          </div>
        </DashboardCard>
      </div>
    </div>
  );
}
