import React, { useState, useEffect, useCallback } from "react";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import {
  MapPin,
  Search,
  Loader2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Users,
  User,
  CreditCard,
  Building2,
  Home,
  ChevronRight,
  ArrowRight,
  Landmark,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  listAssignments,
  assignVoter,
  removeAssignment,
  listConstituencies,
  listAssignableVoters,
} from "../features/voter-assignments/api/voterAssignmentsApi";
import { T } from "../components/ui/tokens";
import { PageContainer, AdminKeyframes } from "../components/ui/AdminUI";

/* ── Shared styles ───────────────────────────────────────────── */
const card = {
  background: T.surface,
  border: `1px solid ${T.border}`,
  borderRadius: T.radius.xl,
  padding: 24,
  marginBottom: 22,
  boxShadow: T.shadow.sm,
};
const btn = (bg, color) => ({
  padding: "9px 18px",
  borderRadius: T.radius.md,
  border: "none",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: bg,
  color,
  transition: T.transition,
  boxShadow: T.shadow.sm,
});
const inp = {
  padding: "10px 12px",
  borderRadius: T.radius.md,
  border: `1.5px solid ${T.border}`,
  fontSize: 13.5,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  transition: T.transition,
};
const thStyle = {
  background: T.surfaceAlt, color: T.muted, fontSize: 11, fontWeight: 700,
  textTransform: "uppercase", letterSpacing: "0.05em", padding: "11px 14px",
  borderBottom: `1px solid ${T.border}`, textAlign: "left",
};
const tdStyle = {
  padding: "12px 14px", borderBottom: `1px solid ${T.borderLight}`,
  fontSize: 13.5, verticalAlign: "middle",
};

/* ── Level card config ───────────────────────────────────────── */
const LEVELS = [
  {
    key: "federal", label: "Federal Constituencies", description: "House of Representatives — nationwide FPTP constituencies",
    icon: Landmark, color: T.accent, bg: T.accentLight, borderAccent: T.borderFederal,
    active: true, chips: ["165 FPTP", "National"],
  },
  {
    key: "provincial", label: "Provincial Assemblies", description: "Assign voters to provincial assembly areas",
    icon: Building2, color: "#7C3AED", bg: "#F5F3FF", borderAccent: T.borderProvincial,
    to: "/admin/voter-assignments/provincial", chips: ["7 Provinces"],
  },
  {
    key: "local", label: "Local Wards", description: "Assign voters to wards within municipalities",
    icon: Home, color: "#C2410C", bg: "#FFF5ED", borderAccent: T.borderLocal,
    to: "/admin/voter-assignments/local", chips: ["Wards"],
  },
];

