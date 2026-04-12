import React, { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import useAuthGuard from "../hooks/useAuthGuard";
import apiClient from "../lib/apiClient";
import { VT } from "../lib/voterTokens";
import {
  VoterKeyframes,
  VoterPageContainer,
  VoterBackLink,
  VoterSummaryStrip,
  VoterMetricCard,
  VoterStatusBadge,
} from "../components/VoterUI";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/* ── SectionCard ─────────────────────────────────────────────── */
function SectionCard({ children, style }) {
  return (
    <div
      style={{
        background: VT.surface,
        border: `1px solid ${VT.border}`,
        borderRadius: VT.radius.xl,
        overflow: "hidden",
        marginBottom: VT.space["2xl"],
        boxShadow: VT.shadow.sm,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionHeader({ title, subtitle, icon: Icon, iconColor }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "14px 24px",
        borderBottom: `1px solid ${VT.borderLight}`,
        background: VT.surfaceAlt,
      }}
    >
      {Icon && (
        <div
          style={{
            width: 30, height: 30,
            borderRadius: VT.radius.md,
            background: `${iconColor || VT.accent}18`,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={15} color={iconColor || VT.accent} strokeWidth={2.2} />
        </div>
      )}
      <div>
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: VT.navy }}>{title}</h2>
        {subtitle && <p style={{ margin: "1px 0 0", fontSize: 12, color: VT.muted }}>{subtitle}</p>}
      </div>
    </div>
  );
}

/* ── Level meta ──────────────────────────────────────────────── */
const LEVEL_META = {
  FEDERAL:    { label: "Federal",    color: VT.federal.color,    bg: VT.federal.bg,    border: VT.federal.border,    slug: "federal" },
  PROVINCIAL: { label: "Provincial", color: VT.provincial.color, bg: VT.provincial.bg, border: VT.provincial.border, slug: "provincial" },
  LOCAL:      { label: "Local",      color: VT.local.color,      bg: VT.local.bg,      border: VT.local.border,      slug: "local" },
};

export default function VoterResults() {
  const { electionId } = useParams();
  const { loading: authLoading, user } = useAuthGuard();

  const [summary, setSummary] = useState(null);
  const [fptpRows, setFptpRows] = useState([]);
  const [prRows, setPrRows] = useState([]);
  const [prElectedMembers, setPrElectedMembers] = useState([]);
  const [provincialSummary, setProvincialSummary] = useState(null);
  const [localSummary, setLocalSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || !electionId) return;
    Promise.allSettled([
      apiClient.get(`/voter/results/${electionId}/summary`),
      apiClient.get(`/voter/results/${electionId}/fptp`),
      apiClient.get(`/voter/results/${electionId}/pr`),
      apiClient.get(`/voter/results/${electionId}/pr-elected-members`),
      apiClient.get(`/voter/results/${electionId}/provincial-summary`),
      apiClient.get(`/voter/results/${electionId}/local-summary`),
    ])
      .then(([sRes, fRes, pRes, membersRes, provRes, localRes]) => {
        if (sRes.status === "rejected") {
          setError(sRes.reason?.response?.data?.detail || "Results are not yet available");
        } else {
          setSummary(sRes.value.data);
        }
        if (fRes.status === "fulfilled") setFptpRows(fRes.value.data);
        if (pRes.status === "fulfilled") setPrRows(pRes.value.data);
        if (membersRes.status === "fulfilled") setPrElectedMembers(membersRes.value.data);
        if (provRes.status === "fulfilled") setProvincialSummary(provRes.value.data);
        if (localRes.status === "fulfilled") setLocalSummary(localRes.value.data);
        setLoading(false);
      });
  }, [user, electionId]);

  if (authLoading) return <div style={{ textAlign: "center", padding: 40, color: VT.muted }}>Loading…</div>;
  if (!user) return <Navigate to="/" replace />;

  const govLevel = summary?.government_level || localSummary?.government_level;
  const levelMeta = LEVEL_META[govLevel] || null;
  const backTo = levelMeta ? `/results/${levelMeta.slug}` : "/results";

  return (
    <VoterPageContainer>
      <VoterKeyframes />

      {/* ── Back link ─────────────────────────────────────────── */}
      <VoterBackLink to={backTo}>
        {levelMeta ? `${levelMeta.label} Results` : "Results Hub"}
      </VoterBackLink>

      {/* ── Election header card ───────────────────────────────── */}
      {(summary || loading) && (
        <div
          style={{
            background: VT.surface,
            border: `1px solid ${VT.border}`,
            borderRadius: VT.radius.xl,
            padding: "20px 24px",
            marginBottom: VT.space["2xl"],
            boxShadow: VT.shadow.sm,
            display: "flex",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(18px, 2.2vw, 24px)",
                fontWeight: 800,
                color: VT.navy,
                lineHeight: 1.2,
              }}
            >
              {summary?.election_title || "Election Results"}
            </h1>
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              {levelMeta && (
                <span
                  style={{
                    padding: "3px 10px",
                    borderRadius: 5,
                    fontSize: 11,
                    fontWeight: 700,
                    background: levelMeta.bg,
                    color: levelMeta.color,
                    border: `1px solid ${levelMeta.border}`,
                    letterSpacing: "0.03em",
                    textTransform: "uppercase",
                  }}
                >
                  {levelMeta.label}
                </span>
              )}
              {summary?.election_status && <VoterStatusBadge status={summary.election_status} />}
            </div>
          </div>
        </div>
      )}

      {/* ── Loading ───────────────────────────────────────────── */}
      {loading && (
        <div style={{ color: VT.muted, padding: 24, fontSize: 14, fontWeight: 500 }}>
          Loading results…
        </div>
      )}

      {/* ── Error ─────────────────────────────────────────────── */}
      {error && (
        <div
          style={{
            padding: "14px 20px",
            background: VT.errorBg,
            border: `1px solid ${VT.errorBorder}`,
            borderRadius: VT.radius.lg,
            color: VT.error,
            fontSize: 14,
            fontWeight: 600,
            marginBottom: VT.space.xl,
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && summary && (() => {
        const isLocal = govLevel === "LOCAL" || localSummary?.government_level === "LOCAL";
        return (
          <>
            {/* ── Summary metrics ─────────────────────────────── */}
            <VoterSummaryStrip>
              <VoterMetricCard
                label="Ballots Counted"
                value={summary.total_ballots_counted?.toLocaleString() ?? "—"}
                color={VT.accent}
              />
              {isLocal ? (
                <>
                  <VoterMetricCard label="Contests" value={summary.fptp.total_contests ?? "—"} color={VT.navy} />
                  <VoterMetricCard
                    label="Winners Declared"
                    value={`${summary.fptp.winners_declared} / ${summary.fptp.total_seats ?? summary.fptp.total_contests}`}
                    color={VT.success}
                  />
                  <VoterMetricCard
                    label="Adjudication"
                    value={summary.fptp.adjudication_required ?? 0}
                    color={summary.fptp.adjudication_required > 0 ? VT.warn : VT.subtle}
                  />
                </>
              ) : (
                <>
                  <VoterMetricCard
                    label="FPTP Winners"
                    value={`${summary.fptp.winners_declared} / ${summary.fptp.total_contests}`}
                    color={VT.success}
                  />
                  <VoterMetricCard
                    label="PR Seats Allocated"
                    value={`${summary.pr.seats_allocated} / ${summary.pr.total_seats ?? "—"}`}
                    color={VT.provincial.color}
                  />
                  <VoterMetricCard
                    label="PR Parties Qualified"
                    value={summary.pr.parties_qualified}
                    color={VT.local.color}
                  />
                </>
              )}
            </VoterSummaryStrip>

            {/* ── Adjudication notice ─────────────────────────── */}
            {summary.fptp.adjudication_required > 0 && (
              <div
                style={{
                  padding: "12px 18px",
                  background: VT.warnBg,
                  border: `1px solid ${VT.warnBorder}`,
                  borderRadius: VT.radius.lg,
                  color: VT.warn,
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: VT.space.xl,
                }}
              >
                ⚠ {summary.fptp.adjudication_required} {isLocal ? "contest" : "FPTP constituency"} tie(s) pending adjudication.
              </div>
            )}

            {/* ── Local results ───────────────────────────────── */}
            {isLocal && localSummary && <LocalResultSection localSummary={localSummary} />}

            {/* ── FPTP results ─────────────────────────────────── */}
            {!isLocal && fptpRows.length > 0 && (
              <SectionCard>
                <SectionHeader title="FPTP Constituency Results" subtitle="First-past-the-post winners by constituency" />
                <div style={{ padding: "20px 24px" }}>
                  <FptpTable rows={fptpRows} />
                </div>
              </SectionCard>
            )}

            {/* ── PR results ───────────────────────────────────── */}
            {!isLocal && prRows.length > 0 && (
              <SectionCard>
                <SectionHeader title="Proportional Representation Results" subtitle="Party vote shares, qualification, and seat allocation" />
                <div style={{ padding: "20px 24px" }}>
                  <PrTable rows={prRows} />
                </div>
              </SectionCard>
            )}

            {/* ── PR elected members ───────────────────────────── */}
            {provincialSummary?.government_level === "PROVINCIAL" && prElectedMembers.length > 0 && (
              <SectionCard>
                <SectionHeader
                  title="Elected PR Members"
                  subtitle="Candidates elected through proportional representation"
                />
                <div style={{ padding: "20px 24px" }}>
                  <PrElectedMembersTable members={prElectedMembers} />
                </div>
              </SectionCard>
            )}

            {/* ── Assembly composition ─────────────────────────── */}
            {provincialSummary?.government_level === "PROVINCIAL" && (provincialSummary.assembly_composition?.length ?? 0) > 0 && (
              <SectionCard>
                <SectionHeader
                  title="Assembly Composition"
                  subtitle={`Party-wise seat distribution (FPTP + PR) · ${provincialSummary.assembly_seats_filled} / ${provincialSummary.assembly_total_seats} seats filled`}
                />
                <div style={{ padding: "20px 24px" }}>
                  <AssemblyCompositionTable rows={provincialSummary.assembly_composition} />
                </div>
              </SectionCard>
            )}
          </>
        );
      })()}
    </VoterPageContainer>
  );
}

/* ══════════════════════════════════════════════════════════════
   TABLE HELPERS
   ══════════════════════════════════════════════════════════════ */
function ResultTable({ children }) {
  return (
    <div style={{ overflowX: "auto", borderRadius: VT.radius.lg, border: `1px solid ${VT.border}` }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        {children}
      </table>
    </div>
  );
}

function Th({ children, align = "left" }) {
  return (
    <th
      style={{
        padding: "10px 16px",
        textAlign: align,
        fontSize: 11,
        fontWeight: 700,
        color: VT.muted,
        background: VT.surfaceAlt,
        borderBottom: `2px solid ${VT.border}`,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, align = "left", bold = false, style: extra = {} }) {
  return (
    <td
      style={{
        padding: "11px 16px",
        textAlign: align,
        fontSize: 13,
        color: VT.text,
        borderBottom: `1px solid ${VT.borderLight}`,
        fontWeight: bold ? 700 : 400,
        ...extra,
      }}
    >
      {children}
    </td>
  );
}

/* ── Winner / result badge ───────────────────────────────────── */
function WinnerBadge() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 8px",
        borderRadius: 5,
        fontSize: 11,
        fontWeight: 700,
        background: VT.successBg,
        color: VT.success,
        border: `1px solid ${VT.successBorder}`,
      }}
    >
      ✓ Winner
    </span>
  );
}

function TieBadge() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 8px",
        borderRadius: 5,
        fontSize: 11,
        fontWeight: 700,
        background: VT.warnBg,
        color: VT.warn,
        border: `1px solid ${VT.warnBorder}`,
      }}
    >
      ⚠ Tie
    </span>
  );
}

