import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { BarChart3, ClipboardList, ShieldCheck, ShieldUser, UserRoundCheck, Users, Vote } from "lucide-react";
import PremiumMetricCard from "../components/dashboard/PremiumMetricCard";
import PremiumChartPanel from "../components/dashboard/PremiumChartPanel";
import ElectionStatusDistributionDonut from "../components/charts/ElectionStatusDistributionDonut";
import RegistrationActivityAreaChart from "../components/charts/RegistrationActivityAreaChart";
import ScheduledElectionsPanel from "../components/dashboard/ScheduledElectionsPanel";
import CoreAdministrationPanel from "../components/dashboard/CoreAdministrationPanel";
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

  const scheduledElectionItems = [
  ];

  const token = localStorage.getItem("access_token");
  let userRole = null;
  if (token) {
    try {
      const payloadBase64 = token.split(".")[1];
      const payloadJson = atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/"));
      userRole = JSON.parse(payloadJson).role;
    } catch (e) { }
  }

  const coreAdministrationItems = [
    {
      id: "core-manage-voters",
      title: "Manage Voters",
      description: "Registry, eligibility, and lifecycle management",
      href: "/admin/manage-voters",
      icon: <Users size={18} strokeWidth={2.2} />,
      tone: "info",
      badgeText: registeredVoters > 0 ? registeredVoters.toLocaleString("en-US") : "",
    },
    {
      id: "core-review-queue",
      title: "Review Queue",
      description: "Pending voter verification decisions",
      href: "/admin/voter-verifications",
      icon: <ClipboardList size={18} strokeWidth={2.2} />,
      tone: "warning",
      badgeText: pendingVerifications > 0 ? pendingVerifications.toLocaleString("en-US") : "",
    },
    ...(userRole === "super_admin" ? [{
      id: "core-admin-staff",
      title: "Admin Staff",
      description: "Administrative access and governance",
      href: "/superadmin/manage-admins",
      icon: <ShieldUser size={18} strokeWidth={2.2} />,
      tone: "neutral",
      badgeText: "",
    }] : []),
  ];

  const coreAdministrationAlert = pendingVerifications > 0
    ? {
      title: "Security Alert",
      message: "There are pending verification or review items requiring administrator attention.",
      tone: "danger",
      actionLabel: "Open Review Queue",
      actionHref: "/admin/voter-verifications",
    }
    : {
      title: "Operational Status",
      message: "No active security or review alerts at this time.",
      tone: "success",
      actionLabel: "View Dashboard",
      actionHref: "/dashboard",
    };

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
            to="/admin/voter-verifications"
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

      <div
        className="dashboard-grid-panels"
        style={{
          display: "grid",
          gap: 24,
          alignItems: "stretch",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))",
        }}
      >
        <div style={{ minWidth: 0, maxWidth: "100%", display: "flex" }}>
          <ScheduledElectionsPanel
            items={scheduledElectionItems}
            viewAllHref="#"
          />
        </div>

        <div style={{ minWidth: 0, maxWidth: "100%", display: "flex" }}>
          <CoreAdministrationPanel
            items={coreAdministrationItems}
            alert={coreAdministrationAlert}
          />
        </div>
      </div>
    </div>
  );
}
