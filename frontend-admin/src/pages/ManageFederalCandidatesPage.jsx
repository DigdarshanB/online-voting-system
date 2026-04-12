import React, { useState, useMemo, useEffect, useCallback, useId, Component, useRef } from "react";
import {
  Users, UserPlus, ListOrdered, Plus, Trash2, Check, X,
  ChevronDown, ChevronUp, AlertTriangle, Shield, RotateCcw,
  MoreHorizontal, Camera, FileText, Pencil, Grid, List, Loader2,
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
  { key: "candidates", label: "Candidate Profiles", icon: Users, sublabel: "Nominate Candidates" },
  { key: "nominations", label: "Nominations",       icon: UserPlus, sublabel: "Election-scoped" },
  { key: "prlists",    label: "PR Lists",           icon: ListOrdered, sublabel: "Election-scoped" },
];
const SINGLE_SEAT_TYPES = ["FPTP", "MAYOR", "DEPUTY_MAYOR"];

/* ── Form helpers ── */
const lbl = { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 600, color: T.textSecondary };
const inp = { padding: "8px 12px", borderRadius: T.radius.md, border: `1px solid ${T.border}`, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box", background: "#fff", color: T.text };
const sel = { ...inp, cursor: "pointer" };

/* ── Age calculation helper ── */
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
export default function ManageFederalCandidatesPage() {
  const [tab, setTab] = useState("candidates");
  const [msg, setMsg] = useState(null);
  const tablistId = useId();
  const { profiles } = useCandidateProfiles({ governmentLevel: "FEDERAL" });

  // Tab counts — candidates count is always available; others are election-scoped
  const tabCounts = {
    candidates: profiles.length,
    nominations: null,
    prlists: null,
  };

  return (
    <PageContainer>
      <AdminKeyframes />
      <Toast msg={msg} onClose={() => setMsg(null)} />

      {/* ── Workspace header (replaces context band + BackLink) ── */}
      <WorkspaceHeader />

      {/* ── Workspace tab switcher ── */}
      <WorkspaceTabs
        tabs={TABS}
        activeTab={tab}
        onSelect={setTab}
        id={tablistId}
        counts={tabCounts}
      />

      {/* ── Tab panels ── */}
      {TABS.map((t) => (
        <div
          key={t.key}
          role="tabpanel"
          id={`${tablistId}-panel-${t.key}`}
          aria-labelledby={`${tablistId}-tab-${t.key}`}
          hidden={tab !== t.key}
        >
          {tab === t.key && (
            <>
              {t.key === "candidates"  && <CandidatesPanel  setMsg={setMsg} />}
              {t.key === "nominations" && <NominationsPanel setMsg={setMsg} />}
              {t.key === "prlists"     && <PRListsPanel     setMsg={setMsg} />}
            </>
          )}
        </div>
      ))}
    </PageContainer>
  );
}


/* ══════════════════════════════════════════════════════════════ */
/*  WORKSPACE HEADER                                             */
/* ══════════════════════════════════════════════════════════════ */
function WorkspaceHeader() {
  return (
    <div style={{ marginBottom: T.space.xl }}>
      {/* Breadcrumb */}
      <BackLink to="/admin/manage-candidates" label="Candidate Management" />

      {/* Header row */}
      <div style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderLeft: `4px solid ${T.accent}`,
        borderRadius: T.radius.xl,
        padding: "20px 28px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 20, flexWrap: "wrap",
        boxShadow: T.shadow.sm,
      }}>
        {/* Left: icon + heading */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 48, height: 48, borderRadius: T.radius.lg, flexShrink: 0,
            background: T.accentLight, border: `1px solid ${T.accent}20`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <FileText size={22} color={T.accent} strokeWidth={2.2} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "clamp(17px, 2vw, 22px)", fontWeight: 800, color: T.navy, lineHeight: 1.2 }}>
              Federal Candidates Workspace
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: T.muted }}>
              Candidate profiles · Nominations · PR lists — all scoped to federal elections
            </p>
          </div>
        </div>
        {/* Right: accent badge */}
        <span style={{
          padding: "6px 14px", borderRadius: 20,
          fontSize: 11, fontWeight: 700,
          background: T.accentLight, color: T.accent,
          border: `1px solid ${T.accent}25`, whiteSpace: "nowrap",
        }}>
          House of Representatives
        </span>
      </div>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════ */
