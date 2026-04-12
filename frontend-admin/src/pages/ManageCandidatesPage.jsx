import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2, Landmark, MapPin, ChevronRight, Plus, Trash2,
  UserCheck, Layers, MoreHorizontal, Archive,
} from "lucide-react";
import { T } from "../components/ui/tokens";
import {
  PageContainer, AdminBadge, Btn,
  SearchInput, Toast, AdminKeyframes, imageUrl, errMsg,
} from "../components/ui/AdminUI";
import useParties from "../features/candidates/hooks/useParties";
import { createParty, deleteParty, uploadPartySymbol, removePartySymbol } from "../features/candidates/api/candidatesApi";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import ProfileMediaMenu from "../components/ui/ProfileMediaMenu";
import EmptyState from "../components/ui/EmptyState";
import { TableSkeleton } from "../components/ui/Skeleton";

/* ── Shared form styles ──────────────────────────────────────── */
const lbl = { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 600, color: T.textSecondary };
const inp = { padding: "8px 12px", borderRadius: T.radius.md, border: `1px solid ${T.border}`, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box", background: "#fff", color: T.text };

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
  },
  {
    key: "provincial",
    label: "Provincial Candidates",
    description: "Provincial Assembly nominations and candidate management across all 7 provinces",
    icon: Building2,
    color: T.purple,
    bg: T.purpleBg,
    to: "/admin/manage-candidates/provincial",
    ready: true,
  },
  {
    key: "local",
    label: "Local Candidates",
    description: "Municipal and Rural Municipal candidate operations, including ward-level nominations",
    icon: MapPin,
    color: T.orange,
    bg: T.orangeBg,
    to: "/admin/manage-candidates/local",
    ready: true,
  },
];

function DiagonalStripe() {
  return (
    <svg
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <pattern id="diag-stripe" patternUnits="userSpaceOnUse" width="16" height="16" patternTransform="rotate(45)">
          <line x1="0" y="0" x2="0" y2="16" stroke={T.navy} strokeWidth="1.5" strokeOpacity="0.04" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#diag-stripe)" />
    </svg>
  );
}


export default function ManageCandidatesPage() {
  const navigate = useNavigate();
  const [msg, setMsg] = useState(null);
  const { parties } = useParties();

  return (
    <PageContainer>
      <AdminKeyframes />
      <Toast msg={msg} onClose={() => setMsg(null)} />

      {/* ── Hero Strip ── */}
      <HeroStrip partyCount={parties.length} />

      {/* ═══════════════════════════════════════════════════ */}
      {/*  SECTION 1 — Party Registry                       */}
      {/* ═══════════════════════════════════════════════════ */}
      <PartiesSection msg={msg} setMsg={setMsg} />

      {/* ═══════════════════════════════════════════════════ */}
      {/*  SECTION 2 — Workspace cards                      */}
      {/* ═══════════════════════════════════════════════════ */}
      <WorkspacesSection navigate={navigate} setMsg={setMsg} />
    </PageContainer>
  );
}


