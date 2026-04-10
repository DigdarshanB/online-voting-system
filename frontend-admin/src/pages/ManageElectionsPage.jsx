import React, { useState, useCallback } from "react";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import {
  Plus,
  Vote,
  Trash2,
  Settings2,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Landmark,
  LayoutList,
  Lock,
  RefreshCw,
} from "lucide-react";
import useElections from "../features/elections/hooks/useElections";
import {
  createElection,
  updateElection,
  deleteElection,
  generateStructure,
  getReadiness,
  configureElection,
  advanceElection,
  getMasterDataStatus,
  getContests,
} from "../features/elections/api/electionsApi";

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
  warnBg: "#FFFBEB",
  warn: "#D97706",
  purple: "#7C3AED",
  purpleBg: "#F5F3FF",
};

const STATUS_BADGES = {
  DRAFT: { bg: "#F1F5F9", color: "#475569", label: "Draft" },
  CONFIGURED: { bg: "#F5F3FF", color: "#7C3AED", label: "Configured" },
  NOMINATIONS_OPEN: { bg: "#ECFEFF", color: "#0891B2", label: "Nominations Open" },
  NOMINATIONS_CLOSED: { bg: "#E0F2FE", color: "#0284C7", label: "Nominations Closed" },
  CANDIDATE_LIST_PUBLISHED: { bg: "#DBEAFE", color: "#2563EB", label: "Candidates Published" },
  POLLING_OPEN: { bg: "#ECFDF5", color: "#059669", label: "Polling Open" },
  POLLING_CLOSED: { bg: "#FFFBEB", color: "#D97706", label: "Polling Closed" },
  COUNTING: { bg: "#FFF7ED", color: "#EA580C", label: "Counting" },
  FINALIZED: { bg: "#ECFDF5", color: "#047857", label: "Finalized" },
  ARCHIVED: { bg: "#F3F4F6", color: "#6B7280", label: "Archived" },
};

function StatusBadge({ status }) {
  const meta = STATUS_BADGES[status] || { bg: "#F1F5F9", color: "#475569", label: status };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 700,
        background: meta.bg,
        color: meta.color,
        letterSpacing: "0.02em",
      }}
    >
      {meta.label}
    </span>
  );
}

function formatDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const SUBTYPE_LABELS = {
  HOR_DIRECT: "House of Representatives (Direct)",
  PROVINCIAL_ASSEMBLY: "Provincial Assembly",
  LOCAL_MUNICIPAL: "Local – Municipal",
  LOCAL_RURAL: "Local – Rural Municipal",
};

const LEVEL_SUBTYPES = {
  FEDERAL: [{ value: "HOR_DIRECT", label: "House of Representatives (Direct)" }],
  PROVINCIAL: [{ value: "PROVINCIAL_ASSEMBLY", label: "Provincial Assembly" }],
  LOCAL: [
    { value: "LOCAL_MUNICIPAL", label: "Local – Municipal" },
    { value: "LOCAL_RURAL", label: "Local – Rural Municipal" },
  ],
};

const CONTEST_TYPE_COLORS = {
  FPTP:         { bg: "#DBEAFE", color: "#2563EB" },
  PR:           { bg: "#F5F3FF", color: "#7C3AED" },
  MAYOR:        { bg: "#ECFDF5", color: "#059669" },
  DEPUTY_MAYOR: { bg: "#FFF7ED", color: "#EA580C" },
};

