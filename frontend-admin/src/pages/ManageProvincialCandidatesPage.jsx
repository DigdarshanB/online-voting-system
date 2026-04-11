import React, { useState, useMemo, useEffect, useCallback, useId, Component } from "react";
import {
  Users, UserPlus, ListOrdered, Plus, Trash2, Check, X,
  ChevronDown, ChevronUp, AlertTriangle, Shield, RotateCcw,
  Search, MoreHorizontal, Camera, FileText, Pencil, Building2,
} from "lucide-react";
import { T } from "../components/ui/tokens";
import {
  PageContainer, BackLink, SectionCard, SectionHeader,
  AdminBadge, Btn, SearchInput, Toast, AdminKeyframes,
  StatusBanner, imageUrl, errMsg,
} from "../components/ui/AdminUI";
import useParties from "../features/candidates/hooks/useParties";
import useCandidateProfiles from "../features/candidates/hooks/useCandidateProfiles";
import {
  createProfile, updateProfile, deleteProfile,
  uploadCandidatePhoto, removeCandidatePhoto,
  listElections, listContests,
  listFptpNominations, createFptpNomination, updateFptpNomination, deleteFptpNomination,
  listPrSubmissions, createPrSubmission, deletePrSubmission, reviewPrSubmission,
  listPrEntries, addPrEntry, removePrEntry,
  validatePrList, submitPrList,
  getCandidateReadiness,
  listPrEligibleCandidates,
} from "../features/candidates/api/candidatesApi";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import ProfileMediaMenu from "../components/ui/ProfileMediaMenu";
import EmptyState from "../components/ui/EmptyState";
import { TableSkeleton } from "../components/ui/Skeleton";

/* ── Status badge maps ── */
const NOM_MAP = {
  PENDING:   { bg: T.warnBg, color: T.warn, label: "Pending" },
  APPROVED:  { bg: T.successBg, color: T.success, label: "Approved" },
  REJECTED:  { bg: T.errorBg, color: T.error, label: "Rejected" },
  WITHDRAWN: { bg: T.borderLight, color: T.muted, label: "Withdrawn" },
};
const PR_MAP = {
  DRAFT:     { bg: T.warnBg, color: T.warn, label: "Draft" },
  SUBMITTED: { bg: T.accentLight, color: T.accent, label: "Submitted" },
  VALID:     { bg: T.successBg, color: T.success, label: "Valid" },
  INVALID:   { bg: T.errorBg, color: T.error, label: "Invalid" },
  APPROVED:  { bg: T.successBg, color: T.success, label: "Approved" },
  REJECTED:  { bg: T.errorBg, color: T.error, label: "Rejected" },
};

const TABS = [
  { key: "candidates", label: "Candidate Profiles", icon: Users, sublabel: "Shared registry" },
  { key: "nominations", label: "Nominations", icon: UserPlus, sublabel: "Election-scoped" },
  { key: "prlists", label: "PR Lists", icon: ListOrdered, sublabel: "Election-scoped" },
];
const SINGLE_SEAT_TYPES = ["FPTP", "MAYOR", "DEPUTY_MAYOR"];

const PROVINCE_NAMES = {
  P1: "Koshi", P2: "Madhesh", P3: "Bagmati", P4: "Gandaki",
  P5: "Lumbini", P6: "Karnali", P7: "Sudurpashchim",
};

/* ── Form helpers ── */
const lbl = { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 600, color: T.textSecondary };
const inp = { padding: "8px 12px", borderRadius: T.radius.md, border: `1px solid ${T.border}`, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box", background: T.surface, color: T.text };
const sel = { ...inp, cursor: "pointer" };


/* ══════════════════════════════════════════════════════════════ */
/*  MAIN PAGE                                                    */
/* ══════════════════════════════════════════════════════════════ */
export default function ManageProvincialCandidatesPage() {
  const [tab, setTab] = useState("nominations");
  const [msg, setMsg] = useState(null);
  const tablistId = useId();

  return (
    <PageContainer>
      <AdminKeyframes />
      <Toast msg={msg} onClose={() => setMsg(null)} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <BackLink to="/admin/manage-candidates" label="Candidate Management" />
      </div>

      {/* ── Context band ── */}
      <div style={{
        background: T.surfaceAlt, border: `1px solid ${T.borderLight}`,
        borderRadius: T.radius.lg, padding: "14px 20px",
        marginBottom: T.space.xl, display: "flex", gap: 12,
        alignItems: "flex-start", flexWrap: "wrap",
      }}>
        <Building2 size={16} color={T.purple || T.accent} style={{ marginTop: 2, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.navy }}>
            Provincial candidates workspace
          </span>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: T.muted, lineHeight: 1.5 }}>
            <strong>Party registry</strong> and <strong>candidate profiles</strong> are shared master data.{" "}
            <strong>Nominations</strong> and <strong>PR lists</strong> are scoped to individual provincial elections.
          </p>
        </div>
      </div>

      {/* ── Workspace switcher ── */}
      <WorkspaceTabs tabs={TABS} activeTab={tab} onSelect={setTab} id={tablistId} />

      {TABS.map((t) => (
        <div key={t.key} role="tabpanel" id={`${tablistId}-panel-${t.key}`}
          aria-labelledby={`${tablistId}-tab-${t.key}`} hidden={tab !== t.key}>
          {tab === t.key && (
            <>
              {t.key === "candidates" && <CandidatesPanel setMsg={setMsg} />}
              {t.key === "nominations" && <NominationsPanel setMsg={setMsg} />}
              {t.key === "prlists" && <PRListsPanel setMsg={setMsg} />}
            </>
          )}
        </div>
      ))}
    </PageContainer>
  );
}


