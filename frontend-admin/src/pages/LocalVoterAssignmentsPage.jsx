import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import {
  MapPin, Search, Loader2, Trash2, CheckCircle2,
  AlertTriangle, Users, User, CreditCard, Home,
  ArrowLeft,
} from "lucide-react";
import {
  listAreaAssignments,
  listAreas,
  listAssignableVotersForArea,
  assignVoterToArea,
  removeAreaAssignment,
} from "../features/voter-assignments/api/voterAreaAssignmentsApi";
import { T } from "../components/ui/tokens";
import { PageContainer, AdminKeyframes } from "../components/ui/AdminUI";

const card = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius.xl, padding: 24, marginBottom: 22, boxShadow: T.shadow.sm };
const btn = (bg, color) => ({ padding: "9px 18px", borderRadius: T.radius.md, border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, background: bg, color, transition: T.transition, boxShadow: T.shadow.sm });
const inp = { padding: "10px 12px", borderRadius: T.radius.md, border: `1.5px solid ${T.border}`, fontSize: 13.5, outline: "none", width: "100%", boxSizing: "border-box", transition: T.transition };
const thStyle = { background: T.surfaceAlt, color: T.muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", padding: "11px 14px", borderBottom: `1px solid ${T.border}`, textAlign: "left" };
const tdStyle = { padding: "12px 14px", borderBottom: `1px solid ${T.borderLight}`, fontSize: 13.5, verticalAlign: "middle" };

export default function LocalVoterAssignmentsPage() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [areas, setAreas] = useState([]);
  const [voters, setVoters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  const [voterSearch, setVoterSearch] = useState("");
  const [selectedVoter, setSelectedVoter] = useState(null);
  const [selectedArea, setSelectedArea] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [page, setPage] = useState(1);

  const loadAssignments = useCallback(async () => {
    try {
      const data = await listAreaAssignments({ government_level: "LOCAL", page, pageSize: 50 });
      setAssignments(Array.isArray(data) ? data : []);
    } catch (err) {
      setMsg({ type: "error", text: err?.response?.data?.detail || "Failed to load assignments" });
    }
  }, [page]);

  const loadAreas = useCallback(async () => {
    try {
      const data = await listAreas({ government_level: "LOCAL" });
      setAreas(Array.isArray(data) ? data : []);
    } catch {
      setAreas([]);
    }
  }, []);

  const loadVoters = useCallback(async (search) => {
    try {
      const data = await listAssignableVotersForArea(search, "LOCAL");
      setVoters(Array.isArray(data) ? data : []);
    } catch {
      setVoters([]);
    }
  }, []);

  useEffect(() => {
    Promise.all([loadAssignments(), loadAreas(), loadVoters("")]).then(() => setLoading(false));
  }, [loadAssignments, loadAreas, loadVoters]);

  const handleSearch = () => { loadVoters(voterSearch); };

  const handleAssign = async () => {
    if (!selectedVoter || !selectedArea) {
      setMsg({ type: "error", text: "Select both a voter and a ward" });
      return;
    }
    setSubmitting(true);
    try {
      await assignVoterToArea(selectedVoter.id, parseInt(selectedArea, 10), "LOCAL");
      setMsg({ type: "success", text: `Assigned ${selectedVoter.citizenship_no_normalized || selectedVoter.full_name} successfully` });
      setSelectedVoter(null);
      setSelectedArea("");
      loadAssignments();
      loadVoters(voterSearch);
    } catch (err) {
      setMsg({ type: "error", text: err?.response?.data?.detail || "Assignment failed" });
    } finally {
      setSubmitting(false);
    }
  };

  const confirmRemoveAction = async () => {
    if (!confirmRemove) return;
    const { voterId, voterName } = confirmRemove;
    setConfirmRemove(null);
    try {
      await removeAreaAssignment(voterId, "LOCAL");
      setMsg({ type: "success", text: `Assignment removed for ${voterName}` });
      loadAssignments();
      loadVoters(voterSearch);
    } catch (err) {
      setMsg({ type: "error", text: err?.response?.data?.detail || "Removal failed" });
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div style={{ display: "flex", justifyContent: "center", padding: 60, color: T.muted }}>
          <Loader2 size={24} style={{ animation: "spin 1s linear infinite" }} />
          <span style={{ marginLeft: 8, fontWeight: 600 }}>Loading local ward assignments…</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <AdminKeyframes />
      <div style={{ maxWidth: 1140, margin: "0 auto" }}>
      {/* Back link */}
      <button
        onClick={() => navigate("/admin/voter-assignments")}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "none", border: "none", cursor: "pointer",
          fontSize: 13, fontWeight: 600, color: T.muted, padding: 0, marginBottom: 14,
          transition: T.transition,
        }}
        onMouseEnter={e => { e.currentTarget.style.color = T.accent; }}
        onMouseLeave={e => { e.currentTarget.style.color = T.muted; }}
      >
        <ArrowLeft size={14} /> Back to Voter Assignments
      </button>
      {/* Page header with icon */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <div style={{
          width: 48, height: 48, borderRadius: T.radius.lg, display: "flex",
          alignItems: "center", justifyContent: "center",
          background: `linear-gradient(135deg, ${T.orange || "#C2410C"}18, ${T.orange || "#C2410C"}08)`,
          border: `1.5px solid ${T.orange || "#C2410C"}30`,
        }}><Home size={22} color={T.orange || "#C2410C"} /></div>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: "-0.02em" }}>
            Local Ward Assignments
          </h1>
          <p style={{ margin: "2px 0 0", color: T.muted, fontSize: 13.5, fontWeight: 500 }}>
            Assign voters to wards within their local bodies (municipalities and rural municipalities).
          </p>
        </div>
      </div>

      {/* Message banner */}
      {msg && (
        <div style={{
          padding: "12px 16px", borderRadius: T.radius.md, marginBottom: 16,
          display: "flex", alignItems: "center", gap: 8,
          background: msg.type === "success" ? T.successBg : T.errorBg,
          color: msg.type === "success" ? T.success : T.error,
          border: `1px solid ${msg.type === "success" ? T.successBorder : T.errorBorder}`,
          fontSize: 13, fontWeight: 600,
        }}>
          {msg.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {msg.text}
          <button onClick={() => setMsg(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "inherit", fontWeight: 700, fontSize: 16 }}>×</button>
        </div>
      )}

      {/* Assign form */}
      <div style={card}>
        <h3 style={{ margin: "0 0 18px", fontSize: 17, fontWeight: 800, color: T.navy, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%", display: "flex",
            alignItems: "center", justifyContent: "center", background: `${T.orange || "#C2410C"}12`,
          }}><Home size={16} color={T.orange || "#C2410C"} /></div>
          Assign Voter to Local Ward
        </h3>

        {/* Step 1: Search voter */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: T.text, display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: T.orange || "#C2410C", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>1</span>
            Search Voter by Citizenship ID
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input style={{ ...inp, maxWidth: 350 }} placeholder="Enter citizenship number…"
              value={voterSearch} onChange={e => setVoterSearch(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()} />
            <button style={btn(T.accent, "#fff")} onClick={handleSearch}>
              <Search size={14} /> Search
            </button>
          </div>
          {voters.length > 0 && !selectedVoter && (
            <div style={{ marginTop: 8, maxHeight: 220, overflowY: "auto", border: `1px solid ${T.border}`, borderRadius: T.radius.md, background: T.surfaceAlt }}>
              {voters.map(v => (
                <div key={v.id} onClick={() => setSelectedVoter(v)}
                  style={{ padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${T.borderLight}`, background: "transparent", fontSize: 13, transition: T.transitionFast }}
                  onMouseEnter={e => { e.currentTarget.style.background = T.accentLight; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontWeight: 700, color: T.navy }}>{v.citizenship_no_normalized || v.citizenship_no_raw}</span>
                      <span style={{ color: T.muted, marginLeft: 10 }}>{v.full_name}</span>
                    </div>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 9999, background: v.status === "ACTIVE" ? T.successBg : T.errorBg, color: v.status === "ACTIVE" ? T.success : T.error, fontWeight: 600 }}>
                      {v.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {voters.length === 0 && voterSearch.trim() && !selectedVoter && (
            <div style={{ marginTop: 8, fontSize: 13, color: T.muted }}>No voters found for "{voterSearch}"</div>
          )}
          {selectedVoter && (
            <div style={{ marginTop: 12, padding: 16, border: `2px solid ${T.accent}`, borderRadius: T.radius.lg, background: T.accentLight, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: T.accent, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 18 }}>
                  {(selectedVoter.full_name || "?")[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: T.navy }}>{selectedVoter.full_name}</div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 2, display: "flex", gap: 14, alignItems: "center" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><CreditCard size={12} /> {selectedVoter.citizenship_no_normalized || selectedVoter.citizenship_no_raw}</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><User size={12} /> Voter #{selectedVoter.id}</span>
                    <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 9999, background: selectedVoter.status === "ACTIVE" ? T.successBg : T.errorBg, color: selectedVoter.status === "ACTIVE" ? T.success : T.error, fontWeight: 600 }}>{selectedVoter.status}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedVoter(null)} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: T.radius.sm, padding: "4px 10px", cursor: "pointer", fontSize: 12, color: T.muted, fontWeight: 600 }}>Clear</button>
            </div>
          )}
        </div>

        {/* Step 2: Select ward */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: T.text, display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: T.orange || "#C2410C", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>2</span>
            Select Ward
          </label>
          <select style={{ ...inp, maxWidth: 550 }} value={selectedArea} onChange={e => setSelectedArea(e.target.value)}>
            <option value="">— Select a ward —</option>
            {areas.map(a => (
              <option key={a.id} value={a.id}>
                {a.name || a.title || `Ward #${a.id}`}
              </option>
            ))}
          </select>
        </div>

        {/* Step 3: Assign */}
        <button style={{ ...btn(T.navy, "#fff"), opacity: !selectedVoter || !selectedArea || submitting ? 0.5 : 1 }}
          disabled={!selectedVoter || !selectedArea || submitting} onClick={handleAssign}>
          {submitting ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <CheckCircle2 size={14} />}
          {submitting ? "Assigning…" : "Assign Voter"}
        </button>
      </div>

      {/* Current assignments table */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.navy, display: "flex", alignItems: "center", gap: 8 }}>
            <Users size={18} color={T.orange || "#C2410C"} /> Ward Assignments ({assignments.length})
          </h3>
          <div style={{ display: "flex", gap: 8 }}>
            {page > 1 && <button style={btn(T.surfaceAlt, T.text)} onClick={() => setPage(p => p - 1)}>← Prev</button>}
            <span style={{ fontSize: 13, color: T.muted, padding: "8px 0", fontWeight: 600 }}>Page {page}</span>
            {assignments.length === 50 && <button style={btn(T.surfaceAlt, T.text)} onClick={() => setPage(p => p + 1)}>Next →</button>}
          </div>
        </div>
        {assignments.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: T.muted, fontSize: 14 }}>
            <Home size={28} color={T.border} style={{ marginBottom: 8 }} />
            <p style={{ margin: "0 0 4px", fontWeight: 700, color: T.text }}>No ward assignments yet</p>
            <p style={{ margin: 0, color: T.muted, fontSize: 13 }}>Use the form above to assign voters to wards within their local bodies.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13 }}>
            <thead>
              <tr>
                <th style={thStyle}>Voter</th>
                <th style={thStyle}>Citizenship ID</th>
                <th style={thStyle}>Ward</th>
                <th style={{ ...thStyle, textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a, idx) => (
                <tr key={a.id || `${a.voter_id}-${a.area_id}`} style={{ background: idx % 2 === 0 ? T.surface : T.surfaceAlt, transition: T.transitionFast }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#FFF5ED"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = idx % 2 === 0 ? T.surface : T.surfaceAlt; }}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{a.voter_name || "—"}</td>
                  <td style={tdStyle}><code style={{ background: T.surfaceAlt, padding: "2px 8px", borderRadius: T.radius.sm, fontSize: 12, fontWeight: 600, color: T.textSecondary, border: `1px solid ${T.borderLight}`, fontFamily: "monospace" }}>{a.citizenship_no || "—"}</code></td>
                  <td style={tdStyle}>{a.area_name || a.constituency_name || "Unknown"}</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    <button style={{ ...btn(T.errorBg, T.error), padding: "5px 12px", fontSize: 12, boxShadow: "none", border: `1px solid ${T.errorBorder}` }}
                      onClick={() => setConfirmRemove({ voterId: a.voter_id, voterName: a.voter_name || `Voter #${a.voter_id}` })}>
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

      <ConfirmDialog open={!!confirmRemove} onClose={() => setConfirmRemove(null)}
        onConfirm={confirmRemoveAction} title="Remove Ward Assignment"
        body={`Remove local ward assignment for ${confirmRemove?.voterName}?`}
        confirmLabel="Remove" variant="danger" />
    </div>
    </PageContainer>
  );
}
