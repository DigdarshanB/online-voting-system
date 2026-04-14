import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  ClipboardList,
  MapPin,
  RefreshCw,
  ShieldCheck,
  ShieldUser,
  UserCheck,
  Users,
  Vote,
} from "lucide-react";
import PremiumMetricCard from "../components/dashboard/PremiumMetricCard";
import PremiumChartPanel from "../components/dashboard/PremiumChartPanel";
import ElectionStatusDistributionDonut from "../components/charts/ElectionStatusDistributionDonut";
import RegistrationActivityAreaChart from "../components/charts/RegistrationActivityAreaChart";
import ScheduledElectionsPanel from "../components/dashboard/ScheduledElectionsPanel";
import CoreAdministrationPanel from "../components/dashboard/CoreAdministrationPanel";
import SystemStatusPanel from "../components/dashboard/SystemStatusPanel";
import useDashboardData from "../hooks/useDashboardData";
import useDashboardAnalytics from "../hooks/useDashboardAnalytics";
import { getToken, getTokenRole } from "../lib/auth";

/* ── Status label map for election levels ───────────────── */
const LEVEL_LABELS = {
  FEDERAL: "Federal",
  PROVINCIAL: "Provincial",
  LOCAL: "Local",
};

/* ── Build election level breakdown text from scheduled list */
function buildElectionBreakdown(scheduledElections, activeCount) {
  if (activeCount === 0) return "No active elections";
  if (!scheduledElections || scheduledElections.length === 0) {
    return `${activeCount} active election${activeCount !== 1 ? "s" : ""}`;
  }

  const activeLevels = scheduledElections
    .filter((e) => e.status === "POLLING_OPEN")
    .reduce((acc, e) => {
      const label = LEVEL_LABELS[e.government_level] || e.government_level || "Other";
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});

  const parts = Object.entries(activeLevels).map(([label, count]) => `${count} ${label}`);
  return parts.length > 0 ? parts.join(" · ") : `${activeCount} active`;
}