/*  WORKSPACE TABS (WAI Tabs — manual activation)               */
/* ══════════════════════════════════════════════════════════════ */
function WorkspaceTabs({ tabs, activeTab, onSelect, id, counts = {} }) {
  const [focusIdx, setFocusIdx] = useState(() => tabs.findIndex(t => t.key === activeTab));

  const handleKeyDown = (e) => {
    let next = focusIdx;
    if (e.key === "ArrowRight") { next = (focusIdx + 1) % tabs.length; e.preventDefault(); }
    else if (e.key === "ArrowLeft") { next = (focusIdx - 1 + tabs.length) % tabs.length; e.preventDefault(); }
    else if (e.key === "Home") { next = 0; e.preventDefault(); }
    else if (e.key === "End") { next = tabs.length - 1; e.preventDefault(); }
    else if (e.key === "Enter" || e.key === " ") { onSelect(tabs[focusIdx].key); e.preventDefault(); return; }
    if (next !== focusIdx) {
      setFocusIdx(next);
      document.getElementById(`${id}-tab-${tabs[next].key}`)?.focus();
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Federal candidates workspace"
      onKeyDown={handleKeyDown}
      className="admin-workspace-tabs"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${tabs.length}, 1fr)`,
        background: T.surfaceSubtle,
        borderRadius: T.radius.xl,
        border: `1px solid ${T.border}`,
        borderBottom: `2px solid ${T.border}`,
        marginBottom: T.space["2xl"],
        overflow: "hidden",
      }}
    >
      {tabs.map((t, i) => {
        const active = activeTab === t.key;
        const Icon = t.icon;
        const count = counts[t.key];
        return (
          <button
            key={t.key}
            role="tab"
            id={`${id}-tab-${t.key}`}
            aria-selected={active}
            aria-controls={`${id}-panel-${t.key}`}
            tabIndex={focusIdx === i ? 0 : -1}
            onClick={() => { setFocusIdx(i); onSelect(t.key); }}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "16px 20px",
              background: active ? T.surface : T.surfaceAlt,
              border: "none",
              borderBottom: active ? `3px solid ${T.accent}` : "3px solid transparent",
              borderRight: i < tabs.length - 1 ? `1px solid ${T.borderLight}` : "none",
              cursor: "pointer",
              transition: "all 0.18s ease",
              outline: "none",
              transform: "none",
              boxShadow: active ? T.shadow.sm : "none",
            }}
            onFocus={e => { if (!active) e.currentTarget.style.background = T.surface + "cc"; }}
            onBlur={e => { if (!active) e.currentTarget.style.background = T.surfaceAlt; }}
            onMouseEnter={e => { if (!active) { e.currentTarget.style.background = T.surface + "cc"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
            onMouseLeave={e => { if (!active) { e.currentTarget.style.background = T.surfaceAlt; e.currentTarget.style.transform = "none"; } }}
          >
            {/* Icon tile (40×40) */}
            <div className="admin-tab-icon" style={{
              width: 40, height: 40, borderRadius: T.radius.md,
              background: active ? T.accentLight : T.borderLight,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, transition: T.transition,
            }}>
              <Icon size={18} color={active ? T.accent : T.muted} strokeWidth={2} />
            </div>
            {/* Label + sublabel */}
            <div style={{ textAlign: "left", minWidth: 0, flex: 1 }}>
              <div className="admin-tab-label" style={{
                fontSize: 14, fontWeight: active ? 700 : 600,
                color: active ? T.accent : T.textSecondary,
                lineHeight: 1.3, whiteSpace: "nowrap",
                overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {t.label}
              </div>
              <span className="admin-tab-sublabel" style={{
                fontSize: 11, fontWeight: 500,
                color: active ? T.accent + "bb" : T.muted,
                letterSpacing: "0.01em",
              }}>
                {t.sublabel}
              </span>
            </div>
            {/* Count badge */}
            {count != null && (
              <span style={{
                padding: "2px 9px", borderRadius: 20,
                fontSize: 11, fontWeight: 700,
                background: active ? T.accentLight : T.surfaceSubtle,
                color: active ? T.accent : T.muted,
                border: `1px solid ${active ? T.accent + "25" : T.borderLight}`,
                flexShrink: 0,
              }}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════ */
/*  KPI ROW (redesigned — larger numbers, colored left border)   */
/* ══════════════════════════════════════════════════════════════ */
function KPIRow({ items }) {
  return (
    <div className="admin-kpi-row" style={{
      display: "grid",
      gridTemplateColumns: `repeat(auto-fit, minmax(150px, 1fr))`,
      gap: T.space.lg,
      marginBottom: T.space.xl,
    }}>
      {items.map((item, i) => (
        <div key={i} style={{
          background: T.surface, border: `1px solid ${T.border}`,
          borderRadius: T.radius.lg, padding: "18px 20px",
          borderLeft: `3px solid ${item.accent || T.accent}`,
          animation: "adminFadeIn 0.2s ease",
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: T.muted,
            textTransform: "uppercase", letterSpacing: "0.06em",
            marginBottom: 8,
          }}>
            {item.label}
          </div>
          <div className="admin-kpi-value" style={{
            fontSize: 32, fontWeight: 800, color: item.accent || T.text,
            lineHeight: 1,
          }}>
            {item.value}
          </div>
          {item.detail && (
            <div style={{ fontSize: 12, color: T.muted, marginTop: 5 }}>{item.detail}</div>
          )}
        </div>
      ))}
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════ */
/*  TOOLBAR                                                      */
/* ══════════════════════════════════════════════════════════════ */
function Toolbar({ left, right }) {
  return (
    <div className="admin-toolbar" style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 12, padding: "12px 24px", borderBottom: `1px solid ${T.borderLight}`,
      flexWrap: "wrap",
    }}>
      <div className="admin-toolbar-left" style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
        {left}
      </div>
      <div className="admin-toolbar-right" style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {right}
      </div>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════ */
/*  CANDIDATES PANEL — grid + list view toggle                  */
/* ══════════════════════════════════════════════════════════════ */
function CandidatesPanel({ setMsg }) {
  const { parties } = useParties();
  const { profiles, loading, reload } = useCandidateProfiles({ governmentLevel: "FEDERAL" });
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
    if (!form.full_name.trim()) {
      setMsg({ type: "error", text: "Full name is required" }); return;
    }
    setSaving(true);
    const payload = { ...form, party_id: form.party_id ? Number(form.party_id) : null, gender: form.gender || null, date_of_birth: form.date_of_birth || null, government_level: "FEDERAL" };
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
    catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
    finally { setConfirmDel(null); }
  };

  const handlePhotoUpload = async (c, file) => {
    setUploading(u => ({ ...u, [c.id]: true }));
    try { await uploadCandidatePhoto(c.id, file); setMsg({ type: "success", text: "Photo uploaded" }); reload(); }
    catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
    finally { setUploading(u => ({ ...u, [c.id]: false })); }
  };

  const handlePhotoRemove = async (c) => {
    setUploading(u => ({ ...u, [c.id]: true }));
    try { await removeCandidatePhoto(c.id); setMsg({ type: "success", text: "Photo removed" }); reload(); }
    catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
    finally { setUploading(u => ({ ...u, [c.id]: false })); }
  };

  const handleStartEdit = (c) => {
    setEditCandidate(c);
    setEditForm({
      full_name: c.full_name || "",
      gender: c.gender || "",
      date_of_birth: c.date_of_birth || "",
      address: c.address || "",
      citizenship_no: c.citizenship_no || "",
      party_id: c.party_id ? String(c.party_id) : "",
    });
  };

  const handleUpdate = async () => {
    if (!editCandidate) return;
    if (!editForm.full_name.trim()) {
      setMsg({ type: "error", text: "Full name is required" }); return;
    }
    setUpdating(true);
    try {
      await updateProfile(editCandidate.id, {
        full_name: editForm.full_name,
        gender: editForm.gender || null,
        date_of_birth: editForm.date_of_birth || null,
        address: editForm.address || null,
        citizenship_no: editForm.citizenship_no || null,
        party_id: editForm.party_id ? Number(editForm.party_id) : null,
      });
      setMsg({ type: "success", text: "Candidate profile updated" });
      setEditCandidate(null);
      reload();
    } catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
    finally { setUpdating(false); }
  };

  const withPhoto = profiles.filter(c => c.photo_path).length;
  const partyCount = [...new Set(profiles.map(c => c.party_id))].length;

  return (
    <>
      {/* KPI row */}
      <KPIRow items={[
        { label: "Total profiles", value: profiles.length, accent: T.navy },
        { label: "With photo", value: withPhoto, accent: T.success, detail: profiles.length > 0 ? `${Math.round(withPhoto / profiles.length * 100)}% coverage` : "—" },
        { label: "Parties represented", value: partyCount, accent: T.accent },
      ]} />

      {/* Main data card */}
      <SectionCard style={{ border: `1px solid ${T.borderStrong}` }}>
        <SectionHeader
          icon={Users} iconColor={T.navy}
          title="Candidate Profiles"
          subtitle="Federal candidate registry — House of Representatives"
        />

        {/* Toolbar: search + party filter + add + view toggle */}
        <div className="admin-toolbar" style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 10, padding: "12px 20px", borderBottom: `1px solid ${T.borderLight}`,
          flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0, flexWrap: "wrap" }}>
            <SearchInput value={search} onChange={setSearch} placeholder="Search candidates…" />
            {/* Party filter dropdown */}
            <select
              value={partyFilter}
              onChange={e => setPartyFilter(e.target.value)}
              style={{
                padding: "7px 12px", borderRadius: T.radius.md, border: `1px solid ${T.border}`,
                fontSize: 12, fontWeight: 600, color: T.textSecondary, background: T.surface,
                cursor: "pointer", outline: "none",
              }}
            >
              <option value="">All parties</option>
              <option value="__independent__">Independent</option>
              {(parties || []).map(p => (
                <option key={p.id} value={String(p.id)}>{p.abbreviation} — {p.name}</option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <Btn small onClick={() => setShowForm(s => !s)}>
              <Plus size={13} /> {showForm ? "Cancel" : "Add Candidate"}
            </Btn>
            {/* Grid/list toggle */}
            <div style={{
              display: "flex", borderRadius: T.radius.md,
              border: `1px solid ${T.border}`, overflow: "hidden",
            }}>
              <button
                onClick={() => setViewMode("grid")}
                title="Grid view"
                style={{
                  padding: "6px 10px", background: viewMode === "grid" ? T.accentLight : T.surface,
                  border: "none", borderRight: `1px solid ${T.border}`, cursor: "pointer",
                  color: viewMode === "grid" ? T.accent : T.muted, transition: "all 0.15s",
                }}
              >
                <Grid size={15} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                title="List view"
                style={{
                  padding: "6px 10px", background: viewMode === "list" ? T.accentLight : T.surface,
                  border: "none", cursor: "pointer",
                  color: viewMode === "list" ? T.accent : T.muted, transition: "all 0.15s",
                }}
              >
                <List size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Create form */}
        {showForm && (
          <div style={{ padding: 20, borderBottom: `1px solid ${T.borderLight}`, background: T.surfaceAlt, animation: "adminFadeInDown 0.18s ease" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 12 }}>
              <label style={lbl}>Full Name *<input style={inp} value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></label>
              <label style={lbl}>Gender
                <select style={sel} value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                  <option value="">—</option><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option>
                </select>
              </label>
              <label style={lbl}>Date of birth<input style={inp} type="date" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} /></label>
              <label style={lbl}>Citizenship No<input style={inp} value={form.citizenship_no} onChange={e => setForm({ ...form, citizenship_no: e.target.value })} /></label>
              <label style={lbl}>Address<input style={inp} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></label>
              <label style={lbl}>Party
                <select style={sel} value={form.party_id} onChange={e => setForm({ ...form, party_id: e.target.value })}>
                  <option value="">Independent</option>
                  {(parties || []).filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.name} ({p.abbreviation})</option>)}
                </select>
              </label>
            </div>
            <Btn onClick={handleCreate} loading={saving}>Create profile</Btn>
          </div>
        )}

        {/* Content area: grid or list */}
        {loading ? (
          viewMode === "grid" ? (
            <div style={{ padding: 20, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{ borderRadius: T.radius.lg, overflow: "hidden", border: `1px solid ${T.borderLight}` }}>
                  <div style={{ aspectRatio: "4/3", background: T.surfaceAlt }} />
                  <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ height: 14, background: T.borderLight, borderRadius: 6, width: "70%" }} />
                    <div style={{ height: 10, background: T.borderLight, borderRadius: 6, width: "40%" }} />
                    <div style={{ height: 10, background: T.borderLight, borderRadius: 6, width: "55%" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: 24 }}><TableSkeleton rows={4} cols={5} /></div>
          )
        ) : filtered.length === 0 ? (
          <div style={{ padding: 32 }}>
            <EmptyState icon={Users} title="No candidate profiles" message={search || partyFilter ? "No match for the current filters." : "Create the first candidate profile."} />
          </div>
        ) : viewMode === "grid" ? (
          /* ── Grid view ── */
          <div className="admin-candidate-grid" style={{
            padding: 20,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 16,
          }}>
            {filtered.map(c => (
              <CandidateCard
                key={c.id}
                candidate={c}
                party={partyMap[c.party_id]}
                uploading={uploading[c.id]}
                onEdit={handleStartEdit}
                onDelete={setConfirmDel}
                onPhotoUpload={handlePhotoUpload}
                onPhotoRemove={handlePhotoRemove}
              />
            ))}
          </div>
        ) : (
          /* ── List view (upgraded) ── */
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
                    <tr
                      key={c.id}
                      style={{ background: idx % 2 === 0 ? T.surface : T.surfaceAlt, transition: "background 0.1s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = T.accentLight + "55"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = idx % 2 === 0 ? T.surface : T.surfaceAlt; }}
                    >
                      <td style={tdStyle}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {/* 36px avatar circle */}
                          <div style={{
                            width: 36, height: 36, borderRadius: "50%", flexShrink: 0, overflow: "hidden",
                            background: c.photo_path ? "transparent" : `linear-gradient(135deg, ${T.navy} 0%, ${T.accent} 100%)`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            {c.photo_path
                              ? <img src={imageUrl(c.photo_path)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              : <span style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>
                                  {c.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                                </span>
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
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5,
                            background: T.accentLight, color: T.accent,
                          }}>{party.abbreviation}</span>
                        ) : (
                          <span style={{ fontSize: 12, color: T.muted }}>Independent</span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, fontSize: 12, color: T.muted }}>{c.gender ? c.gender.charAt(0) + c.gender.slice(1).toLowerCase() : "—"}</td>
                      <td style={{ ...tdStyle, fontSize: 12, color: T.muted }}>{c.date_of_birth || "—"}</td>
                      <td style={{ ...tdStyle, fontSize: 11, color: T.muted, fontFamily: "monospace" }}>{c.citizenship_no || "—"}</td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                          <Btn variant="ghost" small onClick={() => handleStartEdit(c)} style={{ color: T.accent }}>
                            <Pencil size={13} />
                          </Btn>
                          <Btn variant="ghost" small onClick={() => setConfirmDel(c)} style={{ color: T.error }}>
                            <Trash2 size={13} />
                          </Btn>
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

      {/* Edit candidate modal */}
      {editCandidate && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => { if (!updating) setEditCandidate(null); }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: T.surface, borderRadius: T.radius.xl,
              boxShadow: T.shadow.xl, width: "min(95vw, 560px)",
              maxHeight: "85vh", overflow: "auto", border: `1px solid ${T.border}`,
              animation: "adminFadeInDown 0.2s ease",
            }}
          >
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.borderLight}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.navy }}>Edit Candidate Profile</h3>
              <button onClick={() => setEditCandidate(null)} disabled={updating} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, padding: 4 }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: 24 }}>
              <div className="admin-form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
                <label style={lbl}>Full Name *<input style={inp} value={editForm.full_name} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} /></label>
                <label style={lbl}>Gender
                  <select style={sel} value={editForm.gender} onChange={e => setEditForm({ ...editForm, gender: e.target.value })}>
                    <option value="">—</option><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option>
                  </select>
                </label>
                <label style={lbl}>Date of birth<input style={inp} type="date" value={editForm.date_of_birth} onChange={e => setEditForm({ ...editForm, date_of_birth: e.target.value })} /></label>
                <label style={lbl}>Citizenship No<input style={inp} value={editForm.citizenship_no} onChange={e => setEditForm({ ...editForm, citizenship_no: e.target.value })} /></label>
                <label style={lbl}>Address<input style={inp} value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} /></label>
                <label style={lbl}>Party
                  <select style={sel} value={editForm.party_id} onChange={e => setEditForm({ ...editForm, party_id: e.target.value })}>
                    <option value="">Independent</option>
                    {(parties || []).filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.name} ({p.abbreviation})</option>)}
                  </select>
                </label>
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
/*  CANDIDATE CARD — photo-first grid card                       */
/* ══════════════════════════════════════════════════════════════ */
function CandidateCard({ candidate, party, uploading, onEdit, onDelete, onPhotoUpload, onPhotoRemove }) {
  const [photoHovered, setPhotoHovered] = useState(false);
  const fileRef = useRef(null);
  const age = calcAge(candidate.date_of_birth);
  const photo = imageUrl(candidate.photo_path);
  const initials = candidate.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div
      style={{
        background: T.surface, borderRadius: T.radius.xl,
        border: `1px solid ${T.border}`, overflow: "hidden",
        boxShadow: T.shadow.sm, transition: "box-shadow 0.18s, transform 0.18s",
        animation: "adminFadeIn 0.2s ease",
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = T.shadow.md; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = T.shadow.sm; e.currentTarget.style.transform = "none"; }}
    >
      {/* Photo area (4:3 aspect ratio) */}
      <div
        style={{ position: "relative", aspectRatio: "4/3", overflow: "hidden", cursor: "pointer" }}
        onMouseEnter={() => setPhotoHovered(true)}
        onMouseLeave={() => setPhotoHovered(false)}
        onClick={() => fileRef.current?.click()}
      >
        {photo ? (
          <img src={photo} alt={candidate.full_name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            background: `linear-gradient(135deg, ${T.navy} 0%, ${T.accent} 100%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 36, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>{initials}</span>
          </div>
        )}
        {/* Hover overlay */}
        {photoHovered && (
          <div style={{
            position: "absolute", inset: 0, background: "rgba(15,23,42,0.55)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 6, animation: "adminFadeIn 0.12s ease",
          }}>
            {uploading
              ? <Loader2 size={22} color="#fff" style={{ animation: "adminSpin 0.8s linear infinite" }} />
              : <><Camera size={20} color="#fff" /><span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>Change Photo</span></>
            }
          </div>
        )}
        <input
          ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
          onChange={e => { const f = e.target.files?.[0]; if (f) onPhotoUpload(candidate, f); e.target.value = ""; }}
        />
      </div>

      {/* Card body */}
      <div style={{ padding: "14px 16px" }}>
        {/* Name */}
        <div style={{ fontWeight: 700, fontSize: 15, color: T.text, lineHeight: 1.3, marginBottom: 6 }}>
          {candidate.full_name}
        </div>
        {/* Party badge */}
        <div style={{ marginBottom: 8 }}>
          {party ? (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5,
              background: T.accentLight, color: T.accent, letterSpacing: "0.03em",
            }}>
              {party.abbreviation}
            </span>
          ) : (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5,
              background: T.surfaceAlt, color: T.muted, letterSpacing: "0.03em",
            }}>
              Independent
            </span>
          )}
        </div>
        {/* Gender + age */}
        {(candidate.gender || age) && (
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 4 }}>
            {[candidate.gender ? candidate.gender.charAt(0) + candidate.gender.slice(1).toLowerCase() : null, age ? `${age} yrs` : null].filter(Boolean).join(" · ")}
          </div>
        )}
        {/* Citizenship */}
        {candidate.citizenship_no && (
          <div style={{ fontSize: 11, fontFamily: "monospace", color: T.muted, marginBottom: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {candidate.citizenship_no}
          </div>
        )}
        {/* Divider */}
        <div style={{ height: 1, background: T.borderLight, margin: "10px 0" }} />
        {/* Action row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around" }}>
          <Btn variant="ghost" small onClick={() => onEdit(candidate)} title="Edit profile" style={{ color: T.accent }}>
            <Pencil size={14} />
          </Btn>
          <Btn variant="ghost" small onClick={() => fileRef.current?.click()} title="Change photo" style={{ color: T.muted }}>
            <Camera size={14} />
          </Btn>
          {candidate.photo_path && (
            <Btn variant="ghost" small onClick={() => onPhotoRemove(candidate)} title="Remove photo" style={{ color: T.muted }}>
              <X size={14} />
            </Btn>
          )}
          <Btn variant="ghost" small onClick={() => onDelete(candidate)} title="Delete profile" style={{ color: T.error }}>
            <Trash2 size={14} />
          </Btn>
        </div>
      </div>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════ */
/*  NOMINATIONS PANEL — election pills + hover-reveal actions    */
/* ══════════════════════════════════════════════════════════════ */
function NominationsPanel({ setMsg }) {
  const { parties } = useParties();
  const { profiles } = useCandidateProfiles({ governmentLevel: "FEDERAL" });
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
  const [hoveredRow, setHoveredRow] = useState(null);

  const profileMap = useMemo(() => Object.fromEntries((profiles || []).map(p => [p.id, p])), [profiles]);
  const partyMap = useMemo(() => Object.fromEntries((parties || []).map(p => [p.id, p])), [parties]);
  const contestMap = useMemo(() => Object.fromEntries(contests.map(c => [c.id, c])), [contests]);

  useEffect(() => {
    (async () => { try { const d = await listElections(); setElections(d || []); } catch { /* ignore */ } })();
  }, []);

  const eligibleElections = useMemo(() =>
    (elections || []).filter(e => ["NOMINATIONS_OPEN", "NOMINATIONS_CLOSED", "CANDIDATE_LIST_PUBLISHED"].includes(e.status)),
  [elections]);

  useEffect(() => {
    if (!selectedElection) { setContests([]); return; }
    (async () => {
      try {
        const all = await listContests(selectedElection);
        setContests((all || []).filter(c => SINGLE_SEAT_TYPES.includes(c.contest_type)));
      } catch { setContests([]); }
    })();
  }, [selectedElection]);

  const loadNominations = useCallback(async () => {
    if (!selectedElection) { setNominations([]); return; }
    setNomLoading(true);
    try {
      const data = await listFptpNominations(selectedElection, { contestId: selectedContest || undefined });
      setNominations(data || []);
    } catch { setNominations([]); }
    finally { setNomLoading(false); }
  }, [selectedElection, selectedContest]);

  useEffect(() => { loadNominations(); }, [loadNominations]);

  const filtered = useMemo(() => {
    if (!search.trim()) return nominations;
    const q = search.toLowerCase();
    return nominations.filter(n => {
      const prof = profileMap[n.candidate_id];
      return prof?.full_name?.toLowerCase().includes(q) || String(n.id).includes(q);
    });
  }, [nominations, search, profileMap]);

  const handleCreate = async () => {
    if (!form.contest_id || !form.candidate_id) {
      setMsg({ type: "error", text: "Contest and candidate are required" }); return;
    }
    setSaving(true);
    try {
      await createFptpNomination(selectedElection, {
        contest_id: Number(form.contest_id),
        candidate_id: Number(form.candidate_id),
        party_id: form.party_id ? Number(form.party_id) : null,
      });
      setMsg({ type: "success", text: "Nomination created" });
      setShowForm(false); setForm({ contest_id: "", candidate_id: "", party_id: "" });
      loadNominations();
    } catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (nom, newStatus) => {
    try {
      await updateFptpNomination(nom.id, { status: newStatus });
      setMsg({ type: "success", text: `Nomination ${newStatus.toLowerCase()}` });
      loadNominations();
    } catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
  };

  const handleDelete = async () => {
    if (!confirmDel) return;
    try { await deleteFptpNomination(confirmDel.id); setMsg({ type: "success", text: "Nomination deleted" }); loadNominations(); }
    catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
    finally { setConfirmDel(null); }
  };

  const pendingCount = nominations.filter(n => n.status === "PENDING").length;
  const approvedCount = nominations.filter(n => n.status === "APPROVED").length;

  return (
    <>
      {/* Election pill strip */}
      <div style={{ marginBottom: T.space.xl }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>
          Select Election
        </div>
        {eligibleElections.length === 0 ? (
          <div style={{ fontSize: 13, color: T.muted, fontStyle: "italic", padding: "12px 0" }}>
            No elections currently open for nominations.
          </div>
        ) : (
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6, WebkitOverflowScrolling: "touch" }}>
            {eligibleElections.map(e => {
              const isSelected = String(selectedElection) === String(e.id);
              return (
                <button
                  key={e.id}
                  onClick={() => { setSelectedElection(String(e.id)); setSelectedContest(""); }}
                  style={{
                    flexShrink: 0, padding: "12px 18px", borderRadius: T.radius.lg,
                    cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                    background: isSelected ? T.accentLight : T.surfaceAlt,
                    border: `2px solid ${isSelected ? T.accent : T.borderLight}`,
                    boxShadow: isSelected ? T.shadow.sm : "none",
                    minWidth: 160,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: isSelected ? T.accent : T.text, marginBottom: 6, lineHeight: 1.3 }}>
                    {e.title}
                  </div>
                  <span style={{
                    display: "inline-block", fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
                    padding: "2px 8px", borderRadius: 5,
                    background: isSelected ? T.accent + "25" : T.surfaceSubtle,
                    color: isSelected ? T.accent : T.muted,
                  }}>
                    {e.status.replace(/_/g, " ")}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Contest filter (visible after election is selected) */}
        {selectedElection && contests.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <label style={{ ...lbl, minWidth: 200, maxWidth: 340, display: "inline-flex", flexDirection: "column" }}>
              <span style={{ marginBottom: 4, fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Filter by contest
              </span>
              <select style={sel} value={selectedContest} onChange={e => setSelectedContest(e.target.value)}>
                <option value="">All contests</option>
                {contests.map(c => <option key={c.id} value={c.id}>{c.title} ({c.contest_type})</option>)}
              </select>
            </label>
          </div>
        )}
      </div>

      {/* KPI row */}
      {selectedElection && (
        <KPIRow items={[
          { label: "Total nominations", value: nominations.length, accent: T.navy },
          { label: "Pending review", value: pendingCount, accent: T.warn },
          { label: "Approved", value: approvedCount, accent: T.success },
          { label: "Contests", value: contests.length, accent: T.accent },
        ]} />
      )}

      {/* Main data card */}
      <SectionCard style={{ border: `1px solid ${T.borderStrong}` }}>
        <SectionHeader icon={UserPlus} iconColor={T.accent} title="FPTP Nominations"
          subtitle={selectedElection ? "Election-scoped nominations for constituency contests" : "Select an election above"} />

        {/* Toolbar */}
        {selectedElection && (
          <div className="admin-toolbar" style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 10, padding: "12px 20px", borderBottom: `1px solid ${T.borderLight}`, flexWrap: "wrap",
          }}>
            <SearchInput value={search} onChange={setSearch} placeholder="Search nominations…" />
            <Btn small onClick={() => setShowForm(s => !s)}>
              <Plus size={13} /> {showForm ? "Cancel" : "New nomination"}
            </Btn>
          </div>
        )}

        {showForm && selectedElection && (
          <div style={{ padding: 20, borderBottom: `1px solid ${T.borderLight}`, background: T.surfaceAlt, animation: "adminFadeInDown 0.18s ease" }}>
            <div className="admin-form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 12 }}>
              <label style={lbl}>Contest *
                <select style={sel} value={form.contest_id} onChange={e => setForm({ ...form, contest_id: e.target.value })}>
                  <option value="">Select contest</option>
                  {contests.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </label>
              <label style={lbl}>Party
                <select style={sel} value={form.party_id} onChange={e => {
                  const newPartyId = e.target.value;
                  const currentCandidate = profiles.find(c => String(c.id) === form.candidate_id);
                  const candidateMatchesParty = currentCandidate && (!newPartyId ? true : String(currentCandidate.party_id) === newPartyId);
                  setForm({ ...form, party_id: newPartyId, candidate_id: candidateMatchesParty ? form.candidate_id : "" });
                }}>
                  <option value="">Independent / All</option>
                  {parties.filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.name} ({p.abbreviation})</option>)}
                </select>
              </label>
              <label style={lbl}>Candidate *
                <select style={sel} value={form.candidate_id} onChange={e => setForm({ ...form, candidate_id: e.target.value })}>
                  <option value="">Select candidate</option>
                  {profiles.filter(c => c.is_active && (!form.party_id ? true : String(c.party_id) === form.party_id)).map(p => <option key={p.id} value={p.id}>{p.full_name}{p.party_id ? ` (${partyMap[p.party_id]?.abbreviation || ""})` : " (Independent)"}</option>)}
                </select>
              </label>
            </div>
            <Btn onClick={handleCreate} loading={saving}>Create nomination</Btn>
          </div>
        )}

        {/* Table */}
        {!selectedElection ? (
          <div style={{ padding: 40 }}>
            <EmptyState icon={UserPlus} title="No election selected" message="Select an election above to view and manage nominations." />
          </div>
        ) : nomLoading ? (
          <div style={{ padding: 24 }}><TableSkeleton rows={4} cols={5} /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 24 }}>
            <EmptyState icon={UserPlus} title="No nominations" message={search ? "No match for this search." : "Create the first nomination."} />
          </div>
        ) : (
          <div className="admin-table-wrap" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: T.surfaceAlt, position: "sticky", top: 0, zIndex: 5 }}>
                  <th style={thStyle}>Contest</th>
                  <th style={thStyle}>Candidate</th>
                  <th style={thStyle}>Party</th>
                  <th style={thStyle}>Status</th>
                  <th style={{ ...thStyle, minWidth: 200, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((n, idx) => {
                  const prof = profileMap[n.candidate_id];
                  const party = partyMap[n.party_id];
                  const contest = contestMap[n.contest_id];
                  const isHovered = hoveredRow === n.id;
                  const rowBg = isHovered ? (T.accentLight + "55") : idx % 2 === 0 ? T.surface : T.surfaceAlt;
                  return (
                    <tr
                      key={n.id}
                      style={{ background: rowBg, transition: "background 0.12s" }}
                      onMouseEnter={() => setHoveredRow(n.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      <td style={{ ...tdStyle, fontSize: 12, color: T.textSecondary }}>{contest?.title || `#${n.contest_id}`}</td>
                      <td style={{ ...tdStyle, fontWeight: 600, color: T.text }}>{prof?.full_name || `#${n.candidate_id}`}</td>
                      <td style={tdStyle}>
                        {party ? (
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5,
                            background: T.accentLight, color: T.accent,
                          }}>{party.abbreviation}</span>
                        ) : (
                          <span style={{ fontSize: 12, color: T.muted }}>Ind.</span>
                        )}
                      </td>
                      <td style={tdStyle}><AdminBadge map={NOM_MAP} status={n.status} /></td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>
                        {/* Actions — always visible on mobile, appear on hover on desktop */}
                        <div style={{
                          display: "flex", gap: 4, justifyContent: "flex-end", flexWrap: "wrap",
                          opacity: isHovered ? 1 : 0,
                          transition: "opacity 0.15s",
                          pointerEvents: isHovered ? "auto" : "none",
                        }}>
                          {n.status === "PENDING" && (
                            <>
                              <Btn variant="success" small onClick={() => handleStatusChange(n, "APPROVED")}><Check size={12} /> Approve</Btn>
                              <Btn variant="danger" small onClick={() => handleStatusChange(n, "REJECTED")}><X size={12} /> Reject</Btn>
                              <Btn variant="ghost" small onClick={() => handleStatusChange(n, "WITHDRAWN")}>Withdraw</Btn>
                              <Btn variant="ghost" small onClick={() => setConfirmDel(n)} style={{ color: T.error }}><Trash2 size={13} /></Btn>
                            </>
                          )}
                          {n.status === "APPROVED" && (
                            <Btn variant="ghost" small onClick={() => handleStatusChange(n, "WITHDRAWN")}>Withdraw</Btn>
                          )}
                          {n.status === "WITHDRAWN" && (
                            <Btn variant="ghost" small onClick={() => setConfirmDel(n)} style={{ color: T.error }}><Trash2 size={13} /> Delete</Btn>
                          )}
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
/*  PR LISTS PANEL (kept, toolbar + refined)                     */
/* ══════════════════════════════════════════════════════════════ */
function PRListsPanel({ setMsg }) {
  const { parties } = useParties();
  const { profiles } = useCandidateProfiles({ governmentLevel: "FEDERAL" });
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

  // Parties that already have a submission for this election
  const usedPartyIds = useMemo(() => new Set(submissions.map(s => s.party_id)), [submissions]);

  useEffect(() => {
    (async () => { try { const d = await listElections(); setElections(d || []); } catch { /* ignore */ } })();
  }, []);

  const loadSubmissions = useCallback(async () => {
    if (!selectedElection) { setSubmissions([]); return; }
    setPRLoading(true);
    try { setSubmissions(await listPrSubmissions(selectedElection) || []); }
    catch { setSubmissions([]); }
    finally { setPRLoading(false); }
  }, [selectedElection]);

  useEffect(() => { loadSubmissions(); }, [loadSubmissions]);

  const loadEntries = async (subId) => {
    try { const data = await listPrEntries(subId); setEntries(prev => ({ ...prev, [subId]: Array.isArray(data) ? data : [] })); }
    catch { setEntries(prev => ({ ...prev, [subId]: [] })); }
  };

  const loadEligible = async (subId, partyId) => {
    if (!selectedElection || !partyId) return;
    try {
      const data = await listPrEligibleCandidates(selectedElection, partyId);
      setEligibleCandidates(prev => ({ ...prev, [subId]: Array.isArray(data) ? data : [] }));
    } catch {
      setEligibleCandidates(prev => ({ ...prev, [subId]: [] }));
    }
  };

  const handleExpand = (sub) => {
    if (expandedSub === sub.id) {
      setExpandedSub(null); setValidation(null); return;
    }
    setExpandedSub(sub.id);
    let parsed = null;
    if (sub.validation_snapshot) {
      try { parsed = JSON.parse(sub.validation_snapshot); } catch { parsed = null; }
    }
    setValidation(parsed);
    loadEntries(sub.id);
    loadEligible(sub.id, sub.party_id);
  };

  const handleCreateList = async () => {
    if (!listForm.party_id) {
      setMsg({ type: "error", text: "Party is required" }); return;
    }
    if (usedPartyIds.has(Number(listForm.party_id))) {
      setMsg({ type: "error", text: "This party already has a PR submission for the selected election" }); return;
    }
    setSaving(true);
    try {
      await createPrSubmission(selectedElection, { party_id: Number(listForm.party_id) });
      setMsg({ type: "success", text: "PR submission created" });
      setShowForm(false); setListForm({ party_id: "" }); loadSubmissions();
    } catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
    finally { setSaving(false); }
  };

  const handleAddEntry = async (subId) => {
    const f = entryForm[subId] || {};
    if (!f.candidate_id) {
      setMsg({ type: "error", text: "Candidate is required" }); return;
    }
    if (!f.list_position) {
      setMsg({ type: "error", text: "Position is required" }); return;
    }
    const pos = Number(f.list_position);
    if (!Number.isInteger(pos) || pos < 1) {
      setMsg({ type: "error", text: "Position must be a positive integer" }); return;
    }
    const subEntries = entries[subId] || [];
    if (subEntries.some(e => e.list_position === pos)) {
      setMsg({ type: "error", text: `Position ${pos} is already occupied` }); return;
    }
    if (subEntries.some(e => String(e.candidate_id) === String(f.candidate_id))) {
      setMsg({ type: "error", text: "Candidate is already in this list" }); return;
    }
    try {
      await addPrEntry(subId, { candidate_id: Number(f.candidate_id), list_position: pos });
      setMsg({ type: "success", text: "Entry added" });
      setEntryForm(p => ({ ...p, [subId]: {} }));
      loadEntries(subId); loadSubmissions();
      // Reload eligible list to reflect usage
      const sub = submissions.find(s => s.id === subId);
      if (sub) loadEligible(subId, sub.party_id);
    } catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
  };

  const handleRemoveEntry = async (subId, entryId) => {
    try {
      await removePrEntry(subId, entryId);
      setMsg({ type: "success", text: "Entry removed" });
      loadEntries(subId); loadSubmissions();
      const sub = submissions.find(s => s.id === subId);
      if (sub) loadEligible(subId, sub.party_id);
    }
    catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
  };

  const handleValidate = async (sub) => {
    try {
      const res = await validatePrList(sub.id);
      setValidation(res);
      setMsg({ type: res.valid ? "success" : "error", text: res.valid ? "List is valid" : "Validation failed — see details below" });
      loadSubmissions();
    } catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
  };

  const handleSubmit = async () => {
    if (!confirmSubmit) return;
    try {
      await submitPrList(confirmSubmit.id);
      setMsg({ type: "success", text: "PR list submitted for review" });
      loadSubmissions();
    } catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
    finally { setConfirmSubmit(null); }
  };

  const handleReview = async (sub, action) => {
    try {
      await reviewPrSubmission(sub.id, { action });
      setMsg({ type: "success", text: `Submission ${action}${action === "reopen" ? "ed" : "d"}` });
      loadSubmissions();
    } catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
  };

  const handleDeleteSub = async () => {
    if (!confirmDel) return;
    try { await deletePrSubmission(confirmDel.id); setMsg({ type: "success", text: "Submission deleted" }); loadSubmissions(); }
    catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
    finally { setConfirmDel(null); }
  };

  const draftCount = submissions.filter(s => s.status === "DRAFT").length;
  const submittedCount = submissions.filter(s => s.status === "SUBMITTED").length;
  const approvedCount = submissions.filter(s => s.status === "APPROVED").length;

  return (
    <>
      {/* Election selector */}
      <div className="admin-election-selector" style={{ display: "flex", gap: 12, marginBottom: T.space.xl }}>
        <label style={{ ...lbl, minWidth: 240, flex: 1, maxWidth: 400 }}>Election
          <select style={sel} value={selectedElection} onChange={e => { setSelectedElection(e.target.value); setExpandedSub(null); }}>
            <option value="">Select election</option>
            {elections.filter(e => ["NOMINATIONS_OPEN", "NOMINATIONS_CLOSED", "CANDIDATE_LIST_PUBLISHED"].includes(e.status)).map(e => <option key={e.id} value={e.id}>{e.title} — {e.status.replace(/_/g, " ")}</option>)}
          </select>
        </label>
      </div>

      {/* KPI row */}
      {selectedElection && (
        <KPIRow items={[
          { label: "Total submissions", value: submissions.length, accent: T.navy },
          { label: "Draft", value: draftCount, accent: T.warn },
          { label: "Submitted", value: submittedCount, accent: T.accent },
          { label: "Approved", value: approvedCount, accent: T.success },
        ]} />
      )}

      {/* Main data card */}
      <SectionCard style={{ border: `1px solid ${T.borderStrong}` }}>
        <SectionHeader icon={ListOrdered} iconColor={T.accent} title="PR Submissions"
          subtitle={selectedElection ? "Party list submissions for proportional representation" : "Select an election above"} />

        {/* Toolbar */}
        {selectedElection && (
          <Toolbar
            left={
              <span style={{ fontSize: 12, color: T.muted }}>
                {submissions.length} submission{submissions.length !== 1 ? "s" : ""}
              </span>
            }
            right={
              <Btn small onClick={() => setShowForm(!showForm)}>
                <Plus size={13} /> {showForm ? "Cancel" : "New submission"}
              </Btn>
            }
          />
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

        {/* Submission list */}
        {!selectedElection ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <EmptyState icon={ListOrdered} title="No election selected" message="Select an election to view and manage PR submissions." />
          </div>
        ) : prLoading ? (
          <div style={{ padding: 24 }}><TableSkeleton rows={3} cols={4} /></div>
        ) : submissions.length === 0 ? (
          <div style={{ padding: 24 }}>
            <EmptyState icon={ListOrdered} title="No PR submissions" message="Create the first PR submission for this election." />
          </div>
        ) : (
          <div style={{ padding: "12px 20px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            {submissions.map(sub => {
              const party = partyMap[sub.party_id];
              const isOpen = expandedSub === sub.id;
              const ef = entryForm[sub.id] || {};
              const subEntries = Array.isArray(entries[sub.id]) ? entries[sub.id] : [];
              const isEditable = sub.status === "DRAFT" || sub.status === "INVALID";

              // Eligible candidates: from backend, minus those already in this submission
              const subEntryIds = new Set(subEntries.map(e => e.candidate_id));
              const availableCandidates = (eligibleCandidates[sub.id] || []).filter(c => !subEntryIds.has(c.id));

              return (
                <div key={sub.id} style={{
                  border: `1px solid ${isOpen ? T.accent + "40" : T.borderLight}`,
                  borderRadius: T.radius.lg, background: isOpen ? T.surface : T.surfaceAlt,
                  transition: "border-color 0.18s, background 0.18s",
                }}>
                  <button onClick={() => handleExpand(sub)} style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%",
                    padding: "14px 18px", background: "none", border: "none",
                    cursor: "pointer", textAlign: "left",
                  }}>
                    {/* Party logo thumbnail */}
                    <div style={{
                      width: 36, height: 36, borderRadius: T.radius.md, flexShrink: 0, overflow: "hidden",
                      background: party?.symbol_path ? "transparent" : T.accentLight,
                      border: `1px solid ${T.borderLight}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {party?.symbol_path
                        ? <img src={imageUrl(party.symbol_path)} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                        : <span style={{ fontSize: 12, fontWeight: 800, color: T.accent }}>
                            {(party?.abbreviation || "?").slice(0, 2).toUpperCase()}
                          </span>
                      }
                    </div>
                    {/* Party name */}
                    <span style={{ fontWeight: 700, fontSize: 14, color: T.text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {party?.name || `Party #${sub.party_id}`}
                    </span>
                    <AdminBadge map={PR_MAP} status={sub.status} />
                    <span style={{ fontSize: 11, fontWeight: 700, background: T.accentLight, color: T.accent, padding: "2px 8px", borderRadius: 6, flexShrink: 0 }}>
                      {subEntries.length} {subEntries.length === 1 ? "entry" : "entries"}
                    </span>
                    {isOpen ? <ChevronUp size={14} color={T.accent} style={{ flexShrink: 0 }} /> : <ChevronDown size={14} color={T.muted} style={{ flexShrink: 0 }} />}
                  </button>

                  {isOpen && (
                    <PRSubmissionDetail
                      sub={sub}
                      subEntries={subEntries}
                      ef={ef}
                      isEditable={isEditable}
                      availableCandidates={availableCandidates}
                      profileMap={profileMap}
                      validation={validation}
                      expandedSub={expandedSub}
                      setEntryForm={setEntryForm}
                      handleAddEntry={handleAddEntry}
                      handleRemoveEntry={handleRemoveEntry}
                      handleValidate={handleValidate}
                      handleReview={handleReview}
                      setConfirmSubmit={setConfirmSubmit}
                      setConfirmDel={setConfirmDel}
                    />
                  )}
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


/* ── Error Boundary for PR Submission accordion ── */
class PRSubmissionErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: "14px 18px", borderTop: `1px solid ${T.borderLight}`,
          background: T.errorBg, borderRadius: `0 0 ${T.radius.lg} ${T.radius.lg}`,
        }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
            <AlertTriangle size={14} color={T.error} />
            <span style={{ fontWeight: 700, fontSize: 13, color: T.error }}>Unable to render submission details</span>
          </div>
          <p style={{ fontSize: 12, color: T.muted, margin: 0 }}>
            This submission may contain invalid or corrupted data. Try reopening or deleting it.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ── Safe PR Submission Detail (crash-proof rendering via Error Boundary) ── */
function PRSubmissionDetail({
  sub, subEntries, ef, isEditable, availableCandidates, profileMap,
  validation, expandedSub, setEntryForm, handleAddEntry, handleRemoveEntry,
  handleValidate, handleReview, setConfirmSubmit, setConfirmDel,
}) {
  const safeEntries = Array.isArray(subEntries) ? subEntries : [];
  const noCandidatesAvailable = availableCandidates.length === 0;

  return (
    <PRSubmissionErrorBoundary>
      <div style={{ padding: "4px 18px 18px", borderTop: `1px solid ${T.borderLight}` }}>
        {/* Entries table */}
        {safeEntries.length > 0 ? (
          <div className="admin-table-wrap" style={{ overflowX: "auto", marginBottom: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: T.surfaceAlt }}>
                  <th style={{ ...thStyle, width: 60 }}>#</th>
                  <th style={thStyle}>Candidate</th>
                  <th style={thStyle}>Gender</th>
                  <th style={thStyle}>DOB</th>
                  <th style={{ ...thStyle, width: 50 }} />
                </tr>
              </thead>
              <tbody>
                {[...safeEntries].sort((a, b) => (a.list_position || 0) - (b.list_position || 0)).map((entry, idx) => {
                  if (!entry || !entry.id) return null;
                  const prof = profileMap[entry.candidate_id];
                  return (
                    <tr key={entry.id} style={{ background: idx % 2 === 0 ? "transparent" : T.surfaceAlt }}>
                      <td style={tdStyle}>
                        {/* Rank circle badge */}
                        <div style={{
                          width: 28, height: 28, borderRadius: "50%",
                          background: T.accentLight, color: T.accent,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 800,
                        }}>
                          {entry.list_position ?? "—"}
                        </div>
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 600, color: T.text }}>{prof?.full_name || `#${entry.candidate_id}`}</td>
                      <td style={{ ...tdStyle, fontSize: 12, color: T.muted }}>{prof?.gender || "—"}</td>
                      <td style={{ ...tdStyle, fontSize: 12, color: T.muted }}>{prof?.date_of_birth || "—"}</td>
                      <td style={tdStyle}>
                        {isEditable && (
                          <Btn variant="ghost" small onClick={() => handleRemoveEntry(sub.id, entry.id)} style={{ color: T.error }}>
                            <Trash2 size={13} />
                          </Btn>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ margin: "8px 0 12px", fontSize: 12, color: T.muted, fontStyle: "italic" }}>No entries yet</p>
        )}

        {/* Add entry — only for editable submissions */}
        {isEditable && (
          <div style={{ marginBottom: 14 }}>
            {noCandidatesAvailable ? (
              <div style={{
                padding: "10px 14px", borderRadius: T.radius.md,
                background: T.warnBg, border: `1px solid ${T.warn}20`,
                fontSize: 12, color: T.warn,
              }}>
                <AlertTriangle size={13} style={{ verticalAlign: "middle", marginRight: 6 }} />
                No eligible candidates available for this party. Candidates already assigned to FPTP or another PR list cannot be reused.
              </div>
            ) : (
              <div className="admin-pr-entry-form" style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                <label style={{ ...lbl, flex: 1, minWidth: 140 }}>Candidate
                  <select style={sel} value={ef.candidate_id || ""} onChange={e => setEntryForm(p => ({ ...p, [sub.id]: { ...ef, candidate_id: e.target.value } }))}>
                    <option value="">Select candidate</option>
                    {availableCandidates.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                  </select>
                </label>
                <label style={{ ...lbl, width: 90 }}>Position
                  <input style={inp} type="number" min={1} value={ef.list_position || ""} onChange={e => setEntryForm(p => ({ ...p, [sub.id]: { ...ef, list_position: e.target.value } }))} />
                </label>
                <Btn small onClick={() => handleAddEntry(sub.id)}><Plus size={13} /> Add</Btn>
              </div>
            )}
          </div>
        )}

        {/* Validation results */}
        {validation && expandedSub === sub.id && (
          <div style={{
            padding: "12px 14px", borderRadius: T.radius.md, marginBottom: 12,
            background: validation.valid ? T.successBg : T.errorBg,
            border: `1px solid ${validation.valid ? (T.successBorder || T.success + "30") : (T.errorBorder || T.error + "30")}`,
          }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: validation.valid ? T.success : T.error, marginBottom: 4 }}>
              {validation.valid ? "✓ List is valid" : "✗ Validation failed"}
            </div>
            {Array.isArray(validation.errors) && validation.errors.length > 0 && (
              <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 12, color: T.error }}>
                {validation.errors.map((e, i) => <li key={i}>{typeof e === "string" ? e : (e?.message || JSON.stringify(e))}</li>)}
              </ul>
            )}
            {Array.isArray(validation.warnings) && validation.warnings.length > 0 && (
              <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 12, color: T.warn }}>
                {validation.warnings.map((w, i) => <li key={i}>{typeof w === "string" ? w : (w?.message || JSON.stringify(w))}</li>)}
              </ul>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="admin-pr-actions" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Btn variant="secondary" small onClick={() => handleValidate(sub)}>
            <Shield size={13} /> Validate
          </Btn>
          {(sub.status === "DRAFT" || sub.status === "VALID" || sub.status === "INVALID") && (
            <Btn variant="primary" small onClick={() => setConfirmSubmit(sub)}>Submit for review</Btn>
          )}
          {sub.status === "SUBMITTED" && (
            <>
              <Btn variant="success" small onClick={() => handleReview(sub, "approve")}><Check size={12} /> Approve</Btn>
              <Btn variant="danger" small onClick={() => handleReview(sub, "reject")}><X size={12} /> Reject</Btn>
            </>
          )}
          {(sub.status === "REJECTED" || sub.status === "INVALID") && (
            <Btn variant="ghost" small onClick={() => handleReview(sub, "reopen")}>
              <RotateCcw size={12} /> Reopen
            </Btn>
          )}
          {(sub.status === "DRAFT" || sub.status === "INVALID") && (
            <Btn variant="ghost" small onClick={() => setConfirmDel(sub)} style={{ color: T.error }}>
              <Trash2 size={13} /> Delete
            </Btn>
          )}
        </div>
      </div>
    </PRSubmissionErrorBoundary>
  );
}


/* ── Shared table styles ── */
const thStyle = {
  padding: "10px 14px", fontSize: 11, fontWeight: 700,
  textTransform: "uppercase", letterSpacing: "0.04em",
  color: T.muted, borderBottom: `2px solid ${T.borderLight}`,
  textAlign: "left",
};
const tdStyle = {
  padding: "12px 14px", fontSize: 13,
  borderBottom: `1px solid ${T.borderLight}`,
};