/* ══════════════════════════════════════════════════════════════ */
/*  WORKSPACE TABS                                               */
/* ══════════════════════════════════════════════════════════════ */
function WorkspaceTabs({ tabs, activeTab, onSelect, id }) {
  const [focusIdx, setFocusIdx] = useState(() => tabs.findIndex(t => t.key === activeTab));
  const handleKeyDown = (e) => {
    let next = focusIdx;
    if (e.key === "ArrowRight") { next = (focusIdx + 1) % tabs.length; e.preventDefault(); }
    else if (e.key === "ArrowLeft") { next = (focusIdx - 1 + tabs.length) % tabs.length; e.preventDefault(); }
    else if (e.key === "Home") { next = 0; e.preventDefault(); }
    else if (e.key === "End") { next = tabs.length - 1; e.preventDefault(); }
    else if (e.key === "Enter" || e.key === " ") { onSelect(tabs[focusIdx].key); e.preventDefault(); return; }
    if (next !== focusIdx) { setFocusIdx(next); document.getElementById(`${id}-tab-${tabs[next].key}`)?.focus(); }
  };
  return (
    <div role="tablist" aria-label="Provincial candidates workspace" onKeyDown={handleKeyDown}
      className="admin-workspace-tabs" style={{
        display: "flex", gap: 6, marginBottom: T.space["2xl"], padding: 4,
        background: T.surfaceAlt, borderRadius: T.radius.xl,
        border: `1px solid ${T.borderLight}`, overflowX: "auto", flexWrap: "wrap",
      }}>
      {tabs.map((t, i) => {
        const active = activeTab === t.key;
        const Icon = t.icon;
        return (
          <button key={t.key} role="tab" id={`${id}-tab-${t.key}`}
            aria-selected={active} aria-controls={`${id}-panel-${t.key}`}
            tabIndex={focusIdx === i ? 0 : -1}
            onClick={() => { setFocusIdx(i); onSelect(t.key); }}
            style={{
              display: "flex", alignItems: "center", gap: 8, padding: "12px 20px",
              borderRadius: T.radius.lg,
              border: active ? `1.5px solid ${T.accent}` : "1.5px solid transparent",
              background: active ? T.accentLight : "transparent",
              boxShadow: active ? `0 2px 8px ${T.accent}15, ${T.shadow.sm}` : "none",
              cursor: "pointer", transition: "all 0.18s ease", flex: "1 1 auto", minWidth: 0, outline: "none",
            }}
            onFocus={e => { if (!active) e.currentTarget.style.boxShadow = T.focusRing; }}
            onBlur={e => { if (!active) e.currentTarget.style.boxShadow = "none"; }}
            onMouseEnter={e => { if (!active) { e.currentTarget.style.background = T.surface + "80"; e.currentTarget.style.borderColor = T.borderLight; } }}
            onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; } }}
          >
            <div style={{ width: 32, height: 32, borderRadius: T.radius.md, background: active ? T.accentLight : T.borderLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon size={15} color={active ? T.accent : T.muted} strokeWidth={2} />
            </div>
            <div style={{ textAlign: "left", minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: active ? 700 : 600, color: active ? T.accent : T.textSecondary, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.label}</div>
              <span style={{ fontSize: 10, fontWeight: 600, color: active ? T.accent : T.muted, letterSpacing: "0.02em" }}>{t.sublabel}</span>
            </div>
            {active && <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.accent, flexShrink: 0, marginLeft: "auto" }} />}
          </button>
        );
      })}
    </div>
  );
}

