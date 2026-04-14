import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Trash2, Settings2, ChevronRight, AlertTriangle, CheckCircle2,
  Loader2, Landmark, LayoutList, Lock, RefreshCw, ChevronDown,
  Vote, Users, BarChart3, FileText, Shield, Clock,
} from "lucide-react";
import useElections from "../features/elections/hooks/useElections";
import {
  createElection, deleteElection, generateStructure, getReadiness,
  configureElection, advanceElection, getMasterDataStatus, getContests,
} from "../features/elections/api/electionsApi";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { T, STATUS_MAP, CONTEST_COLORS } from "../components/ui/tokens";
import {
  PageContainer, BackLink, StatusBanner,
  SectionCard, SectionHeader, AdminBadge, Btn, WorkflowTimeline,
  AdminKeyframes, formatDateTime, inputStyle, labelStyle,
} from "../components/ui/AdminUI";

/* ── Constants ───────────────────────────────────────────────── */
const SUBTYPE_LABELS = {
  HOR_DIRECT: "House of Representatives (Direct)",
  PROVINCIAL_ASSEMBLY: "Provincial Assembly",
  LOCAL_MUNICIPAL: "Local — Municipal",
  LOCAL_RURAL: "Local — Rural Municipal",
};

const LIFECYCLE_STEPS = [
  { key: "DRAFT", label: "Draft" },
  { key: "CONFIGURED", label: "Configured" },
  { key: "NOMINATIONS_OPEN", label: "Nominations open" },
  { key: "NOMINATIONS_CLOSED", label: "Nominations closed" },
  { key: "CANDIDATE_LIST_PUBLISHED", label: "Candidates published" },
  { key: "POLLING_OPEN", label: "Polling open" },
  { key: "POLLING_CLOSED", label: "Polling closed" },
  { key: "COUNTING", label: "Counting" },
  { key: "FINALIZED", label: "Finalized" },
  { key: "ARCHIVED", label: "Archived" },
];

const LIFECYCLE_DETAIL = [
  { key: "DRAFT", label: "Draft", description: "Election created, metadata defined. Structure not yet generated." },
  { key: "STRUCTURE", label: "Structure generated", description: "Contest structure built from geography master data (165 FPTP + 1 PR)." },
  { key: "CONFIGURED", label: "Configured", description: "Setup locked. Structure cannot be modified. Ready for nominations." },
  { key: "NOMINATIONS_OPEN", label: "Nominations open", description: "Candidate nominations and PR list submissions can be filed." },
  { key: "NOMINATIONS_CLOSED", label: "Nominations closed", description: "Nomination window closed. Lists under review." },
  { key: "CANDIDATE_LIST_PUBLISHED", label: "Candidates published", description: "Official candidate lists published. Ready for polling." },
  { key: "POLLING_OPEN", label: "Polling open", description: "Voting period active. Voters can cast ballots." },
  { key: "POLLING_CLOSED", label: "Polling closed", description: "Voting period ended. Ballots sealed for counting." },
  { key: "COUNTING", label: "Counting", description: "Ballot counting and result tallying in progress." },
  { key: "FINALIZED", label: "Finalized", description: "Results certified and locked. Winners declared." },
  { key: "ARCHIVED", label: "Archived", description: "Election record preserved for institutional audit." },
];

function formatContestCounts(el) {
  const cc = el.contest_counts || {};
  const parts = Object.entries(cc).filter(([, v]) => v > 0).map(([k, v]) => `${v} ${k}`);
  return parts.length > 0 ? parts.join(" + ") : `${el.contest_count} contests`;
}

/* ══════════════════════════════════════════════════════════════ */
/*  MAIN PAGE                                                    */
/* ══════════════════════════════════════════════════════════════ */

