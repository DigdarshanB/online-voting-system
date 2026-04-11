/**
 * VoterDashboard.jsx
 *
 * Protected voter dashboard page.
 * Shows an overview of the voter's activity, upcoming elections,
 * and quick-access links to key actions.
 */

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Vote, BarChart3, Receipt, ShieldCheck, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import apiClient from "../lib/apiClient";

const PALETTE = {
  navy: "#173B72",
  accentBlue: "#2F6FED",
  mutedText: "#64748B",
  surface: "#FFFFFF",
  appBg: "#F5F7FB",
  success: "#0F9F6E",
  warning: "#F59E0B",
  nepalRed: "#D42C3A",
};

export default function VoterDashboard({ user }) {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiClient
      .get("/voter/elections")
      .then((res) => setElections(res.data || []))
      .catch(() => setError("Unable to load elections."))
      .finally(() => setLoading(false));
  }, []);

  const openElections = elections.filter((e) => e.status === "POLLING_OPEN");
  const votedCount = elections.filter((e) => e.user_has_voted).length;
  const resultElections = elections.filter(
    (e) => e.status === "FINALIZED" || e.status === "ARCHIVED"
  );

  return (
    <div style={{ padding: "32px 32px 48px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Welcome Banner */}
      <div
        style={{
          background: `linear-gradient(135deg, ${PALETTE.navy} 0%, ${PALETTE.accentBlue} 100%)`,
          borderRadius: 16,
          padding: "32px 36px",
          color: "#FFF",
          marginBottom: 28,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>
          Welcome back{user?.full_name ? `, ${user.full_name}` : ""}
        </h2>
        <p style={{ margin: "8px 0 0", fontSize: 14, opacity: 0.85, fontWeight: 500 }}>
          Your voter account is verified and active. Use this portal to participate in elections securely.
        </p>
      </div>

      {/* Stats Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 28,
        }}
      >
        <StatCard
          icon={<Vote size={22} color={PALETTE.accentBlue} />}
          label="Open Elections"
          value={loading ? "–" : openElections.length}
          accent={PALETTE.accentBlue}
        />
        <StatCard
          icon={<CheckCircle2 size={22} color={PALETTE.success} />}
          label="Votes Cast"
          value={loading ? "–" : votedCount}
          accent={PALETTE.success}
        />
        <StatCard
          icon={<BarChart3 size={22} color={PALETTE.warning} />}
          label="Results Available"
          value={loading ? "–" : resultElections.length}
          accent={PALETTE.warning}
        />
        <StatCard
          icon={<ShieldCheck size={22} color={PALETTE.success} />}
          label="Account Status"
          value="Active"
          accent={PALETTE.success}
        />
      </div>

      {/* Quick Actions */}
      <h3
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: PALETTE.navy,
          marginBottom: 14,
          letterSpacing: "-0.01em",
        }}
      >
        Quick Actions
      </h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <ActionCard
          to="/elections"
          icon={<Vote size={24} color={PALETTE.accentBlue} />}
          title="View Elections"
          description="Browse available elections and cast your ballot"
        />
        <ActionCard
          to="/results"
          icon={<BarChart3 size={24} color={PALETTE.warning} />}
          title="View Results"
          description="Check published election results and outcomes"
        />
        <ActionCard
          to="/receipt"
          icon={<Receipt size={24} color={PALETTE.success} />}
          title="Vote Receipts"
          description="Access your vote confirmation receipts"
        />
      </div>

      {/* Active Elections Section */}
      {!loading && openElections.length > 0 && (
        <>
          <h3
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: PALETTE.navy,
              marginBottom: 14,
              letterSpacing: "-0.01em",
            }}
          >
            <Clock size={18} style={{ verticalAlign: "middle", marginRight: 8 }} />
            Active Elections
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {openElections.map((el) => (
              <div
                key={el.id}
                style={{
                  background: PALETTE.surface,
                  borderRadius: 12,
                  border: "1px solid #E2E8F0",
                  padding: "18px 24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: PALETTE.navy }}>
                    {el.title}
                  </div>
                  <div style={{ fontSize: 13, color: PALETTE.mutedText, marginTop: 2 }}>
                    {el.election_type || "General"} Election
                    {el.polling_end && (
                      <> · Closes {new Date(el.polling_end).toLocaleDateString()}</>
                    )}
                  </div>
                </div>
                <Link
                  to={el.user_has_voted ? `/elections/${el.id}/results` : `/elections/${el.id}/ballot`}
                  style={{
                    padding: "8px 20px",
                    borderRadius: 8,
                    background: el.user_has_voted ? "#F0FDF4" : PALETTE.accentBlue,
                    color: el.user_has_voted ? PALETTE.success : "#FFF",
                    fontWeight: 700,
                    fontSize: 13,
                    textDecoration: "none",
                    border: el.user_has_voted ? `1px solid ${PALETTE.success}30` : "none",
                  }}
                >
                  {el.user_has_voted ? "✓ Voted" : "Cast Vote →"}
                </Link>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Error state */}
      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 20px",
            background: "#FEF2F2",
            borderRadius: 10,
            border: "1px solid #FECACA",
            color: "#DC2626",
            fontSize: 14,
            fontWeight: 500,
            marginTop: 16,
          }}
        >
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && elections.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "48px 24px",
            background: PALETTE.surface,
            borderRadius: 14,
            border: "1px solid #E2E8F0",
          }}
        >
          <Vote size={40} color="#CBD5E1" style={{ marginBottom: 12 }} />
          <p style={{ color: PALETTE.mutedText, fontSize: 15, fontWeight: 500, margin: 0 }}>
            No elections are currently available. Check back later.
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, accent }) {
  return (
    <div
      style={{
        background: PALETTE.surface,
        borderRadius: 14,
        border: "1px solid #E2E8F0",
        padding: "20px 24px",
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: `${accent}12`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 12, color: PALETTE.mutedText, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {label}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: PALETTE.navy, marginTop: 2 }}>
          {value}
        </div>
      </div>
    </div>
  );
}

function ActionCard({ to, icon, title, description }) {
  return (
    <Link
      to={to}
      style={{
        background: PALETTE.surface,
        borderRadius: 14,
        border: "1px solid #E2E8F0",
        padding: "24px",
        textDecoration: "none",
        transition: "all 0.2s ease",
        display: "block",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = PALETTE.accentBlue;
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(47,111,237,0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#E2E8F0";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={{ marginBottom: 12 }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: 15, color: PALETTE.navy, marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ fontSize: 13, color: PALETTE.mutedText, fontWeight: 500, lineHeight: 1.5 }}>
        {description}
      </div>
    </Link>
  );
}
