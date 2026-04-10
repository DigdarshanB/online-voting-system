import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Trash2, Settings2, ChevronDown, AlertTriangle, CheckCircle2,
  Loader2, Building2, LayoutList, Lock, RefreshCw, Clock, Vote, Map,
} from "lucide-react";
import useElections from "../features/elections/hooks/useElections";
import {
  createElection, deleteElection, generateStructure, getReadiness,
  configureElection, advanceElection, getMasterDataStatus, getContests,
} from "../features/elections/api/electionsApi";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { T, STATUS_MAP, CONTEST_COLORS } from "../components/ui/tokens";
import {
  PageContainer, BackLink, SummaryStrip, SummaryMetric, StatusBanner,
  SectionCard, SectionHeader, AdminBadge, Btn, WorkflowTimeline,
  AdminKeyframes, formatDateTime, inputStyle, labelStyle,
} from "../components/ui/AdminUI";

/* ── Province seat table (constitutional — Article 176) ─────── */
const PROVINCE_SEATS = [
  { code: "P1", fptp: 28, pr: 28, total: 56 },
  { code: "P2", fptp: 32, pr: 32, total: 64 },
  { code: "P3", fptp: 33, pr: 33, total: 66 },
  { code: "P4", fptp: 18, pr: 18, total: 36 },
  { code: "P5", fptp: 26, pr: 26, total: 52 },
  { code: "P6", fptp: 12, pr: 12, total: 24 },
  { code: "P7", fptp: 16, pr: 16, total: 32 },
];

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
  { key: "DRAFT", label: "Draft", description: "Election created, province selected, metadata defined." },
  { key: "STRUCTURE", label: "Structure generated", description: "Contest structure built from provincial constituency master data." },
  { key: "CONFIGURED", label: "Configured", description: "Setup locked. Structure cannot be modified. Ready for nominations." },
  { key: "NOMINATIONS_OPEN", label: "Nominations open", description: "Candidate nominations and provincial PR list submissions can be filed." },
  { key: "NOMINATIONS_CLOSED", label: "Nominations closed", description: "Nomination window closed. Lists under review." },
  { key: "CANDIDATE_LIST_PUBLISHED", label: "Candidates published", description: "Official candidate lists published. Ready for polling." },
  { key: "POLLING_OPEN", label: "Polling open", description: "Voting period active. Voters can cast provincial ballots." },
  { key: "POLLING_CLOSED", label: "Polling closed", description: "Voting period ended. Ballots sealed for counting." },
  { key: "COUNTING", label: "Counting", description: "Provincial ballot counting and result tallying in progress." },
  { key: "FINALIZED", label: "Finalized", description: "Results certified and locked. Provincial Assembly winners declared." },
  { key: "ARCHIVED", label: "Archived", description: "Election record preserved for institutional audit." },
];

function formatContestCounts(el) {
  const cc = el.contest_counts || {};
  const parts = Object.entries(cc).filter(([, v]) => v > 0).map(([k, v]) => `${v} ${k}`);
  return parts.length > 0 ? parts.join(" + ") : `${el.contest_count} contests`;
}

function provinceName(masterData, code) {
  const prov = (masterData?.province_list || []).find(p => p.code === code);
  return prov?.name || code;
}

/* ══════════════════════════════════════════════════════════════ */
/*  MAIN PAGE                                                    */
/* ══════════════════════════════════════════════════════════════ */

