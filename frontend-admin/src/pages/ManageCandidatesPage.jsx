import React, { useState, useCallback, useEffect } from "react";
import {
  Plus,
  Trash2,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Users,
  UserPlus,
  Building2,
  ListOrdered,
  ShieldCheck,
  XCircle,
  RotateCcw,
  Send,
  ClipboardCheck,
  Info,
} from "lucide-react";
import useParties from "../features/candidates/hooks/useParties";
import useCandidateProfiles from "../features/candidates/hooks/useCandidateProfiles";
import {
  createParty,
  deleteParty,
  createProfile,
  deleteProfile,
  listElections,
  listContests,
  listFptpNominations,
  createFptpNomination,
  updateFptpNomination,
  deleteFptpNomination,
  listPrSubmissions,
  createPrSubmission,
  deletePrSubmission,
  reviewPrSubmission,
  listPrEntries,
  addPrEntry,
  removePrEntry,
  validatePrList,
  submitPrList,
  getCandidateReadiness,
} from "../features/candidates/api/candidatesApi";

/* ── Palette ─────────────────────────────────────────────────── */
const P = {
  navy: "#173B72", accent: "#2F6FED", surface: "#FFFFFF", bg: "#F5F7FB",
  border: "#DCE3EC", text: "#0F172A", muted: "#64748B",
  success: "#059669", successBg: "#ECFDF5",
  error: "#DC2626", errorBg: "#FEF2F2",
  warnBg: "#FFFBEB", warn: "#D97706",
  purple: "#7C3AED", purpleBg: "#F5F3FF",
  cyan: "#0891B2", cyanBg: "#ECFEFF",
};

const TABS = [
  { key: "parties", label: "Parties", icon: Building2 },
  { key: "candidates", label: "Candidates", icon: Users },
  { key: "fptp", label: "FPTP Nominations", icon: UserPlus },
  { key: "pr", label: "PR Lists", icon: ListOrdered },
];

const NOM_STATUS_BADGES = {
  PENDING: { bg: "#FEF3C7", color: "#92400E", label: "Pending" },
  APPROVED: { bg: "#D1FAE5", color: "#065F46", label: "Approved" },
  REJECTED: { bg: "#FEE2E2", color: "#991B1B", label: "Rejected" },
  WITHDRAWN: { bg: "#F3F4F6", color: "#6B7280", label: "Withdrawn" },
};
const PR_STATUS_BADGES = {
  DRAFT: { bg: "#F1F5F9", color: "#475569", label: "Draft" },
  SUBMITTED: { bg: "#DBEAFE", color: "#2563EB", label: "Submitted" },
  VALIDATED: { bg: "#D1FAE5", color: "#065F46", label: "Validated" },
  INVALID: { bg: "#FEE2E2", color: "#991B1B", label: "Invalid" },
  APPROVED: { bg: "#D1FAE5", color: "#047857", label: "Approved" },
  REJECTED: { bg: "#FEE2E2", color: "#7F1D1D", label: "Rejected" },
};

function Badge({ map, status }) {
  const m = map[status] || { bg: "#F1F5F9", color: "#475569", label: status };
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 5, fontSize: 11, fontWeight: 700, background: m.bg, color: m.color }}>{m.label}</span>
  );
}

function Btn({ children, onClick, disabled, loading, variant = "primary", small, style: extra }) {
  const base = {
    primary: { bg: P.accent, color: "#fff" },
    danger: { bg: P.error, color: "#fff" },
    secondary: { bg: "#F1F5F9", color: P.text },
    success: { bg: P.success, color: "#fff" },
    warn: { bg: P.warn, color: "#fff" },
  }[variant];
  return (
    <button disabled={disabled || loading} onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: small ? "5px 12px" : "8px 18px", borderRadius: 8, border: "none",
      fontSize: small ? 12 : 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
      background: disabled ? "#E2E8F0" : base.bg, color: disabled ? "#94A3B8" : base.color,
      opacity: loading ? 0.7 : 1, transition: "all 0.15s", ...extra,
    }}>
      {loading && <Loader2 size={14} className="spin" />}
      {children}
    </button>
  );
}

function errMsg(err) {
  return err?.response?.data?.detail || err?.message || String(err);
}