/* ══════════════════════════════════════════════════════════════ */
/*  HERO STRIP                                                   */
/* ══════════════════════════════════════════════════════════════ */
function HeroStrip({ partyCount }) {
  const pills = [
    { label: `${partyCount} ${partyCount === 1 ? "Party" : "Parties"}`, color: T.accent, bg: T.accentLight },
    { label: "3 Election Levels", color: T.purple, bg: T.purpleBg },
    { label: "All Levels Active", color: T.success, bg: T.successBg },
  ];
  return (
    <div
      className="admin-hero-strip"
      style={{
        position: "relative", overflow: "hidden",
        background: T.surface,
        borderLeft: `4px solid ${T.accent}`,
        borderRadius: T.radius.xl,
        border: `1px solid ${T.border}`,
        padding: "28px 32px",
        marginBottom: T.space["2xl"],
        boxShadow: T.shadow.md,
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        gap: 24, flexWrap: "wrap",
      }}
    >
      <DiagonalStripe />
      {/* Left: icon tile + title/subtitle */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, zIndex: 1, flex: 1, minWidth: 240 }}>
        <div style={{
          width: 64, height: 64, borderRadius: T.radius.lg, flexShrink: 0,
          background: `linear-gradient(135deg, #1a3a6e 0%, ${T.accent} 100%)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 4px 16px ${T.accent}30`,
        }}>
          <UserCheck size={30} color="#fff" strokeWidth={2} />
        </div>
        <div>
          <h1 style={{
            margin: 0, fontSize: "clamp(19px, 2.4vw, 26px)",
            fontWeight: 800, color: T.navy, letterSpacing: "-0.02em", lineHeight: 1.2,
          }}>
            Candidate Administration
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: T.muted, lineHeight: 1.55, maxWidth: 460 }}>
            Manage the shared party registry and open election-level candidate workspaces for federal, provincial, and local elections.
          </p>
        </div>
      </div>
      {/* Right: stat pills */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", zIndex: 1 }}>
        {pills.map((p, i) => (
          <span key={i} style={{
            padding: "8px 16px", borderRadius: 20,
            fontSize: 12, fontWeight: 700, letterSpacing: "0.01em",
            background: p.bg, color: p.color,
            border: `1px solid ${p.color}25`, whiteSpace: "nowrap",
          }}>
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}


function WorkspacesSection({ navigate, setMsg }) {
  return (
    <div>
      {/* Section heading */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: T.space.lg }}>
        <div style={{
          width: 32, height: 32, borderRadius: T.radius.md,
          background: T.surfaceAlt, border: `1px solid ${T.borderLight}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Layers size={16} color={T.navy} strokeWidth={2.2} />
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

      <div className="admin-workspace-grid" style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        gap: 20,
      }}>
        {WORKSPACES.map(ws => (
          <WorkspaceCard key={ws.key} ws={ws} navigate={navigate} setMsg={setMsg} />
        ))}
      </div>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════ */
/*  WORKSPACE CARD — feature card with level accent banner       */
/* ══════════════════════════════════════════════════════════════ */
function WorkspaceCard({ ws, navigate, setMsg }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const Icon = ws.icon;
  const isActive = ws.ready;
  const highlight = hovered || focused;

  const handleClick = () => {
    if (!isActive) {
      setMsg({ type: "warn", text: "This workspace is under development." });
      return;
    }
    navigate(ws.to);
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        display: "flex", flexDirection: "column",
        padding: 0, borderRadius: T.radius.xl,
        border: `1.5px solid ${focused ? ws.color : highlight && isActive ? ws.color + "55" : T.border}`,
        background: T.surface,
        cursor: isActive ? "pointer" : "not-allowed",
        textAlign: "left",
        boxShadow: focused
          ? T.focusRing
          : highlight && isActive
            ? `0 8px 24px ${ws.color}14, ${T.shadow.md}`
            : T.shadow.sm,
        transform: highlight && isActive ? "translateY(-2px)" : "none",
        transition: "all 0.2s ease",
        outline: "none",
        overflow: "hidden",
        opacity: isActive ? 1 : 0.72,
        position: "relative",
      }}
    >
      {/* 8px top accent banner */}
      <div style={{ height: 8, width: "100%", background: ws.color, flexShrink: 0 }} />

      {/* Card body */}
      <div style={{ padding: "20px 22px 0", display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
        {/* Icon tile (48×48) */}
        <div style={{
          width: 48, height: 48, borderRadius: T.radius.lg, flexShrink: 0,
          background: highlight && isActive ? ws.color + "20" : ws.bg,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background 0.2s",
        }}>
          <Icon size={22} color={ws.color} strokeWidth={2.2} />
        </div>

        {/* Title */}
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.text, lineHeight: 1.3 }}>
          {ws.label}
        </h3>

        {/* Status badge */}
        <span style={{
          display: "inline-block", alignSelf: "flex-start",
          fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 6,
          background: isActive ? T.successBg : ws.bg,
          color: isActive ? T.success : ws.color,
          border: `1px solid ${isActive ? T.successBorder : ws.color + "30"}`,
          letterSpacing: "0.02em",
        }}>
          {isActive ? "Active" : "Coming Soon"}
        </span>

        {/* Description */}
        <p style={{ margin: 0, fontSize: 13, color: T.muted, lineHeight: 1.55 }}>
          {ws.description}
        </p>

        {/* Divider */}
        <div style={{ height: 1, background: T.borderLight }} />

        {/* Mini stats row */}
        <div style={{ display: "flex", gap: 20 }}>
          {[["0", "Profiles"], ["0", "Nominations"]].map(([val, lbl]) => (
            <div key={lbl} style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: T.text, lineHeight: 1 }}>{val}</span>
              <span style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>{lbl}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer CTA */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "13px 22px", marginTop: 14,
        borderTop: `1px solid ${highlight && isActive ? ws.color + "18" : T.borderLight}`,
        color: highlight && isActive ? ws.color : T.muted,
        fontSize: 13, fontWeight: 600,
        transition: "all 0.18s",
      }}>
        {isActive ? "Open Workspace" : "Under Development"}
        <ChevronRight
          size={14}
          style={{ transition: "transform 0.18s", transform: highlight && isActive ? "translateX(2px)" : "none" }}
        />
      </div>

      {/* Coming Soon overlay */}
      {!isActive && (
        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(255,255,255,0.30)",
          borderRadius: T.radius.xl,
          pointerEvents: "none",
        }} />
      )}
    </button>
  );
}


/* ══════════════════════════════════════════════════════════════ */
/*  PARTIES SECTION — two-zone: header bar + party grid          */
/* ══════════════════════════════════════════════════════════════ */
function PartiesSection({ setMsg }) {
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
    return parties.filter(p =>
      p.name.toLowerCase().includes(q) || p.abbreviation.toLowerCase().includes(q)
    );
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

  const radius = T.radius.xl;

  return (
    <div style={{ marginBottom: T.space["2xl"] }}>
      {/* ── Zone A: header bar ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: T.surface,
        border: `1.5px solid ${T.borderStrong}`,
        borderRadius: `${radius}px ${radius}px 0 0`,
        padding: "16px 24px",
        flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: T.radius.md,
            background: T.accentLight, border: `1px solid ${T.accent}20`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Building2 size={18} color={T.accent} strokeWidth={2.2} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: T.navy, lineHeight: 1.3 }}>
              Party Registry
            </h2>
            <p style={{ margin: 0, fontSize: 12, color: T.muted }}>
              Shared master data across all election levels
            </p>
          </div>
          {parties.length > 0 && (
            <span style={{
              padding: "3px 10px", borderRadius: 20,
              fontSize: 11, fontWeight: 700,
              background: T.accentLight, color: T.accent,
              border: `1px solid ${T.accent}20`,
            }}>
              {parties.length} registered
            </span>
          )}
        </div>
        <Btn small onClick={() => setShowForm(s => !s)}>
          <Plus size={13} /> {showForm ? "Cancel" : "New Party"}
        </Btn>
      </div>

      {/* ── Zone A.2: create form (slide-in) ── */}
      {showForm && (
        <div style={{
          background: T.surfaceAlt,
          border: `1.5px solid ${T.borderStrong}`, borderTop: "none",
          padding: 20, animation: "adminFadeInDown 0.18s ease",
        }}>
          <div className="admin-form-grid" style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12, marginBottom: 12,
          }}>
            <label style={lbl}>Name *<input style={inp} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
            <label style={lbl}>Abbreviation *<input style={inp} value={form.abbreviation} onChange={e => setForm({ ...form, abbreviation: e.target.value })} /></label>
            <label style={lbl}>Address<input style={inp} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></label>
          </div>
          <Btn onClick={handleCreate} loading={saving}>Create party</Btn>
        </div>
      )}

      {/* ── Zone A.3: search toolbar ── */}
      <div style={{
        background: T.surface,
        border: `1.5px solid ${T.borderStrong}`, borderTop: "none",
        padding: "10px 20px",
        borderBottom: `1px solid ${T.borderLight}`,
      }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search parties…" />
      </div>

      {/* ── Zone B: party grid ── */}
      <div style={{
        background: T.surface,
        border: `1.5px solid ${T.borderStrong}`, borderTop: "none",
        borderRadius: `0 0 ${radius}px ${radius}px`,
        padding: loading || filtered.length === 0 ? 0 : 16,
        minHeight: 64,
      }}>
        {loading ? (
          <div style={{ padding: "16px 24px" }}><TableSkeleton rows={3} cols={3} /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "32px 28px 36px" }}>
            <EmptyState
              icon={Archive}
              title={search ? "No parties match" : "No parties registered"}
              message={search ? "Try a different search term." : "Add the first party to get started."}
              action={!search && !showForm ? (
                <Btn small onClick={() => setShowForm(true)}>
                  <Plus size={13} /> Add First Party
                </Btn>
              ) : null}
            />
          </div>
        ) : (
          <div className="admin-party-grid" style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 12,
          }}>
            {filtered.map(p => (
              <PartyTile
                key={p.id}
                party={p}
                uploading={uploading[p.id]}
                onUpload={file => handleSymbolUpload(p, file)}
                onRemove={() => handleSymbolRemove(p)}
                onDelete={() => setConfirmDel(p)}
              />
            ))}
          </div>
        )}
      </div>

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


/* ══════════════════════════════════════════════════════════════ */
/*  PARTY TILE — grid card with symbol, 3-dot menu, metadata    */
/* ══════════════════════════════════════════════════════════════ */

const PARTY_TILE_COLORS = [T.accent, T.purple, T.orange, T.teal, "#BE185D", "#059669"];

function PartyTile({ party, uploading, onUpload, onRemove, onDelete }) {
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Deterministic accent colour from abbreviation
  const accentColor = PARTY_TILE_COLORS[party.abbreviation.charCodeAt(0) % PARTY_TILE_COLORS.length];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setMenuOpen(false); }}
      style={{
        background: T.surface,
        border: `1px solid ${hovered ? T.borderStrong : T.borderLight}`,
        borderRadius: T.radius.lg,
        padding: 16,
        boxShadow: hovered ? T.shadow.md : T.shadow.sm,
        transform: hovered ? "translateY(-1px)" : "none",
        transition: "all 0.18s ease",
        position: "relative",
        display: "flex", flexDirection: "column", gap: 12,
        animation: "adminFadeIn 0.2s ease",
      }}
    >
      {/* Top row: symbol image + 3-dot menu */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <ProfileMediaMenu
          currentUrl={imageUrl(party.symbol_path)}
          onUpload={onUpload}
          onRemove={onRemove}
          uploading={uploading}
          size={64}
          shape="square"
        />
        {/* Three-dot menu */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setMenuOpen(m => !m)}
            aria-label="Party options"
            style={{
              width: 30, height: 30, borderRadius: T.radius.sm,
              background: menuOpen ? T.surfaceAlt : "transparent",
              border: `1px solid ${menuOpen ? T.borderLight : "transparent"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: T.muted, transition: "all 0.15s",
            }}
            onMouseEnter={e => { if (!menuOpen) { e.currentTarget.style.background = T.surfaceAlt; e.currentTarget.style.borderColor = T.borderLight; } }}
            onMouseLeave={e => { if (!menuOpen) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; } }}
          >
            <MoreHorizontal size={15} />
          </button>
          {menuOpen && (
            <div style={{
              position: "absolute", right: 0, top: 34, zIndex: 200,
              background: T.surface, border: `1px solid ${T.border}`,
              borderRadius: T.radius.md, boxShadow: T.shadow.lg,
              minWidth: 130, overflow: "hidden",
              animation: "adminFadeIn 0.12s ease",
            }}>
              <button
                onClick={() => { setMenuOpen(false); onDelete(); }}
                style={{
                  display: "flex", width: "100%", alignItems: "center", gap: 8,
                  padding: "9px 14px", background: "none", border: "none",
                  cursor: "pointer", fontSize: 13, color: T.error, transition: "background 0.12s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = T.errorBg; }}
                onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Party info */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: T.text, lineHeight: 1.3 }}>{party.name}</span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5,
            background: accentColor + "18", color: accentColor, letterSpacing: "0.03em",
          }}>
            {party.abbreviation}
          </span>
          {party.is_active === false && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5,
              background: T.errorBg, color: T.error, letterSpacing: "0.03em",
            }}>
              Inactive
            </span>
          )}
        </div>
        {party.address && (
          <p style={{ margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.5 }}>{party.address}</p>
        )}
      </div>

      {/* Bottom faint divider line */}
      <div style={{ height: 1, background: T.borderLight, marginTop: -4 }} />
    </div>
  );
}

