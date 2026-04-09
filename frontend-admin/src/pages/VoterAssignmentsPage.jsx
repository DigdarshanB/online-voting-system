import React, { useState, useEffect, useCallback } from "react";
import {
  MapPin,
  Search,
  Loader2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Users,
} from "lucide-react";
import {
  listAssignments,
  assignVoter,
  removeAssignment,
  listConstituencies,
  listAssignableVoters,
} from "../features/voter-assignments/api/voterAssignmentsApi";

/* ── Palette — matches existing admin shell design tokens ────── */
const P = {
  navy: "#173B72",
  accent: "#2F6FED",
  surface: "#FFFFFF",
  bg: "#F5F7FB",
  border: "#DCE3EC",
  text: "#0F172A",
  muted: "#64748B",
  success: "#059669",
  successBg: "#ECFDF5",
  error: "#DC2626",
  errorBg: "#FEF2F2",
};

/* ── Shared styles ───────────────────────────────────────────── */
const card = {
  background: P.surface,
  border: `1px solid ${P.border}`,
  borderRadius: 12,
  padding: 24,
  marginBottom: 20,
};
const btn = (bg, color) => ({
  padding: "8px 18px",
  borderRadius: 8,
  border: "none",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: bg,
  color,
});
const inp = {
  padding: "8px 12px",
  borderRadius: 8,
  border: `1px solid ${P.border}`,
  fontSize: 13,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

export default function VoterAssignmentsPage() {
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
      setMsg({ type: "success", text: `Assigned ${selectedVoter.full_name} successfully` });
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
    if (!window.confirm(`Remove assignment for ${voterName}?`)) return;
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
      <div style={{ display: "flex", justifyContent: "center", padding: 60, color: P.muted }}>
        <Loader2 size={24} style={{ animation: "spin 1s linear infinite" }} />
        <span style={{ marginLeft: 8 }}>Loading assignments…</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* ── Message banner ────────────────────────────── */}
      {msg && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 8,
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: msg.type === "success" ? P.successBg : P.errorBg,
            color: msg.type === "success" ? P.success : P.error,
            fontSize: 13,
            fontWeight: 600,
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
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 800, color: P.navy, display: "flex", alignItems: "center", gap: 8 }}>
          <MapPin size={18} /> Assign Voter to Federal Constituency
        </h3>

        {/* Step 1: Search voter */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: P.text, display: "block", marginBottom: 4 }}>
            1. Search Voter
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              style={{ ...inp, maxWidth: 350 }}
              placeholder="Search by name…"
              value={voterSearch}
              onChange={(e) => setVoterSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <button style={btn(P.accent, "#fff")} onClick={handleSearch}>
              <Search size={14} /> Search
            </button>
          </div>
          {voters.length > 0 && (
            <div
              style={{
                marginTop: 8,
                maxHeight: 200,
                overflowY: "auto",
                border: `1px solid ${P.border}`,
                borderRadius: 8,
                background: "#FAFBFC",
              }}
            >
              {voters.map((v) => (
                <div
                  key={v.id}
                  onClick={() => setSelectedVoter(v)}
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    borderBottom: `1px solid ${P.border}`,
                    background: selectedVoter?.id === v.id ? "#EAF2FF" : "transparent",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 13,
                  }}
                >
                  <div>
                    <strong>{v.full_name}</strong>
                    {v.citizenship_number && (
                      <span style={{ color: P.muted, marginLeft: 8 }}>
                        ID: {v.citizenship_number}
                      </span>
                    )}
                  </div>
                  {v.assigned_constituency && (
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 9999,
                        background: "#DBEAFE",
                        color: "#1E40AF",
                        fontWeight: 600,
                      }}
                    >
                      {v.assigned_constituency}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          {selectedVoter && (
            <div style={{ marginTop: 8, fontSize: 13, color: P.navy, fontWeight: 600 }}>
              Selected: {selectedVoter.full_name} (ID: {selectedVoter.id})
              {selectedVoter.assigned_constituency && (
                <span style={{ color: P.muted, fontWeight: 400 }}>
                  {" "}— currently: {selectedVoter.assigned_constituency}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Step 2: Select constituency */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: P.text, display: "block", marginBottom: 4 }}>
            2. Select Federal Constituency
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
            ...btn(P.navy, "#fff"),
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
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: P.navy, display: "flex", alignItems: "center", gap: 8 }}>
            <Users size={18} /> Current Assignments ({assignments.length})
          </h3>
          <div style={{ display: "flex", gap: 8 }}>
            {page > 1 && (
              <button style={btn("#F1F5F9", P.text)} onClick={() => setPage((p) => p - 1)}>
                ← Prev
              </button>
            )}
            <span style={{ fontSize: 13, color: P.muted, padding: "8px 0" }}>Page {page}</span>
            {assignments.length === 50 && (
              <button style={btn("#F1F5F9", P.text)} onClick={() => setPage((p) => p + 1)}>
                Next →
              </button>
            )}
          </div>
        </div>

        {assignments.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: P.muted, fontSize: 14 }}>
            No voter assignments yet. Use the form above to assign voters to constituencies.
          </div>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
            }}
          >
            <thead>
              <tr style={{ textAlign: "left", borderBottom: `2px solid ${P.border}` }}>
                <th style={{ padding: "8px 12px", color: P.muted, fontWeight: 600 }}>Voter</th>
                <th style={{ padding: "8px 12px", color: P.muted, fontWeight: 600 }}>Voter ID</th>
                <th style={{ padding: "8px 12px", color: P.muted, fontWeight: 600 }}>Constituency</th>
                <th style={{ padding: "8px 12px", color: P.muted, fontWeight: 600, textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => (
                <tr key={a.id} style={{ borderBottom: `1px solid ${P.border}` }}>
                  <td style={{ padding: "10px 12px", fontWeight: 500 }}>{a.voter_name || "—"}</td>
                  <td style={{ padding: "10px 12px", color: P.muted }}>{a.voter_id}</td>
                  <td style={{ padding: "10px 12px" }}>{a.constituency_name || "Unknown"}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>
                    <button
                      style={{ ...btn("#FEF2F2", P.error), padding: "4px 12px", fontSize: 12 }}
                      onClick={() => handleRemove(a.voter_id, a.voter_name || `Voter #${a.voter_id}`)}
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