function formatContestCounts(el) {
  const cc = el.contest_counts || {};
  const parts = Object.entries(cc)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${v} ${k}`);
  return parts.length > 0 ? parts.join(" + ") : `${el.contest_count} contests`;
}

/** Check if master data is ready for a given election level */
function isMasterDataReadyForLevel(masterData, level) {
  if (!masterData) return false;
  if (level === "FEDERAL") return masterData.federal_ready;
  if (level === "PROVINCIAL") return masterData.provincial_ready;
  if (level === "LOCAL") return masterData.local_ready;
  return false;
}

/* ══════════════════════════════════════════════════════════════ */
/*  MAIN PAGE COMPONENT                                         */
/* ══════════════════════════════════════════════════════════════ */

export default function ManageElectionsPage() {
  const { elections, loading, error, reload } = useElections();
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [masterData, setMasterData] = useState(null);
  const [masterDataLoading, setMasterDataLoading] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);

  const clearMessages = () => {
    setActionError(null);
    setActionSuccess(null);
  };

  const loadMasterData = useCallback(async () => {
    setMasterDataLoading(true);
    try {
      const data = await getMasterDataStatus();
      setMasterData(data);
    } catch {
      /* ignore */
    } finally {
      setMasterDataLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  /* ── Create handler ──────────────────────────────────────── */
  const handleCreate = async (formData) => {
    clearMessages();
    setActionLoading("create");
    try {
      await createElection(formData);
      setShowCreate(false);
      setActionSuccess("Election created successfully");
      reload();
    } catch (err) {
      setActionError(err?.response?.data?.detail || "Failed to create election");
    } finally {
      setActionLoading(null);
    }
  };

  /* ── Delete handler ──────────────────────────────────────── */
  const requestDelete = (id, status) => {
    setConfirmDel({ id, status });
  };

  const handleDelete = async () => {
    if (!confirmDel) return;
    const { id } = confirmDel;
    setConfirmDel(null);
    clearMessages();
    setActionLoading(`delete-${id}`);
    try {
      await deleteElection(id);
      setActionSuccess("Election deleted");
      setExpandedId(null);
      reload();
    } catch (err) {
      setActionError(err?.response?.data?.detail || "Failed to delete election");
    } finally {
      setActionLoading(null);
    }
  };

  /* ── Generate structure handler ──────────────────────────── */
  const handleGenerate = async (id) => {
    clearMessages();
    setActionLoading(`gen-${id}`);
    try {
      const result = await generateStructure(id);
      const parts = [];
      if (result.fptp_contests_created) parts.push(`${result.fptp_contests_created} FPTP`);
      if (result.pr_contests_created) parts.push(`${result.pr_contests_created} PR`);
      if (result.mayor_contests_created) parts.push(`${result.mayor_contests_created} Mayor/Chair`);
      if (result.deputy_mayor_contests_created) parts.push(`${result.deputy_mayor_contests_created} Deputy/Vice`);
      setActionSuccess(
        `Structure generated: ${parts.join(" + ")} = ${result.total_contests} contests`
      );
      reload();
    } catch (err) {
      setActionError(err?.response?.data?.detail || "Failed to generate structure");
    } finally {
      setActionLoading(null);
    }
  };

  /* ── Configure handler ───────────────────────────────────── */
  const handleConfigure = async (id) => {
    clearMessages();
    setActionLoading(`cfg-${id}`);
    try {
      await configureElection(id);
      setActionSuccess("Election configured and setup locked");
      reload();
    } catch (err) {
      setActionError(err?.response?.data?.detail || "Configuration failed");
    } finally {
      setActionLoading(null);
    }
  };

  /* ── Advance lifecycle handler ─────────────────────────────── */
  const handleAdvance = async (id, nextLabel) => {
    clearMessages();
    setActionLoading(`adv-${id}`);
    try {
      await advanceElection(id);
      setActionSuccess(`Election advanced to ${nextLabel}`);
      reload();
    } catch (err) {
      setActionError(err?.response?.data?.detail || "Failed to advance election status");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="admin-page-container" style={{ padding: "32px 40px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div className="admin-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: P.text, display: "flex", alignItems: "center", gap: 10 }}>
            <Vote size={22} strokeWidth={2.2} color={P.accent} />
            Manage Elections
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: P.muted }}>
            Create elections, generate contest structures, and manage setup lifecycle
          </p>
        </div>
        <button
          onClick={() => { clearMessages(); setShowCreate(true); }}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 20px", borderRadius: 10, border: "none",
            background: P.navy, color: "#FFF", fontWeight: 700, fontSize: 14,
            cursor: "pointer",
          }}
        >
          <Plus size={18} strokeWidth={2.5} />
          New Election
        </button>
      </div>

      {/* Master Data Banner */}
      {masterData && (!masterData.federal_ready || !masterData.provincial_ready || !masterData.local_ready) && (
        <div className="admin-context-band" style={{
          padding: "14px 20px", borderRadius: 10, marginBottom: 20,
          background: P.warnBg, border: `1px solid ${P.warn}30`,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <AlertTriangle size={20} color={P.warn} />
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: P.warn }}>Master Data Status</span>
            <span style={{ fontSize: 13, color: P.muted, marginLeft: 8 }}>
              Federal: {masterData.federal_ready ? "✓" : "✗"}
              {" · "}
              Provincial: {masterData.provincial_ready ? "✓" : "✗"}
              {" · "}
              Local: {masterData.local_ready ? "✓" : `✗ (${masterData.local_bodies || 0} bodies)`}
            </span>
          </div>
          <button
            onClick={loadMasterData}
            disabled={masterDataLoading}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 8, border: `1px solid ${P.border}`,
              background: P.surface, color: P.muted, fontWeight: 600, fontSize: 12,
              cursor: "pointer",
            }}
          >
            <RefreshCw size={14} className={masterDataLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      )}

      {/* Messages */}
      {actionError && (
        <div style={{
          padding: "12px 18px", borderRadius: 10, marginBottom: 16,
          background: P.errorBg, border: `1px solid ${P.error}30`,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <AlertTriangle size={18} color={P.error} />
          <span style={{ fontSize: 14, color: P.error, fontWeight: 600 }}>{actionError}</span>
        </div>
      )}
      {actionSuccess && (
        <div style={{
          padding: "12px 18px", borderRadius: 10, marginBottom: 16,
          background: P.successBg, border: `1px solid ${P.success}30`,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <CheckCircle2 size={18} color={P.success} />
          <span style={{ fontSize: 14, color: P.success, fontWeight: 600 }}>{actionSuccess}</span>
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <CreateElectionForm
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
          submitting={actionLoading === "create"}
          masterData={masterData}
        />
      )}

      {/* Election List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: P.muted }}>
          <Loader2 size={28} className="animate-spin" style={{ margin: "0 auto 12px" }} />
          <p>Loading elections…</p>
        </div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: 40, color: P.error }}>{error}</div>
      ) : elections.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "60px 40px", borderRadius: 14,
          background: P.surface, border: `1px solid ${P.border}`,
        }}>
          <Landmark size={40} color={P.muted} style={{ margin: "0 auto 16px", opacity: 0.4 }} />
          <p style={{ fontSize: 16, fontWeight: 700, color: P.text, margin: "0 0 6px" }}>
            No elections yet
          </p>
          <p style={{ fontSize: 14, color: P.muted }}>
            Create a new election to get started.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {elections.map((el) => (
            <ElectionCard
              key={el.id}
              election={el}
              expanded={expandedId === el.id}
              onToggle={() => setExpandedId(expandedId === el.id ? null : el.id)}
              onDelete={() => requestDelete(el.id, el.status)}
              onGenerate={() => handleGenerate(el.id)}
              onConfigure={() => handleConfigure(el.id)}
              onAdvance={(nextLabel) => handleAdvance(el.id, nextLabel)}
              actionLoading={actionLoading}
              masterData={masterData}
            />
          ))}
        </div>
      )}
      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={handleDelete}
        title="Delete Election"
        body={`Delete this ${confirmDel?.status === "ARCHIVED" ? "archived" : "draft"} election and all its associated data? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════ */
/*  CREATE FORM                                                 */
/* ══════════════════════════════════════════════════════════════ */

function CreateElectionForm({ onSubmit, onCancel, submitting, masterData }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [governmentLevel, setGovernmentLevel] = useState("FEDERAL");
  const [electionSubtype, setElectionSubtype] = useState("HOR_DIRECT");
  const [provinceCode, setProvinceCode] = useState("P1");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const handleLevelChange = (level) => {
    setGovernmentLevel(level);
    // Auto-select first valid subtype for the new level
    const subtypes = LEVEL_SUBTYPES[level] || [];
    setElectionSubtype(subtypes[0]?.value || "");
    // Reset province to first available when switching to PROVINCIAL
    if (level === "PROVINCIAL") {
      const provinces = masterData?.province_list || [];
      setProvinceCode(provinces[0]?.code || "P1");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      government_level: governmentLevel,
      election_subtype: electionSubtype,
      province_code: governmentLevel === "PROVINCIAL" ? provinceCode : null,
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
    });
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 8,
    border: `1px solid ${P.border}`,
    fontSize: 14,
    fontFamily: "inherit",
    color: P.text,
    background: P.surface,
    boxSizing: "border-box",
  };

  const labelStyle = {
    display: "block",
    fontSize: 13,
    fontWeight: 700,
    color: P.text,
    marginBottom: 6,
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: P.surface,
        borderRadius: 14,
        border: `1px solid ${P.border}`,
        padding: "28px 32px",
        marginBottom: 20,
      }}
    >
      <h3 style={{ margin: "0 0 20px", fontSize: 17, fontWeight: 800, color: P.navy }}>
        New Election
      </h3>

      <div className="admin-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Title</label>
          <input
            style={inputStyle}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Federal HoR Election 2083"
            required
            minLength={3}
            maxLength={255}
          />
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Description (optional)</label>
          <textarea
            style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional notes about this election"
          />
        </div>

        <div>
          <label style={labelStyle}>Government Level</label>
          <select style={inputStyle} value={governmentLevel} onChange={(e) => handleLevelChange(e.target.value)}>
            <option value="FEDERAL">Federal</option>
            <option value="PROVINCIAL">Provincial</option>
            <option value="LOCAL">Local</option>
          </select>
        </div>

        <div>
          <label style={labelStyle}>Election Type</label>
          <select style={inputStyle} value={electionSubtype} onChange={(e) => setElectionSubtype(e.target.value)}>
            {(LEVEL_SUBTYPES[governmentLevel] || []).map((st) => (
              <option key={st.value} value={st.value}>{st.label}</option>
            ))}
          </select>
        </div>

        {governmentLevel === "PROVINCIAL" && (
          <div>
            <label style={labelStyle}>Province</label>
            <select
              style={inputStyle}
              value={provinceCode}
              onChange={(e) => setProvinceCode(e.target.value)}
              required
            >
              {(masterData?.province_list || [
                { code: "P1", name: "Koshi Province" },
                { code: "P2", name: "Madhesh Province" },
                { code: "P3", name: "Bagmati Province" },
                { code: "P4", name: "Gandaki Province" },
                { code: "P5", name: "Lumbini Province" },
                { code: "P6", name: "Karnali Province" },
                { code: "P7", name: "Sudurpashchim Province" },
              ]).map((p) => (
                <option key={p.code} value={p.code}>{p.name} ({p.code})</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label style={labelStyle}>Start Time</label>
          <input
            type="datetime-local"
            style={inputStyle}
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </div>

        <div>
          <label style={labelStyle}>End Time</label>
          <input
            type="datetime-local"
            style={inputStyle}
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: "9px 20px", borderRadius: 8, border: `1px solid ${P.border}`,
            background: P.surface, color: P.muted, fontWeight: 600, fontSize: 14,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: "9px 20px", borderRadius: 8, border: "none",
            background: P.navy, color: "#FFF", fontWeight: 700, fontSize: 14,
            cursor: submitting ? "not-allowed" : "pointer",
            opacity: submitting ? 0.6 : 1,
            display: "flex", alignItems: "center", gap: 8,
          }}
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          Create Draft Election
        </button>
      </div>
    </form>
  );
}


/* ══════════════════════════════════════════════════════════════ */
/*  ELECTION CARD                                               */
/* ══════════════════════════════════════════════════════════════ */

function ElectionCard({
  election: el,
  expanded,
  onToggle,
  onDelete,
  onGenerate,
  onConfigure,
  onAdvance,
  actionLoading,
  masterData,
}) {
  const masterDataReady = isMasterDataReadyForLevel(masterData, el.government_level);
  const [readiness, setReadiness] = useState(null);
  const [contests, setContests] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const isDraft = el.status === "DRAFT";
  const hasContests = el.contest_count > 0;

  React.useEffect(() => {
    if (!expanded) {
      setReadiness(null);
      setContests(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setDetailLoading(true);
      try {
        const [r, c] = await Promise.all([getReadiness(el.id), getContests(el.id)]);
        if (!cancelled) {
          setReadiness(r);
          setContests(c);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [expanded, el.id, el.contest_count]);

  return (
    <div
      style={{
        background: P.surface,
        borderRadius: 14,
        border: `1px solid ${expanded ? P.accent + "40" : P.border}`,
        overflow: "hidden",
        transition: "border-color 0.2s",
      }}
    >
      {/* Header row */}
      <button
        onClick={onToggle}
        className="admin-election-card-header"
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "18px 24px",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <ChevronRight
          size={18}
          color={P.muted}
          style={{
            transition: "transform 0.2s",
            transform: expanded ? "rotate(90deg)" : "none",
            flexShrink: 0,
          }}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: P.text }}>{el.title}</span>
            <StatusBadge status={el.status} />
          </div>
          <div style={{ fontSize: 13, color: P.muted, marginTop: 4, display: "flex", gap: 16, flexWrap: "wrap" }}>
            <span>{SUBTYPE_LABELS[el.election_subtype] || el.election_subtype}</span>
            {el.province_code && (
              <span style={{ fontWeight: 600, color: P.purple }}>
                {el.province_code}
              </span>
            )}
            <span>{formatDateTime(el.start_time)} — {formatDateTime(el.end_time)}</span>
          </div>
        </div>

        {/* Contest badge */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          {hasContests ? (
            <span style={{
              padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
              background: P.successBg, color: P.success,
            }}>
              <LayoutList size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />
              {formatContestCounts(el)}
            </span>
          ) : isDraft ? (
            <span style={{
              padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
              background: P.warnBg, color: P.warn,
            }}>
              No contests
            </span>
          ) : null}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: "0 24px 20px", borderTop: `1px solid ${P.border}` }}>
          {detailLoading ? (
            <div style={{ padding: "24px 0", textAlign: "center", color: P.muted }}>
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : (
            <>
              {/* Readiness panel */}
              {readiness && (
                <div style={{
                  marginTop: 16, padding: "16px 20px", borderRadius: 10,
                  background: readiness.ready ? P.successBg : P.warnBg,
                  border: `1px solid ${readiness.ready ? P.success : P.warn}20`,
                }}>
                  <div style={{
                    fontWeight: 700, fontSize: 14,
                    color: readiness.ready ? P.success : P.warn,
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    {readiness.ready ? (
                      <><CheckCircle2 size={16} /> Structure Ready</>
                    ) : (
                      <><AlertTriangle size={16} /> Structure Not Ready</>
                    )}
                  </div>
                  {!readiness.ready && readiness.issues.length > 0 && (
                    <ul style={{
                      margin: "8px 0 0", paddingLeft: 24,
                      fontSize: 13, color: P.warn, lineHeight: 1.6,
                    }}>
                      {readiness.issues.map((issue, i) => <li key={i}>{issue}</li>)}
                    </ul>
                  )}
                  <div style={{ marginTop: 8, fontSize: 13, color: P.muted }}>
                    Total contests: {readiness.total_contests}
                    {readiness.contest_counts && Object.entries(readiness.contest_counts)
                      .filter(([, v]) => v > 0)
                      .map(([k, v]) => ` · ${k}: ${v}`)
                    }
                    {readiness.total_constituencies > 0 && ` · Constituencies: ${readiness.total_constituencies}`}
                  </div>
                </div>
              )}

              {/* Contest summary */}
              {contests && contests.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: P.text, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                    <LayoutList size={16} color={P.accent} />
                    Contest Structure ({contests.length} total)
                  </div>
                  <div className="admin-table-wrap" style={{
                    maxHeight: 260, overflowY: "auto",
                    border: `1px solid ${P.border}`, borderRadius: 10,
                  }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "#F8FAFC" }}>
                          <th style={{ padding: "8px 14px", textAlign: "left", fontWeight: 700, color: P.muted, borderBottom: `1px solid ${P.border}` }}>Type</th>
                          <th style={{ padding: "8px 14px", textAlign: "left", fontWeight: 700, color: P.muted, borderBottom: `1px solid ${P.border}` }}>Contest Title</th>
                          <th style={{ padding: "8px 14px", textAlign: "right", fontWeight: 700, color: P.muted, borderBottom: `1px solid ${P.border}` }}>Seats</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contests.map((c) => (
                          <tr key={c.id} style={{ borderBottom: `1px solid ${P.border}` }}>
                            <td style={{ padding: "7px 14px" }}>
                              <span style={{
                                display: "inline-block", padding: "2px 8px", borderRadius: 4,
                                fontSize: 11, fontWeight: 700,
                                background: (CONTEST_TYPE_COLORS[c.contest_type] || { bg: "#F1F5F9" }).bg,
                                color: (CONTEST_TYPE_COLORS[c.contest_type] || { color: "#475569" }).color,
                              }}>
                                {c.contest_type}
                              </span>
                            </td>
                            <td style={{ padding: "7px 14px", color: P.text }}>{c.title}</td>
                            <td style={{ padding: "7px 14px", textAlign: "right", fontWeight: 600, color: P.text }}>{c.seat_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Actions */}
              {isDraft && (
                <div className="admin-election-actions" style={{
                  marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap",
                  paddingTop: 16, borderTop: `1px solid ${P.border}`,
                }}>
                  {!hasContests && (
                    <button
                      onClick={onGenerate}
                      disabled={actionLoading === `gen-${el.id}` || !masterDataReady}
                      title={!masterDataReady ? "Required geography data not yet seeded" : "Generate contest structure"}
                      style={{
                        display: "flex", alignItems: "center", gap: 7,
                        padding: "9px 18px", borderRadius: 8, border: "none",
                        background: P.accent, color: "#FFF", fontWeight: 700, fontSize: 13,
                        cursor: !masterDataReady ? "not-allowed" : "pointer",
                        opacity: !masterDataReady ? 0.5 : 1,
                      }}
                    >
                      {actionLoading === `gen-${el.id}` ? <Loader2 size={15} className="animate-spin" /> : <Settings2 size={15} />}
                      Generate Structure
                    </button>
                  )}

                  {hasContests && readiness?.ready && (
                    <button
                      onClick={onConfigure}
                      disabled={actionLoading === `cfg-${el.id}`}
                      style={{
                        display: "flex", alignItems: "center", gap: 7,
                        padding: "9px 18px", borderRadius: 8, border: "none",
                        background: P.success, color: "#FFF", fontWeight: 700, fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      {actionLoading === `cfg-${el.id}` ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />}
                      Lock Setup (Configure)
                    </button>
                  )}

                  <button
                    onClick={onDelete}
                    disabled={actionLoading === `delete-${el.id}`}
                    style={{
                      display: "flex", alignItems: "center", gap: 7,
                      padding: "9px 18px", borderRadius: 8,
                      border: `1px solid ${P.error}40`,
                      background: P.errorBg, color: P.error, fontWeight: 700, fontSize: 13,
                      cursor: "pointer", marginLeft: "auto",
                    }}
                  >
                    {actionLoading === `delete-${el.id}` ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                    Delete Draft
                  </button>
                </div>
              )}

              {/* Locked elections — lifecycle advance buttons */}
              {!isDraft && (() => {
                const TRANSITIONS = {
                  CONFIGURED: { next: "Nominations Open", icon: ChevronRight, color: "#06B6D4" },
                  NOMINATIONS_OPEN: { next: "Nominations Closed", icon: Lock, color: "#0EA5E9" },
                  NOMINATIONS_CLOSED: { next: "Candidate List Published", icon: CheckCircle2, color: "#2563EB" },
                  CANDIDATE_LIST_PUBLISHED: { next: "Polling Open", icon: ChevronRight, color: "#16A34A" },
                  POLLING_OPEN: { next: "Polling Closed", icon: Lock, color: "#F59E0B" },
                  FINALIZED: { next: "Archived", icon: ChevronRight, color: "#6B7280" },
                };
                const t = TRANSITIONS[el.status];
                return (
                  <div className="admin-election-actions" style={{
                    marginTop: 16, padding: "12px 16px", borderRadius: 8,
                    background: "#F8FAFC", fontSize: 13, color: P.muted,
                    display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
                  }}>
                    <Lock size={14} />
                    <span>
                      This election is in <strong style={{ color: P.text }}>{el.status}</strong> state.
                    </span>
                    {t && (
                      <button
                        onClick={() => onAdvance(t.next)}
                        disabled={!!actionLoading}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "7px 16px", borderRadius: 8, border: "none",
                          background: t.color, color: "#FFF", fontWeight: 700, fontSize: 13,
                          cursor: actionLoading ? "not-allowed" : "pointer",
                          opacity: actionLoading ? 0.6 : 1, marginLeft: "auto",
                        }}
                      >
                        {actionLoading === `adv-${el.id}` ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <t.icon size={14} />
                        )}
                        Advance → {t.next}
                      </button>
                    )}
                    {el.status === "ARCHIVED" && (
                      <button
                        onClick={onDelete}
                        disabled={actionLoading === `delete-${el.id}`}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "7px 16px", borderRadius: 8,
                          border: `1px solid ${P.error}40`,
                          background: P.errorBg, color: P.error, fontWeight: 700, fontSize: 13,
                          cursor: "pointer", marginLeft: t ? 0 : "auto",
                        }}
                      >
                        {actionLoading === `delete-${el.id}` ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        Delete Archived
                      </button>
                    )}
                  </div>
                );
              })()}
            </>
          )}
        </div>
      )}
    </div>
  );
}