/* ── Vote share bar ──────────────────────────────────────────── */
function VoteShareBar({ votes, total, isWinner }) {
  const pct = total > 0 ? Math.round((votes / total) * 1000) / 10 : 0;
  return (
    <div style={{ marginTop: 4 }}>
      <div
        style={{
          height: 4,
          background: VT.borderLight,
          borderRadius: 2,
          overflow: "hidden",
          width: "100%",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: isWinner ? VT.success : VT.accentMuted,
            borderRadius: 2,
            transition: "width 0.6s ease",
          }}
        />
      </div>
      <span style={{ fontSize: 10, color: VT.muted, fontWeight: 500 }}>{pct.toFixed(1)}%</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   FPTP TABLE
   ══════════════════════════════════════════════════════════════ */
function FptpTable({ rows }) {
  const contests = {};
  for (const r of rows) {
    if (!contests[r.contest_id]) contests[r.contest_id] = [];
    contests[r.contest_id].push(r);
  }

  return Object.entries(contests).map(([contestId, cRows]) => {
    const totalVotes = cRows.reduce((sum, r) => sum + (r.vote_count || 0), 0);
    return (
      <div key={contestId} style={{ marginBottom: 20 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: VT.federal.color,
            marginBottom: 8,
            padding: "4px 10px",
            background: VT.federal.bg,
            border: `1px solid ${VT.federal.border}`,
            borderRadius: VT.radius.sm,
            display: "inline-block",
          }}
        >
          Constituency #{contestId}
        </div>
        <ResultTable>
          <thead>
            <tr>
              <Th>Rank</Th>
              <Th>Candidate</Th>
              <Th>Party</Th>
              <Th align="right">Votes</Th>
              <Th>Result</Th>
            </tr>
          </thead>
          <tbody>
            {cRows.map((r, idx) => (
              <tr
                key={r.id}
                style={{
                  background: r.is_winner
                    ? VT.successBg
                    : r.requires_adjudication
                    ? VT.warnBg
                    : idx % 2 === 1 ? VT.surfaceAlt : VT.surface,
                }}
              >
                <Td style={{ color: VT.muted, fontFamily: "monospace", width: 40 }}>{r.rank}</Td>
                <Td bold={r.is_winner}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {r.candidate_photo_path ? (
                      <img
                        src={`${API_BASE}/${r.candidate_photo_path}`}
                        alt=""
                        style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", border: `1px solid ${VT.border}`, flexShrink: 0 }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 28, height: 28, borderRadius: "50%",
                          background: VT.accentLight,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 700, color: VT.accent, flexShrink: 0,
                        }}
                      >
                        {r.candidate_name?.[0] || "?"}
                      </div>
                    )}
                    <div>
                      <div>{r.candidate_name}</div>
                      <VoteShareBar votes={r.vote_count} total={totalVotes} isWinner={r.is_winner} />
                    </div>
                  </div>
                </Td>
                <Td>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    {r.party_symbol_path && (
                      <img src={`${API_BASE}/${r.party_symbol_path}`} alt="" style={{ width: 18, height: 18, objectFit: "contain" }} />
                    )}
                    <span style={{ color: VT.textSecondary }}>{r.party_name || "Independent"}</span>
                  </div>
                </Td>
                <Td align="right" bold>{r.vote_count.toLocaleString()}</Td>
                <Td>
                  {r.is_winner && <WinnerBadge />}
                  {r.requires_adjudication && !r.is_winner && <TieBadge />}
                </Td>
              </tr>
            ))}
          </tbody>
        </ResultTable>
      </div>
    );
  });
}