export default function ManageFederalElectionsPage() {
  const navigate = useNavigate();
  const { elections: allElections, loading, error, reload } = useElections();
  const elections = allElections.filter((el) => el.government_level === "FEDERAL");

  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [masterData, setMasterData] = useState(null);
  const [masterDataLoading, setMasterDataLoading] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);

  const clearMessages = () => { setActionError(null); setActionSuccess(null); };

  const loadMasterData = useCallback(async () => {
    setMasterDataLoading(true);
    try { setMasterData(await getMasterDataStatus()); }
    catch { /* ignore */ }
    finally { setMasterDataLoading(false); }
  }, []);

  React.useEffect(() => { loadMasterData(); }, [loadMasterData]);

  /* ── Handlers ─────────────────────────────────────────── */
  const handleCreate = async (formData) => {
    clearMessages(); setActionLoading("create");
    try {
      await createElection(formData);
      setShowCreate(false);
      setActionSuccess("Election created successfully");
      reload();
    } catch (err) {
      setActionError(err?.response?.data?.detail || "Failed to create election");
    } finally { setActionLoading(null); }
  };

  const requestDelete = (id, status) => setConfirmDel({ id, status });

  const handleDelete = async () => {
    if (!confirmDel) return;
    setConfirmDel(null); clearMessages(); setActionLoading(`delete-${confirmDel.id}`);
    try {
      await deleteElection(confirmDel.id);
      setActionSuccess("Election deleted"); setExpandedId(null); reload();
    } catch (err) {
      setActionError(err?.response?.data?.detail || "Failed to delete election");
    } finally { setActionLoading(null); }
  };

  const handleGenerate = async (id) => {
    clearMessages(); setActionLoading(`gen-${id}`);
    try {
      const result = await generateStructure(id);
      const parts = [];
      if (result.fptp_contests_created) parts.push(`${result.fptp_contests_created} FPTP`);
      if (result.pr_contests_created) parts.push(`${result.pr_contests_created} PR`);
      if (result.mayor_contests_created) parts.push(`${result.mayor_contests_created} Mayor/Chair`);
      if (result.deputy_mayor_contests_created) parts.push(`${result.deputy_mayor_contests_created} Deputy/Vice`);
      setActionSuccess(`Structure generated: ${parts.join(" + ")} = ${result.total_contests} contests`);
      reload();
    } catch (err) {
      setActionError(err?.response?.data?.detail || "Failed to generate structure");
    } finally { setActionLoading(null); }
  };

  const handleConfigure = async (id) => {
    clearMessages(); setActionLoading(`cfg-${id}`);
    try {
      await configureElection(id);
      setActionSuccess("Election configured and setup locked"); reload();
    } catch (err) {
      setActionError(err?.response?.data?.detail || "Configuration failed");
    } finally { setActionLoading(null); }
  };

  const handleAdvance = async (id, nextLabel) => {
    clearMessages(); setActionLoading(`adv-${id}`);
    try {
      await advanceElection(id);
      setActionSuccess(`Election advanced to ${nextLabel}`); reload();
    } catch (err) {
      setActionError(err?.response?.data?.detail || "Failed to advance election status");
    } finally { setActionLoading(null); }
  };

  /* ── Derived data ─────────────────────────────────────── */
  const draftCount = elections.filter(e => e.status === "DRAFT").length;
  const activeCount = elections.filter(e =>
    ["CONFIGURED","NOMINATIONS_OPEN","NOMINATIONS_CLOSED","CANDIDATE_LIST_PUBLISHED","POLLING_OPEN","POLLING_CLOSED","COUNTING"].includes(e.status)
  ).length;
  const finalizedCount = elections.filter(e => ["FINALIZED","ARCHIVED"].includes(e.status)).length;
  const masterDataReady = masterData?.federal_ready ?? false;

  return (
    <PageContainer>
      <AdminKeyframes />

      {/* Back nav */}
      <BackLink onClick={() => navigate("/admin/manage-elections")}>Election Hub</BackLink>

      {/* ── Unified dashboard header ───────────────────────────── */}
      <div style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: T.radius.xl,
        marginBottom: T.space.xl,
        overflow: "hidden",
        boxShadow: T.shadow.md,
      }}>
        {/* Title + CTA row */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 28px",
          gap: 16,
          flexWrap: "wrap",
        }}>
          <div>
            <h2 style={{
              margin: "0 0 3px",
              fontSize: 20,
              fontWeight: 800,
              color: T.navy,
              lineHeight: 1.25,
            }}>
              Federal Elections
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: T.muted }}>
              Manage House of Representatives elections · 165 FPTP + 110 PR = 275 seats · Article 84, Constitution of Nepal
            </p>
          </div>
          <Btn
            onClick={() => { clearMessages(); setShowCreate(true); }}
            style={{ background: T.accent, border: "none", color: "#fff", flexShrink: 0 }}
          >
            <Plus size={16} strokeWidth={2.5} /> New federal election
          </Btn>
        </div>

        {/* KPI cards row */}
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: T.space.md,
          padding: "0 20px 20px",
          borderTop: `1px solid ${T.borderLight}`,
          paddingTop: T.space.md,
        }}>

          {/* Total elections */}
          <div style={{
            flex: "1 1 130px",
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: T.radius.lg,
            padding: "14px 18px",
            boxShadow: T.shadow.sm,
          }}>
            <span style={{
              display: "block", fontSize: 10, fontWeight: 700, color: T.muted,
              textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8,
            }}>
              Total elections
            </span>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <Landmark size={14} color={T.accent} strokeWidth={2.5} />
              <span style={{ fontSize: 26, fontWeight: 800, color: T.accent, lineHeight: 1 }}>
                {elections.length}
              </span>
            </div>
            <span style={{ display: "block", fontSize: 11, color: T.muted, marginTop: 5 }}>
              house of representatives
            </span>
          </div>

          {/* Active / in progress */}
          <div style={{
            flex: "1 1 130px",
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: T.radius.lg,
            padding: "14px 18px",
            boxShadow: T.shadow.sm,
          }}>
            <span style={{
              display: "block", fontSize: 10, fontWeight: 700, color: T.muted,
              textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8,
            }}>
              Active / in progress
            </span>
            <span style={{
              display: "block", fontSize: 26, fontWeight: 800, lineHeight: 1,
              color: activeCount > 0 ? T.success : T.muted,
            }}>
              {activeCount}
            </span>
            <span style={{ display: "block", fontSize: 11, color: T.muted, marginTop: 5 }}>
              configured → counting
            </span>
          </div>

          {/* Draft / setup */}
          <div style={{
            flex: "1 1 130px",
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: T.radius.lg,
            padding: "14px 18px",
            boxShadow: T.shadow.sm,
          }}>
            <span style={{
              display: "block", fontSize: 10, fontWeight: 700, color: T.muted,
              textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8,
            }}>
              Draft / setup
            </span>
            <span style={{
              display: "block", fontSize: 26, fontWeight: 800, lineHeight: 1,
              color: draftCount > 0 ? T.warn : T.muted,
            }}>
              {draftCount}
            </span>
            <span style={{ display: "block", fontSize: 11, color: T.muted, marginTop: 5 }}>
              awaiting configuration
            </span>
          </div>

          {/* Finalized / archived */}
          <div style={{
            flex: "1 1 130px",
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: T.radius.lg,
            padding: "14px 18px",
            boxShadow: T.shadow.sm,
          }}>
            <span style={{
              display: "block", fontSize: 10, fontWeight: 700, color: T.muted,
              textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8,
            }}>
              Finalized / archived
            </span>
            <span style={{
              display: "block", fontSize: 26, fontWeight: 800, lineHeight: 1, color: T.text,
            }}>
              {finalizedCount}
            </span>
            <span style={{ display: "block", fontSize: 11, color: T.muted, marginTop: 5 }}>
              completed elections
            </span>
          </div>

          {/* Federal seat structure */}
          <div style={{
            flex: "1 1 150px",
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: T.radius.lg,
            padding: "14px 18px",
            boxShadow: T.shadow.sm,
          }}>
            <span style={{
              display: "block", fontSize: 10, fontWeight: 700, color: T.muted,
              textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8,
            }}>
              Seat structure
            </span>
            <div style={{ display: "flex", gap: 16, alignItems: "baseline" }}>
              <div>
                <span style={{ fontSize: 20, fontWeight: 800, color: T.accent, lineHeight: 1 }}>165</span>
                <span style={{ fontSize: 11, color: T.muted, marginLeft: 4 }}>FPTP</span>
              </div>
              <div>
                <span style={{ fontSize: 20, fontWeight: 800, color: T.navy, lineHeight: 1 }}>110</span>
                <span style={{ fontSize: 11, color: T.muted, marginLeft: 4 }}>PR</span>
              </div>
            </div>
            <span style={{ display: "block", fontSize: 11, color: T.muted, marginTop: 5 }}>
              275 HoR seats (Article 84)
            </span>
          </div>

          {/* Master data */}
          <div style={{
            flex: "1 1 165px",
            background: masterDataReady ? T.successBg : T.warnBg,
            border: `1px solid ${masterDataReady ? T.successBorder : T.warnBorder}`,
            borderRadius: T.radius.lg,
            padding: "14px 18px",
            boxShadow: T.shadow.sm,
          }}>
            <span style={{
              display: "block", fontSize: 10, fontWeight: 700, color: T.muted,
              textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8,
            }}>
              Master data
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              {masterDataLoading
                ? <Loader2 size={15} color={T.muted} style={{ animation: "adminSpin 0.8s linear infinite", flexShrink: 0 }} />
                : masterDataReady
                  ? <CheckCircle2 size={16} color={T.success} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                  : <AlertTriangle size={16} color={T.warn} strokeWidth={2.5} style={{ flexShrink: 0 }} />
              }
              <span style={{
                fontSize: 22, fontWeight: 800, lineHeight: 1,
                color: masterDataReady ? T.success : T.warn,
              }}>
                {masterDataReady ? "Ready" : "Not ready"}
              </span>
            </div>
            <span style={{
              display: "block", fontSize: 11, fontWeight: 600, marginTop: 5,
              color: masterDataReady ? T.success : T.warn,
            }}>
              {masterDataLoading
                ? "Checking…"
                : masterDataReady
                  ? `${masterData?.districts ?? 0} districts · ${masterData?.constituencies ?? 0} constituencies`
                  : `${masterData?.constituencies ?? 0} / ${masterData?.required_constituencies ?? 165} constituencies`
              }
            </span>
          </div>

        </div>
      </div>

      {/* Master data banner */}
      {masterData && !masterData.federal_ready && (
        <StatusBanner variant="warning" action={
          <Btn variant="secondary" small onClick={loadMasterData} disabled={masterDataLoading}>
            <RefreshCw size={13} className={masterDataLoading ? "animate-spin" : ""} /> Refresh
          </Btn>
        }>
          <strong>Geography master data not seeded.</strong> Federal contest structures require constituency data.
          Districts: {masterData.districts ?? 0} · Constituencies: {masterData.constituencies ?? 0} / {masterData.required_constituencies ?? 165}
        </StatusBanner>
      )}

      {/* Action messages */}
      {actionError && (
        <StatusBanner variant="error">{actionError}</StatusBanner>
      )}
      {actionSuccess && (
        <StatusBanner variant="success">{actionSuccess}</StatusBanner>
      )}

      {/* Create form */}
      {showCreate && (
        <CreateFederalElectionForm
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
          submitting={actionLoading === "create"}
        />
      )}

      {/* Election list */}
      <SectionCard style={{ marginBottom: T.space["2xl"] }}>
        <SectionHeader
          icon={Landmark}
          iconColor={T.accent}
          title="Federal elections"
          subtitle={`${elections.length} election${elections.length !== 1 ? "s" : ""}`}
        />

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: T.muted }}>
            <Loader2 size={28} style={{ margin: "0 auto 12px", animation: "adminSpin 1s linear infinite" }} />
            <p style={{ margin: 0, fontSize: 14 }}>Loading elections…</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: 40, color: T.error, fontSize: 14 }}>
            <AlertTriangle size={20} style={{ margin: "0 auto 8px" }} />
            <p>{error}</p>
          </div>
        ) : elections.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 32px" }}>
            <div style={{
              width: 56, height: 56, borderRadius: T.radius.xl, margin: "0 auto 16px",
              background: T.borderLight, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Landmark size={28} color={T.subtle} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: "0 0 6px" }}>
              No federal elections yet
            </p>
            <p style={{ fontSize: 13, color: T.muted, margin: "0 0 16px" }}>
              Create your first federal election to begin managing the electoral process.
            </p>
            <Btn variant="navy" onClick={() => { clearMessages(); setShowCreate(true); }}>
              <Plus size={14} /> Create election
            </Btn>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
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
      </SectionCard>

      {/* Federal lifecycle section */}
      <SectionCard style={{ marginBottom: T.space["2xl"] }}>
        <SectionHeader icon={Clock} iconColor={T.navy} title="Federal election lifecycle" subtitle="The complete lifecycle of a federal election" />
        <div style={{ padding: "20px 24px" }}>
          <WorkflowTimeline steps={LIFECYCLE_DETAIL} compact />
        </div>
      </SectionCard>

      {/* Federal contest model section */}
      <SectionCard>
        <SectionHeader icon={LayoutList} iconColor={T.navy} title="Federal contest model" subtitle="Structure of a House of Representatives election" />
        <div style={{ padding: "20px 24px" }}>
          <div className="admin-form-grid" style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: T.space.lg, marginBottom: T.space.xl,
          }}>
            {/* FPTP block */}
            <div style={{
              padding: "20px 24px", borderRadius: T.radius.lg,
              background: "#EFF6FF", border: "1px solid #BFDBFE",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 800, background: "#DBEAFE", color: "#2563EB" }}>FPTP</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Direct constituency seats</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#2563EB", marginBottom: 6 }}>165</div>
              <p style={{ margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.5 }}>
                Single-member constituencies. Each voter casts one FPTP ballot for a candidate. Winner: highest valid votes.
              </p>
            </div>

            {/* PR block */}
            <div style={{
              padding: "20px 24px", borderRadius: T.radius.lg,
              background: T.purpleBg, border: `1px solid ${T.purpleBorder}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 800, background: "#EDE9FE", color: "#7C3AED" }}>PR</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Proportional representation</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#7C3AED", marginBottom: 6 }}>110</div>
              <p style={{ margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.5 }}>
                Nationwide closed party lists. Each voter casts one PR ballot for a party. Allocated via Sainte-Laguë method. 3% threshold.
              </p>
            </div>
          </div>

          {/* Total */}
          <div style={{
            display: "flex", alignItems: "center", gap: 12, padding: "12px 20px",
            background: T.surfaceAlt, borderRadius: T.radius.md, border: `1px solid ${T.borderLight}`,
          }}>
            <Vote size={16} color={T.navy} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.navy }}>Total: 275 seats</span>
            <span style={{ fontSize: 12, color: T.muted }}>
              Each voter casts 2 ballots — 1 FPTP (constituency) + 1 PR (nationwide party list)
            </span>
          </div>
        </div>
      </SectionCard>

      {/* Delete dialog */}
      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={handleDelete}
        title="Delete election"
        body={`Delete this ${confirmDel?.status === "ARCHIVED" ? "archived" : "draft"} election and all associated data? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </PageContainer>
  );
}