/* ══════════════════════════════════════════════════════════════ */
/*  MAIN PAGE                                                    */
/* ══════════════════════════════════════════════════════════════ */

export default function ManageCandidatesPage() {
  const [tab, setTab] = useState("parties");
  const [msg, setMsg] = useState(null); // {type: "success"|"error", text}

  const clearMsg = () => setMsg(null);

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, borderBottom: `2px solid ${P.border}`, marginBottom: 24 }}>
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => { setTab(t.key); clearMsg(); }} style={{
              display: "flex", alignItems: "center", gap: 7, padding: "10px 18px",
              background: "none", border: "none", borderBottom: active ? `3px solid ${P.accent}` : "3px solid transparent",
              color: active ? P.navy : P.muted, fontWeight: active ? 800 : 600, fontSize: 13.5,
              cursor: "pointer", marginBottom: -2, transition: "all 0.15s",
            }}>
              <Icon size={16} strokeWidth={active ? 2.4 : 1.8} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Global message */}
      {msg && (
        <div style={{
          padding: "10px 16px", borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 600,
          background: msg.type === "error" ? P.errorBg : P.successBg,
          color: msg.type === "error" ? P.error : P.success,
          border: `1px solid ${msg.type === "error" ? "#FECACA" : "#A7F3D0"}`,
        }}>
          {msg.text}
        </div>
      )}

      {tab === "parties" && <PartiesPanel setMsg={setMsg} clearMsg={clearMsg} />}
      {tab === "candidates" && <CandidatesPanel setMsg={setMsg} clearMsg={clearMsg} />}
      {tab === "fptp" && <FptpPanel setMsg={setMsg} clearMsg={clearMsg} />}
      {tab === "pr" && <PrPanel setMsg={setMsg} clearMsg={clearMsg} />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/*  PARTIES PANEL                                                */
/* ══════════════════════════════════════════════════════════════ */

function PartiesPanel({ setMsg, clearMsg }) {
  const { parties, loading, reload } = useParties();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", abbreviation: "", address: "" });
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    clearMsg();
    if (!form.name.trim() || !form.abbreviation.trim()) {
      setMsg({ type: "error", text: "Name and abbreviation are required" });
      return;
    }
    setSaving(true);
    try {
      await createParty(form);
      setMsg({ type: "success", text: "Party created" });
      setShowForm(false);
      setForm({ name: "", abbreviation: "", address: "" });
      reload();
    } catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`Delete party "${p.name}"?`)) return;
    clearMsg();
    try { await deleteParty(p.id); setMsg({ type: "success", text: "Party deleted" }); reload(); }
    catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: P.navy }}>Political Parties</h3>
        <Btn onClick={() => setShowForm(!showForm)}><Plus size={14} /> {showForm ? "Cancel" : "New Party"}</Btn>
      </div>

      {showForm && (
        <div style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 10, padding: 20, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <label style={lbl}>Name<input style={inp} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
            <label style={lbl}>Abbreviation<input style={inp} value={form.abbreviation} onChange={e => setForm({ ...form, abbreviation: e.target.value })} /></label>
            <label style={lbl}>Address<input style={inp} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></label>
          </div>
          <Btn onClick={handleCreate} loading={saving}>Create Party</Btn>
        </div>
      )}

      {loading ? <Loader2 size={20} style={{ color: P.muted, animation: "spin 1s linear infinite" }} /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {parties.length === 0 && <p style={{ color: P.muted, fontSize: 13 }}>No parties registered yet.</p>}
          {parties.map(p => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: P.surface, border: `1px solid ${P.border}`, borderRadius: 8, padding: "10px 16px" }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: 14, color: P.text }}>{p.name}</span>
                <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 700, color: P.accent, background: "#EFF6FF", padding: "2px 8px", borderRadius: 4 }}>{p.abbreviation}</span>
                {p.address && <span style={{ marginLeft: 10, fontSize: 12, color: P.muted }}>{p.address}</span>}
                {!p.is_active && <span style={{ marginLeft: 8, fontSize: 11, color: P.error, fontWeight: 700 }}>INACTIVE</span>}
              </div>
              <button onClick={() => handleDelete(p)} style={{ background: "none", border: "none", cursor: "pointer", color: P.error, opacity: 0.6 }} title="Delete party">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/*  CANDIDATES PANEL                                             */