export default function VoterAssignmentsPage() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [constituencies, setConstituencies] = useState([]);
  const [voters, setVoters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  // Form state
  const [voterSearch, setVoterSearch] = useState("");
  const [selectedVoter, setSelectedVoter] = useState(null);
  const [selectedConstituency, setSelectedConstituency] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);

  const loadAssignments = useCallback(async () => {
    try {
      const data = await listAssignments(page, 50);
      setAssignments(data);
    } catch (err) {
      setMsg({ type: "error", text: err?.response?.data?.detail || "Failed to load assignments" });
    }
  }, [page]);

  const loadConstituencies = useCallback(async () => {
    try {
      const data = await listConstituencies();
      setConstituencies(data);
    } catch {
      /* non-critical */
    }
  }, []);

  const loadVoters = useCallback(async (search) => {
    try {
      const data = await listAssignableVoters(search);
      setVoters(data);
    } catch {
      setVoters([]);
    }
  }, []);

  useEffect(() => {
    Promise.all([loadAssignments(), loadConstituencies(), loadVoters("")]).then(() =>
      setLoading(false)
    );
  }, [loadAssignments, loadConstituencies, loadVoters]);

  const handleSearch = () => {
    loadVoters(voterSearch);
  };

  const handleAssign = async () => {
    if (!selectedVoter || !selectedConstituency) {
      setMsg({ type: "error", text: "Select both a voter and a constituency" });
      return;
    }
    setSubmitting(true);
    try {
      await assignVoter(selectedVoter.id, parseInt(selectedConstituency, 10));
      setMsg({ type: "success", text: `Assigned ${selectedVoter.citizenship_no_normalized || selectedVoter.full_name} successfully` });
      setSelectedVoter(null);
      setSelectedConstituency("");
      loadAssignments();
      loadVoters(voterSearch);
    } catch (err) {
      setMsg({ type: "error", text: err?.response?.data?.detail || "Assignment failed" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (voterId, voterName) => {
    setConfirmRemove({ voterId, voterName });
  };

  const confirmRemoveAction = async () => {
    if (!confirmRemove) return;
    const { voterId, voterName } = confirmRemove;
    setConfirmRemove(null);
    try {
      await removeAssignment(voterId);
      setMsg({ type: "success", text: `Assignment removed for ${voterName}` });
      loadAssignments();
      loadVoters(voterSearch);
    } catch (err) {
      setMsg({ type: "error", text: err?.response?.data?.detail || "Removal failed" });
    }
  };

  // Filter constituencies by province
  const filteredConstituencies = provinceFilter
    ? constituencies.filter((c) => String(c.province_id) === provinceFilter)
    : constituencies;

  const provinces = [...new Set(constituencies.map((c) => c.province_id))].sort((a, b) => a - b);

  if (loading) {
    return (
      <PageContainer>
        <div style={{ display: "flex", justifyContent: "center", padding: 60, color: T.muted }}>
          <Loader2 size={24} style={{ animation: "spin 1s linear infinite" }} />
          <span style={{ marginLeft: 8, fontWeight: 600 }}>Loading assignments…</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <AdminKeyframes />
      <div style={{ maxWidth: 1140, margin: "0 auto" }}>
        {/* ── Page header ──────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <div style={{
            width: 48, height: 48, borderRadius: T.radius.lg, display: "flex",
            alignItems: "center", justifyContent: "center",
            background: `linear-gradient(135deg, ${T.accent}18, ${T.accent}08)`,
            border: `1.5px solid ${T.accent}30`,
          }}><MapPin size={22} color={T.accent} /></div>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: T.text, letterSpacing: "-0.02em" }}>
              Voter Assignments
            </h1>
            <p style={{ margin: "2px 0 0", color: T.muted, fontSize: 14, fontWeight: 500 }}>
              Assign registered voters to their electoral constituencies, provincial areas, and local wards.
            </p>
          </div>
        </div>

        {/* ── Hub-style level switcher ─────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 24 }}>
          {LEVELS.map(({ key, label, description, icon: Icon, color, bg, borderAccent, active, to, chips }) => (
            <div key={key}
              onClick={() => !active && navigate(to)}
              style={{
                background: T.surface, borderRadius: T.radius.xl,
                border: `1px solid ${active ? borderAccent : T.border}`,
                borderTop: `3px solid ${borderAccent}`,
                padding: "20px 22px", cursor: active ? "default" : "pointer",
                boxShadow: active ? T.shadow.md : T.shadow.sm,
                display: "flex", flexDirection: "column", gap: 12,
                transition: T.transition, position: "relative", overflow: "hidden",
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.boxShadow = T.shadow.md; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.boxShadow = T.shadow.sm; }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "50%", display: "flex",
                  alignItems: "center", justifyContent: "center", background: bg, flexShrink: 0,
                }}><Icon size={20} color={color} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: T.text }}>{label}</div>
                  <div style={{ fontSize: 12.5, color: T.muted, marginTop: 1 }}>{description}</div>
                </div>
                {!active && <ChevronRight size={18} color={T.muted} />}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {chips.map(c => (
                  <span key={c} style={{
                    fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 999,
                    background: bg, color, border: `1px solid ${color}25`,
                  }}>{c}</span>
                ))}
                {active && (
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 999,
                    background: T.successBg, color: T.success, border: `1px solid ${T.successBorder}`,
                  }}>Currently viewing</span>
                )}
              </div>
            </div>
          ))}
        </div>

      {/* ── Message banner ────────────────────────────── */}
      {msg && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: T.radius.md,
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: msg.type === "success" ? T.successBg : T.errorBg,
            color: msg.type === "success" ? T.success : T.error,
            fontSize: 13,
            fontWeight: 600,
            border: `1px solid ${msg.type === "success" ? T.successBorder : T.errorBorder}`,
          }}
        >
          {msg.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {msg.text}
          <button
            onClick={() => setMsg(null)}
            style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "inherit", fontWeight: 700, fontSize: 16 }}
          >
            ×
          </button>
        </div>
      )}

      {/* ── Assign form ───────────────────────────────── */}
      <div style={card}>
        <h3 style={{ margin: "0 0 18px", fontSize: 17, fontWeight: 800, color: T.navy, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%", display: "flex",
            alignItems: "center", justifyContent: "center",
            background: T.accentLight,
          }}><Landmark size={16} color={T.accent} /></div>
          Assign Voter to Federal Constituency
        </h3>

        {/* Step 1: Search voter by citizenship ID */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: T.text, display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{
              width: 22, height: 22, borderRadius: "50%", background: T.accent, color: "#fff",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 800,
            }}>1</span>
            Search Voter by Citizenship ID
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              style={{ ...inp, maxWidth: 350 }}
              placeholder="Enter citizenship number…"
              value={voterSearch}
              onChange={(e) => setVoterSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              onFocus={e => { e.target.style.borderColor = T.accent; e.target.style.boxShadow = T.focusRing; }}
              onBlur={e => { e.target.style.borderColor = T.border; e.target.style.boxShadow = "none"; }}
            />
            <button style={btn(T.accent, "#fff")} onClick={handleSearch}>
              <Search size={14} /> Search
            </button>
          </div>
          {voters.length > 0 && !selectedVoter && (
            <div
              style={{
                marginTop: 8,
                maxHeight: 220,
                overflowY: "auto",
                border: `1px solid ${T.border}`,
                borderRadius: T.radius.md,
                background: T.surfaceAlt,
              }}
            >
              {voters.map((v) => (
                <div
                  key={v.id}
                  onClick={() => setSelectedVoter(v)}
                  style={{
                    padding: "10px 14px",
                    cursor: "pointer",
                    borderBottom: `1px solid ${T.borderLight}`,
                    background: "transparent",
                    fontSize: 13,
                    transition: T.transitionFast,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = T.surface; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontWeight: 700, color: T.navy }}>{v.citizenship_no_normalized || v.citizenship_no_raw}</span>
                      <span style={{ color: T.muted, marginLeft: 10 }}>{v.full_name}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span
                        style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          borderRadius: 9999,
                          background: v.status === "ACTIVE" ? T.successBg : T.errorBg,
                          color: v.status === "ACTIVE" ? T.success : T.error,
                          fontWeight: 700,
                        }}
                      >
                        {v.status}
                      </span>
                      {v.assigned_constituency && (
                        <span
                          style={{
                            fontSize: 11,
                            padding: "2px 8px",
                            borderRadius: 9999,
                            background: T.accentLight,
                            color: T.accent,
                            fontWeight: 700,
                          }}
                        >
                          {v.assigned_constituency}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {voters.length === 0 && voterSearch.trim() && !selectedVoter && (
            <div style={{ marginTop: 8, fontSize: 13, color: T.muted }}>
              No voters found for "{voterSearch}"
            </div>
          )}
          {/* ── Voter Card ──────────────────────────────── */}
          {selectedVoter && (
            <div
              style={{
                marginTop: 12,
                padding: 16,
                border: `2px solid ${T.accent}`,
                borderRadius: T.radius.lg,
                background: T.accentLight,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: T.accent,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 18,
                  }}
                >
                  {(selectedVoter.full_name || "?")[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: T.navy }}>
                    {selectedVoter.full_name}
                  </div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 2, display: "flex", gap: 14, alignItems: "center" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <CreditCard size={12} /> {selectedVoter.citizenship_no_normalized || selectedVoter.citizenship_no_raw}
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <User size={12} /> Voter #{selectedVoter.id}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "1px 7px",
                        borderRadius: 9999,
                        background: selectedVoter.status === "ACTIVE" ? T.successBg : T.errorBg,
                        color: selectedVoter.status === "ACTIVE" ? T.success : T.error,
                        fontWeight: 700,
                      }}
                    >
                      {selectedVoter.status}
                    </span>
                  </div>
                  {selectedVoter.assigned_constituency && (
                    <div style={{ fontSize: 12, color: T.accent, marginTop: 4, fontWeight: 600 }}>
                      Currently assigned: {selectedVoter.assigned_constituency}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedVoter(null)}
                style={{
                  background: "none",
                  border: `1px solid ${T.border}`,
                  borderRadius: T.radius.sm,
                  padding: "4px 10px",
                  cursor: "pointer",
                  fontSize: 12,
                  color: T.muted,
                  fontWeight: 600,
                }}
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Step 2: Select constituency */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: T.text, display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{
              width: 22, height: 22, borderRadius: "50%", background: T.accent, color: "#fff",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 800,
            }}>2</span>
            Select Federal Constituency
          </label>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <select
              style={{ ...inp, maxWidth: 180 }}
              value={provinceFilter}
              onChange={(e) => setProvinceFilter(e.target.value)}
            >
              <option value="">All Provinces</option>
              {provinces.map((p) => (
                <option key={p} value={p}>
                  Province {p}
                </option>
              ))}
            </select>
            <select
              style={{ ...inp, maxWidth: 450 }}
              value={selectedConstituency}
              onChange={(e) => setSelectedConstituency(e.target.value)}
            >
              <option value="">— Select constituency —</option>
              {filteredConstituencies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.district_name}, P{c.province_id})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Step 3: Assign */}
        <button
          style={{
            ...btn(T.navy, "#fff"),
            opacity: !selectedVoter || !selectedConstituency || submitting ? 0.5 : 1,
          }}
          disabled={!selectedVoter || !selectedConstituency || submitting}
          onClick={handleAssign}
        >
          {submitting ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <CheckCircle2 size={14} />}
          {submitting ? "Assigning…" : "Assign Voter"}
        </button>
      </div>

      {/* ── Current assignments table ─────────────────── */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.navy, display: "flex", alignItems: "center", gap: 8 }}>
            <Users size={18} color={T.accent} /> Current Assignments ({assignments.length})
          </h3>
          <div style={{ display: "flex", gap: 8 }}>
            {page > 1 && (
              <button style={btn(T.surfaceAlt, T.text)} onClick={() => setPage((p) => p - 1)}>
                ← Prev
              </button>
            )}
            <span style={{ fontSize: 13, color: T.muted, padding: "8px 0", fontWeight: 600 }}>Page {page}</span>
            {assignments.length === 50 && (
              <button style={btn(T.surfaceAlt, T.text)} onClick={() => setPage((p) => p + 1)}>
                Next →
              </button>
            )}
          </div>
        </div>

        {assignments.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: T.muted, fontSize: 14 }}>
            <MapPin size={28} color={T.border} style={{ marginBottom: 8 }} />
            <p style={{ margin: "0 0 4px", fontWeight: 700, color: T.text }}>No voter assignments yet</p>
            <p style={{ margin: 0, color: T.muted, fontSize: 13 }}>Use the form above to assign voters to constituencies.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13 }}>
            <thead>
              <tr>
                <th style={thStyle}>Voter</th>
                <th style={thStyle}>Citizenship ID</th>
                <th style={thStyle}>Constituency</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a, idx) => (
                <tr key={a.id} style={{
                  background: idx % 2 === 0 ? T.surface : T.surfaceAlt,
                  transition: T.transitionFast,
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#F0F4FF"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = idx % 2 === 0 ? T.surface : T.surfaceAlt; }}
                >
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{a.voter_name || "—"}</td>
                  <td style={tdStyle}>
                    <code style={{
                      background: T.surfaceAlt, padding: "2px 8px", borderRadius: T.radius.sm,
                      fontSize: 12, fontWeight: 600, color: T.textSecondary,
                      border: `1px solid ${T.borderLight}`, fontFamily: "monospace",
                    }}>{a.citizenship_no || "—"}</code>
                  </td>
                  <td style={tdStyle}>{a.constituency_name || "Unknown"}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    <button
                      style={{ ...btn(T.errorBg, T.error), padding: "5px 12px", fontSize: 12, boxShadow: "none", border: `1px solid ${T.errorBorder}` }}
                      onClick={() => handleRemove(a.voter_id, a.voter_name || `Voter #${a.voter_id}`)}
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        onConfirm={confirmRemoveAction}
        title="Remove Assignment"
        body={`Remove constituency assignment for ${confirmRemove?.voterName}?`}
        confirmLabel="Remove"
        variant="danger"
      />
    </div>
    </PageContainer>
  );
}