/* ══════════════════════════════════════════════════════════════ */
/*  CREATE FORM                                                  */
/* ══════════════════════════════════════════════════════════════ */

function CreateFederalElectionForm({ onSubmit, onCancel, submitting }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      government_level: "FEDERAL",
      election_subtype: "HOR_DIRECT",
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
    });
  };

  return (
    <SectionCard style={{ marginBottom: T.space.xl }}>
      <div style={{ padding: "24px 28px", borderBottom: `1px solid ${T.borderLight}` }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.navy }}>
          New federal election
        </h3>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: T.muted }}>
          Create a new House of Representatives election
        </p>
      </div>
      <form onSubmit={handleSubmit} style={{ padding: "24px 28px" }}>
        <div className="admin-form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 20 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Title</label>
            <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Federal HoR Election 2083" required minLength={3} maxLength={255} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Description (optional)</label>
            <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={description}
              onChange={e => setDescription(e.target.value)} placeholder="Optional notes about this election" />
          </div>
          <div>
            <label style={labelStyle}>Government level</label>
            <input style={{ ...inputStyle, background: T.surfaceAlt, color: T.muted }} value="Federal" disabled />
          </div>
          <div>
            <label style={labelStyle}>Election type</label>
            <input style={{ ...inputStyle, background: T.surfaceAlt, color: T.muted }} value="House of Representatives (Direct)" disabled />
          </div>
          <div>
            <label style={labelStyle}>Start time</label>
            <input type="datetime-local" style={inputStyle} value={startTime} onChange={e => setStartTime(e.target.value)} required />
          </div>
          <div>
            <label style={labelStyle}>End time</label>
            <input type="datetime-local" style={inputStyle} value={endTime} onChange={e => setEndTime(e.target.value)} required />
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <Btn variant="secondary" onClick={onCancel} type="button">Cancel</Btn>
          <Btn variant="navy" type="submit" disabled={submitting} loading={submitting}>Create draft election</Btn>
        </div>
      </form>
    </SectionCard>
  );
}


