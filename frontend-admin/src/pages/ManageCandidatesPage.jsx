import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Building2, Landmark, MapPin, ChevronRight, Plus, Trash2,
  UserCheck, Layers,
} from "lucide-react";
import { T } from "../components/ui/tokens";
import {
  PageContainer, SectionCard, SectionHeader, AdminBadge, Btn,
  SearchInput, Toast, AdminKeyframes, imageUrl, errMsg,
} from "../components/ui/AdminUI";
import useParties from "../features/candidates/hooks/useParties";
import { createParty, deleteParty, uploadPartySymbol, removePartySymbol } from "../features/candidates/api/candidatesApi";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import ImageUpload from "../components/ui/ImageUpload";
import EmptyState from "../components/ui/EmptyState";
import { TableSkeleton } from "../components/ui/Skeleton";

/* ── Shared form styles ──────────────────────────────────────── */
const lbl = { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 600, color: T.textSecondary };
const inp = { padding: "8px 12px", borderRadius: T.radius.md, border: `1px solid ${T.border}`, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" };

const WORKSPACES = [
  {
    key: "federal",
    label: "Federal Candidates",
    description: "Candidate profiles, nominations, and PR lists for House of Representatives elections",
    icon: Landmark,
    color: T.accent,
    bg: T.accentLight,
    to: "/admin/manage-candidates/federal",
    ready: true,
    scope: "Profiles · Nominations · PR lists",
  },
  {
    key: "provincial",
    label: "Provincial Candidates",
    description: "Provincial Assembly nominations and candidate management across all 7 provinces",
    icon: Building2,
    color: T.purple,
    bg: T.purpleBg,
    to: "/admin/manage-candidates/provincial",
    ready: false,
    scope: "Planned — next phase",
  },
  {
    key: "local",
    label: "Local Candidates",
    description: "Municipal and Rural Municipal candidate operations including ward-level nominations",
    icon: MapPin,
    color: T.orange,
    bg: T.orangeBg,
    to: "/admin/manage-candidates/local",
    ready: false,
    scope: "Planned — next phase",
  },
];


export default function ManageCandidatesPage() {
  const navigate = useNavigate();
  const [msg, setMsg] = useState(null);

  return (
    <PageContainer>
      <AdminKeyframes />
      <Toast msg={msg} onClose={() => setMsg(null)} />

      {/* ── Compact intro ── */}
      <p style={{
        margin: `0 0 ${T.space.xl}px`, fontSize: 13, color: T.muted,
        lineHeight: 1.55, maxWidth: 640,
      }}>
        The <strong style={{ color: T.textSecondary }}>Party Registry</strong> is shared master data across all election levels.
        Nominations and PR lists are managed inside election-scoped workspaces below.
      </p>

      {/* ════════════════════════════════════════════════════════ */}
      {/*  SECTION 1 — Party Registry (operational)               */}
      {/* ════════════════════════════════════════════════════════ */}
      <PartiesSection msg={msg} setMsg={setMsg} />

      {/* ════════════════════════════════════════════════════════ */}
      {/*  SECTION 2 — Election-level candidate workspaces        */}
      {/* ════════════════════════════════════════════════════════ */}
      <div>
        <div style={{ marginBottom: T.space.lg }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: T.radius.md,
              background: T.surfaceAlt, border: `1px solid ${T.borderLight}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <Layers size={15} color={T.navy} strokeWidth={2.2} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: T.navy, lineHeight: 1.3 }}>
                Election-level candidate workspaces
              </h2>
              <p style={{ margin: 0, fontSize: 12, color: T.muted }}>
                Nominations and PR lists scoped to each government level
              </p>
            </div>
          </div>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 16,
        }}>
          {WORKSPACES.map((ws) => (
            <WorkspaceCard key={ws.key} ws={ws} navigate={navigate} />
          ))}
        </div>
      </div>
    </PageContainer>
  );
}


/* ══════════════════════════════════════════════════════════════ */
/*  WORKSPACE CARD — refined election-level entry                */
/* ══════════════════════════════════════════════════════════════ */
function WorkspaceCard({ ws, navigate }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const Icon = ws.icon;
  const isActive = ws.ready;
  const highlight = hovered || focused;

  return (
    <button
      onClick={() => navigate(ws.to)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        display: "flex", flexDirection: "column",
        padding: 0, borderRadius: T.radius.xl,
        border: `1.5px solid ${
          focused ? T.accent
          : highlight ? ws.color + "55"
          : isActive ? ws.color + "22"
          : T.border
        }`,
        background: T.surface,
        cursor: "pointer", textAlign: "left",
        boxShadow: focused
          ? T.focusRing
          : highlight
            ? `0 6px 20px ${ws.color}10, ${T.shadow.md}`
            : T.shadow.sm,
        transform: highlight ? "translateY(-2px)" : "none",
        transition: "all 0.2s ease",
        outline: "none",
        overflow: "hidden",
      }}
    >
      {/* Card body */}
      <div style={{ padding: "22px 22px 0", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        {/* Icon tile */}
        <div style={{
          width: 40, height: 40, borderRadius: T.radius.lg,
          background: highlight ? ws.color + "16" : ws.bg,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background 0.2s",
        }}>
          <Icon size={19} color={ws.color} strokeWidth={2.2} />
        </div>

        {/* Title */}
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: T.text, lineHeight: 1.3 }}>
          {ws.label}
        </h3>

        {/* Status chip */}
        <span style={{
          display: "inline-block", alignSelf: "flex-start",
          fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 6,
          background: isActive ? T.successBg : T.surfaceAlt,
          color: isActive ? T.success : T.muted,
          border: `1px solid ${isActive ? T.successBorder : T.borderLight}`,
          letterSpacing: "0.02em",
        }}>
          {isActive ? "Active" : "Planned"}
        </span>

        {/* Description */}
        <p style={{
          margin: 0, fontSize: 13, color: T.muted, lineHeight: 1.55,
          maxWidth: 300,
        }}>
          {ws.description}
        </p>

        {/* Metadata chip */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{
            fontSize: 11, fontWeight: 600, color: T.textSecondary,
            background: T.surfaceAlt, padding: "3px 10px", borderRadius: 6,
            border: `1px solid ${T.borderLight}`,
          }}>
            {ws.scope}
          </span>
        </div>
      </div>

      {/* Footer CTA row */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "14px 22px",
        marginTop: 14,
        borderTop: `1px solid ${highlight ? ws.color + "18" : T.borderLight}`,
        color: highlight ? ws.color : T.muted,
        fontSize: 13, fontWeight: 600,
        transition: "all 0.18s",
      }}>
        Open workspace
        <ChevronRight size={14} style={{ transition: "transform 0.18s", transform: highlight ? "translateX(2px)" : "none" }} />
      </div>
    </button>
  );
}


/* ══════════════════════════════════════════════════════════════ */
/*  PARTIES SECTION — primary data workspace on hub              */
/* ══════════════════════════════════════════════════════════════ */

function PartiesSection({ msg, setMsg }) {
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
    if (!form.name.trim() || !form.abbreviation.trim()) {
      setMsg({ type: "error", text: "Name and abbreviation are required" }); return;
    }
    setSaving(true);
    try {
      await createParty(form);
      setMsg({ type: "success", text: "Party created" });
      setShowForm(false); setForm({ name: "", abbreviation: "", address: "" }); reload();
    } catch (err) { setMsg({ type: "error", text: errMsg(err) }); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirmDel) return;
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
    <div style={{ marginBottom: T.space["2xl"] }}>
      <SectionCard style={{ border: `1.5px solid ${T.borderStrong}` }}>
        <SectionHeader
          icon={Building2} iconColor={T.navy}
          title="Party Registry"
          subtitle={`${parties.length} registered · Shared across all election levels`}
          action={
            <Btn small onClick={() => setShowForm(!showForm)}>
              <Plus size={13} /> {showForm ? "Cancel" : "New party"}
            </Btn>
          }
        />

        {showForm && (
          <div style={{ padding: 20, borderBottom: `1px solid ${T.borderLight}`, background: T.surfaceAlt }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 12 }}>
              <label style={lbl}>Name *<input style={inp} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
              <label style={lbl}>Abbreviation *<input style={inp} value={form.abbreviation} onChange={e => setForm({ ...form, abbreviation: e.target.value })} /></label>
              <label style={lbl}>Address<input style={inp} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></label>
            </div>
            <Btn onClick={handleCreate} loading={saving}>Create party</Btn>
          </div>
        )}

        {/* Toolbar */}
        <div style={{
          display: "flex", alignItems: "center",
          padding: "10px 24px",
          borderBottom: `1px solid ${T.borderLight}`,
        }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search parties..." />
        </div>

        {loading ? (
          <div style={{ padding: "16px 24px" }}><TableSkeleton rows={3} cols={3} /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "28px 24px 32px" }}>
            <EmptyState
              icon={Building2}
              title={search ? "No parties match" : "No parties registered"}
              message={search ? "Try a different search term." : "Add the first party to get started."}
              action={!search && !showForm ? (
                <Btn small onClick={() => setShowForm(true)}>
                  <Plus size={13} /> New party
                </Btn>
              ) : null}
            />
          </div>
        ) : (
          <div style={{ padding: "12px 24px 16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.map(p => (
                <div key={p.id} style={{
                  display: "flex", gap: 14, alignItems: "center",
                  background: T.surfaceAlt, border: `1px solid ${T.borderLight}`,
                  borderRadius: T.radius.lg, padding: "14px 16px",
                  transition: "border-color 0.15s, background 0.15s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.surface; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = T.borderLight; e.currentTarget.style.background = T.surfaceAlt; }}
                >
                  <ImageUpload
                    currentUrl={imageUrl(p.symbol_path)}
                    onUpload={(file) => handleSymbolUpload(p, file)}
                    onRemove={() => handleSymbolRemove(p)}
                    uploading={uploading[p.id]}
                    label=""
                    size={52}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: T.text }}>{p.name}</span>
                      <AdminBadge map={{ [p.abbreviation]: { bg: T.accentLight, color: T.accent, label: p.abbreviation } }} status={p.abbreviation} />
                      {!p.is_active && <AdminBadge map={{ I: { bg: T.errorBg, color: T.error, label: "Inactive" } }} status="I" />}
                    </div>
                    {p.address && <p style={{ margin: 0, fontSize: 12, color: T.muted }}>{p.address}</p>}
                  </div>
                  <Btn variant="ghost" small onClick={() => setConfirmDel(p)} style={{ color: T.error }}>
                    <Trash2 size={14} />
                  </Btn>
                </div>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={handleDelete}
        title="Delete party"
        body={`Delete "${confirmDel?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
