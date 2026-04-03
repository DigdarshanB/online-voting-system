import React, { Suspense, useMemo } from "react";
import { Link } from "react-router-dom";
import DashboardCard from "../components/dashboard/DashboardCard";
import DashboardMetricCard from "../components/dashboard/DashboardMetricCard";
import DashboardPlaceholderChart from "../components/dashboard/DashboardPlaceholderChart";
import DashboardFilters from "../features/dashboard/components/DashboardFilters";
import useDashboardFilters from "../features/dashboard/hooks/useDashboardFilters";
import { useDashboardSystemStatus } from "../features/dashboard/hooks/useDashboardSystemStatus";

const ElectionStatusDonutChart = React.lazy(() => import("../components/charts/ElectionStatusDonutChart"));
const RegistrationTrendChart = React.lazy(() => import("../components/charts/RegistrationTrendChart"));

const registrationTrendData = [
  { date: "2025-09-01", label: "Sep", value: 1610 },
  { date: "2025-10-01", label: "Oct", value: 1745 },
  { date: "2025-11-01", label: "Nov", value: 1820 },
  { date: "2025-12-01", label: "Dec", value: 1965 },
  { date: "2026-01-01", label: "Jan", value: 2140 },
  { date: "2026-02-01", label: "Feb", value: 2310 },
  { date: "2026-03-01", label: "Mar", value: 2495 },
  { date: "2026-04-01", label: "Apr", value: 2670 },
];

const electionStatusData = [
  { name: "Active", value: 3 },
  { name: "Scheduled", value: 5 },
  { name: "Draft", value: 2 },
  { name: "Closed", value: 4 },
];

export default function DashboardPage() {
  const { data, isLoading, isError } = useDashboardSystemStatus();
  const { range, startDate, endDate, setRange, setStartDate, setEndDate } = useDashboardFilters();
  const filteredRegistrationTrendData = useMemo(() => {
    if (!startDate && !endDate) {
      const now = new Date();
      const lowerBound = new Date(now);

      if (range === "30d") {
        lowerBound.setDate(lowerBound.getDate() - 30);
      } else if (range === "90d") {
        lowerBound.setDate(lowerBound.getDate() - 90);
      } else if (range === "6m") {
        lowerBound.setMonth(lowerBound.getMonth() - 6);
      } else if (range === "12m") {
        lowerBound.setMonth(lowerBound.getMonth() - 12);
      }

      return registrationTrendData.filter((item) => new Date(`${item.date}T00:00:00`) >= lowerBound);
    }

    const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
    const end = endDate ? new Date(`${endDate}T23:59:59`) : null;

    return registrationTrendData.filter((item) => {
      const itemDate = new Date(`${item.date}T00:00:00`);

      if (start && itemDate < start) {
        return false;
      }

      if (end && itemDate > end) {
        return false;
      }

      return true;
    });
  }, [range, startDate, endDate]);

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
            {dateStr} &nbsp;·&nbsp; System Status: <span style={{ color: "var(--dashboard-success)" }}>{isLoading ? "Checking..." : isError ? "Unavailable" : data.label}</span>
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

      <div className="dashboard-grid-kpi">
        {[
          { label: "Active Elections", val: "3", sub: "2 Federal · 1 Local", icon: "🗳️" },
          { label: "Registered Voters", val: "142,850", sub: "+124 this week", icon: "👥" },
          { label: "Pending Verification", val: "1,240", sub: "Needs urgent review", icon: "⏳", tone: "warning" },
          { label: "Total Votes Cast", val: "582,410", sub: "72.4% avg turnout", icon: "📊" },
        ].map((kpi) => (
          <DashboardMetricCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.val}
            meta={kpi.sub}
            icon={kpi.icon}
            tone={kpi.tone}
          />
        ))}
      </div>

      <div
        className="dashboard-grid"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", marginBottom: 32 }}
      >
        <section className="dashboard-card-surface">
          <h3 className="dashboard-section-title">Election Status Distribution</h3>
          <p className="dashboard-section-copy">Global overview of electoral events</p>
          <Suspense
            fallback={
              <div
                style={{
                  height: 280,
                  borderRadius: 12,
                  border: "1px dashed var(--dashboard-border)",
                  background: "var(--dashboard-surface-muted)",
                }}
              />
            }
          >
            <ElectionStatusDonutChart data={electionStatusData} />
          </Suspense>
        </section>
        <section className="dashboard-card-surface">
          <h3 className="dashboard-section-title">Registration Activity</h3>
          <p className="dashboard-section-copy">New registrations per month (Last 6 Months)</p>
          <DashboardFilters
            range={range}
            startDate={startDate}
            endDate={endDate}
            onRangeChange={(value) => setRange(value)}
            onStartDateChange={(value) => setStartDate(value)}
            onEndDateChange={(value) => setEndDate(value)}
          />
          {filteredRegistrationTrendData.length === 0 ? (
            <p style={{ marginTop: 12, fontSize: 13, color: "var(--dashboard-text-muted)" }}>No data for selected range</p>
          ) : (
            <Suspense
              fallback={
                <div
                  style={{
                    height: 280,
                    borderRadius: 12,
                    border: "1px dashed var(--dashboard-border)",
                    background: "var(--dashboard-surface-muted)",
                  }}
                />
              }
            >
              <RegistrationTrendChart data={filteredRegistrationTrendData} />
            </Suspense>
          )}
        </section>
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