/* ══════════════════════════════════════════════════════════════ */
/*  ELECTION CARD                                                */
/* ══════════════════════════════════════════════════════════════ */

function ElectionCard({ election: el, expanded, onToggle, onDelete, onGenerate, onConfigure, onAdvance, actionLoading, masterData }) {
  const masterDataReady = masterData?.federal_ready ?? false;
  const [readiness, setReadiness] = useState(null);
  const [contests, setContests] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const isDraft = el.status === "DRAFT";
  const hasContests = el.contest_count > 0;

  React.useEffect(() => {
    if (!expanded) { setReadiness(null); setContests(null); return; }
    let cancelled = false;
    (async () => {
      setDetailLoading(true);
      try {
        const [r, c] = await Promise.all([getReadiness(el.id), getContests(el.id)]);
        if (!cancelled) { setReadiness(r); setContests(c); }
      } catch { /* ignore */ }
      finally { if (!cancelled) setDetailLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [expanded, el.id, el.contest_count]);

  const TRANSITIONS = {
    CONFIGURED: { next: "Nominations open", color: "#06B6D4" },
    NOMINATIONS_OPEN: { next: "Nominations closed", color: "#0EA5E9" },
    NOMINATIONS_CLOSED: { next: "Candidate list published", color: "#2563EB" },
    CANDIDATE_LIST_PUBLISHED: { next: "Polling open", color: "#16A34A" },
    POLLING_OPEN: { next: "Polling closed", color: "#F59E0B" },
    FINALIZED: { next: "Archived", color: "#6B7280" },
  };
  const transition = TRANSITIONS[el.status];

  return (
    <div style={{
      borderBottom: `1px solid ${T.borderLight}`,
      transition: "background 0.15s",
    }}>
      {/* Header row */}
      <button
        onClick={onToggle}
        className="admin-election-card-header"
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 14,
          padding: "16px 24px", border: "none", background: expanded ? T.surfaceAlt : "transparent",
          cursor: "pointer", textAlign: "left", transition: "background 0.15s",
        }}
      >
        <ChevronDown size={16} color={T.muted} style={{
          transition: "transform 0.2s",
          transform: expanded ? "rotate(0deg)" : "rotate(-90deg)",
          flexShrink: 0,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{el.title}</span>
            <AdminBadge map={STATUS_MAP} status={el.status} />
          </div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 4, display: "flex", gap: 14, flexWrap: "wrap" }}>
            <span>{SUBTYPE_LABELS[el.election_subtype] || el.election_subtype}</span>
            <span>{formatDateTime(el.start_time)} — {formatDateTime(el.end_time)}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0, flexWrap: "wrap" }}>
          {hasContests ? (
            <span style={{
              padding: "4px 12px", borderRadius: T.radius.sm, fontSize: 11, fontWeight: 700,
              background: T.successBg, color: T.success,
            }}>
              <LayoutList size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />
              {formatContestCounts(el)}
            </span>
          ) : isDraft && (
            <span style={{
              padding: "4px 12px", borderRadius: T.radius.sm, fontSize: 11, fontWeight: 700,
              background: T.warnBg, color: T.warn,
            }}>
              No contests
            </span>
          )}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: "0 24px 24px" }}>
          {detailLoading ? (
            <div style={{ padding: "24px 0", textAlign: "center", color: T.muted }}>
              <Loader2 size={20} style={{ animation: "adminSpin 1s linear infinite" }} />
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Lifecycle mini-timeline for this election */}
              <div style={{
                padding: "12px 16px", background: T.surfaceAlt,
                borderRadius: T.radius.md, border: `1px solid ${T.borderLight}`, overflow: "auto",
              }}>
                <WorkflowTimeline steps={LIFECYCLE_STEPS} activeStep={el.status} compact />
              </div>

              {/* Readiness panel */}
              {readiness && (
                <div style={{
                  padding: "14px 18px", borderRadius: T.radius.md,
                  background: readiness.ready ? T.successBg : T.warnBg,
                  border: `1px solid ${readiness.ready ? T.successBorder : T.warnBorder}`,
                }}>
                  <div style={{
                    fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 8,
                    color: readiness.ready ? T.success : T.warn,
                  }}>
                    {readiness.ready ? <><CheckCircle2 size={15} /> Structure ready</> : <><AlertTriangle size={15} /> Structure not ready</>}
                  </div>
                  {!readiness.ready && readiness.issues?.length > 0 && (
                    <ul style={{ margin: "8px 0 0", paddingLeft: 22, fontSize: 12, color: T.warn, lineHeight: 1.6 }}>
                      {readiness.issues.map((issue, i) => <li key={i}>{issue}</li>)}
                    </ul>
                  )}
                  <div style={{ marginTop: 8, fontSize: 12, color: T.muted }}>
                    Total contests: {readiness.total_contests}
                    {readiness.contest_counts && Object.entries(readiness.contest_counts)
                      .filter(([, v]) => v > 0).map(([k, v]) => ` · ${k}: ${v}`)}
                    {readiness.total_constituencies > 0 && ` · Constituencies: ${readiness.total_constituencies}`}
                  </div>
                </div>
              )}

              {/* Contest structure */}
              {contests && contests.length > 0 && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: T.text, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                    <LayoutList size={15} color={T.accent} /> Contest structure ({contests.length} total)
                  </div>
                  <div className="admin-table-wrap" style={{ maxHeight: 240, overflowY: "auto", border: `1px solid ${T.border}`, borderRadius: T.radius.md }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: T.surfaceAlt }}>
                          <th style={{ padding: "8px 14px", textAlign: "left", fontWeight: 700, color: T.muted, borderBottom: `1px solid ${T.border}` }}>Type</th>
                          <th style={{ padding: "8px 14px", textAlign: "left", fontWeight: 700, color: T.muted, borderBottom: `1px solid ${T.border}` }}>Contest title</th>
                          <th style={{ padding: "8px 14px", textAlign: "right", fontWeight: 700, color: T.muted, borderBottom: `1px solid ${T.border}` }}>Seats</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contests.map((c) => (
                          <tr key={c.id} style={{ borderBottom: `1px solid ${T.borderLight}` }}>
                            <td style={{ padding: "7px 14px" }}>
                              <span style={{
                                display: "inline-block", padding: "2px 8px", borderRadius: 4,
                                fontSize: 10, fontWeight: 700,
                                background: (CONTEST_COLORS[c.contest_type] || { bg: "#F1F5F9" }).bg,
                                color: (CONTEST_COLORS[c.contest_type] || { color: "#475569" }).color,
                              }}>{c.contest_type}</span>
                            </td>
                            <td style={{ padding: "7px 14px", color: T.text }}>{c.title}</td>
                            <td style={{ padding: "7px 14px", textAlign: "right", fontWeight: 600, color: T.text }}>{c.seat_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Actions — draft */}
              {isDraft && (
                <div className="admin-election-actions" style={{
                  display: "flex", gap: 10, flexWrap: "wrap", paddingTop: 12,
                  borderTop: `1px solid ${T.borderLight}`,
                }}>
                  {!hasContests && (
                    <Btn onClick={onGenerate} disabled={actionLoading === `gen-${el.id}` || !masterDataReady}
                      loading={actionLoading === `gen-${el.id}`}
                      title={!masterDataReady ? "Required geography data not yet seeded" : "Generate contest structure"}>
                      <Settings2 size={14} /> Generate structure
                    </Btn>
                  )}
                  {hasContests && readiness?.ready && (
                    <Btn variant="success" onClick={onConfigure} disabled={actionLoading === `cfg-${el.id}`}
                      loading={actionLoading === `cfg-${el.id}`}>
                      <Lock size={14} /> Lock setup (configure)
                    </Btn>
                  )}
                  <Btn variant="ghost" onClick={onDelete} disabled={actionLoading === `delete-${el.id}`}
                    loading={actionLoading === `delete-${el.id}`}
                    style={{ color: T.error, marginLeft: "auto" }}>
                    <Trash2 size={14} /> Delete draft
                  </Btn>
                </div>
              )}

              {/* Actions — locked (lifecycle advance) */}
              {!isDraft && (
                <div className="admin-election-actions" style={{
                  display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
                  padding: "12px 16px", borderRadius: T.radius.md,
                  background: T.surfaceAlt, border: `1px solid ${T.borderLight}`,
                }}>
                  <Lock size={13} color={T.muted} />
                  <span style={{ fontSize: 13, color: T.muted }}>
                    Status: <strong style={{ color: T.text }}>{STATUS_MAP[el.status]?.label || el.status}</strong>
                  </span>
                  {transition && (
                    <Btn small onClick={() => onAdvance(transition.next)}
                      disabled={!!actionLoading} loading={actionLoading === `adv-${el.id}`}
                      style={{ background: transition.color, color: "#fff", border: "none", marginLeft: "auto" }}>
                      Advance → {transition.next}
                    </Btn>
                  )}
                  {el.status === "ARCHIVED" && (
                    <Btn small variant="ghost" onClick={onDelete}
                      disabled={actionLoading === `delete-${el.id}`}
                      loading={actionLoading === `delete-${el.id}`}
                      style={{ color: T.error, marginLeft: transition ? 0 : "auto" }}>
                      <Trash2 size={13} /> Delete archived
                    </Btn>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
