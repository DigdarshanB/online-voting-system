import React, { useState, useMemo, useEffect, useCallback, useId, Component, useRef } from "react";
import {
  Users, UserPlus, Plus, Trash2, Check, X,
  AlertTriangle, Shield, Search, Camera, FileText, Pencil, MapPin, Grid, List, Loader2,
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

const TABS = [
  { key: "candidates", label: "Candidate Profiles", icon: Users, sublabel: "Local registry" },
  { key: "nominations", label: "Nominations", icon: UserPlus, sublabel: "Election-scoped" },
];

/* All local contest types — no PR in local elections */
const LOCAL_CONTEST_TYPES = [
  "MAYOR", "DEPUTY_MAYOR", "WARD_CHAIR",
  "WARD_WOMAN_MEMBER", "WARD_DALIT_WOMAN", "WARD_MEMBER_OPEN",
];

const CONTEST_TYPE_LABELS = {
  MAYOR: "Mayor",
  DEPUTY_MAYOR: "Deputy Mayor",
  WARD_CHAIR: "Ward Chair",
  WARD_WOMAN_MEMBER: "Ward Woman Member",
  WARD_DALIT_WOMAN: "Ward Dalit Woman Member",
  WARD_MEMBER_OPEN: "Ward Member (Open)",
};

/* ── Form helpers ── */
const lbl = { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 600, color: T.textSecondary };
const inp = { padding: "8px 12px", borderRadius: T.radius.md, border: `1px solid ${T.border}`, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box", background: T.surface, color: T.text };
const sel = { ...inp, cursor: "pointer" };

const accentColor = T.orange || "#EA580C";
const accentBg = T.orangeBg || "#FFF7ED";

function calcAge(dob) {
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}


/* ══════════════════════════════════════════════════════════════ */
/*  MAIN PAGE                                                    */
/* ══════════════════════════════════════════════════════════════ */
export default function ManageLocalCandidatesPage() {
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
        <MapPin size={16} color={accentColor} style={{ marginTop: 2, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.navy }}>
            Local candidates workspace
          </span>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: T.muted, lineHeight: 1.5 }}>
            <strong>Candidate profiles</strong> are shared master data.{" "}
            <strong>Nominations</strong> are scoped to individual local elections — covering Mayor, Deputy Mayor, Ward Chair, and ward-level member contests across all 753 local bodies.
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
    <div role="tablist" aria-label="Local candidates workspace" onKeyDown={handleKeyDown}
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
              border: active ? `1.5px solid ${accentColor}` : "1.5px solid transparent",
              background: active ? accentBg : "transparent",
              boxShadow: active ? `0 2px 8px ${accentColor}15, ${T.shadow.sm}` : "none",
              cursor: "pointer", transition: "all 0.18s ease", flex: "1 1 auto", minWidth: 0, outline: "none",
            }}
            onFocus={e => { if (!active) e.currentTarget.style.boxShadow = T.focusRing; }}
            onBlur={e => { if (!active) e.currentTarget.style.boxShadow = "none"; }}
            onMouseEnter={e => { if (!active) { e.currentTarget.style.background = T.surface + "80"; e.currentTarget.style.borderColor = T.borderLight; } }}
            onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; } }}
          >
            <div style={{ width: 32, height: 32, borderRadius: T.radius.md, background: active ? accentBg : T.borderLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon size={15} color={active ? accentColor : T.muted} strokeWidth={2} />
            </div>
            <div style={{ textAlign: "left", minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: active ? 700 : 600, color: active ? accentColor : T.textSecondary, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.label}</div>
              <span style={{ fontSize: 10, fontWeight: 600, color: active ? accentColor : T.muted, letterSpacing: "0.02em" }}>{t.sublabel}</span>
            </div>
            {active && <span style={{ width: 6, height: 6, borderRadius: "50%", background: accentColor, flexShrink: 0, marginLeft: "auto" }} />}
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
        <div key={i} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius.lg, padding: "18px 20px", borderLeft: `3px solid ${item.accent || accentColor}` }}>
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
/*  CANDIDATES PANEL — local registry                            */
/* ══════════════════════════════════════════════════════════════ */
function CandidatesPanel({ setMsg }) {
  const { parties } = useParties();
  const { profiles, loading, reload } = useCandidateProfiles({ governmentLevel: "LOCAL" });
  const [viewMode, setViewMode] = useState("grid");
  const [partyFilter, setPartyFilter] = useState("");
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
    let list = profiles;
    if (partyFilter) {
      if (partyFilter === "__independent__") {
        list = list.filter(c => !c.party_id);
      } else {
        list = list.filter(c => String(c.party_id) === partyFilter);
      }
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(c => {
      const pName = partyMap[c.party_id]?.name || "";
      return c.full_name.toLowerCase().includes(q) || pName.toLowerCase().includes(q);
    });
  }, [profiles, search, partyMap, partyFilter]);

  const handleCreate = async () => {
    if (!form.full_name.trim()) { setMsg({ type: "error", text: "Full name is required" }); return; }
    setSaving(true);
    const payload = { ...form, party_id: form.party_id ? Number(form.party_id) : null, gender: form.gender || null, date_of_birth: form.date_of_birth || null, government_level: "LOCAL" };
    try {
      await createProfile(payload);
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
        { label: "Parties represented", value: partyCount, accent: accentColor },
      ]} />
      <SectionCard style={{ border: `1px solid ${T.borderStrong}` }}>
        <SectionHeader icon={Users} iconColor={T.navy} title="Candidate Profiles" subtitle="Local candidate registry — Municipal & Village Elections" />
        <div className="admin-toolbar" style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 10, padding: "12px 20px", borderBottom: `1px solid ${T.borderLight}`,
          flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0, flexWrap: "wrap" }}>
            <SearchInput value={search} onChange={setSearch} placeholder="Search candidates…" />
            <select value={partyFilter} onChange={e => setPartyFilter(e.target.value)}
              style={{ padding: "7px 12px", borderRadius: T.radius.md, border: `1px solid ${T.border}`, fontSize: 12, fontWeight: 600, color: T.textSecondary, background: T.surface, cursor: "pointer", outline: "none" }}>
              <option value="">All parties</option>
              <option value="__independent__">Independent</option>
              {(parties || []).map(p => <option key={p.id} value={String(p.id)}>{p.abbreviation} — {p.name}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <Btn small onClick={() => setShowForm(s => !s)}><Plus size={13} /> {showForm ? "Cancel" : "Add Candidate"}</Btn>
            <div style={{ display: "flex", borderRadius: T.radius.md, border: `1px solid ${T.border}`, overflow: "hidden" }}>
              <button onClick={() => setViewMode("grid")} title="Grid view"
                style={{ padding: "6px 10px", background: viewMode === "grid" ? accentBg : T.surface, border: "none", borderRight: `1px solid ${T.border}`, cursor: "pointer", color: viewMode === "grid" ? accentColor : T.muted, transition: "all 0.15s" }}>
                <Grid size={15} />
              </button>
              <button onClick={() => setViewMode("list")} title="List view"
                style={{ padding: "6px 10px", background: viewMode === "list" ? accentBg : T.surface, border: "none", cursor: "pointer", color: viewMode === "list" ? accentColor : T.muted, transition: "all 0.15s" }}>
                <List size={15} />
              </button>
            </div>
          </div>
        </div>
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
          viewMode === "grid" ? (
            <div style={{ padding: 20, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{ borderRadius: T.radius.lg, overflow: "hidden", border: `1px solid ${T.borderLight}` }}>
                  <div style={{ aspectRatio: "4/3", background: T.surfaceAlt }} />
                  <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ height: 14, background: T.borderLight, borderRadius: 6, width: "70%" }} />
                    <div style={{ height: 10, background: T.borderLight, borderRadius: 6, width: "40%" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: 24 }}><TableSkeleton rows={4} cols={5} /></div>
          )
        ) : filtered.length === 0 ? (
          <div style={{ padding: 32 }}><EmptyState icon={Users} title="No candidate profiles" message={search || partyFilter ? "No match for the current filters." : "Create the first candidate profile."} /></div>
        ) : viewMode === "grid" ? (
          <div className="admin-candidate-grid" style={{ padding: 20, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
            {filtered.map(c => (
              <CandidateCard key={c.id} candidate={c} party={partyMap[c.party_id]} uploading={uploading[c.id]}
                onEdit={handleStartEdit} onDelete={setConfirmDel} onPhotoUpload={handlePhotoUpload} onPhotoRemove={handlePhotoRemove} />
            ))}
          </div>
        ) : (
          <div className="admin-table-wrap" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: T.surfaceAlt, position: "sticky", top: 0, zIndex: 10 }}>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Party</th>
                  <th style={thStyle}>Gender</th>
                  <th style={thStyle}>DOB</th>
                  <th style={thStyle}>Citizenship</th>
                  <th style={{ ...thStyle, width: 100, textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, idx) => {
                  const party = partyMap[c.party_id];
                  return (
                    <tr key={c.id}
                      style={{ background: idx % 2 === 0 ? T.surface : T.surfaceAlt, transition: "background 0.1s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = accentBg + "88"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = idx % 2 === 0 ? T.surface : T.surfaceAlt; }}>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, overflow: "hidden",
                            background: c.photo_path ? "transparent" : `linear-gradient(135deg, ${T.navy} 0%, ${accentColor} 100%)`,
                            display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {c.photo_path
                              ? <img src={imageUrl(c.photo_path)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              : <span style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>{c.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}</span>
                            }
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: T.text, lineHeight: 1.3 }}>{c.full_name}</div>
                            {c.citizenship_no && <div style={{ fontSize: 11, color: T.muted, fontFamily: "monospace" }}>{c.citizenship_no}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        {party ? (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: accentBg, color: accentColor }}>{party.abbreviation}</span>
                        ) : (
                          <span style={{ fontSize: 12, color: T.muted }}>Independent</span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, fontSize: 12, color: T.muted }}>{c.gender ? c.gender.charAt(0) + c.gender.slice(1).toLowerCase() : "—"}</td>
                      <td style={{ ...tdStyle, fontSize: 12, color: T.muted }}>{c.date_of_birth || "—"}</td>
                      <td style={{ ...tdStyle, fontSize: 11, color: T.muted, fontFamily: "monospace" }}>{c.citizenship_no || "—"}</td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                          <Btn variant="ghost" small onClick={() => handleStartEdit(c)} style={{ color: accentColor }}><Pencil size={13} /></Btn>
                          <Btn variant="ghost" small onClick={() => setConfirmDel(c)} style={{ color: T.error }}><Trash2 size={13} /></Btn>
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
/*  CANDIDATE CARD — local                                       */
/* ══════════════════════════════════════════════════════════════ */
function CandidateCard({ candidate, party, uploading, onEdit, onDelete, onPhotoUpload, onPhotoRemove }) {
  const [photoHovered, setPhotoHovered] = useState(false);
  const fileRef = useRef(null);
  const age = calcAge(candidate.date_of_birth);
  const photo = imageUrl(candidate.photo_path);
  const initials = candidate.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div
      style={{ background: T.surface, borderRadius: T.radius.xl, border: `1px solid ${T.border}`, overflow: "hidden", boxShadow: T.shadow.sm, transition: "box-shadow 0.18s, transform 0.18s", animation: "adminFadeIn 0.2s ease" }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = T.shadow.md; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = T.shadow.sm; e.currentTarget.style.transform = "none"; }}
    >
      <div
        style={{ position: "relative", aspectRatio: "4/3", overflow: "hidden", cursor: "pointer" }}
        onMouseEnter={() => setPhotoHovered(true)}
        onMouseLeave={() => setPhotoHovered(false)}
        onClick={() => fileRef.current?.click()}
      >
        {photo ? (
          <img src={photo} alt={candidate.full_name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg, ${T.navy} 0%, ${accentColor} 100%)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 36, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>{initials}</span>
          </div>
        )}
        {photoHovered && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.55)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, animation: "adminFadeIn 0.12s ease" }}>
            {uploading
              ? <Loader2 size={22} color="#fff" style={{ animation: "adminSpin 0.8s linear infinite" }} />
              : <><Camera size={20} color="#fff" /><span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>Change Photo</span></>
            }
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
          onChange={e => { const f = e.target.files?.[0]; if (f) onPhotoUpload(candidate, f); e.target.value = ""; }} />
      </div>
      <div style={{ padding: "14px 16px" }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: T.text, lineHeight: 1.3, marginBottom: 6 }}>{candidate.full_name}</div>
        <div style={{ marginBottom: 8 }}>
          {party ? (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: accentBg, color: accentColor, letterSpacing: "0.03em" }}>{party.abbreviation}</span>
          ) : (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: T.surfaceAlt, color: T.muted, letterSpacing: "0.03em" }}>Independent</span>
          )}
        </div>
        {(candidate.gender || age) && (
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 4 }}>
            {[candidate.gender ? candidate.gender.charAt(0) + candidate.gender.slice(1).toLowerCase() : null, age ? `${age} yrs` : null].filter(Boolean).join(" · ")}
          </div>
        )}
        {candidate.citizenship_no && (
          <div style={{ fontSize: 11, fontFamily: "monospace", color: T.muted, marginBottom: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{candidate.citizenship_no}</div>
        )}
        <div style={{ height: 1, background: T.borderLight, margin: "10px 0" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around" }}>
          <Btn variant="ghost" small onClick={() => onEdit(candidate)} title="Edit profile" style={{ color: accentColor }}><Pencil size={14} /></Btn>
          <Btn variant="ghost" small onClick={() => fileRef.current?.click()} title="Change photo" style={{ color: T.muted }}><Camera size={14} /></Btn>
          {candidate.photo_path && <Btn variant="ghost" small onClick={() => onPhotoRemove(candidate)} title="Remove photo" style={{ color: T.muted }}><X size={14} /></Btn>}
          <Btn variant="ghost" small onClick={() => onDelete(candidate)} title="Delete profile" style={{ color: T.error }}><Trash2 size={14} /></Btn>
        </div>
      </div>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════ */
/*  NOMINATIONS PANEL — local elections only                     */
/* ══════════════════════════════════════════════════════════════ */
function NominationsPanel({ setMsg }) {
  const { parties } = useParties();
  const { profiles } = useCandidateProfiles({ governmentLevel: "LOCAL" });
  const [elections, setElections] = useState([]);
  const [selectedElection, setSelectedElection] = useState("");
  const [contests, setContests] = useState([]);
  const [selectedContest, setSelectedContest] = useState("");
  const [contestTypeFilter, setContestTypeFilter] = useState("");
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
      e.government_level === "LOCAL" &&
      ["NOMINATIONS_OPEN", "NOMINATIONS_CLOSED", "CANDIDATE_LIST_PUBLISHED"].includes(e.status)
    ), [elections]);

  useEffect(() => {
    if (!selectedElection) { setContests([]); return; }
    (async () => {
      try {
        const all = await listContests(selectedElection);
        setContests((all || []).filter(c => LOCAL_CONTEST_TYPES.includes(c.contest_type)));
      }
      catch { setContests([]); }
    })();
  }, [selectedElection]);

  /* Derived: contests visible in the dropdown after type filter */
  const visibleContests = useMemo(() => {
    if (!contestTypeFilter) return contests;
    return contests.filter(c => c.contest_type === contestTypeFilter);
  }, [contests, contestTypeFilter]);

  /* Count unique contest types available */
  const availableTypes = useMemo(() => {
    const types = [...new Set(contests.map(c => c.contest_type))];
    return LOCAL_CONTEST_TYPES.filter(t => types.includes(t));
  }, [contests]);

  const loadNominations = useCallback(async () => {
    if (!selectedElection) { setNominations([]); return; }
    setNomLoading(true);
    try { setNominations(await listFptpNominations(selectedElection, { contestId: selectedContest || undefined }) || []); }
    catch { setNominations([]); } finally { setNomLoading(false); }
  }, [selectedElection, selectedContest]);

  useEffect(() => { loadNominations(); }, [loadNominations]);

  /* Filter nominations by contest type when type filter is active */
  const typeFilteredNominations = useMemo(() => {
    if (!contestTypeFilter) return nominations;
    return nominations.filter(n => {
      const contest = contestMap[n.contest_id];
      return contest?.contest_type === contestTypeFilter;
    });
  }, [nominations, contestTypeFilter, contestMap]);

  const filtered = useMemo(() => {
    if (!search.trim()) return typeFilteredNominations;
    const q = search.toLowerCase();
    return typeFilteredNominations.filter(n => { const prof = profileMap[n.candidate_id]; return prof?.full_name?.toLowerCase().includes(q) || String(n.id).includes(q); });
  }, [typeFilteredNominations, search, profileMap]);

  const handleCreate = async () => {
    if (!form.contest_id || !form.candidate_id) { setMsg({ type: "error", text: "Contest and candidate are required" }); return; }
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

  const pendingCount = typeFilteredNominations.filter(n => n.status === "PENDING").length;
  const approvedCount = typeFilteredNominations.filter(n => n.status === "APPROVED").length;

  return (
    <>
      <div style={{ display: "flex", gap: 12, marginBottom: T.space.xl, flexWrap: "wrap" }}>
        <label style={{ ...lbl, minWidth: 200, flex: 1 }}>Local Election
          <select style={sel} value={selectedElection} onChange={e => { setSelectedElection(e.target.value); setSelectedContest(""); setContestTypeFilter(""); }}>
            <option value="">Select local election</option>
            {eligibleElections.map(e => <option key={e.id} value={e.id}>{e.title} — {e.status.replace(/_/g, " ")}</option>)}
          </select>
        </label>
        {selectedElection && availableTypes.length > 1 && (
          <label style={{ ...lbl, minWidth: 160, flex: "0 1 220px" }}>Contest type
            <select style={sel} value={contestTypeFilter} onChange={e => { setContestTypeFilter(e.target.value); setSelectedContest(""); }}>
              <option value="">All types</option>
              {availableTypes.map(t => <option key={t} value={t}>{CONTEST_TYPE_LABELS[t] || t}</option>)}
            </select>
          </label>
        )}
        {selectedElection && (
          <label style={{ ...lbl, minWidth: 200, flex: 1 }}>Contest filter
            <select style={sel} value={selectedContest} onChange={e => setSelectedContest(e.target.value)}>
              <option value="">All contests</option>
              {visibleContests.map(c => <option key={c.id} value={c.id}>{c.title} ({CONTEST_TYPE_LABELS[c.contest_type] || c.contest_type})</option>)}
            </select>
          </label>
        )}
      </div>

      {selectedElection && (
        <KPIRow items={[
          { label: "Total nominations", value: typeFilteredNominations.length, accent: T.navy },
          { label: "Pending review", value: pendingCount, accent: T.warn },
          { label: "Approved", value: approvedCount, accent: T.success },
          { label: "Contests", value: visibleContests.length, accent: accentColor },
        ]} />
      )}

      <SectionCard style={{ border: `1px solid ${T.borderStrong}` }}>
        <SectionHeader icon={UserPlus} iconColor={accentColor} title="Local Nominations"
          subtitle={selectedElection ? "Direct-election nominations for this local election" : "Select a local election above"} />
        {selectedElection && (
          <Toolbar
            left={<SearchInput value={search} onChange={setSearch} placeholder="Search nominations..." />}
            right={<Btn small onClick={() => setShowForm(!showForm)}><Plus size={13} /> {showForm ? "Cancel" : "New nomination"}</Btn>}
          />
        )}
        {showForm && selectedElection && (
          <div style={{ padding: 20, borderBottom: `1px solid ${T.borderLight}`, background: T.surfaceAlt }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 12 }}>
              <label style={lbl}>Contest *<select style={sel} value={form.contest_id} onChange={e => setForm({ ...form, contest_id: e.target.value })}><option value="">Select contest</option>{visibleContests.map(c => <option key={c.id} value={c.id}>{c.title} ({CONTEST_TYPE_LABELS[c.contest_type] || c.contest_type})</option>)}</select></label>
              <label style={lbl}>Party<select style={sel} value={form.party_id} onChange={e => { const np = e.target.value; const cur = profiles.find(c => String(c.id) === form.candidate_id); const ok = cur && (!np || String(cur.party_id) === np); setForm({ ...form, party_id: np, candidate_id: ok ? form.candidate_id : "" }); }}><option value="">Independent / All</option>{(parties || []).filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.name} ({p.abbreviation})</option>)}</select></label>
              <label style={lbl}>Candidate *<select style={sel} value={form.candidate_id} onChange={e => setForm({ ...form, candidate_id: e.target.value })}><option value="">Select candidate</option>{(profiles || []).filter(c => c.is_active && (!form.party_id || String(c.party_id) === form.party_id)).map(p => <option key={p.id} value={p.id}>{p.full_name}{p.party_id ? ` (${partyMap[p.party_id]?.abbreviation || ""})` : " (Independent)"}</option>)}</select></label>
            </div>
            <Btn onClick={handleCreate} loading={saving}>Create nomination</Btn>
          </div>
        )}
        {!selectedElection ? (
          <div style={{ padding: 40, textAlign: "center" }}><EmptyState icon={UserPlus} title="No election selected" message="Select a local election above to view and manage nominations." /></div>
        ) : nomLoading ? (
          <div style={{ padding: 24 }}><TableSkeleton rows={4} cols={6} /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 24 }}><EmptyState icon={UserPlus} title="No nominations" message={search ? "No match for this search." : "Create the first nomination."} /></div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ background: T.surfaceAlt }}>
                <th style={thStyle}>Contest</th><th style={thStyle}>Type</th><th style={thStyle}>Candidate</th><th style={thStyle}>Party</th><th style={thStyle}>Status</th><th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
              </tr></thead>
              <tbody>
                {filtered.map(n => {
                  const prof = profileMap[n.candidate_id]; const party = partyMap[n.party_id]; const contest = contestMap[n.contest_id];
                  return (
                    <tr key={n.id} style={{ transition: "background 0.12s" }} onMouseEnter={e => { e.currentTarget.style.background = T.surfaceAlt; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                      <td style={{ ...tdStyle, fontSize: 12, color: T.textSecondary }}>{contest?.title || `#${n.contest_id}`}</td>
                      <td style={tdStyle}><span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: accentBg, color: accentColor, whiteSpace: "nowrap" }}>{CONTEST_TYPE_LABELS[contest?.contest_type] || contest?.contest_type || "—"}</span></td>
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


/* ── Shared table styles ── */
const thStyle = { padding: "10px 14px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: T.muted, borderBottom: `2px solid ${T.borderLight}`, textAlign: "left" };
const tdStyle = { padding: "12px 14px", fontSize: 13, borderBottom: `1px solid ${T.borderLight}` };
