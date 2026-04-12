import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, ArrowLeft, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import useElectionsForResults from "../features/results/hooks/useResults";
import ElectionResultCard from "../features/results/components/ElectionResultCard";
import { PageContainer } from "../components/ui/AdminUI";

const P = {
  navy: "#173B72", accent: "#2F6FED", surface: "#FFFFFF", bg: "#F5F7FB",
  border: "#DCE3EC", text: "#0F172A", muted: "#64748B",
  success: "#059669", successBg: "#ECFDF5", error: "#DC2626", errorBg: "#FEF2F2",
  orange: "#EA580C", orangeBg: "#FFF7ED",
};

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "POLLING_CLOSED", label: "Polling Closed" },
  { key: "COUNTING", label: "Counting" },
  { key: "FINALIZED", label: "Finalized" },
];

export default function LocalResultsPage() {
  const navigate = useNavigate();
  const { elections, loading, error, reload } = useElectionsForResults();
  const [expandedId, setExpandedId] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [districtFilter, setDistrictFilter] = useState("");

  const clearMessages = () => { setActionError(null); setActionSuccess(null); };

  const localElections = elections.filter(e => e.government_level === "LOCAL");

  const districts = useMemo(() => {
    const d = new Set();
    localElections.forEach(e => { if (e.district_name) d.add(e.district_name); });
    return [...d].sort();
  }, [localElections]);

  const filtered = useMemo(() => {
    let result = localElections;
    if (statusFilter !== "all") result = result.filter(e => e.status === statusFilter);
    if (districtFilter) result = result.filter(e => e.district_name === districtFilter);
    return result;
  }, [localElections, statusFilter, districtFilter]);

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
            background: "linear-gradient(135deg, #EA580C 0%, #9A3412 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <MapPin size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: P.navy }}>Local Election Results</h1>
            <p style={{ margin: 0, fontSize: 13, color: P.muted }}>{localElections.length} election(s) available</p>
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

      {/* District filter */}
      {districts.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap", overflowX: "auto" }}>
          <button onClick={() => setDistrictFilter("")} style={{
            padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700,
            border: "none", cursor: "pointer", whiteSpace: "nowrap",
            background: !districtFilter ? P.orange : "#F1F5F9",
            color: !districtFilter ? "#fff" : "#475569",
          }}>
            All Districts
          </button>
          {districts.map(d => (
            <button key={d} onClick={() => setDistrictFilter(d)} style={{
              padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700,
              border: "none", cursor: "pointer", whiteSpace: "nowrap",
              background: districtFilter === d ? P.orange : "#F1F5F9",
              color: districtFilter === d ? "#fff" : "#475569",
            }}>
              {d}
            </button>
          ))}
        </div>
      )}

      {/* Status filters */}
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
          <style>{`@keyframes localShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{
              height: 64, borderRadius: 14, marginBottom: 12,
              background: "linear-gradient(90deg, #F0F0F0 25%, #E8E8E8 50%, #F0F0F0 75%)",
              backgroundSize: "200% 100%", animation: "localShimmer 1.5s infinite",
            }} />
          ))}
        </div>
      )}

      {!loading && error && <div style={{ textAlign: "center", padding: 48, color: P.error }}>{error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div style={{
          textAlign: "center", padding: "60px 24px",
          background: "linear-gradient(180deg, #FFF7ED 0%, #F5F7FB 100%)",
          borderRadius: 16, border: `1px solid ${P.border}`,
        }}>
          <MapPin size={48} color={P.orange} style={{ marginBottom: 12 }} />
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: P.navy }}>No local results yet</h3>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: P.muted }}>
            Local elections that have closed polling will appear here.
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
