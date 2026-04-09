import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  Plus, Trash2, ChevronRight, AlertTriangle, CheckCircle2, Loader2,
  Users, UserPlus, Building2, ListOrdered, ShieldCheck, XCircle,
  RotateCcw, Send, ClipboardCheck, Info, Search, User,
} from "lucide-react";
import useParties from "../features/candidates/hooks/useParties";
import useCandidateProfiles from "../features/candidates/hooks/useCandidateProfiles";
import {
  createParty, deleteParty,
  createProfile, deleteProfile,
  uploadPartySymbol, removePartySymbol,
  uploadCandidatePhoto, removeCandidatePhoto,
  listElections, listContests,
  listFptpNominations, createFptpNomination, updateFptpNomination, deleteFptpNomination,
  listPrSubmissions, createPrSubmission, deletePrSubmission, reviewPrSubmission,
  listPrEntries, addPrEntry, removePrEntry,
  validatePrList, submitPrList,
  getCandidateReadiness,
} from "../features/candidates/api/candidatesApi";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import ImageUpload from "../components/ui/ImageUpload";
import EmptyState from "../components/ui/EmptyState";
import { TableSkeleton } from "../components/ui/Skeleton";

/* ── Design tokens ───────────────────────────────────────────── */
const P = {
  navy: "#173B72", accent: "#2F6FED", surface: "#FFFFFF", bg: "#F5F7FB",
  border: "#E2E8F0", borderLight: "#F1F5F9", text: "#0F172A", muted: "#64748B",
  subtle: "#94A3B8",
  success: "#059669", successBg: "#ECFDF5", successBorder: "#A7F3D0",
  error: "#DC2626", errorBg: "#FEF2F2", errorBorder: "#FECACA",
  warnBg: "#FFFBEB", warn: "#D97706", warnBorder: "#FDE68A",
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const TABS = [
  { key: "parties", label: "Parties", icon: Building2 },
  { key: "candidates", label: "Candidates", icon: Users },
  { key: "nominations", label: "Nominations", icon: UserPlus },
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
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 6,
      fontSize: 11, fontWeight: 700, background: m.bg, color: m.color,
      letterSpacing: "0.01em", lineHeight: 1.4,
    }}>{m.label}</span>
  );
}

function Btn({ children, onClick, disabled, loading, variant = "primary", small, style: extra }) {
  const base = {
    primary:   { bg: P.accent, color: "#fff", border: "none" },
    danger:    { bg: P.error, color: "#fff", border: "none" },
    secondary: { bg: "#FFFFFF", color: P.text, border: `1px solid ${P.border}` },
    success:   { bg: P.success, color: "#fff", border: "none" },
    warn:      { bg: P.warn, color: "#fff", border: "none" },
    ghost:     { bg: "transparent", color: P.muted, border: "none" },
  }[variant] || { bg: P.accent, color: "#fff", border: "none" };
  return (
    <button disabled={disabled || loading} onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: small ? "6px 12px" : "8px 18px", borderRadius: 8, border: base.border,
      fontSize: small ? 12 : 13, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
      background: disabled ? "#F1F5F9" : base.bg, color: disabled ? "#94A3B8" : base.color,
      opacity: loading ? 0.7 : 1, transition: "all 0.15s", whiteSpace: "nowrap", ...extra,
    }}>
      {loading && <Loader2 size={14} style={{ animation: "spin 0.8s linear infinite" }} />}
      {children}
    </button>
  );
}

function errMsg(err) {
  return err?.response?.data?.detail || err?.message || String(err);
}

function imageUrl(path) {
  if (!path) return null;
  return `${API_BASE}/${path}`;
}

function SectionCard({ children, style }) {
  return (
    <div style={{
      background: P.surface, border: `1px solid ${P.border}`, borderRadius: 12,
      overflow: "hidden", ...style,
    }}>{children}</div>
  );
}