function KPIRow({ items }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: T.space.lg, marginBottom: T.space.xl }}>
      {items.map((item, i) => (
        <div key={i} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius.lg, padding: "18px 20px", borderLeft: `3px solid ${item.accent || T.accent}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{item.label}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: item.accent || T.text, lineHeight: 1 }}>{item.value}</div>
          {item.detail && <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>{item.detail}</div>}
        </div>
      ))}
    </div>
  );
}

function Toolbar({ left, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 24px", borderBottom: `1px solid ${T.borderLight}`, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>{left}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>{right}</div>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════ */
/*  CANDIDATES PANEL (shared registry — same as federal)         */
/* ══════════════════════════════════════════════════════════════ */
function CandidatesPanel({ setMsg }) {
  const { parties } = useParties();
  const { profiles, loading, reload } = useCandidateProfiles();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: "", gender: "", date_of_birth: "", address: "", citizenship_no: "", party_id: "" });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [confirmDel, setConfirmDel] = useState(null);
  const [uploading, setUploading] = useState({});
  const [editCandidate, setEditCandidate] = useState(null);
  const [editForm, setEditForm] = useState({ full_name: "", gender: "", date_of_birth: "", address: "", citizenship_no: "", party_id: "" });
  const [updating, setUpdating] = useState(false);

  const partyMap = useMemo(() => Object.fromEntries((parties || []).map(p => [p.id, p])), [parties]);
  const filtered = useMemo(() => {
    if (!search.trim()) return profiles;
    const q = search.toLowerCase();
    return profiles.filter(c => {
      const pName = partyMap[c.party_id]?.name || "";
      return c.full_name.toLowerCase().includes(q) || pName.toLowerCase().includes(q);
    });
  }, [profiles, search, partyMap]);

  const handleCreate = async () => {
    if (!form.full_name.trim()) { setMsg({ type: "error", text: "Full name is required" }); return; }
    setSaving(true);
    try {
      await createProfile({ ...form, party_id: form.party_id ? Number(form.party_id) : null, gender: form.gender || null, date_of_birth: form.date_of_birth || null });
      setMsg({ type: "success", text: "Candidate profile created" });
      setShowForm(false); setForm({ full_name: "", gender: "", date_of_birth: "", address: "", citizenship_no: "", party_id: "" }); reload();
    } catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
    finally { setSaving(false); }
  };
  const handleDelete = async () => {
    if (!confirmDel) return;
    try { await deleteProfile(confirmDel.id); setMsg({ type: "success", text: "Profile deleted" }); reload(); }
    catch (err) { setMsg({ type: "error", text: errMsg(err) }); } finally { setConfirmDel(null); }
  };
  const handlePhotoUpload = async (c, file) => {
    setUploading(u => ({ ...u, [c.id]: true }));
    try { await uploadCandidatePhoto(c.id, file); setMsg({ type: "success", text: "Photo uploaded" }); reload(); }
    catch (err) { setMsg({ type: "error", text: errMsg(err) }); } finally { setUploading(u => ({ ...u, [c.id]: false })); }
  };
  const handlePhotoRemove = async (c) => {
    setUploading(u => ({ ...u, [c.id]: true }));
    try { await removeCandidatePhoto(c.id); setMsg({ type: "success", text: "Photo removed" }); reload(); }
    catch (err) { setMsg({ type: "error", text: errMsg(err) }); } finally { setUploading(u => ({ ...u, [c.id]: false })); }
  };
  const handleStartEdit = (c) => {
    setEditCandidate(c);
    setEditForm({ full_name: c.full_name || "", gender: c.gender || "", date_of_birth: c.date_of_birth || "", address: c.address || "", citizenship_no: c.citizenship_no || "", party_id: c.party_id ? String(c.party_id) : "" });
  };
  const handleUpdate = async () => {
    if (!editCandidate) return;
    if (!editForm.full_name.trim()) { setMsg({ type: "error", text: "Full name is required" }); return; }
    setUpdating(true);
    try {
      await updateProfile(editCandidate.id, { full_name: editForm.full_name, gender: editForm.gender || null, date_of_birth: editForm.date_of_birth || null, address: editForm.address || null, citizenship_no: editForm.citizenship_no || null, party_id: editForm.party_id ? Number(editForm.party_id) : null });
      setMsg({ type: "success", text: "Candidate profile updated" }); setEditCandidate(null); reload();
    } catch (err) { setMsg({ type: "error", text: errMsg(err) }); } finally { setUpdating(false); }
  };

  const withPhoto = profiles.filter(c => c.photo_path).length;
  const partyCount = [...new Set(profiles.map(c => c.party_id))].length;

  return (
    <>
      <KPIRow items={[
        { label: "Total profiles", value: profiles.length, accent: T.navy },
        { label: "With photo", value: withPhoto, accent: T.success, detail: profiles.length > 0 ? `${Math.round(withPhoto / profiles.length * 100)}% coverage` : "—" },
        { label: "Parties represented", value: partyCount, accent: T.accent },
      ]} />
      <SectionCard style={{ border: `1px solid ${T.borderStrong}` }}>
        <SectionHeader icon={Users} iconColor={T.navy} title="Candidate Profiles" subtitle="Global registry — shared across all election levels" />
        <Toolbar
          left={<SearchInput value={search} onChange={setSearch} placeholder="Search candidates..." />}
          right={<Btn small onClick={() => setShowForm(!showForm)}><Plus size={13} /> {showForm ? "Cancel" : "New profile"}</Btn>}
        />
        {showForm && (
          <div style={{ padding: 20, borderBottom: `1px solid ${T.borderLight}`, background: T.surfaceAlt }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 12 }}>
              <label style={lbl}>Full Name *<input style={inp} value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></label>
              <label style={lbl}>Gender<select style={sel} value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}><option value="">—</option><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option></select></label>
              <label style={lbl}>Date of birth<input style={inp} type="date" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} /></label>
              <label style={lbl}>Citizenship No<input style={inp} value={form.citizenship_no} onChange={e => setForm({ ...form, citizenship_no: e.target.value })} /></label>
              <label style={lbl}>Address<input style={inp} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></label>
              <label style={lbl}>Party<select style={sel} value={form.party_id} onChange={e => setForm({ ...form, party_id: e.target.value })}><option value="">Independent</option>{(parties || []).filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.name} ({p.abbreviation})</option>)}</select></label>
            </div>
            <Btn onClick={handleCreate} loading={saving}>Create profile</Btn>
          </div>
        )}
        {loading ? (
          <div style={{ padding: 24 }}><TableSkeleton rows={4} cols={5} /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 24 }}><EmptyState icon={Users} title="No candidate profiles" message={search ? "No match for this search." : "Create the first candidate profile."} /></div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ background: T.surfaceAlt }}>
                <th style={thStyle}>Profile</th><th style={thStyle}>Candidate</th><th style={thStyle}>Gender</th>
                <th style={thStyle}>DOB</th><th style={thStyle}>Citizenship</th><th style={thStyle}>Party</th>
                <th style={{ ...thStyle, width: 90, textAlign: "center" }}>Actions</th>
              </tr></thead>
              <tbody>
                {filtered.map(c => {
                  const party = partyMap[c.party_id];
                  return (
                    <tr key={c.id} style={{ transition: "background 0.12s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = T.surfaceAlt; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                      <td style={tdStyle}><ProfileMediaMenu currentUrl={imageUrl(c.photo_path)} onUpload={(file) => handlePhotoUpload(c, file)} onRemove={() => handlePhotoRemove(c)} uploading={uploading[c.id]} size={38} /></td>
                      <td style={tdStyle}><div style={{ fontWeight: 600, fontSize: 13, color: T.text }}>{c.full_name}</div>{!c.is_active && <AdminBadge map={{ INACTIVE: { bg: T.errorBg, color: T.error, label: "Inactive" } }} status="INACTIVE" />}</td>
                      <td style={{ ...tdStyle, fontSize: 12, color: T.muted }}>{c.gender || "—"}</td>
                      <td style={{ ...tdStyle, fontSize: 12, color: T.muted }}>{c.date_of_birth || "—"}</td>
                      <td style={{ ...tdStyle, fontSize: 12, color: T.muted }}>{c.citizenship_no || "—"}</td>
                      <td style={tdStyle}><div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 13, color: T.textSecondary }}>{party?.name || <span style={{ color: T.muted }}>Independent</span>}</span>{party?.abbreviation && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: T.accentLight, color: T.accent }}>{party.abbreviation}</span>}</div></td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 2, justifyContent: "center" }}>
                          <Btn variant="ghost" small onClick={() => handleStartEdit(c)} style={{ color: T.accent }}><Pencil size={14} /></Btn>
                          <Btn variant="ghost" small onClick={() => setConfirmDel(c)} style={{ color: T.error }}><Trash2 size={14} /></Btn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Edit dialog */}
      {editCandidate && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => { if (!updating) setEditCandidate(null); }}>
          <div onClick={e => e.stopPropagation()} style={{ background: T.surface, borderRadius: T.radius.xl, boxShadow: T.shadow.xl, width: "min(95vw, 560px)", maxHeight: "85vh", overflow: "auto", border: `1px solid ${T.border}` }}>
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.borderLight}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.navy }}>Edit Candidate Profile</h3>
              <button onClick={() => setEditCandidate(null)} disabled={updating} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, padding: 4 }}><X size={18} /></button>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
                <label style={lbl}>Full Name *<input style={inp} value={editForm.full_name} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} /></label>
                <label style={lbl}>Gender<select style={sel} value={editForm.gender} onChange={e => setEditForm({ ...editForm, gender: e.target.value })}><option value="">—</option><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option></select></label>
                <label style={lbl}>Date of birth<input style={inp} type="date" value={editForm.date_of_birth} onChange={e => setEditForm({ ...editForm, date_of_birth: e.target.value })} /></label>
                <label style={lbl}>Citizenship No<input style={inp} value={editForm.citizenship_no} onChange={e => setEditForm({ ...editForm, citizenship_no: e.target.value })} /></label>
                <label style={lbl}>Address<input style={inp} value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} /></label>
                <label style={lbl}>Party<select style={sel} value={editForm.party_id} onChange={e => setEditForm({ ...editForm, party_id: e.target.value })}><option value="">Independent</option>{(parties || []).filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.name} ({p.abbreviation})</option>)}</select></label>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <Btn variant="ghost" small onClick={() => setEditCandidate(null)} disabled={updating}>Cancel</Btn>
                <Btn small onClick={handleUpdate} loading={updating}>Save changes</Btn>
              </div>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={handleDelete}
        title="Delete candidate profile" body={`Delete profile for "${confirmDel?.full_name}"? This action cannot be undone.`} confirmLabel="Delete" variant="danger" />
    </>
  );
}


/* ══════════════════════════════════════════════════════════════ */
/*  NOMINATIONS PANEL — provincial elections only                */
/* ══════════════════════════════════════════════════════════════ */
function NominationsPanel({ setMsg }) {
  const { parties } = useParties();
  const { profiles } = useCandidateProfiles();
  const [elections, setElections] = useState([]);
  const [selectedElection, setSelectedElection] = useState("");
  const [contests, setContests] = useState([]);
  const [selectedContest, setSelectedContest] = useState("");
  const [nominations, setNominations] = useState([]);
  const [nomLoading, setNomLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ contest_id: "", candidate_id: "", party_id: "" });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [confirmDel, setConfirmDel] = useState(null);

  const profileMap = useMemo(() => Object.fromEntries((profiles || []).map(p => [p.id, p])), [profiles]);
  const partyMap = useMemo(() => Object.fromEntries((parties || []).map(p => [p.id, p])), [parties]);
  const contestMap = useMemo(() => Object.fromEntries(contests.map(c => [c.id, c])), [contests]);

  useEffect(() => { (async () => { try { const d = await listElections(); setElections(d || []); } catch {} })(); }, []);

  const eligibleElections = useMemo(() =>
    (elections || []).filter(e =>
      e.government_level === "PROVINCIAL" &&
      ["NOMINATIONS_OPEN", "NOMINATIONS_CLOSED", "CANDIDATE_LIST_PUBLISHED"].includes(e.status)
    ), [elections]);

  useEffect(() => {
    if (!selectedElection) { setContests([]); return; }
    (async () => {
      try { const all = await listContests(selectedElection); setContests((all || []).filter(c => SINGLE_SEAT_TYPES.includes(c.contest_type))); }
      catch { setContests([]); }
    })();
  }, [selectedElection]);

  const loadNominations = useCallback(async () => {
    if (!selectedElection) { setNominations([]); return; }
    setNomLoading(true);
    try { setNominations(await listFptpNominations(selectedElection, { contestId: selectedContest || undefined }) || []); }
    catch { setNominations([]); } finally { setNomLoading(false); }
  }, [selectedElection, selectedContest]);

  useEffect(() => { loadNominations(); }, [loadNominations]);

  const filtered = useMemo(() => {
    if (!search.trim()) return nominations;
    const q = search.toLowerCase();
    return nominations.filter(n => { const prof = profileMap[n.candidate_id]; return prof?.full_name?.toLowerCase().includes(q) || String(n.id).includes(q); });
  }, [nominations, search, profileMap]);

  const handleCreate = async () => {
    if (!form.contest_id || !form.candidate_id) { setMsg({ type: "error", text: "Constituency and candidate are required" }); return; }
    setSaving(true);
    try {
      await createFptpNomination(selectedElection, { contest_id: Number(form.contest_id), candidate_id: Number(form.candidate_id), party_id: form.party_id ? Number(form.party_id) : null });
      setMsg({ type: "success", text: "Nomination created" }); setShowForm(false); setForm({ contest_id: "", candidate_id: "", party_id: "" }); loadNominations();
    } catch (err) { setMsg({ type: "error", text: errMsg(err) }); } finally { setSaving(false); }
  };
  const handleStatusChange = async (nom, newStatus) => {
    try { await updateFptpNomination(nom.id, { status: newStatus }); setMsg({ type: "success", text: `Nomination ${newStatus.toLowerCase()}` }); loadNominations(); }
    catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
  };
  const handleDelete = async () => {
    if (!confirmDel) return;
    try { await deleteFptpNomination(confirmDel.id); setMsg({ type: "success", text: "Nomination deleted" }); loadNominations(); }
    catch (err) { setMsg({ type: "error", text: errMsg(err) }); } finally { setConfirmDel(null); }
  };

  const pendingCount = nominations.filter(n => n.status === "PENDING").length;
  const approvedCount = nominations.filter(n => n.status === "APPROVED").length;
  const selectedElObj = elections.find(e => String(e.id) === String(selectedElection));
  const provinceLabel = selectedElObj?.province_code ? `Province ${selectedElObj.province_code.replace("P", "")} — ${PROVINCE_NAMES[selectedElObj.province_code] || ""}` : null;

  return (
    <>
      <div style={{ display: "flex", gap: 12, marginBottom: T.space.xl, flexWrap: "wrap" }}>
        <label style={{ ...lbl, minWidth: 200, flex: 1 }}>Provincial Election
          <select style={sel} value={selectedElection} onChange={e => { setSelectedElection(e.target.value); setSelectedContest(""); }}>
            <option value="">Select provincial election</option>
            {eligibleElections.map(e => <option key={e.id} value={e.id}>{e.title} [{e.province_code}] — {e.status.replace(/_/g, " ")}</option>)}
          </select>
        </label>
        {selectedElection && (
          <label style={{ ...lbl, minWidth: 200, flex: 1 }}>Constituency filter
            <select style={sel} value={selectedContest} onChange={e => setSelectedContest(e.target.value)}>
              <option value="">All constituencies</option>
              {contests.map(c => <option key={c.id} value={c.id}>{c.title} ({c.contest_type})</option>)}
            </select>
          </label>
        )}
      </div>

      {provinceLabel && (
        <div style={{ background: T.purpleBg || "#F5F3FF", border: `1px solid ${(T.purple || "#7C3AED") + "30"}`, borderRadius: T.radius.md, padding: "10px 16px", marginBottom: T.space.lg, fontSize: 13, fontWeight: 600, color: T.purple || "#7C3AED", display: "flex", alignItems: "center", gap: 8 }}>
          <Building2 size={14} /> {provinceLabel}
        </div>
      )}

      {selectedElection && (
        <KPIRow items={[
          { label: "Total nominations", value: nominations.length, accent: T.navy },
          { label: "Pending review", value: pendingCount, accent: T.warn },
          { label: "Approved", value: approvedCount, accent: T.success },
          { label: "Constituencies", value: contests.length, accent: T.accent },
        ]} />
      )}

      <SectionCard style={{ border: `1px solid ${T.borderStrong}` }}>
        <SectionHeader icon={UserPlus} iconColor={T.accent} title="Provincial FPTP Nominations"
          subtitle={selectedElection ? "Constituency nominations for this provincial election" : "Select a provincial election above"} />
        {selectedElection && (
          <Toolbar
            left={<SearchInput value={search} onChange={setSearch} placeholder="Search nominations..." />}
            right={<Btn small onClick={() => setShowForm(!showForm)}><Plus size={13} /> {showForm ? "Cancel" : "New nomination"}</Btn>}
          />
        )}
        {showForm && selectedElection && (
          <div style={{ padding: 20, borderBottom: `1px solid ${T.borderLight}`, background: T.surfaceAlt }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 12 }}>
              <label style={lbl}>Constituency *<select style={sel} value={form.contest_id} onChange={e => setForm({ ...form, contest_id: e.target.value })}><option value="">Select constituency</option>{contests.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
              <label style={lbl}>Party<select style={sel} value={form.party_id} onChange={e => { const np = e.target.value; const cur = profiles.find(c => String(c.id) === form.candidate_id); const ok = cur && (!np || String(cur.party_id) === np); setForm({ ...form, party_id: np, candidate_id: ok ? form.candidate_id : "" }); }}><option value="">Independent / All</option>{(parties || []).filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.name} ({p.abbreviation})</option>)}</select></label>
              <label style={lbl}>Candidate *<select style={sel} value={form.candidate_id} onChange={e => setForm({ ...form, candidate_id: e.target.value })}><option value="">Select candidate</option>{(profiles || []).filter(c => c.is_active && (!form.party_id || String(c.party_id) === form.party_id)).map(p => <option key={p.id} value={p.id}>{p.full_name}{p.party_id ? ` (${partyMap[p.party_id]?.abbreviation || ""})` : " (Independent)"}</option>)}</select></label>
            </div>
            <Btn onClick={handleCreate} loading={saving}>Create nomination</Btn>
          </div>
        )}
        {!selectedElection ? (
          <div style={{ padding: 40, textAlign: "center" }}><EmptyState icon={UserPlus} title="No election selected" message="Select a provincial election above to view and manage nominations." /></div>
        ) : nomLoading ? (
          <div style={{ padding: 24 }}><TableSkeleton rows={4} cols={5} /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 24 }}><EmptyState icon={UserPlus} title="No nominations" message={search ? "No match for this search." : "Create the first nomination."} /></div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ background: T.surfaceAlt }}>
                <th style={thStyle}>Constituency</th><th style={thStyle}>Candidate</th><th style={thStyle}>Party</th><th style={thStyle}>Status</th><th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
              </tr></thead>
              <tbody>
                {filtered.map(n => {
                  const prof = profileMap[n.candidate_id]; const party = partyMap[n.party_id]; const contest = contestMap[n.contest_id];
                  return (
                    <tr key={n.id} style={{ transition: "background 0.12s" }} onMouseEnter={e => { e.currentTarget.style.background = T.surfaceAlt; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                      <td style={{ ...tdStyle, fontSize: 12, color: T.textSecondary }}>{contest?.title || `#${n.contest_id}`}</td>
                      <td style={{ ...tdStyle, fontWeight: 600, color: T.text }}>{prof?.full_name || `#${n.candidate_id}`}</td>
                      <td style={tdStyle}><span style={{ fontSize: 12, color: T.textSecondary }}>{party ? party.abbreviation : "Ind."}</span></td>
                      <td style={tdStyle}><AdminBadge map={NOM_MAP} status={n.status} /></td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end", flexWrap: "wrap" }}>
                          {n.status === "PENDING" && (<><Btn variant="success" small onClick={() => handleStatusChange(n, "APPROVED")}><Check size={12} /> Approve</Btn><Btn variant="danger" small onClick={() => handleStatusChange(n, "REJECTED")}><X size={12} /> Reject</Btn><Btn variant="ghost" small onClick={() => handleStatusChange(n, "WITHDRAWN")}>Withdraw</Btn><Btn variant="ghost" small onClick={() => setConfirmDel(n)} style={{ color: T.error }}><Trash2 size={13} /></Btn></>)}
                          {n.status === "APPROVED" && <Btn variant="ghost" small onClick={() => handleStatusChange(n, "WITHDRAWN")}>Withdraw</Btn>}
                          {n.status === "WITHDRAWN" && <Btn variant="ghost" small onClick={() => setConfirmDel(n)} style={{ color: T.error }}><Trash2 size={13} /> Delete</Btn>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={handleDelete}
        title="Delete nomination" body={`Delete nomination #${confirmDel?.id}? This action cannot be undone.`} confirmLabel="Delete" variant="danger" />
    </>
  );
}


/* ══════════════════════════════════════════════════════════════ */
/*  PR LISTS PANEL — provincial elections only                   */
/* ══════════════════════════════════════════════════════════════ */
function PRListsPanel({ setMsg }) {
  const { parties } = useParties();
  const { profiles } = useCandidateProfiles();
  const [elections, setElections] = useState([]);
  const [selectedElection, setSelectedElection] = useState("");
  const [submissions, setSubmissions] = useState([]);
  const [prLoading, setPRLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [listForm, setListForm] = useState({ party_id: "" });
  const [saving, setSaving] = useState(false);
  const [expandedSub, setExpandedSub] = useState(null);
  const [entries, setEntries] = useState({});
  const [entryForm, setEntryForm] = useState({});
  const [validation, setValidation] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [confirmSubmit, setConfirmSubmit] = useState(null);
  const [eligibleCandidates, setEligibleCandidates] = useState({});

  const partyMap = useMemo(() => Object.fromEntries((parties || []).map(p => [p.id, p])), [parties]);
  const profileMap = useMemo(() => Object.fromEntries((profiles || []).map(p => [p.id, p])), [profiles]);
  const usedPartyIds = useMemo(() => new Set(submissions.map(s => s.party_id)), [submissions]);

  useEffect(() => { (async () => { try { const d = await listElections(); setElections(d || []); } catch {} })(); }, []);

  const eligibleElections = useMemo(() =>
    (elections || []).filter(e =>
      e.government_level === "PROVINCIAL" &&
      ["NOMINATIONS_OPEN", "NOMINATIONS_CLOSED", "CANDIDATE_LIST_PUBLISHED"].includes(e.status)
    ), [elections]);

  const loadSubmissions = useCallback(async () => {
    if (!selectedElection) { setSubmissions([]); return; }
    setPRLoading(true);
    try { setSubmissions(await listPrSubmissions(selectedElection) || []); }
    catch { setSubmissions([]); } finally { setPRLoading(false); }
  }, [selectedElection]);
  useEffect(() => { loadSubmissions(); }, [loadSubmissions]);

  const loadEntries = async (subId) => {
    try { const data = await listPrEntries(subId); setEntries(prev => ({ ...prev, [subId]: Array.isArray(data) ? data : [] })); }
    catch { setEntries(prev => ({ ...prev, [subId]: [] })); }
  };
  const loadEligible = async (subId, partyId) => {
    if (!selectedElection || !partyId) return;
    try { const data = await listPrEligibleCandidates(selectedElection, partyId); setEligibleCandidates(prev => ({ ...prev, [subId]: Array.isArray(data) ? data : [] })); }
    catch { setEligibleCandidates(prev => ({ ...prev, [subId]: [] })); }
  };

  const handleExpand = (sub) => {
    if (expandedSub === sub.id) { setExpandedSub(null); setValidation(null); return; }
    setExpandedSub(sub.id);
    let parsed = null;
    if (sub.validation_snapshot) { try { parsed = JSON.parse(sub.validation_snapshot); } catch { parsed = null; } }
    setValidation(parsed);
    loadEntries(sub.id); loadEligible(sub.id, sub.party_id);
  };

  const handleCreateList = async () => {
    if (!listForm.party_id) { setMsg({ type: "error", text: "Party is required" }); return; }
    if (usedPartyIds.has(Number(listForm.party_id))) { setMsg({ type: "error", text: "This party already has a PR submission for the selected election" }); return; }
    setSaving(true);
    try { await createPrSubmission(selectedElection, { party_id: Number(listForm.party_id) }); setMsg({ type: "success", text: "PR submission created" }); setShowForm(false); setListForm({ party_id: "" }); loadSubmissions(); }
    catch (err) { setMsg({ type: "error", text: errMsg(err) }); } finally { setSaving(false); }
  };

  const handleAddEntry = async (subId) => {
    const f = entryForm[subId] || {};
    if (!f.candidate_id) { setMsg({ type: "error", text: "Candidate is required" }); return; }
    if (!f.list_position) { setMsg({ type: "error", text: "Position is required" }); return; }
    const pos = Number(f.list_position);
    if (!Number.isInteger(pos) || pos < 1) { setMsg({ type: "error", text: "Position must be a positive integer" }); return; }
    const subEntries = entries[subId] || [];
    if (subEntries.some(e => e.list_position === pos)) { setMsg({ type: "error", text: `Position ${pos} is already occupied` }); return; }
    if (subEntries.some(e => String(e.candidate_id) === String(f.candidate_id))) { setMsg({ type: "error", text: "Candidate is already in this list" }); return; }
    try {
      await addPrEntry(subId, { candidate_id: Number(f.candidate_id), list_position: pos });
      setMsg({ type: "success", text: "Entry added" }); setEntryForm(p => ({ ...p, [subId]: {} }));
      loadEntries(subId); loadSubmissions();
      const sub = submissions.find(s => s.id === subId); if (sub) loadEligible(subId, sub.party_id);
    } catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
  };
  const handleRemoveEntry = async (subId, entryId) => {
    try { await removePrEntry(subId, entryId); setMsg({ type: "success", text: "Entry removed" }); loadEntries(subId); loadSubmissions(); const sub = submissions.find(s => s.id === subId); if (sub) loadEligible(subId, sub.party_id); }
    catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
  };
  const handleValidate = async (sub) => {
    try { const res = await validatePrList(sub.id); setValidation(res); setMsg({ type: res.valid ? "success" : "error", text: res.valid ? "List is valid" : "Validation failed — see details below" }); loadSubmissions(); }
    catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
  };
  const handleSubmit = async () => {
    if (!confirmSubmit) return;
    try { await submitPrList(confirmSubmit.id); setMsg({ type: "success", text: "PR list submitted for review" }); loadSubmissions(); }
    catch (err) { setMsg({ type: "error", text: errMsg(err) }); } finally { setConfirmSubmit(null); }
  };
  const handleReview = async (sub, action) => {
    try { await reviewPrSubmission(sub.id, { action }); setMsg({ type: "success", text: `Submission ${action}${action === "reopen" ? "ed" : "d"}` }); loadSubmissions(); }
    catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
  };
  const handleDeleteSub = async () => {
    if (!confirmDel) return;
    try { await deletePrSubmission(confirmDel.id); setMsg({ type: "success", text: "Submission deleted" }); loadSubmissions(); }
    catch (err) { setMsg({ type: "error", text: errMsg(err) }); } finally { setConfirmDel(null); }
  };

  const draftCount = submissions.filter(s => s.status === "DRAFT").length;
  const submittedCount = submissions.filter(s => s.status === "SUBMITTED").length;
  const approvedCount = submissions.filter(s => s.status === "APPROVED").length;
  const selectedElObj = elections.find(e => String(e.id) === String(selectedElection));
  const provinceLabel = selectedElObj?.province_code ? `Province ${selectedElObj.province_code.replace("P", "")} — ${PROVINCE_NAMES[selectedElObj.province_code] || ""}` : null;

  return (
    <>
      <div style={{ display: "flex", gap: 12, marginBottom: T.space.xl }}>
        <label style={{ ...lbl, minWidth: 240, flex: 1, maxWidth: 500 }}>Provincial Election
          <select style={sel} value={selectedElection} onChange={e => { setSelectedElection(e.target.value); setExpandedSub(null); }}>
            <option value="">Select provincial election</option>
            {eligibleElections.map(e => <option key={e.id} value={e.id}>{e.title} [{e.province_code}] — {e.status.replace(/_/g, " ")}</option>)}
          </select>
        </label>
      </div>

      {provinceLabel && (
        <div style={{ background: T.purpleBg || "#F5F3FF", border: `1px solid ${(T.purple || "#7C3AED") + "30"}`, borderRadius: T.radius.md, padding: "10px 16px", marginBottom: T.space.lg, fontSize: 13, fontWeight: 600, color: T.purple || "#7C3AED", display: "flex", alignItems: "center", gap: 8 }}>
          <Building2 size={14} /> {provinceLabel}
        </div>
      )}

      {selectedElection && (
        <KPIRow items={[
          { label: "Total submissions", value: submissions.length, accent: T.navy },
          { label: "Draft", value: draftCount, accent: T.warn },
          { label: "Submitted", value: submittedCount, accent: T.accent },
          { label: "Approved", value: approvedCount, accent: T.success },
        ]} />
      )}

      <SectionCard style={{ border: `1px solid ${T.borderStrong}` }}>
        <SectionHeader icon={ListOrdered} iconColor={T.accent} title="Provincial PR Submissions"
          subtitle={selectedElection ? "Party list submissions for provincial proportional representation" : "Select a provincial election above"} />
        {selectedElection && (
          <Toolbar left={<span style={{ fontSize: 12, color: T.muted }}>{submissions.length} submission{submissions.length !== 1 ? "s" : ""}</span>}
            right={<Btn small onClick={() => setShowForm(!showForm)}><Plus size={13} /> {showForm ? "Cancel" : "New submission"}</Btn>} />
        )}
        {showForm && selectedElection && (
          <div style={{ padding: 20, borderBottom: `1px solid ${T.borderLight}`, background: T.surfaceAlt }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
              <label style={{ ...lbl, minWidth: 200, flex: 1 }}>Party *
                <select style={sel} value={listForm.party_id} onChange={e => setListForm({ ...listForm, party_id: e.target.value })}>
                  <option value="">Select party</option>
                  {(parties || []).filter(p => !usedPartyIds.has(p.id)).map(p => <option key={p.id} value={p.id}>{p.name} ({p.abbreviation})</option>)}
                </select>
              </label>
              <Btn onClick={handleCreateList} loading={saving}>Create submission</Btn>
            </div>
            {(parties || []).length > 0 && (parties || []).filter(p => !usedPartyIds.has(p.id)).length === 0 && (
              <p style={{ margin: "8px 0 0", fontSize: 12, color: T.warn }}>All parties already have a PR submission for this election.</p>
            )}
          </div>
        )}
        {!selectedElection ? (
          <div style={{ padding: 40, textAlign: "center" }}><EmptyState icon={ListOrdered} title="No election selected" message="Select a provincial election to view and manage PR submissions." /></div>
        ) : prLoading ? (
          <div style={{ padding: 24 }}><TableSkeleton rows={3} cols={4} /></div>
        ) : submissions.length === 0 ? (
          <div style={{ padding: 24 }}><EmptyState icon={ListOrdered} title="No PR submissions" message="Create the first PR submission for this election." /></div>
        ) : (
          <div style={{ padding: "12px 20px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            {submissions.map(sub => {
              const party = partyMap[sub.party_id]; const isOpen = expandedSub === sub.id;
              const ef = entryForm[sub.id] || {}; const subEntries = Array.isArray(entries[sub.id]) ? entries[sub.id] : [];
              const isEditable = sub.status === "DRAFT" || sub.status === "INVALID";
              const subEntryIds = new Set(subEntries.map(e => e.candidate_id));
              const availableCandidates = (eligibleCandidates[sub.id] || []).filter(c => !subEntryIds.has(c.id));
              return (
                <div key={sub.id} style={{ border: `1px solid ${isOpen ? T.accent + "40" : T.borderLight}`, borderRadius: T.radius.lg, background: isOpen ? T.surface : T.surfaceAlt, transition: "border-color 0.18s, background 0.18s" }}>
                  <button onClick={() => handleExpand(sub)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "14px 18px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                    {isOpen ? <ChevronUp size={14} color={T.accent} /> : <ChevronDown size={14} color={T.muted} />}
                    <span style={{ fontWeight: 700, fontSize: 14, color: T.text, flex: 1 }}>{party?.name || `Party #${sub.party_id}`}</span>
                    <AdminBadge map={PR_MAP} status={sub.status} />
                    <span style={{ fontSize: 11, fontWeight: 700, background: T.accentLight, color: T.accent, padding: "2px 8px", borderRadius: 6 }}>{subEntries.length} entries</span>
                  </button>
                  {isOpen && <PRSubmissionDetail sub={sub} subEntries={subEntries} ef={ef} isEditable={isEditable} availableCandidates={availableCandidates}
                    profileMap={profileMap} validation={validation} expandedSub={expandedSub} setEntryForm={setEntryForm} handleAddEntry={handleAddEntry}
                    handleRemoveEntry={handleRemoveEntry} handleValidate={handleValidate} handleReview={handleReview}
                    setConfirmSubmit={setConfirmSubmit} setConfirmDel={setConfirmDel} />}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={handleDeleteSub}
        title="Delete PR submission" body="Delete this PR submission? All entries will be lost." confirmLabel="Delete" variant="danger" />
      <ConfirmDialog open={!!confirmSubmit} onClose={() => setConfirmSubmit(null)} onConfirm={handleSubmit}
        title="Submit PR list" body="Validate and submit this PR list for review? It cannot be edited once submitted." confirmLabel="Submit" />
    </>
  );
}


/* ── Error Boundary ── */
class PRSubmissionErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return (
      <div style={{ padding: "14px 18px", borderTop: `1px solid ${T.borderLight}`, background: T.errorBg, borderRadius: `0 0 ${T.radius.lg} ${T.radius.lg}` }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}><AlertTriangle size={14} color={T.error} /><span style={{ fontWeight: 700, fontSize: 13, color: T.error }}>Unable to render submission details</span></div>
        <p style={{ fontSize: 12, color: T.muted, margin: 0 }}>This submission may contain invalid data. Try reopening or deleting it.</p>
      </div>
    );
    return this.props.children;
  }
}

function PRSubmissionDetail({ sub, subEntries, ef, isEditable, availableCandidates, profileMap, validation, expandedSub, setEntryForm, handleAddEntry, handleRemoveEntry, handleValidate, handleReview, setConfirmSubmit, setConfirmDel }) {
  const safeEntries = Array.isArray(subEntries) ? subEntries : [];
  const noCandidatesAvailable = availableCandidates.length === 0;
  return (
    <PRSubmissionErrorBoundary>
      <div style={{ padding: "4px 18px 18px", borderTop: `1px solid ${T.borderLight}` }}>
        {safeEntries.length > 0 ? (
          <div style={{ overflowX: "auto", marginBottom: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ background: T.surfaceAlt }}><th style={thStyle}>Pos</th><th style={thStyle}>Candidate</th><th style={thStyle}>Gender</th><th style={thStyle}>DOB</th><th style={{ ...thStyle, width: 50 }} /></tr></thead>
              <tbody>
                {[...safeEntries].sort((a, b) => (a.list_position || 0) - (b.list_position || 0)).map(entry => {
                  if (!entry?.id) return null; const prof = profileMap[entry.candidate_id];
                  return (
                    <tr key={entry.id}>
                      <td style={{ ...tdStyle, fontFamily: "monospace", fontWeight: 700, color: T.accent }}>{entry.list_position ?? "—"}</td>
                      <td style={{ ...tdStyle, fontWeight: 600, color: T.text }}>{prof?.full_name || `#${entry.candidate_id}`}</td>
                      <td style={{ ...tdStyle, fontSize: 12, color: T.muted }}>{prof?.gender || "—"}</td>
                      <td style={{ ...tdStyle, fontSize: 12, color: T.muted }}>{prof?.date_of_birth || "—"}</td>
                      <td style={tdStyle}>{isEditable && <Btn variant="ghost" small onClick={() => handleRemoveEntry(sub.id, entry.id)} style={{ color: T.error }}><Trash2 size={13} /></Btn>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <p style={{ margin: "8px 0 12px", fontSize: 12, color: T.muted, fontStyle: "italic" }}>No entries yet</p>}

        {isEditable && (
          <div style={{ marginBottom: 14 }}>
            {noCandidatesAvailable ? (
              <div style={{ padding: "10px 14px", borderRadius: T.radius.md, background: T.warnBg, border: `1px solid ${T.warn}20`, fontSize: 12, color: T.warn }}>
                <AlertTriangle size={13} style={{ verticalAlign: "middle", marginRight: 6 }} />No eligible candidates available for this party.
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                <label style={{ ...lbl, flex: 1, minWidth: 140 }}>Candidate<select style={sel} value={ef.candidate_id || ""} onChange={e => setEntryForm(p => ({ ...p, [sub.id]: { ...ef, candidate_id: e.target.value } }))}><option value="">Select candidate</option>{availableCandidates.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select></label>
                <label style={{ ...lbl, width: 90 }}>Position<input style={inp} type="number" min={1} value={ef.list_position || ""} onChange={e => setEntryForm(p => ({ ...p, [sub.id]: { ...ef, list_position: e.target.value } }))} /></label>
                <Btn small onClick={() => handleAddEntry(sub.id)}><Plus size={13} /> Add</Btn>
              </div>
            )}
          </div>
        )}

        {validation && expandedSub === sub.id && (
          <div style={{ padding: "12px 14px", borderRadius: T.radius.md, marginBottom: 12, background: validation.valid ? T.successBg : T.errorBg, border: `1px solid ${validation.valid ? (T.successBorder || T.success + "30") : (T.errorBorder || T.error + "30")}` }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: validation.valid ? T.success : T.error, marginBottom: 4 }}>{validation.valid ? "✓ List is valid" : "✗ Validation failed"}</div>
            {Array.isArray(validation.errors) && validation.errors.length > 0 && <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 12, color: T.error }}>{validation.errors.map((e, i) => <li key={i}>{typeof e === "string" ? e : (e?.message || JSON.stringify(e))}</li>)}</ul>}
            {Array.isArray(validation.warnings) && validation.warnings.length > 0 && <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 12, color: T.warn }}>{validation.warnings.map((w, i) => <li key={i}>{typeof w === "string" ? w : (w?.message || JSON.stringify(w))}</li>)}</ul>}
          </div>
        )}

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Btn variant="secondary" small onClick={() => handleValidate(sub)}><Shield size={13} /> Validate</Btn>
          {(sub.status === "DRAFT" || sub.status === "VALID" || sub.status === "INVALID") && <Btn variant="primary" small onClick={() => setConfirmSubmit(sub)}>Submit for review</Btn>}
          {sub.status === "SUBMITTED" && (<><Btn variant="success" small onClick={() => handleReview(sub, "approve")}><Check size={12} /> Approve</Btn><Btn variant="danger" small onClick={() => handleReview(sub, "reject")}><X size={12} /> Reject</Btn></>)}
          {(sub.status === "REJECTED" || sub.status === "INVALID") && <Btn variant="ghost" small onClick={() => handleReview(sub, "reopen")}><RotateCcw size={12} /> Reopen</Btn>}
          {(sub.status === "DRAFT" || sub.status === "INVALID") && <Btn variant="ghost" small onClick={() => setConfirmDel(sub)} style={{ color: T.error }}><Trash2 size={13} /> Delete</Btn>}
        </div>
      </div>
    </PRSubmissionErrorBoundary>
  );
}


/* ── Shared table styles ── */
const thStyle = { padding: "10px 14px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: T.muted, borderBottom: `2px solid ${T.borderLight}`, textAlign: "left" };
const tdStyle = { padding: "12px 14px", fontSize: 13, borderBottom: `1px solid ${T.borderLight}` };