/* ══════════════════════════════════════════════════════════════
   PR TABLE
   ══════════════════════════════════════════════════════════════ */
function PrTable({ rows }) {
  const sorted = [...rows].sort((a, b) => b.allocated_seats - a.allocated_seats || b.valid_votes - a.valid_votes);
  const totalVotes = sorted.reduce((sum, r) => sum + (r.valid_votes || 0), 0);
  return (
    <ResultTable>
      <thead>
        <tr>
          <Th>Party</Th>
          <Th align="right">Votes</Th>
          <Th align="right">Share</Th>
          <Th>Qualified</Th>
          <Th align="right">Seats</Th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((r, idx) => (
          <tr
            key={r.id}
            style={{
              background: r.meets_threshold
                ? idx % 2 === 1 ? VT.surfaceAlt : VT.surface
                : "#F9FAFB",
              opacity: r.meets_threshold ? 1 : 0.7,
            }}
          >
            <Td bold>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {r.party_symbol_path && (
                  <img src={`${API_BASE}/${r.party_symbol_path}`} alt="" style={{ width: 22, height: 22, objectFit: "contain" }} />
                )}
                <div>
                  <div>{r.party_name}</div>
                  <VoteShareBar votes={r.valid_votes} total={totalVotes} isWinner={r.meets_threshold} />
                </div>
              </div>
            </Td>
            <Td align="right">{r.valid_votes.toLocaleString()}</Td>
            <Td align="right">{r.vote_share_pct.toFixed(2)}%</Td>
            <Td>
              {r.meets_threshold ? (
                <span style={{ color: VT.success, fontWeight: 700, fontSize: 12 }}>✓ Yes</span>
              ) : (
                <span style={{ color: VT.subtle, fontSize: 12 }}>Below 3%</span>
              )}
            </Td>
            <Td align="right" bold style={{ fontSize: 17, color: r.meets_threshold ? VT.provincial.color : VT.subtle }}>
              {r.allocated_seats}
            </Td>
          </tr>
        ))}
      </tbody>
    </ResultTable>
  );
}