/* ══════════════════════════════════════════════════════════════ */

function CandidatesPanel({ setMsg, clearMsg }) {
  const { parties } = useParties();
  const { profiles, loading, reload } = useCandidateProfiles();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: "", gender: "", date_of_birth: "", address: "", citizenship_no: "", party_id: "" });
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    clearMsg();
    if (!form.full_name.trim()) { setMsg({ type: "error", text: "Full name is required" }); return; }
    setSaving(true);
    const payload = { ...form, party_id: form.party_id ? Number(form.party_id) : null, gender: form.gender || null, date_of_birth: form.date_of_birth || null };
    try {
      await createProfile(payload);
      setMsg({ type: "success", text: "Candidate profile created" });
      setShowForm(false);
      setForm({ full_name: "", gender: "", date_of_birth: "", address: "", citizenship_no: "", party_id: "" });
      reload();
    } catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`Delete candidate "${c.full_name}"?`)) return;
    clearMsg();
    try { await deleteProfile(c.id); setMsg({ type: "success", text: "Candidate deleted" }); reload(); }
    catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
  };

  const partyMap = Object.fromEntries(parties.map(p => [p.id, p]));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: P.navy }}>Candidate Profiles</h3>
        <Btn onClick={() => setShowForm(!showForm)}><Plus size={14} /> {showForm ? "Cancel" : "New Candidate"}</Btn>
      </div>

      {showForm && (
        <div style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 10, padding: 20, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <label style={lbl}>Full Name *<input style={inp} value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></label>
            <label style={lbl}>Gender
              <select style={inp} value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                <option value="">—</option><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option>
              </select>
            </label>
            <label style={lbl}>Date of Birth<input type="date" style={inp} value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} /></label>
            <label style={lbl}>Citizenship No<input style={inp} value={form.citizenship_no} onChange={e => setForm({ ...form, citizenship_no: e.target.value })} /></label>
            <label style={lbl}>Address<input style={inp} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></label>
            <label style={lbl}>Party
              <select style={inp} value={form.party_id} onChange={e => setForm({ ...form, party_id: e.target.value })}>
                <option value="">Independent</option>
                {parties.filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.name} ({p.abbreviation})</option>)}
              </select>
            </label>
          </div>
          <Btn onClick={handleCreate} loading={saving}>Create Candidate</Btn>
        </div>
      )}

      {loading ? <Loader2 size={20} style={{ color: P.muted, animation: "spin 1s linear infinite" }} /> : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${P.border}`, textAlign: "left" }}>
              <th style={th}>Name</th><th style={th}>Gender</th><th style={th}>DOB</th><th style={th}>Citizenship</th><th style={th}>Party</th><th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {profiles.length === 0 && <tr><td colSpan={6} style={{ ...td, color: P.muted }}>No candidates registered yet.</td></tr>}
            {profiles.map(c => (
              <tr key={c.id} style={{ borderBottom: `1px solid ${P.border}` }}>
                <td style={td}><span style={{ fontWeight: 600 }}>{c.full_name}</span>{!c.is_active && <span style={{ color: P.error, fontSize: 11, marginLeft: 6 }}>INACTIVE</span>}</td>
                <td style={td}>{c.gender || "—"}</td>
                <td style={td}>{c.date_of_birth || "—"}</td>
                <td style={td}>{c.citizenship_no || "—"}</td>
                <td style={td}>{c.party_id ? (partyMap[c.party_id]?.abbreviation || `#${c.party_id}`) : <span style={{ color: P.muted }}>Independent</span>}</td>
                <td style={td}><button onClick={() => handleDelete(c)} style={{ background: "none", border: "none", cursor: "pointer", color: P.error, opacity: 0.6 }}><Trash2 size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/*  FPTP NOMINATIONS PANEL                                       */
/* ══════════════════════════════════════════════════════════════ */

function FptpPanel({ setMsg, clearMsg }) {
  const { parties } = useParties();
  const { profiles } = useCandidateProfiles();
  const [elections, setElections] = useState([]);
  const [selectedElection, setSelectedElection] = useState("");
  const [contests, setContests] = useState([]);
  const [selectedContest, setSelectedContest] = useState("");
  const [nominations, setNominations] = useState([]);
  const [nomLoading, setNomLoading] = useState(false);
  const [showNomForm, setShowNomForm] = useState(false);
  const [nomForm, setNomForm] = useState({ candidate_id: "", party_id: "" });
  const [saving, setSaving] = useState(false);
  const [readiness, setReadiness] = useState(null);

  useEffect(() => { listElections().then(setElections).catch(() => {}); }, []);

  useEffect(() => {
    if (!selectedElection) { setContests([]); setNominations([]); setReadiness(null); return; }
    listContests(selectedElection).then(c => setContests(c.filter(x => x.contest_type === "FPTP"))).catch(() => {});
    getCandidateReadiness(selectedElection).then(setReadiness).catch(() => {});
  }, [selectedElection]);

  const loadNominations = useCallback(async () => {
    if (!selectedElection) return;
    setNomLoading(true);
    try {
      const data = await listFptpNominations(selectedElection, { contestId: selectedContest || undefined });
      setNominations(data);
    } catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
    finally { setNomLoading(false); }
  }, [selectedElection, selectedContest, setMsg]);

  useEffect(() => { loadNominations(); }, [loadNominations]);

  const handleNominate = async () => {
    clearMsg();
    if (!nomForm.candidate_id || !selectedContest) { setMsg({ type: "error", text: "Select a contest and candidate" }); return; }
    setSaving(true);
    try {
      await createFptpNomination(selectedElection, {
        contest_id: Number(selectedContest),
        candidate_id: Number(nomForm.candidate_id),
        party_id: nomForm.party_id ? Number(nomForm.party_id) : null,
      });
      setMsg({ type: "success", text: "Nomination created" });
      setShowNomForm(false);
      setNomForm({ candidate_id: "", party_id: "" });
      loadNominations();
      getCandidateReadiness(selectedElection).then(setReadiness).catch(() => {});
    } catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (nom, newStatus) => {
    clearMsg();
    try {
      await updateFptpNomination(nom.id, { status: newStatus });
      setMsg({ type: "success", text: `Nomination ${newStatus.toLowerCase()}` });
      loadNominations();
      getCandidateReadiness(selectedElection).then(setReadiness).catch(() => {});
    } catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
  };

  const handleDeleteNom = async (nom) => {
    clearMsg();
    try { await deleteFptpNomination(nom.id); setMsg({ type: "success", text: "Nomination removed" }); loadNominations(); }
    catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
  };

  const partyMap = Object.fromEntries(parties.map(p => [p.id, p]));
  const profileMap = Object.fromEntries(profiles.map(c => [c.id, c]));
  const contestMap = Object.fromEntries(contests.map(c => [c.id, c]));

  const eligibleElections = elections.filter(e => ["CONFIGURED", "NOMINATIONS_OPEN", "NOMINATIONS_CLOSED", "CANDIDATE_LIST_PUBLISHED"].includes(e.status));

  return (
    <div>
      <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800, color: P.navy }}>FPTP Nominations</h3>

      {/* Election selector */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: P.text }}>Election:</label>
        <select style={{ ...inp, maxWidth: 400 }} value={selectedElection} onChange={e => { setSelectedElection(e.target.value); setSelectedContest(""); }}>
          <option value="">— Select election —</option>
          {eligibleElections.map(e => <option key={e.id} value={e.id}>{e.title} ({e.status})</option>)}
        </select>
        {selectedElection && (
          <>
            <label style={{ fontSize: 13, fontWeight: 600, color: P.text }}>Contest:</label>
            <select style={{ ...inp, maxWidth: 320 }} value={selectedContest} onChange={e => setSelectedContest(e.target.value)}>
              <option value="">All contests</option>
              {contests.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </>
        )}
      </div>

      {/* Readiness */}
      {readiness && selectedElection && (
        <div style={{ background: readiness.ready ? P.successBg : P.warnBg, border: `1px solid ${readiness.ready ? "#A7F3D0" : "#FDE68A"}`, borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 12, display: "flex", gap: 16, alignItems: "center" }}>
          {readiness.ready ? <CheckCircle2 size={16} color={P.success} /> : <AlertTriangle size={16} color={P.warn} />}
          <span style={{ fontWeight: 700 }}>Candidate Readiness:</span>
          <span>FPTP filled: {readiness.fptp_contests_filled}/{readiness.fptp_contests_total}</span>
          <span>PR valid: {readiness.pr_submissions_valid}/{readiness.pr_submissions_total}</span>
          {readiness.issues.length > 0 && <span style={{ color: P.warn }}>{readiness.issues.join("; ")}</span>}
        </div>
      )}

      {!selectedElection && <p style={{ color: P.muted, fontSize: 13 }}>Select an election to manage FPTP nominations.</p>}

      {selectedElection && (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <Btn onClick={() => setShowNomForm(!showNomForm)} small disabled={!selectedContest}>
              <Plus size={14} /> {showNomForm ? "Cancel" : "Nominate Candidate"}
            </Btn>
          </div>

          {showNomForm && selectedContest && (
            <div style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 10, padding: 16, marginBottom: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <label style={lbl}>Candidate *
                  <select style={inp} value={nomForm.candidate_id} onChange={e => setNomForm({ ...nomForm, candidate_id: e.target.value })}>
                    <option value="">— Select —</option>
                    {profiles.filter(c => c.is_active).map(c => <option key={c.id} value={c.id}>{c.full_name}{c.party_id ? ` (${partyMap[c.party_id]?.abbreviation || ""})` : ""}</option>)}
                  </select>
                </label>
                <label style={lbl}>Party (optional)
                  <select style={inp} value={nomForm.party_id} onChange={e => setNomForm({ ...nomForm, party_id: e.target.value })}>
                    <option value="">Independent</option>
                    {parties.filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.name} ({p.abbreviation})</option>)}
                  </select>
                </label>
              </div>
              <Btn onClick={handleNominate} loading={saving}>Create Nomination</Btn>
            </div>
          )}

          {nomLoading ? <Loader2 size={20} style={{ color: P.muted, animation: "spin 1s linear infinite" }} /> : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ borderBottom: `2px solid ${P.border}`, textAlign: "left" }}>
                <th style={th}>Contest</th><th style={th}>Candidate</th><th style={th}>Party</th><th style={th}>Status</th><th style={th}>Actions</th>
              </tr></thead>
              <tbody>
                {nominations.length === 0 && <tr><td colSpan={5} style={{ ...td, color: P.muted }}>No nominations found.</td></tr>}
                {nominations.map(n => (
                  <tr key={n.id} style={{ borderBottom: `1px solid ${P.border}` }}>
                    <td style={td}>{contestMap[n.contest_id]?.title || `#${n.contest_id}`}</td>
                    <td style={td}>{profileMap[n.candidate_id]?.full_name || `#${n.candidate_id}`}</td>
                    <td style={td}>{n.party_id ? (partyMap[n.party_id]?.abbreviation || `#${n.party_id}`) : "Ind."}</td>
                    <td style={td}><Badge map={NOM_STATUS_BADGES} status={n.status} /></td>
                    <td style={td}>
                      <div style={{ display: "flex", gap: 4 }}>
                        {n.status === "PENDING" && (
                          <>
                            <Btn small variant="success" onClick={() => handleStatusChange(n, "APPROVED")}><CheckCircle2 size={12} /> Approve</Btn>
                            <Btn small variant="danger" onClick={() => handleStatusChange(n, "REJECTED")}><XCircle size={12} /> Reject</Btn>
                          </>
                        )}
                        {(n.status === "PENDING" || n.status === "APPROVED") && (
                          <Btn small variant="secondary" onClick={() => handleStatusChange(n, "WITHDRAWN")}>Withdraw</Btn>
                        )}
                        {(n.status === "PENDING" || n.status === "WITHDRAWN") && (
                          <Btn small variant="danger" onClick={() => handleDeleteNom(n)}><Trash2 size={12} /></Btn>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/*  PR LISTS PANEL                                               */
/* ══════════════════════════════════════════════════════════════ */

function PrPanel({ setMsg, clearMsg }) {
  const { parties } = useParties();
  const { profiles } = useCandidateProfiles();
  const [elections, setElections] = useState([]);
  const [selectedElection, setSelectedElection] = useState("");
  const [submissions, setSubmissions] = useState([]);
  const [subLoading, setSubLoading] = useState(false);
  const [expandedSub, setExpandedSub] = useState(null);
  const [entries, setEntries] = useState([]);
  const [validation, setValidation] = useState(null);
  const [newSubParty, setNewSubParty] = useState("");
  const [saving, setSaving] = useState(false);
  const [entryForm, setEntryForm] = useState({ candidate_id: "", list_position: "" });

  useEffect(() => { listElections().then(setElections).catch(() => {}); }, []);

  const loadSubmissions = useCallback(async () => {
    if (!selectedElection) { setSubmissions([]); return; }
    setSubLoading(true);
    try { setSubmissions(await listPrSubmissions(selectedElection)); }
    catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
    finally { setSubLoading(false); }
  }, [selectedElection, setMsg]);

  useEffect(() => { loadSubmissions(); setExpandedSub(null); setValidation(null); }, [loadSubmissions]);

  const loadEntries = useCallback(async (subId) => {
    try { setEntries(await listPrEntries(subId)); } catch { setEntries([]); }
  }, []);

  const handleExpand = async (sub) => {
    if (expandedSub === sub.id) { setExpandedSub(null); setValidation(null); return; }
    setExpandedSub(sub.id);
    setValidation(sub.validation_snapshot ? JSON.parse(sub.validation_snapshot) : null);
    loadEntries(sub.id);
  };

  const handleCreateSubmission = async () => {
    clearMsg();
    if (!newSubParty) { setMsg({ type: "error", text: "Select a party" }); return; }
    setSaving(true);
    try {
      await createPrSubmission(selectedElection, { party_id: Number(newSubParty) });
      setMsg({ type: "success", text: "PR submission created" });
      setNewSubParty("");
      loadSubmissions();
    } catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
    finally { setSaving(false); }
  };

  const handleDeleteSubmission = async (sub) => {
    if (!window.confirm("Delete this PR submission and all its entries?")) return;
    clearMsg();
    try { await deletePrSubmission(sub.id); setMsg({ type: "success", text: "Submission deleted" }); loadSubmissions(); }
    catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
  };

  const handleAddEntry = async (subId) => {
    clearMsg();
    if (!entryForm.candidate_id || !entryForm.list_position) { setMsg({ type: "error", text: "Candidate and position required" }); return; }
    setSaving(true);
    try {
      await addPrEntry(subId, { candidate_id: Number(entryForm.candidate_id), list_position: Number(entryForm.list_position) });
      setEntryForm({ candidate_id: "", list_position: "" });
      loadEntries(subId);
    } catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
    finally { setSaving(false); }
  };

  const handleRemoveEntry = async (subId, entryId) => {
    clearMsg();
    try { await removePrEntry(subId, entryId); loadEntries(subId); }
    catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
  };

  const handleValidate = async (sub) => {
    clearMsg();
    try { const result = await validatePrList(sub.id); setValidation(result); setMsg({ type: result.valid ? "success" : "error", text: result.valid ? "Validation passed" : `Validation failed — ${result.errors.length} error(s)` }); }
    catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
  };

  const handleSubmit = async (sub) => {
    clearMsg();
    try {
      const updated = await submitPrList(sub.id);
      if (updated.status === "SUBMITTED") {
        setMsg({ type: "success", text: "PR list submitted successfully" });
      } else {
        setMsg({ type: "error", text: "Validation failed — list not submitted. See errors below." });
        setValidation(updated.validation_snapshot ? JSON.parse(updated.validation_snapshot) : null);
      }
      loadSubmissions();
    } catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
  };

  const handleReview = async (sub, action) => {
    clearMsg();
    try {
      await reviewPrSubmission(sub.id, { action });
      setMsg({ type: "success", text: `Submission ${action}ed` });
      loadSubmissions();
    } catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
  };

  const partyMap = Object.fromEntries(parties.map(p => [p.id, p]));
  const profileMap = Object.fromEntries(profiles.map(c => [c.id, c]));
  const eligibleElections = elections.filter(e => ["CONFIGURED", "NOMINATIONS_OPEN", "NOMINATIONS_CLOSED", "CANDIDATE_LIST_PUBLISHED"].includes(e.status));

  return (
    <div>
      <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800, color: P.navy }}>PR Closed-List Management</h3>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <label style={{ fontSize: 13, fontWeight: 600 }}>Election:</label>
        <select style={{ ...inp, maxWidth: 400 }} value={selectedElection} onChange={e => setSelectedElection(e.target.value)}>
          <option value="">— Select election —</option>
          {eligibleElections.map(e => <option key={e.id} value={e.id}>{e.title} ({e.status})</option>)}
        </select>
      </div>

      {!selectedElection && <p style={{ color: P.muted, fontSize: 13 }}>Select an election to manage PR submissions.</p>}

      {selectedElection && (
        <>
          {/* Create new submission */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, background: P.surface, border: `1px solid ${P.border}`, borderRadius: 8, padding: 12 }}>
            <select style={{ ...inp, flex: 1, maxWidth: 300 }} value={newSubParty} onChange={e => setNewSubParty(e.target.value)}>
              <option value="">— Select party —</option>
              {parties.filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.name} ({p.abbreviation})</option>)}
            </select>
            <Btn onClick={handleCreateSubmission} loading={saving} small><Plus size={14} /> Create PR Submission</Btn>
          </div>

          {subLoading ? <Loader2 size={20} style={{ color: P.muted, animation: "spin 1s linear infinite" }} /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {submissions.length === 0 && <p style={{ color: P.muted, fontSize: 13 }}>No PR submissions for this election.</p>}
              {submissions.map(sub => {
                const party = partyMap[sub.party_id];
                const isExpanded = expandedSub === sub.id;
                return (
                  <div key={sub.id} style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 10, overflow: "hidden" }}>
                    {/* Header */}
                    <div onClick={() => handleExpand(sub)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", cursor: "pointer" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <ChevronRight size={16} style={{ transform: isExpanded ? "rotate(90deg)" : "none", transition: "0.15s", color: P.muted }} />
                        <span style={{ fontWeight: 700, fontSize: 14, color: P.text }}>{party?.name || `Party #${sub.party_id}`}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: P.accent }}>{party?.abbreviation}</span>
                        <Badge map={PR_STATUS_BADGES} status={sub.status} />
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {(sub.status === "DRAFT" || sub.status === "INVALID") && (
                          <Btn small variant="danger" onClick={e => { e.stopPropagation(); handleDeleteSubmission(sub); }}><Trash2 size={12} /></Btn>
                        )}
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div style={{ borderTop: `1px solid ${P.border}`, padding: 16 }}>
                        {/* Action buttons */}
                        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                          {(sub.status === "DRAFT" || sub.status === "INVALID") && (
                            <>
                              <Btn small variant="secondary" onClick={() => handleValidate(sub)}><ClipboardCheck size={14} /> Validate</Btn>
                              <Btn small variant="primary" onClick={() => handleSubmit(sub)}><Send size={14} /> Validate & Submit</Btn>
                            </>
                          )}
                          {sub.status === "SUBMITTED" && (
                            <>
                              <Btn small variant="success" onClick={() => handleReview(sub, "approve")}><ShieldCheck size={14} /> Approve</Btn>
                              <Btn small variant="danger" onClick={() => handleReview(sub, "reject")}><XCircle size={14} /> Reject</Btn>
                            </>
                          )}
                          {(sub.status === "SUBMITTED" || sub.status === "INVALID" || sub.status === "REJECTED") && (
                            <Btn small variant="warn" onClick={() => handleReview(sub, "reopen")}><RotateCcw size={14} /> Reopen to Draft</Btn>
                          )}
                        </div>

                        {/* Validation results */}
                        {validation && (
                          <div style={{ background: validation.valid ? P.successBg : P.errorBg, border: `1px solid ${validation.valid ? "#A7F3D0" : "#FECACA"}`, borderRadius: 8, padding: 14, marginBottom: 14 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                              {validation.valid ? <CheckCircle2 size={16} color={P.success} /> : <XCircle size={16} color={P.error} />}
                              <span style={{ fontWeight: 800, fontSize: 13, color: validation.valid ? P.success : P.error }}>
                                {validation.valid ? "Validation Passed" : `Validation Failed — ${validation.errors.length} error(s)`}
                              </span>
                            </div>
                            {validation.errors.length > 0 && (
                              <ul style={{ margin: "6px 0 0 18px", padding: 0, fontSize: 12, color: P.error }}>
                                {validation.errors.map((e, i) => <li key={i} style={{ marginBottom: 3 }}><strong>[{e.code}]</strong> {e.message}</li>)}
                              </ul>
                            )}
                            {validation.warnings.length > 0 && (
                              <div style={{ marginTop: 8 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: P.warn }}>Warnings:</span>
                                <ul style={{ margin: "4px 0 0 18px", padding: 0, fontSize: 12, color: P.warn }}>
                                  {validation.warnings.map((w, i) => <li key={i}>{w.message}</li>)}
                                </ul>
                              </div>
                            )}
                            <div style={{ marginTop: 8, fontSize: 11, color: P.muted }}>
                              Entries: {validation.summary?.total_entries} · Positions OK: {validation.summary?.positions_sequential ? "✓" : "✗"} · No duplicates: {validation.summary?.no_duplicates_in_list ? "✓" : "✗"} · Cross-party clean: {validation.summary?.no_cross_party_duplicates ? "✓" : "✗"} · Metadata: {validation.summary?.metadata_complete ? "✓" : "✗"}
                            </div>
                          </div>
                        )}

                        {/* Add entry form (only if editable) */}
                        {(sub.status === "DRAFT" || sub.status === "INVALID") && (
                          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 12 }}>
                            <label style={{ ...lbl, flex: 1 }}>Candidate
                              <select style={inp} value={entryForm.candidate_id} onChange={e => setEntryForm({ ...entryForm, candidate_id: e.target.value })}>
                                <option value="">— Select —</option>
                                {profiles.filter(c => c.is_active).map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                              </select>
                            </label>
                            <label style={{ ...lbl, width: 100 }}>Position
                              <input type="number" min="1" style={inp} value={entryForm.list_position} onChange={e => setEntryForm({ ...entryForm, list_position: e.target.value })} />
                            </label>
                            <Btn small onClick={() => handleAddEntry(sub.id)} loading={saving}><Plus size={14} /> Add</Btn>
                          </div>
                        )}

                        {/* Entries table */}
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                          <thead><tr style={{ borderBottom: `2px solid ${P.border}`, textAlign: "left" }}>
                            <th style={th}>Pos</th><th style={th}>Candidate</th><th style={th}>Gender</th><th style={th}>DOB</th><th style={th}></th>
                          </tr></thead>
                          <tbody>
                            {entries.length === 0 && <tr><td colSpan={5} style={{ ...td, color: P.muted }}>No entries yet.</td></tr>}
                            {entries.map(e => {
                              const c = profileMap[e.candidate_id];
                              return (
                                <tr key={e.id} style={{ borderBottom: `1px solid ${P.border}` }}>
                                  <td style={td}><span style={{ fontWeight: 800, color: P.navy }}>{e.list_position}</span></td>
                                  <td style={td}>{c?.full_name || `#${e.candidate_id}`}</td>
                                  <td style={td}>{c?.gender || "—"}</td>
                                  <td style={td}>{c?.date_of_birth || "—"}</td>
                                  <td style={td}>
                                    {(sub.status === "DRAFT" || sub.status === "INVALID") && (
                                      <button onClick={() => handleRemoveEntry(sub.id, e.id)} style={{ background: "none", border: "none", cursor: "pointer", color: P.error, opacity: 0.6 }}><Trash2 size={14} /></button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>

                        {/* Info bar */}
                        {sub.status !== "DRAFT" && sub.status !== "INVALID" && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, padding: "8px 12px", background: "#F0F4FF", borderRadius: 6, fontSize: 12, color: P.navy }}>
                            <Info size={14} />
                            This submission is in <strong>{sub.status}</strong> state. Entries are locked.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Shared styles ───────────────────────────────────────────── */
const lbl = { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 600, color: "#475569" };
const inp = { padding: "7px 10px", borderRadius: 6, border: "1px solid #DCE3EC", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" };
const th = { padding: "8px 10px", fontSize: 12, fontWeight: 700, color: "#475569" };
const td = { padding: "8px 10px" };