export default function ManageProvincialElectionsPage() {
  const navigate = useNavigate();
  const { elections: allElections, loading, error, reload } = useElections();
  const elections = allElections.filter(el => el.government_level === "PROVINCIAL");

  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [provinceFilter, setProvinceFilter] = useState("");
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
  const visibleElections = provinceFilter
    ? elections.filter(e => e.province_code === provinceFilter)
    : elections;

  const draftCount = elections.filter(e => e.status === "DRAFT").length;
  const activeCount = elections.filter(e =>
    ["CONFIGURED", "NOMINATIONS_OPEN", "NOMINATIONS_CLOSED", "CANDIDATE_LIST_PUBLISHED",
      "POLLING_OPEN", "POLLING_CLOSED", "COUNTING"].includes(e.status)
  ).length;
  const finalizedCount = elections.filter(e => ["FINALIZED", "ARCHIVED"].includes(e.status)).length;
  const provincesWithElections = [...new Set(elections.map(e => e.province_code).filter(Boolean))].length;
  const masterDataReady = masterData?.provincial_ready ?? false;
  const provinceList = masterData?.province_list || PROVINCE_SEATS.map(p => ({ code: p.code, name: p.code }));

  return (
    <PageContainer>
      <AdminKeyframes />

      {/* Back + primary CTA */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <BackLink onClick={() => navigate("/admin/manage-elections")}>Election Hub</BackLink>
        <Btn onClick={() => { clearMessages(); setShowCreate(true); }}
          style={{ background: T.purple, border: "none", color: "#fff" }}>
          <Plus size={16} strokeWidth={2.5} /> New provincial election
        </Btn>
      </div>

      {/* Summary strip */}
      <SummaryStrip>
        <SummaryMetric label="Total elections" value={elections.length} icon={Building2} color={T.purple} />
        <SummaryMetric label="Active / in progress" value={activeCount} color={activeCount > 0 ? T.success : T.muted} />
        <SummaryMetric label="Draft / setup" value={draftCount} color={draftCount > 0 ? T.warn : T.muted} />
        <SummaryMetric label="Finalized / archived" value={finalizedCount} />
        <SummaryMetric label="Provinces with elections" value={`${provincesWithElections} / 7`} color={T.purple} />
        <SummaryMetric
          label="Master data"
          value={masterDataReady ? "Ready" : "Not ready"}
          color={masterDataReady ? T.success : T.warn}
        />
      </SummaryStrip>

      {/* Master data banner */}
      {masterData && !masterData.provincial_ready && (
        <StatusBanner variant="warning" action={
          <Btn variant="secondary" small onClick={loadMasterData} disabled={masterDataLoading}>
            <RefreshCw size={13} className={masterDataLoading ? "animate-spin" : ""} /> Refresh
          </Btn>
        }>
          <strong>Provincial geography data not seeded.</strong> Provincial contest structures require province and constituency area unit data.
          Provinces: {masterData.provinces ?? 0} / 7 · Area units: {masterData.area_units_total ?? 0}
        </StatusBanner>
      )}

      {/* Action messages */}
      {actionError && <StatusBanner variant="error">{actionError}</StatusBanner>}
      {actionSuccess && <StatusBanner variant="success">{actionSuccess}</StatusBanner>}

      {/* Create form */}
      {showCreate && (
        <CreateProvincialElectionForm
          provinceList={provinceList}
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
          submitting={actionLoading === "create"}
        />
      )}

      {/* Province filter + election list */}
      <SectionCard style={{ marginBottom: T.space["2xl"] }}>
        <SectionHeader
          icon={Building2}
          iconColor={T.purple}
          title="Provincial elections"
          subtitle={`${elections.length} election${elections.length !== 1 ? "s" : ""}`}
          action={
            elections.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: T.muted, fontWeight: 600 }}>Province:</span>
                <select
                  value={provinceFilter}
                  onChange={e => setProvinceFilter(e.target.value)}
                  style={{
                    padding: "6px 10px", borderRadius: T.radius.md, fontSize: 12,
                    border: `1px solid ${T.border}`, background: T.surface, color: T.text, cursor: "pointer",
                  }}
                >
                  <option value="">All provinces</option>
                  {provinceList.map(p => (
                    <option key={p.code} value={p.code}>{p.code} — {p.name}</option>
                  ))}
                </select>
              </div>
            )
          }
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
        ) : visibleElections.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 32px" }}>
            <div style={{
              width: 56, height: 56, borderRadius: T.radius.xl, margin: "0 auto 16px",
              background: T.purpleBg, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Building2 size={28} color={T.purple} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: "0 0 6px" }}>
              {provinceFilter ? `No elections for ${provinceFilter}` : "No provincial elections yet"}
            </p>
            <p style={{ fontSize: 13, color: T.muted, margin: "0 0 16px" }}>
              {provinceFilter
                ? "Try a different province filter or create an election for this province."
                : "Create your first provincial election to begin managing the electoral process."}
            </p>
            {!provinceFilter && (
              <Btn onClick={() => { clearMessages(); setShowCreate(true); }}
                style={{ background: T.purple, border: "none", color: "#fff" }}>
                <Plus size={14} /> Create election
              </Btn>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {visibleElections.map(el => (
              <ElectionCard
                key={el.id}
                election={el}
                expanded={expandedId === el.id}
                onToggle={() => setExpandedId(expandedId === el.id ? null : el.id)}
                onDelete={() => requestDelete(el.id, el.status)}
                onGenerate={() => handleGenerate(el.id)}
                onConfigure={() => handleConfigure(el.id)}
                onAdvance={nextLabel => handleAdvance(el.id, nextLabel)}
                actionLoading={actionLoading}
                masterDataReady={masterDataReady}
              />
            ))}
          </div>
        )}
      </SectionCard>

      {/* Lifecycle section */}
      <SectionCard style={{ marginBottom: T.space["2xl"] }}>
        <SectionHeader icon={Clock} iconColor={T.purple} title="Provincial election lifecycle"
          subtitle="Complete lifecycle of a provincial assembly election" />
        <div style={{ padding: "20px 24px" }}>
          <WorkflowTimeline steps={LIFECYCLE_DETAIL} compact />
        </div>
      </SectionCard>

      {/* Provincial contest model */}
      <SectionCard>
        <SectionHeader icon={LayoutList} iconColor={T.purple} title="Provincial contest model"
          subtitle="Seat structure per province — Article 176, Constitution of Nepal" />
        <div style={{ padding: "20px 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: T.space.lg, marginBottom: T.space.xl }}>
            <div style={{ padding: "20px 24px", borderRadius: T.radius.lg, background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 800, background: "#DBEAFE", color: "#2563EB" }}>FPTP</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Direct constituency seats</span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.5 }}>
                Single-member constituencies per province. Each voter casts one FPTP ballot for a candidate. Winner: highest valid votes within the provincial constituency.
              </p>
            </div>
            <div style={{ padding: "20px 24px", borderRadius: T.radius.lg, background: T.purpleBg, border: `1px solid ${T.purpleBorder}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 800, background: "#EDE9FE", color: "#7C3AED" }}>PR</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Proportional representation</span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.5 }}>
                Province-wide closed party lists. PR seats = FPTP seats per province. Allocated via Sainte-Laguë method. 3% provincial threshold.
              </p>
            </div>
          </div>

          {/* Seat table */}
          <div className="admin-table-wrap" style={{ overflowX: "auto", border: `1px solid ${T.border}`, borderRadius: T.radius.md }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: T.surfaceAlt }}>
                  <th style={{ padding: "8px 14px", textAlign: "left", fontWeight: 700, color: T.muted, borderBottom: `1px solid ${T.border}` }}>Province</th>
                  <th style={{ padding: "8px 14px", textAlign: "left", fontWeight: 700, color: T.muted, borderBottom: `1px solid ${T.border}` }}>Name</th>
                  <th style={{ padding: "8px 14px", textAlign: "right", fontWeight: 700, color: "#2563EB", borderBottom: `1px solid ${T.border}` }}>FPTP</th>
                  <th style={{ padding: "8px 14px", textAlign: "right", fontWeight: 700, color: T.purple, borderBottom: `1px solid ${T.border}` }}>PR</th>
                  <th style={{ padding: "8px 14px", textAlign: "right", fontWeight: 700, color: T.navy, borderBottom: `1px solid ${T.border}` }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {PROVINCE_SEATS.map(p => (
                  <tr key={p.code} style={{ borderBottom: `1px solid ${T.borderLight}` }}>
                    <td style={{ padding: "8px 14px" }}>
                      <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: T.purpleBg, color: T.purple }}>
                        {p.code}
                      </span>
                    </td>
                    <td style={{ padding: "8px 14px", color: T.text, fontWeight: 500 }}>
                      {provinceName(masterData, p.code)}
                    </td>
                    <td style={{ padding: "8px 14px", textAlign: "right", fontWeight: 700, color: "#2563EB" }}>{p.fptp}</td>
                    <td style={{ padding: "8px 14px", textAlign: "right", fontWeight: 700, color: T.purple }}>{p.pr}</td>
                    <td style={{ padding: "8px 14px", textAlign: "right", fontWeight: 700, color: T.navy }}>{p.total}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: T.surfaceAlt }}>
                  <td colSpan={2} style={{ padding: "8px 14px", fontWeight: 700, color: T.navy, borderTop: `1px solid ${T.border}` }}>All 7 provinces</td>
                  <td style={{ padding: "8px 14px", textAlign: "right", fontWeight: 800, color: "#2563EB", borderTop: `1px solid ${T.border}` }}>
                    {PROVINCE_SEATS.reduce((s, p) => s + p.fptp, 0)}
                  </td>
                  <td style={{ padding: "8px 14px", textAlign: "right", fontWeight: 800, color: T.purple, borderTop: `1px solid ${T.border}` }}>
                    {PROVINCE_SEATS.reduce((s, p) => s + p.pr, 0)}
                  </td>
                  <td style={{ padding: "8px 14px", textAlign: "right", fontWeight: 800, color: T.navy, borderTop: `1px solid ${T.border}` }}>
                    {PROVINCE_SEATS.reduce((s, p) => s + p.total, 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div style={{
            display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", marginTop: T.space.lg,
            background: T.surfaceAlt, borderRadius: T.radius.md, border: `1px solid ${T.borderLight}`,
          }}>
            <Vote size={16} color={T.purple} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.purple }}>
              Each voter casts 2 ballots — 1 FPTP (provincial constituency) + 1 PR (province-wide party list)
            </span>
          </div>
        </div>
      </SectionCard>

      {/* Delete dialog */}
      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={handleDelete}
        title="Delete provincial election"
        body={`Delete this ${confirmDel?.status === "ARCHIVED" ? "archived" : "draft"} provincial election and all associated data? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </PageContainer>
  );
}


