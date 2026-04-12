import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ArrowLeft, RefreshCw, AlertTriangle, CheckCircle2, BarChart3 } from "lucide-react";
import useElectionsForResults from "../features/results/hooks/useResults";
import ElectionResultCard from "../features/results/components/ElectionResultCard";
import { PageContainer } from "../components/ui/AdminUI";

const P = {
  navy: "#173B72", accent: "#2F6FED", surface: "#FFFFFF", bg: "#F5F7FB",
  border: "#DCE3EC", text: "#0F172A", muted: "#64748B",
  success: "#059669", successBg: "#ECFDF5", error: "#DC2626", errorBg: "#FEF2F2",
  purple: "#7C3AED", purpleBg: "#F5F3FF",
};

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "POLLING_CLOSED", label: "Polling Closed" },
  { key: "COUNTING", label: "Counting" },
  { key: "FINALIZED", label: "Finalized" },
];

const PROVINCES = [
  { key: "", label: "All Provinces" },
  { key: "1", label: "Province 1 (Koshi)" },
  { key: "2", label: "Province 2 (Madhesh)" },
  { key: "3", label: "Province 3 (Bagmati)" },
  { key: "4", label: "Province 4 (Gandaki)" },
  { key: "5", label: "Province 5 (Lumbini)" },
  { key: "6", label: "Province 6 (Karnali)" },
  { key: "7", label: "Province 7 (Sudurpashchim)" },
];

export default function ProvincialResultsPage() {
  const navigate = useNavigate();
  const { elections, loading, error, reload } = useElectionsForResults();
  const [expandedId, setExpandedId] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [provinceFilter, setProvinceFilter] = useState("");

  const clearMessages = () => { setActionError(null); setActionSuccess(null); };

  const provincialElections = elections.filter(e => e.government_level === "PROVINCIAL");
  const filtered = useMemo(() => {
    let result = provincialElections;
    if (statusFilter !== "all") result = result.filter(e => e.status === statusFilter);
    if (provinceFilter) result = result.filter(e => String(e.province_id) === provinceFilter || (e.title && e.title.includes(`Province ${provinceFilter}`)));
    return result;
  }, [provincialElections, statusFilter, provinceFilter]);

  return (
    <PageContainer>
      <button onClick={() => navigate("/admin/results")} style={{
        display: "inline-flex", alignItems: "center", gap: 6, background: "none",
        border: "none", color: P.navy, fontSize: 13, fontWeight: 600, cursor: "pointer",
        padding: 0, marginBottom: 20,
      }}>
        <ArrowLeft size={16} /> Election Results
      </button>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Building2 size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: P.navy }}>Provincial Election Results</h1>
            <p style={{ margin: 0, fontSize: 13, color: P.muted }}>{provincialElections.length} election(s) available</p>
          </div>
        </div>
        <button onClick={reload} style={{
          display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px",
          borderRadius: 10, border: `1.5px solid ${P.border}`, background: P.surface,
          color: P.muted, fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Province filter pills */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap", overflowX: "auto" }}>
        {PROVINCES.map(p => (
          <button key={p.key} onClick={() => setProvinceFilter(p.key)} style={{
            padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700,
            border: "none", cursor: "pointer", whiteSpace: "nowrap",
            background: provinceFilter === p.key ? P.purple : "#F1F5F9",
            color: provinceFilter === p.key ? "#fff" : "#475569",
            transition: "all 0.15s ease",
          }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Status filter chips */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {STATUS_FILTERS.map(f => (
          <button key={f.key} onClick={() => setStatusFilter(f.key)} style={{
            padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700,
            border: "none", cursor: "pointer",
            background: statusFilter === f.key ? P.navy : "#F1F5F9",
            color: statusFilter === f.key ? "#fff" : "#475569",
            transition: "all 0.15s ease",
          }}>
            {f.label}
          </button>
        ))}
      </div>

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

      {loading && (
        <div style={{ padding: 48 }}>
          <style>{`@keyframes provShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{
              height: 64, borderRadius: 14, marginBottom: 12,
              background: "linear-gradient(90deg, #F0F0F0 25%, #E8E8E8 50%, #F0F0F0 75%)",
              backgroundSize: "200% 100%", animation: "provShimmer 1.5s infinite",
            }} />
          ))}
        </div>
      )}

      {!loading && error && <div style={{ textAlign: "center", padding: 48, color: P.error }}>{error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div style={{
          textAlign: "center", padding: "60px 24px",
          background: "linear-gradient(180deg, #F3F0FF 0%, #F5F7FB 100%)",
          borderRadius: 16, border: `1px solid ${P.border}`,
        }}>
          <Building2 size={48} color={P.purple} style={{ marginBottom: 12 }} />
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: P.navy }}>No provincial results yet</h3>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: P.muted }}>
            Provincial elections that have closed polling will appear here.
          </p>
        </div>
      )}

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