/* ── Map scheduled election items for the panel ──────────── */
function mapElectionItems(elections) {
  return elections.map((e) => {
    const dateLabel = e.polling_start_at
      ? new Date(e.polling_start_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : e.start_time
        ? new Date(e.start_time).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "";

    const levelLabel = LEVEL_LABELS[e.government_level] || e.government_level || "";
    const levelPath = e.government_level ? e.government_level.toLowerCase() : "federal";

    return {
      id: e.id,
      title: e.title,
      governmentLevel: levelLabel,
      dateLabel,
      status: e.status,
      statusLabel: STATUS_LABELS[e.status] || e.status,
      href: `/admin/manage-elections/${levelPath}`,
    };
  });
}

const STATUS_LABELS = {
  CONFIGURED: "Configured",
  NOMINATIONS_OPEN: "Nominations Open",
  NOMINATIONS_CLOSED: "Nominations Closed",
  CANDIDATE_LIST_PUBLISHED: "Candidates Published",
  POLLING_OPEN: "Polling Open",
  POLLING_CLOSED: "Polling Closed",
  COUNTING: "Counting",
};

export default function DashboardPage() {
  /* ── Data hooks ─────────────────────────────────────────── */
  const { summary, scheduledElections, systemStatus, loading, error, reload } = useDashboardData();
  const [registrationRange, setRegistrationRange] = useState("6m");
  const {
    statusDistribution,
    registrationActivity,
    loading: analyticsLoading,
    error: analyticsError,
    reload: reloadAnalytics,
  } = useDashboardAnalytics(registrationRange);

  /* ── Derived values ─────────────────────────────────────── */
  const activeElections = Number(summary?.active_elections ?? 0);
  const registeredVoters = Number(summary?.registered_voters ?? 0);
  const pendingVerifications = Number(summary?.pending_verifications ?? 0);
  const totalVotesCast = Number(summary?.total_votes_cast ?? 0);
  const scheduledCount = Number(summary?.scheduled_elections ?? 0);

  const electionBreakdown = buildElectionBreakdown(scheduledElections, activeElections);

  /* ── Date display ───────────────────────────────────────── */
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  /* ── Role ───────────────────────────────────────────────── */
  const token = getToken();
  const userRole = getTokenRole(token);
  const isSuperAdmin = userRole === "super_admin";

  /* ── Scheduled election items for panel ─────────────────── */
  const scheduledElectionItems = mapElectionItems(scheduledElections);

  /* ── Core Administration items ──────────────────────────── */
  const coreAdministrationItems = [
    {
      id: "core-manage-voters",
      title: "Manage Voters",
      description: "Voter registry and lifecycle management",
      href: "/admin/manage-voters",
      icon: <Users size={18} strokeWidth={2.2} />,
      tone: "info",
      badgeText: registeredVoters > 0 ? registeredVoters.toLocaleString("en-US") : "",
    },
    {
      id: "core-review-queue",
      title: "Verification Queue",
      description: "Pending voter identity verification",
      href: "/admin/voter-verifications",
      icon: <ClipboardList size={18} strokeWidth={2.2} />,
      tone: pendingVerifications > 0 ? "warning" : "success",
      badgeText: pendingVerifications > 0 ? pendingVerifications.toLocaleString("en-US") : "Clear",
    },
    {
      id: "core-elections",
      title: "Manage Elections",
      description: "Create and configure election structures",
      href: "/admin/manage-elections",
      icon: <Vote size={18} strokeWidth={2.2} />,
      tone: "info",
      badgeText: "",
    },
    {
      id: "core-candidates",
      title: "Manage Candidates",
      description: "Parties, profiles, nominations, and PR lists",
      href: "/admin/manage-candidates",
      icon: <UserCheck size={18} strokeWidth={2.2} />,
      tone: "neutral",
      badgeText: "",
    },
    {
      id: "core-assignments",
      title: "Voter Assignments",
      description: "Assign voters to constituencies and areas",
      href: "/admin/voter-assignments",
      icon: <MapPin size={18} strokeWidth={2.2} />,
      tone: "neutral",
      badgeText: "",
    },
    {
      id: "core-results",
      title: "Election Results",
      description: "Counting, tallies, and result publication",
      href: "/admin/results",
      icon: <BarChart3 size={18} strokeWidth={2.2} />,
      tone: "neutral",
      badgeText: "",
    },
    ...(isSuperAdmin
      ? [
          {
            id: "core-admin-staff",
            title: "Manage Admins",
            description: "Administrative access and governance",
            href: "/superadmin/manage-admins",
            icon: <ShieldUser size={18} strokeWidth={2.2} />,
            tone: "neutral",
            badgeText: "",
          },
        ]
      : []),
  ];

  /* ── Alert ──────────────────────────────────────────────── */
  const coreAdministrationAlert =
    pendingVerifications > 0
      ? {
          title: "Action Required",
          message: `${pendingVerifications} voter registration${pendingVerifications !== 1 ? "s" : ""} awaiting verification review.`,
          tone: "warning",
          actionLabel: "Open Verification Queue",
          actionHref: "/admin/voter-verifications",
        }
      : null;

  return (
    <div className="dashboard-page-shell">
      {/* ─── Header ─────────────────────────────────────────── */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 28,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 800,
              color: "var(--dashboard-text)",
              letterSpacing: "-0.02em",
            }}
          >
            Election Command Center
          </h2>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 13,
              color: "var(--dashboard-text-soft)",
              fontWeight: 500,
            }}
          >
            {dateStr}
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => { reload(); reloadAnalytics(); }}
            aria-label="Refresh dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 10,
              border: "1px solid var(--dashboard-border)",
              background: "var(--dashboard-surface)",
              color: "var(--dashboard-text-soft)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.18s ease",
            }}
          >
            <RefreshCw size={14} strokeWidth={2.2} />
            Refresh
          </button>
          <Link
            to="/admin/voter-verifications"
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              background: "var(--dashboard-accent)",
              color: "#FFF",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 600,
              transition: "opacity 0.18s ease",
            }}
          >
            Review Queue
            {pendingVerifications > 0 && (
              <span
                style={{
                  marginLeft: 8,
                  padding: "2px 7px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.25)",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {pendingVerifications}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* ─── KPI Summary Band ───────────────────────────────── */}
      <div
        className="dashboard-grid-kpi"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 20,
          marginBottom: 28,
        }}
      >
        <PremiumMetricCard
          title="Active Elections"
          value={activeElections}
          helperText={electionBreakdown}
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
          value={registeredVoters.toLocaleString("en-US")}
          helperText="Verified voter accounts"
          statusLabel={registeredVoters > 0 ? "Registry active" : "Empty registry"}
          statusTone={registeredVoters > 0 ? "info" : "neutral"}
          icon={<Users size={20} strokeWidth={2} />}
          loading={loading}
          error={Boolean(error)}
        />
        <PremiumMetricCard
          title="Pending Verification"
          value={pendingVerifications}
          helperText="Awaiting admin review"
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
          value={totalVotesCast.toLocaleString("en-US")}
          helperText="Across all elections"
          statusLabel={totalVotesCast > 0 ? "Live count" : "No active voting"}
          statusTone={totalVotesCast > 0 ? "info" : "neutral"}
          icon={<BarChart3 size={20} strokeWidth={2} />}
          loading={loading}
          error={Boolean(error)}
          empty={totalVotesCast === 0}
          emptyMessage="Voting has not started"
        />
      </div>

      {/* ─── Charts Row ─────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gap: 20,
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 400px), 1fr))",
          marginBottom: 28,
        }}
      >
        <div style={{ minWidth: 0, maxWidth: "100%" }}>
          <PremiumChartPanel
            title="Election Status Distribution"
            subtitle="All elections by lifecycle phase"
            loading={analyticsLoading}
            error={Boolean(analyticsError)}
            empty={
              !analyticsLoading &&
              !analyticsError &&
              (!statusDistribution?.items || statusDistribution.items.length === 0)
            }
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
            empty={
              !analyticsLoading &&
              !analyticsError &&
              (!registrationActivity?.items || registrationActivity.items.length === 0)
            }
            emptyMessage="No registration data available"
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                justifyContent: "space-between",
                marginBottom: 12,
                flexWrap: "wrap",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#475569",
                }}
              >
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
                onClick={reloadAnalytics}
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

      {/* ─── Bottom Row: Elections Panel + System Status ──── */}
      <div
        style={{
          display: "grid",
          gap: 20,
          gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)",
          marginBottom: 28,
        }}
        className="dashboard-bottom-row"
      >
        <div style={{ minWidth: 0, display: "flex" }}>
          <ScheduledElectionsPanel
            items={scheduledElectionItems}
            loading={loading}
            error={Boolean(error)}
            title="Upcoming & Active Elections"
            subtitle="Elections in active lifecycle phases"
            viewAllHref="/admin/manage-elections"
          />
        </div>

        <div style={{ minWidth: 0 }}>
          <SystemStatusPanel
            data={systemStatus}
            loading={loading}
            error={Boolean(error)}
          />
        </div>
      </div>

      {/* ─── Core Administration ─────────────────────────────── */}
      <CoreAdministrationPanel
        items={coreAdministrationItems}
        alert={coreAdministrationAlert}
        loading={loading}
        title="Administration"
        subtitle="Quick access to system management workflows"
      />
    </div>
  );
}
