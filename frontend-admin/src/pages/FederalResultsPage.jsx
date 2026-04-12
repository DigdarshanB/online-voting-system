import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Landmark, ArrowLeft, RefreshCw, Loader2, AlertTriangle, CheckCircle2, BarChart3 } from "lucide-react";
import useElectionsForResults from "../features/results/hooks/useResults";
import ElectionResultCard from "../features/results/components/ElectionResultCard";
import { PageContainer } from "../components/ui/AdminUI";

const P = {
  navy: "#173B72", accent: "#2F6FED", surface: "#FFFFFF", bg: "#F5F7FB",
  border: "#DCE3EC", text: "#0F172A", muted: "#64748B",
  success: "#059669", successBg: "#ECFDF5", error: "#DC2626", errorBg: "#FEF2F2",
};

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "POLLING_CLOSED", label: "Polling Closed" },
  { key: "COUNTING", label: "Counting" },
  { key: "FINALIZED", label: "Finalized" },
];

export default function FederalResultsPage() {
  const navigate = useNavigate();
  const { elections, loading, error, reload } = useElectionsForResults();
  const [expandedId, setExpandedId] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const clearMessages = () => { setActionError(null); setActionSuccess(null); };

  const federalElections = elections.filter(e => e.government_level === "FEDERAL" || !e.government_level);
  const filtered = statusFilter === "all" ? federalElections : federalElections.filter(e => e.status === statusFilter);

  return (
    <PageContainer>
      {/* Back link */}
      <button
        onClick={() => navigate("/admin/results")}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6, background: "none",
          border: "none", color: P.navy, fontSize: 13, fontWeight: 600, cursor: "pointer",
          padding: 0, marginBottom: 20,
        }}
      >
        <ArrowLeft size={16} /> Election Results
      </button>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "linear-gradient(135deg, #2F6FED 0%, #1D4ED8 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Landmark size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: P.navy }}>Federal Election Results</h1>
            <p style={{ margin: 0, fontSize: 13, color: P.muted }}>{federalElections.length} election(s) available</p>
          </div>
        </div>
        <button onClick={reload} style={{
          display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px",
          borderRadius: 10, border: `1.5px solid ${P.border}`, background: P.surface,
          color: P.muted, fontSize: 13, fontWeight: 600, cursor: "pointer",
          transition: "all 0.2s ease",
        }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Filter chips */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {STATUS_FILTERS.map(f => (
          <button key={f.key} onClick={() => setStatusFilter(f.key)} style={{
            padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700,
            border: "none", cursor: "pointer", transition: "all 0.15s ease",
            background: statusFilter === f.key ? P.navy : "#F1F5F9",
            color: statusFilter === f.key ? "#fff" : "#475569",
          }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      {actionError && (
        <div style={{ padding: "12px 16px", borderRadius: 12, background: P.errorBg, color: P.error, marginBottom: 16, fontSize: 14, display: "flex", alignItems: "center", gap: 8, border: "1px solid #FECACA" }}>
          <AlertTriangle size={16} /> {actionError}
          <button onClick={() => setActionError(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: P.error, cursor: "pointer", fontWeight: 700 }}>×</button>
        </div>
      )}
      {actionSuccess && (
        <div style={{ padding: "12px 16px", borderRadius: 12, background: P.successBg, color: P.success, marginBottom: 16, fontSize: 14, display: "flex", alignItems: "center", gap: 8, border: "1px solid #A7F3D0" }}>
          <CheckCircle2 size={16} /> {actionSuccess}
          <button onClick={() => setActionSuccess(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: P.success, cursor: "pointer", fontWeight: 700 }}>×</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ padding: 48 }}>
          <style>{`@keyframes fedShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{
              height: 64, borderRadius: 14, marginBottom: 12,
              background: "linear-gradient(90deg, #F0F0F0 25%, #E8E8E8 50%, #F0F0F0 75%)",
              backgroundSize: "200% 100%",
              animation: "fedShimmer 1.5s infinite",
            }} />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div style={{ textAlign: "center", padding: 48, color: P.error }}>{error}</div>
      )}

      {/* Empty */}
      {!loading && !error && filtered.length === 0 && (
        <div style={{
          textAlign: "center", padding: "60px 24px",
          background: "linear-gradient(180deg, #F0F7FF 0%, #F5F7FB 100%)",
          borderRadius: 16, border: `1px solid ${P.border}`,
        }}>
          <BarChart3 size={48} color={P.accent} style={{ marginBottom: 12 }} />
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: P.navy }}>No federal results yet</h3>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: P.muted }}>
            Federal elections that have closed polling will appear here for counting and review.
          </p>
        </div>
      )}

      {/* Election cards */}
      {!loading && filtered.map(e => (
        <ElectionResultCard
          key={e.id} election={e}
          expanded={expandedId === e.id}
          onToggle={() => { clearMessages(); setExpandedId(expandedId === e.id ? null : e.id); }}
          actionLoading={actionLoading} setActionLoading={setActionLoading}
          setActionError={setActionError} setActionSuccess={setActionSuccess}
          clearMessages={clearMessages}
        />
      ))}
    </PageContainer>
  );
}