/* ══════════════════════════════════════════════════════════════ */
/*  CREATE FORM                                                  */
/* ══════════════════════════════════════════════════════════════ */

function CreateProvincialElectionForm({ provinceList, onSubmit, onCancel, submitting }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [provinceCode, setProvinceCode] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!provinceCode) return;
    onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      government_level: "PROVINCIAL",
      election_subtype: "PROVINCIAL_ASSEMBLY",
      province_code: provinceCode,
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
    });
  };

  const seats = PROVINCE_SEATS.find(p => p.code === provinceCode);

  return (
    <SectionCard style={{ marginBottom: T.space.xl }}>
      <div style={{ padding: "24px 28px", borderBottom: `1px solid ${T.borderLight}` }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.purple }}>New provincial election</h3>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: T.muted }}>
          Create a new Provincial Assembly election for a specific province
        </p>
      </div>
      <form onSubmit={handleSubmit} style={{ padding: "24px 28px" }}>
        <div className="admin-form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 20 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Title</label>
            <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Province 1 Assembly Election 2083" required minLength={3} maxLength={255} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Description (optional)</label>
            <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={description}
              onChange={e => setDescription(e.target.value)} placeholder="Optional notes about this election" />
          </div>
          <div>
            <label style={labelStyle}>Province <span style={{ color: T.error }}>*</span></label>
            <select style={inputStyle} value={provinceCode} onChange={e => setProvinceCode(e.target.value)} required>
              <option value="">Select province…</option>
              {provinceList.map(p => (
                <option key={p.code} value={p.code}>{p.code} — {p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Election type</label>
            <input style={{ ...inputStyle, background: T.surfaceAlt, color: T.muted }} value="Provincial Assembly" disabled />
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
        {seats && (
          <div style={{
            padding: "10px 16px", marginBottom: 16, borderRadius: T.radius.md,
            background: T.purpleBg, border: `1px solid ${T.purpleBorder}`, fontSize: 12, color: T.purple,
          }}>
            <strong>{provinceCode}</strong> — {seats.fptp} FPTP seats + {seats.pr} PR seats = {seats.total} total
          </div>
        )}
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <Btn variant="secondary" onClick={onCancel} type="button">Cancel</Btn>
          <Btn type="submit" disabled={submitting || !provinceCode} loading={submitting}
            style={{ background: T.purple, border: "none", color: "#fff" }}>
            Create draft election
          </Btn>
        </div>
      </form>
    </SectionCard>
  );
}


/* ══════════════════════════════════════════════════════════════ */
/*  ELECTION CARD                                                */
/* ══════════════════════════════════════════════════════════════ */

function ElectionCard({ election: el, expanded, onToggle, onDelete, onGenerate, onConfigure, onAdvance, actionLoading, masterDataReady }) {
  const [readiness, setReadiness] = useState(null);
  const [contests, setContests] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const isDraft = el.status === "DRAFT";
  const hasContests = el.contest_count > 0;
  const provCode = el.province_code || "";

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
    <div style={{ borderBottom: `1px solid ${T.borderLight}`, transition: "background 0.15s" }}>
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
            {provCode && (
              <span style={{
                padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700,
                background: T.purpleBg, color: T.purple, whiteSpace: "nowrap",
              }}>
                <Map size={11} style={{ verticalAlign: "-2px", marginRight: 3 }} />
                {provCode}
              </span>
            )}
            <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{el.title}</span>
            <AdminBadge map={STATUS_MAP} status={el.status} />
          </div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 4, display: "flex", gap: 14, flexWrap: "wrap" }}>
            <span>Provincial Assembly</span>
            <span>{formatDateTime(el.start_time)} — {formatDateTime(el.end_time)}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0, flexWrap: "wrap" }}>
          {hasContests ? (
            <span style={{ padding: "4px 12px", borderRadius: T.radius.sm, fontSize: 11, fontWeight: 700, background: T.successBg, color: T.success }}>
              <LayoutList size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />
              {formatContestCounts(el)}
            </span>
          ) : isDraft && (
            <span style={{ padding: "4px 12px", borderRadius: T.radius.sm, fontSize: 11, fontWeight: 700, background: T.warnBg, color: T.warn }}>
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
              {/* Lifecycle mini-timeline */}
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
                  <div style={{ fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 8, color: readiness.ready ? T.success : T.warn }}>
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
                  </div>
                </div>
              )}

              {/* Contest structure */}
              {contests && contests.length > 0 && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: T.text, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                    <LayoutList size={15} color={T.purple} /> Contest structure ({contests.length} total)
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
                        {contests.map(c => (
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
                    <Btn onClick={onGenerate}
                      disabled={actionLoading === `gen-${el.id}` || !masterDataReady}
                      loading={actionLoading === `gen-${el.id}`}
                      title={!masterDataReady ? "Required provincial geography data not yet seeded" : "Generate contest structure"}
                      style={{ background: T.purple, border: "none", color: "#fff" }}>
                      <Settings2 size={14} /> Generate structure
                    </Btn>
                  )}
                  {hasContests && readiness?.ready && (
                    <Btn variant="success" onClick={onConfigure}
                      disabled={actionLoading === `cfg-${el.id}`}
                      loading={actionLoading === `cfg-${el.id}`}>
                      <Lock size={14} /> Lock setup (configure)
                    </Btn>
                  )}
                  <Btn variant="ghost" onClick={onDelete}
                    disabled={actionLoading === `delete-${el.id}`}
                    loading={actionLoading === `delete-${el.id}`}
                    style={{ color: T.error, marginLeft: "auto" }}>
                    <Trash2 size={14} /> Delete draft
                  </Btn>
                </div>
              )}

              {/* Actions — locked */}
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