function SectionHeader({ title, subtitle, action }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "16px 20px", borderBottom: `1px solid ${P.borderLight}`,
    }}>
      <div>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: P.navy }}>{title}</h3>
        {subtitle && <p style={{ margin: "2px 0 0", fontSize: 12, color: P.muted }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function SearchInput({ value, onChange, placeholder = "Search..." }) {
  return (
    <div style={{ position: "relative", maxWidth: 280 }}>
      <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: P.subtle }} />
      <input
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", padding: "8px 12px 8px 32px", borderRadius: 8,
          border: `1px solid ${P.border}`, fontSize: 13, outline: "none",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}

function Toast({ msg, onClose }) {
  if (!msg) return null;
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [msg, onClose]);
  return (
    <div style={{
      position: "fixed", top: 20, right: 20, zIndex: 10000,
      padding: "12px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600,
      background: msg.type === "error" ? P.errorBg : P.successBg,
      color: msg.type === "error" ? P.error : P.success,
      border: `1px solid ${msg.type === "error" ? P.errorBorder : P.successBorder}`,
      boxShadow: "0 4px 20px rgba(0,0,0,0.08)", maxWidth: 420,
      animation: "toastIn 0.25s ease",
    }}>
      {msg.text}
      <style>{`@keyframes toastIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}

/* ── Shared form styles ──────────────────────────────────────── */
const lbl = { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 600, color: "#475569" };
const inp = { padding: "8px 12px", borderRadius: 8, border: `1px solid ${P.border}`, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" };
const thStyle = { padding: "10px 14px", fontSize: 11, fontWeight: 700, color: P.muted, textTransform: "uppercase", letterSpacing: "0.04em", textAlign: "left" };
const tdStyle = { padding: "12px 14px", fontSize: 13 };

/* ══════════════════════════════════════════════════════════════ */
/*  MAIN PAGE                                                    */
/* ══════════════════════════════════════════════════════════════ */

export default function ManageCandidatesPage() {
  const [tab, setTab] = useState("parties");
  const [msg, setMsg] = useState(null);

  const clearMsg = () => setMsg(null);

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1260, margin: "0 auto" }}>
      <Toast msg={msg} onClose={clearMsg} />

      {/* Tab bar */}
      <div style={{
        display: "flex", gap: 2, marginBottom: 24,
        borderBottom: `1px solid ${P.border}`, overflowX: "auto",
      }}>
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => { setTab(t.key); clearMsg(); }}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "11px 20px", background: "none", border: "none",
                borderBottom: active ? `2px solid ${P.accent}` : "2px solid transparent",
                color: active ? P.navy : P.muted, fontWeight: active ? 700 : 500,
                fontSize: 13.5, cursor: "pointer", marginBottom: -1,
                transition: "all 0.15s", whiteSpace: "nowrap",
              }}>
              <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "parties" && <PartiesPanel setMsg={setMsg} clearMsg={clearMsg} />}
      {tab === "candidates" && <CandidatesPanel setMsg={setMsg} clearMsg={clearMsg} />}
      {tab === "nominations" && <NominationsPanel setMsg={setMsg} clearMsg={clearMsg} />}
      {tab === "pr" && <PrPanel setMsg={setMsg} clearMsg={clearMsg} />}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
  const [search, setSearch] = useState("");
  const [confirmDel, setConfirmDel] = useState(null);
  const [uploading, setUploading] = useState({});

  const filtered = useMemo(() => {
    if (!search.trim()) return parties;
    const q = search.toLowerCase();
    return parties.filter(p => p.name.toLowerCase().includes(q) || p.abbreviation.toLowerCase().includes(q));
  }, [parties, search]);

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

  const handleDelete = async () => {
    if (!confirmDel) return;
    clearMsg();
    try { await deleteParty(confirmDel.id); setMsg({ type: "success", text: "Party deleted" }); reload(); }
    catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
    finally { setConfirmDel(null); }
  };

  const handleSymbolUpload = async (party, file) => {
    setUploading(u => ({ ...u, [party.id]: true }));
    try { await uploadPartySymbol(party.id, file); setMsg({ type: "success", text: "Symbol uploaded" }); reload(); }
    catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
    finally { setUploading(u => ({ ...u, [party.id]: false })); }
  };

  const handleSymbolRemove = async (party) => {
    setUploading(u => ({ ...u, [party.id]: true }));
    try { await removePartySymbol(party.id); setMsg({ type: "success", text: "Symbol removed" }); reload(); }
    catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
    finally { setUploading(u => ({ ...u, [party.id]: false })); }
  };

  return (
    <div>
      <SectionCard>
        <SectionHeader
          title="Political Parties"
          subtitle={`${parties.length} registered`}
          action={<Btn onClick={() => setShowForm(!showForm)}><Plus size={14} /> {showForm ? "Cancel" : "New Party"}</Btn>}
        />

        {showForm && (
          <div style={{ padding: 20, borderBottom: `1px solid ${P.borderLight}`, background: P.bg }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
              <label style={lbl}>Name *<input style={inp} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
              <label style={lbl}>Abbreviation *<input style={inp} value={form.abbreviation} onChange={e => setForm({ ...form, abbreviation: e.target.value })} /></label>
              <label style={lbl}>Address<input style={inp} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></label>
            </div>
            <Btn onClick={handleCreate} loading={saving}>Create Party</Btn>
          </div>
        )}

        <div style={{ padding: "12px 20px" }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search parties..." />
        </div>

        {loading ? <div style={{ padding: 20 }}><TableSkeleton rows={4} cols={3} /></div> : (
          <div style={{ padding: "0 20px 20px" }}>
            {filtered.length === 0 ? (
              <EmptyState icon={Building2} title="No parties found" message={search ? "No parties match your search." : "No parties registered yet."} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filtered.map(p => (
                  <div key={p.id} style={{ display: "flex", gap: 16, alignItems: "center", background: P.bg, border: `1px solid ${P.borderLight}`, borderRadius: 10, padding: 16 }}>
                    <ImageUpload
                      currentUrl={imageUrl(p.symbol_path)}
                      onUpload={(file) => handleSymbolUpload(p, file)}
                      onRemove={() => handleSymbolRemove(p)}
                      uploading={uploading[p.id]}
                      label="Symbol"
                      size={64}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: P.text }}>{p.name}</span>
                        <Badge map={{ [p.abbreviation]: { bg: "#EFF6FF", color: P.accent, label: p.abbreviation } }} status={p.abbreviation} />
                        {!p.is_active && <Badge map={{ INACTIVE: { bg: P.errorBg, color: P.error, label: "Inactive" } }} status="INACTIVE" />}
                      </div>
                      {p.address && <p style={{ margin: 0, fontSize: 12, color: P.muted }}>{p.address}</p>}
                    </div>
                    <Btn variant="ghost" small onClick={() => setConfirmDel(p)} style={{ color: P.error }}><Trash2 size={15} /></Btn>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </SectionCard>

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={handleDelete}
        title="Delete Party"
        body={`Are you sure you want to delete "${confirmDel?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
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
  const [search, setSearch] = useState("");
  const [confirmDel, setConfirmDel] = useState(null);
  const [uploading, setUploading] = useState({});

  const partyMap = useMemo(() => Object.fromEntries(parties.map(p => [p.id, p])), [parties]);

  const filtered = useMemo(() => {
    if (!search.trim()) return profiles;
    const q = search.toLowerCase();
    return profiles.filter(c =>
      c.full_name.toLowerCase().includes(q) ||
      (c.citizenship_no && c.citizenship_no.toLowerCase().includes(q)) ||
      (c.party_id && partyMap[c.party_id]?.name.toLowerCase().includes(q))
    );
  }, [profiles, search, partyMap]);

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

  const handleDelete = async () => {
    if (!confirmDel) return;
    clearMsg();
    try { await deleteProfile(confirmDel.id); setMsg({ type: "success", text: "Candidate deleted" }); reload(); }
    catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
    finally { setConfirmDel(null); }
  };

  const handlePhotoUpload = async (cand, file) => {
    setUploading(u => ({ ...u, [cand.id]: true }));
    try { await uploadCandidatePhoto(cand.id, file); setMsg({ type: "success", text: "Photo uploaded" }); reload(); }
    catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
    finally { setUploading(u => ({ ...u, [cand.id]: false })); }
  };

  const handlePhotoRemove = async (cand) => {
    setUploading(u => ({ ...u, [cand.id]: true }));
    try { await removeCandidatePhoto(cand.id); setMsg({ type: "success", text: "Photo removed" }); reload(); }
    catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
    finally { setUploading(u => ({ ...u, [cand.id]: false })); }
  };

  return (
    <div>
      <SectionCard>
        <SectionHeader
          title="Candidate Profiles"
          subtitle={`${profiles.length} registered`}
          action={<Btn onClick={() => setShowForm(!showForm)}><Plus size={14} /> {showForm ? "Cancel" : "New Candidate"}</Btn>}
        />

        {showForm && (
          <div style={{ padding: 20, borderBottom: `1px solid ${P.borderLight}`, background: P.bg }}>
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

        <div style={{ padding: "12px 20px" }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search candidates..." />
        </div>

        {loading ? <div style={{ padding: 20 }}><TableSkeleton rows={5} cols={6} /></div> : (
          <div style={{ padding: "0 20px 20px", overflowX: "auto" }}>
            {filtered.length === 0 ? (
              <EmptyState icon={Users} title="No candidates found" message={search ? "No candidates match your search." : "No candidates registered yet."} />
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${P.border}` }}>
                    <th style={thStyle}>Photo</th><th style={thStyle}>Name</th><th style={thStyle}>Gender</th>
                    <th style={thStyle}>DOB</th><th style={thStyle}>Citizenship</th><th style={thStyle}>Party</th><th style={thStyle}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id} style={{ borderBottom: `1px solid ${P.borderLight}` }}>
                      <td style={tdStyle}>
                        <ImageUpload
                          currentUrl={imageUrl(c.photo_path)}
                          onUpload={(file) => handlePhotoUpload(c, file)}
                          onRemove={() => handlePhotoRemove(c)}
                          uploading={uploading[c.id]}
                          label="Photo"
                          shape="round"
                          size={40}
                        />
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontWeight: 600 }}>{c.full_name}</span>
                        {!c.is_active && <Badge map={{ INACTIVE: { bg: P.errorBg, color: P.error, label: "Inactive" } }} status="INACTIVE" />}
                      </td>
                      <td style={tdStyle}>{c.gender || "—"}</td>
                      <td style={tdStyle}>{c.date_of_birth || "—"}</td>
                      <td style={tdStyle}>{c.citizenship_no || "—"}</td>
                      <td style={tdStyle}>{c.party_id ? (partyMap[c.party_id]?.abbreviation || `#${c.party_id}`) : <span style={{ color: P.muted }}>Independent</span>}</td>
                      <td style={tdStyle}><Btn variant="ghost" small onClick={() => setConfirmDel(c)} style={{ color: P.error }}><Trash2 size={14} /></Btn></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </SectionCard>

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={handleDelete}
        title="Delete Candidate"
        body={`Are you sure you want to delete "${confirmDel?.full_name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/*  NOMINATIONS PANEL (was FPTP)                                 */
/* ══════════════════════════════════════════════════════════════ */

function NominationsPanel({ setMsg, clearMsg }) {
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
  const [confirmDel, setConfirmDel] = useState(null);

  useEffect(() => { listElections().then(setElections).catch(() => {}); }, []);

  const SINGLE_SEAT_TYPES = ["FPTP", "MAYOR", "DEPUTY_MAYOR"];

  useEffect(() => {
    if (!selectedElection) { setContests([]); setNominations([]); setReadiness(null); return; }
    listContests(selectedElection).then(c => setContests(c.filter(x => SINGLE_SEAT_TYPES.includes(x.contest_type)))).catch(() => {});
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

  const handleDeleteNom = async () => {
    if (!confirmDel) return;
    clearMsg();
    try { await deleteFptpNomination(confirmDel.id); setMsg({ type: "success", text: "Nomination removed" }); loadNominations(); }
    catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
    finally { setConfirmDel(null); }
  };

  const partyMap = Object.fromEntries(parties.map(p => [p.id, p]));
  const profileMap = Object.fromEntries(profiles.map(c => [c.id, c]));
  const contestMap = Object.fromEntries(contests.map(c => [c.id, c]));

  const eligibleElections = elections.filter(e => ["NOMINATIONS_OPEN", "NOMINATIONS_CLOSED", "CANDIDATE_LIST_PUBLISHED"].includes(e.status));

  return (
    <div>
      <SectionCard>
        <SectionHeader title="Nominations" subtitle="Single-seat contest nominations (FPTP / Mayor / Deputy Mayor)" />

        <div style={{ padding: 20 }}>
          {/* Election + Contest selectors */}
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: P.text }}>Election:</label>
            <select style={{ ...inp, maxWidth: 400 }} value={selectedElection} onChange={e => { setSelectedElection(e.target.value); setSelectedContest(""); }}>
              <option value="">— Select election —</option>
              {eligibleElections.map(e => <option key={e.id} value={e.id}>{e.title} [{e.government_level}] ({e.status})</option>)}
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
            <div style={{ background: readiness.ready ? P.successBg : P.warnBg, border: `1px solid ${readiness.ready ? P.successBorder : P.warnBorder}`, borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 12, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              {readiness.ready ? <CheckCircle2 size={16} color={P.success} /> : <AlertTriangle size={16} color={P.warn} />}
              <span style={{ fontWeight: 700 }}>Candidate Readiness:</span>
              {readiness.contest_types && readiness.contest_types.filter(ct => ct !== "PR").map(ct => {
                const key = ct.toLowerCase();
                const total = readiness[`${key}_contests_total`];
                const filled = readiness[`${key}_contests_filled`];
                return total > 0 ? <span key={ct}>{ct} filled: {filled}/{total}</span> : null;
              })}
              {readiness.pr_submissions_total != null && <span>PR valid: {readiness.pr_submissions_valid}/{readiness.pr_submissions_total}</span>}
              {readiness.issues.length > 0 && <span style={{ color: P.warn }}>{readiness.issues.join("; ")}</span>}
            </div>
          )}

          {!selectedElection && <EmptyState icon={UserPlus} title="Select an election" message="Choose an election to manage nominations." />}

          {selectedElection && (
            <>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                <Btn onClick={() => setShowNomForm(!showNomForm)} small disabled={!selectedContest}>
                  <Plus size={14} /> {showNomForm ? "Cancel" : "Nominate Candidate"}
                </Btn>
              </div>

              {showNomForm && selectedContest && (
                <div style={{ background: P.bg, border: `1px solid ${P.borderLight}`, borderRadius: 10, padding: 16, marginBottom: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <label style={lbl}>Party
                      <select style={inp} value={nomForm.party_id} onChange={e => {
                        const newPartyId = e.target.value;
                        const currentCandidate = profiles.find(c => String(c.id) === nomForm.candidate_id);
                        const candidateMatchesParty = currentCandidate && (!newPartyId ? true : String(currentCandidate.party_id) === newPartyId);
                        setNomForm({ ...nomForm, party_id: newPartyId, candidate_id: candidateMatchesParty ? nomForm.candidate_id : "" });
                      }}>
                        <option value="">Independent / All</option>
                        {parties.filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.name} ({p.abbreviation})</option>)}
                      </select>
                    </label>
                    <label style={lbl}>Candidate *
                      <select style={inp} value={nomForm.candidate_id} onChange={e => setNomForm({ ...nomForm, candidate_id: e.target.value })}>
                        <option value="">— Select —</option>
                        {profiles.filter(c => c.is_active && (!nomForm.party_id ? true : String(c.party_id) === nomForm.party_id)).map(c => (
                          <option key={c.id} value={c.id}>{c.full_name}{c.party_id ? ` (${partyMap[c.party_id]?.abbreviation || ""})` : " (Independent)"}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <Btn onClick={handleNominate} loading={saving}>Create Nomination</Btn>
                </div>
              )}

              {nomLoading ? <TableSkeleton rows={4} cols={5} /> : (
                nominations.length === 0 ? (
                  <EmptyState icon={UserPlus} title="No nominations" message="No nominations found for these filters." />
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr style={{ borderBottom: `2px solid ${P.border}` }}>
                      <th style={thStyle}>Contest</th><th style={thStyle}>Candidate</th><th style={thStyle}>Party</th><th style={thStyle}>Status</th><th style={thStyle}>Actions</th>
                    </tr></thead>
                    <tbody>
                      {nominations.map(n => (
                        <tr key={n.id} style={{ borderBottom: `1px solid ${P.borderLight}` }}>
                          <td style={tdStyle}>{contestMap[n.contest_id]?.title || `#${n.contest_id}`}</td>
                          <td style={tdStyle}>{profileMap[n.candidate_id]?.full_name || `#${n.candidate_id}`}</td>
                          <td style={tdStyle}>{n.party_id ? (partyMap[n.party_id]?.abbreviation || `#${n.party_id}`) : "Ind."}</td>
                          <td style={tdStyle}><Badge map={NOM_STATUS_BADGES} status={n.status} /></td>
                          <td style={tdStyle}>
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
                                <Btn small variant="ghost" onClick={() => setConfirmDel(n)} style={{ color: P.error }}><Trash2 size={12} /></Btn>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}
            </>
          )}
        </div>
      </SectionCard>

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={handleDeleteNom}
        title="Delete Nomination"
        body={`Remove nomination for "${confirmDel ? (profileMap[confirmDel.candidate_id]?.full_name || `#${confirmDel.candidate_id}`) : ""}"?`}
        confirmLabel="Delete"
        variant="danger"
      />
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
  const [confirmDel, setConfirmDel] = useState(null);
  const [confirmSubmit, setConfirmSubmit] = useState(null);

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

  const handleDeleteSubmission = async () => {
    if (!confirmDel) return;
    clearMsg();
    try { await deletePrSubmission(confirmDel.id); setMsg({ type: "success", text: "Submission deleted" }); loadSubmissions(); }
    catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
    finally { setConfirmDel(null); }
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

  const handleSubmit = async () => {
    if (!confirmSubmit) return;
    clearMsg();
    try {
      const updated = await submitPrList(confirmSubmit.id);
      if (updated.status === "SUBMITTED") {
        setMsg({ type: "success", text: "PR list submitted successfully" });
      } else {
        setMsg({ type: "error", text: "Validation failed — list not submitted. See errors below." });
        setValidation(updated.validation_snapshot ? JSON.parse(updated.validation_snapshot) : null);
      }
      loadSubmissions();
    } catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
    finally { setConfirmSubmit(null); }
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
  const eligibleElections = elections.filter(e => ["NOMINATIONS_OPEN", "NOMINATIONS_CLOSED", "CANDIDATE_LIST_PUBLISHED"].includes(e.status));
  const prEligibleElections = eligibleElections.filter(e =>
    e.contest_counts ? e.contest_counts["PR"] > 0 : (e.government_level === "FEDERAL" || e.government_level === "PROVINCIAL")
  );

  return (
    <div>
      <SectionCard>
        <SectionHeader title="PR Closed-List Management" subtitle="Proportional representation party lists" />

        <div style={{ padding: 20 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Election:</label>
            <select style={{ ...inp, maxWidth: 400 }} value={selectedElection} onChange={e => setSelectedElection(e.target.value)}>
              <option value="">— Select election —</option>
              {prEligibleElections.map(e => <option key={e.id} value={e.id}>{e.title} [{e.government_level}] ({e.status})</option>)}
            </select>
          </div>

          {!selectedElection && <EmptyState icon={ListOrdered} title="Select an election" message="Choose an election to manage PR submissions." />}

          {selectedElection && (
            <>
              {/* Create new submission */}
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, background: P.bg, border: `1px solid ${P.borderLight}`, borderRadius: 8, padding: 12 }}>
                <select style={{ ...inp, flex: 1, maxWidth: 300 }} value={newSubParty} onChange={e => setNewSubParty(e.target.value)}>
                  <option value="">— Select party —</option>
                  {parties.filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.name} ({p.abbreviation})</option>)}
                </select>
                <Btn onClick={handleCreateSubmission} loading={saving} small><Plus size={14} /> Create PR Submission</Btn>
              </div>

              {subLoading ? <TableSkeleton rows={3} cols={3} /> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {submissions.length === 0 && <EmptyState icon={ListOrdered} title="No submissions" message="No PR submissions for this election." />}
                  {submissions.map(sub => {
                    const party = partyMap[sub.party_id];
                    const isExpanded = expandedSub === sub.id;
                    return (
                      <div key={sub.id} style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 10, overflow: "hidden" }}>
                        {/* Header */}
                        <div onClick={() => handleExpand(sub)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", cursor: "pointer" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <ChevronRight size={16} style={{ transform: isExpanded ? "rotate(90deg)" : "none", transition: "0.15s", color: P.muted }} />
                            {party?.symbol_path && (
                              <img src={imageUrl(party.symbol_path)} alt="" style={{ width: 24, height: 24, objectFit: "contain", borderRadius: 4 }} />
                            )}
                            <span style={{ fontWeight: 700, fontSize: 14, color: P.text }}>{party?.name || `Party #${sub.party_id}`}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: P.accent }}>{party?.abbreviation}</span>
                            <Badge map={PR_STATUS_BADGES} status={sub.status} />
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            {(sub.status === "DRAFT" || sub.status === "INVALID") && (
                              <Btn small variant="ghost" onClick={e => { e.stopPropagation(); setConfirmDel(sub); }} style={{ color: P.error }}><Trash2 size={12} /></Btn>
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
                                  <Btn small variant="primary" onClick={() => setConfirmSubmit(sub)}><Send size={14} /> Validate & Submit</Btn>
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
                              <div style={{ background: validation.valid ? P.successBg : P.errorBg, border: `1px solid ${validation.valid ? P.successBorder : P.errorBorder}`, borderRadius: 8, padding: 14, marginBottom: 14 }}>
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
                              <thead><tr style={{ borderBottom: `2px solid ${P.border}` }}>
                                <th style={thStyle}>Pos</th><th style={thStyle}>Candidate</th><th style={thStyle}>Gender</th><th style={thStyle}>DOB</th><th style={thStyle}></th>
                              </tr></thead>
                              <tbody>
                                {entries.length === 0 && <tr><td colSpan={5} style={{ ...tdStyle, color: P.muted }}>No entries yet.</td></tr>}
                                {entries.map(e => {
                                  const c = profileMap[e.candidate_id];
                                  return (
                                    <tr key={e.id} style={{ borderBottom: `1px solid ${P.borderLight}` }}>
                                      <td style={tdStyle}><span style={{ fontWeight: 800, color: P.navy }}>{e.list_position}</span></td>
                                      <td style={tdStyle}>{c?.full_name || `#${e.candidate_id}`}</td>
                                      <td style={tdStyle}>{c?.gender || "—"}</td>
                                      <td style={tdStyle}>{c?.date_of_birth || "—"}</td>
                                      <td style={tdStyle}>
                                        {(sub.status === "DRAFT" || sub.status === "INVALID") && (
                                          <Btn variant="ghost" small onClick={() => handleRemoveEntry(sub.id, e.id)} style={{ color: P.error }}><Trash2 size={14} /></Btn>
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
      </SectionCard>

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={handleDeleteSubmission}
        title="Delete PR Submission"
        body="Delete this PR submission and all its entries? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />

      <ConfirmDialog
        open={!!confirmSubmit}
        onClose={() => setConfirmSubmit(null)}
        onConfirm={handleSubmit}
        title="Submit PR List"
        body="This will validate and submit the PR list. Once submitted, entries are locked until reviewed."
        confirmLabel="Submit"
        variant="primary"
      />
    </div>
  );
}