/* ══════════════════════════════════════════════════════════════
   PR ELECTED MEMBERS TABLE
   ══════════════════════════════════════════════════════════════ */
function PrElectedMembersTable({ members }) {
  const sorted = [...members].sort((a, b) => a.seat_number - b.seat_number);
  return (
    <ResultTable>
      <thead>
        <tr>
          <Th align="right">#</Th>
          <Th>Candidate</Th>
          <Th>Party</Th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((m, idx) => (
          <tr key={m.id} style={{ background: idx % 2 === 1 ? VT.surfaceAlt : VT.surface }}>
            <Td align="right" bold style={{ color: VT.provincial.color, fontFamily: "monospace", width: 48 }}>
              {m.seat_number}
            </Td>
            <Td bold>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {m.candidate_photo_path ? (
                  <img
                    src={`${API_BASE}/${m.candidate_photo_path}`}
                    alt=""
                    style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", border: `1px solid ${VT.border}`, flexShrink: 0 }}
                  />
                ) : (
                  <div
                    style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: VT.provincial.bg,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700, color: VT.provincial.color, flexShrink: 0,
                    }}
                  >
                    {m.candidate_name?.[0] || "?"}
                  </div>
                )}
                {m.candidate_name}
              </div>
            </Td>
            <Td>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {m.party_symbol_path && (
                  <img src={`${API_BASE}/${m.party_symbol_path}`} alt="" style={{ width: 18, height: 18, objectFit: "contain" }} />
                )}
                <span style={{ color: VT.textSecondary }}>{m.party_name}</span>
              </div>
            </Td>
          </tr>
        ))}
      </tbody>
    </ResultTable>
  );
}

/* ══════════════════════════════════════════════════════════════
   ASSEMBLY COMPOSITION TABLE
   ══════════════════════════════════════════════════════════════ */
function AssemblyCompositionTable({ rows }) {
  return (
    <ResultTable>
      <thead>
        <tr>
          <Th>Party</Th>
          <Th align="right">FPTP Seats</Th>
          <Th align="right">PR Seats</Th>
          <Th align="right">Total</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{ background: i % 2 === 1 ? VT.surfaceAlt : VT.surface }}>
            <Td bold style={{ color: i === 0 ? VT.provincial.color : VT.text }}>{r.party_name}</Td>
            <Td align="right">{r.fptp_seats}</Td>
            <Td align="right" style={{ color: VT.provincial.color, fontWeight: 600 }}>{r.pr_seats}</Td>
            <Td align="right" bold style={{ fontSize: 15, color: i === 0 ? VT.provincial.color : VT.text }}>
              {r.total_seats}
            </Td>
          </tr>
        ))}
      </tbody>
    </ResultTable>
  );
}


/* ══════════════════════════════════════════════════════════════
   LOCAL RESULT SECTION
   ══════════════════════════════════════════════════════════════ */
function LocalResultSection({ localSummary }) {
  if (!localSummary) return null;

  const { head_results = [], ward_results = [], local_summary } = localSummary;

  const ContestTable = ({ contest }) => {
    const total = (contest.candidates || []).reduce((sum, c) => sum + (c.vote_count || 0), 0);
    return (
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 12, fontWeight: 700, color: VT.local.color,
            marginBottom: 8, display: "flex", alignItems: "center", gap: 6,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              padding: "2px 8px", borderRadius: VT.radius.sm,
              background: VT.local.bg, border: `1px solid ${VT.local.border}`,
            }}
          >
            {contest.contest_title || contest.contest_type}
          </span>
          {contest.area_name && (
            <span style={{ fontWeight: 400, color: VT.muted, fontSize: 12 }}>
              — {contest.area_name}
            </span>
          )}
          <span style={{ fontSize: 11, color: VT.muted, marginLeft: "auto", fontWeight: 500 }}>
            {contest.seat_count > 1 ? `${contest.seat_count} seats` : "1 seat"}
          </span>
        </div>
        <ResultTable>
          <thead>
            <tr>
              <Th>Rank</Th>
              <Th>Candidate</Th>
              <Th>Party</Th>
              <Th align="right">Votes</Th>
              <Th>Result</Th>
            </tr>
          </thead>
          <tbody>
            {(contest.candidates || []).map((c, idx) => (
              <tr
                key={c.nomination_id || idx}
                style={{
                  background: c.is_winner
                    ? VT.successBg
                    : c.requires_adjudication
                    ? VT.warnBg
                    : idx % 2 === 1 ? VT.surfaceAlt : VT.surface,
                }}
              >
                <Td style={{ color: VT.muted, fontFamily: "monospace", width: 40 }}>{c.rank}</Td>
                <Td bold={c.is_winner}>
                  <div>
                    {c.candidate_name}
                    <VoteShareBar votes={c.vote_count} total={total} isWinner={c.is_winner} />
                  </div>
                </Td>
                <Td style={{ color: VT.textSecondary }}>{c.party_name || "Independent"}</Td>
                <Td align="right" bold>{c.vote_count.toLocaleString()}</Td>
                <Td>
                  {c.is_winner && <WinnerBadge />}
                  {c.requires_adjudication && !c.is_winner && <TieBadge />}
                </Td>
              </tr>
            ))}
          </tbody>
        </ResultTable>
      </div>
    );
  };

  return (
    <>
      {/* Local summary totals */}
      {local_summary && (
        <VoterSummaryStrip>
          <VoterMetricCard label="Total Contests" value={local_summary.total_direct_contests} color={VT.navy} />
          <VoterMetricCard label="Total Seats" value={local_summary.total_seats} color={VT.accent} />
          <VoterMetricCard label="Seats Filled" value={local_summary.seats_filled} color={VT.success} />
          <VoterMetricCard label="Wards Counted" value={local_summary.wards_counted} color={VT.provincial.color} />
        </VoterSummaryStrip>
      )}

      {/* Head contests (Mayor, Deputy Mayor) */}
      {head_results.length > 0 && (
        <SectionCard>
          <SectionHeader title="Head Positions" subtitle="Mayor, Deputy Mayor and equivalent leadership roles" />
          <div style={{ padding: "20px 24px" }}>
            {head_results.map((contest) => (
              <ContestTable key={contest.contest_id} contest={contest} />
            ))}
          </div>
        </SectionCard>
      )}

      {/* Ward results */}
      {ward_results.length > 0 && (
        <SectionCard>
          <SectionHeader title="Ward Results" subtitle="Ward Chair, Ward Member, and representative contests" />
          <div style={{ padding: "20px 24px" }}>
            {ward_results.map((ward) => (
              <div key={ward.area_id} style={{ marginBottom: 24 }}>
                <div
                  style={{
                    fontSize: 13, fontWeight: 700, color: VT.navy, marginBottom: 10,
                    padding: "8px 14px", background: VT.surfaceSubtle,
                    borderRadius: VT.radius.md, border: `1px solid ${VT.borderLight}`,
                  }}
                >
                  {ward.ward_name || `Ward ${ward.ward_number}`}
                </div>
                {(ward.contests || []).map((contest) => (
                  <ContestTable key={contest.contest_id} contest={contest} />
                ))}
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </>
  );
}
