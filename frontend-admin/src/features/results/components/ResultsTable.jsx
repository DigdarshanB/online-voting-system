import React from "react";
import { Award, TrendingUp, AlertTriangle } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const P = {
  navy: "#173B72", accent: "#2F6FED", surface: "#FFFFFF", bg: "#F5F7FB",
  border: "#DCE3EC", text: "#0F172A", muted: "#64748B",
  success: "#059669", warn: "#D97706", purple: "#7C3AED", orange: "#EA580C",
};

const thStyle = {
  padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700,
  color: P.muted, borderBottom: `2px solid #E6EAF0`, background: "#FAFBFE",
  textTransform: "uppercase", letterSpacing: "0.06em",
};
const tdStyle = {
  padding: "10px 14px", fontSize: 13, color: P.text,
  borderBottom: `1px solid ${P.border}`,
};

/* ── FPTP Results Table ───────────────────────────────────────── */
export function FptpResultsTable({ rows }) {
  const contests = {};
  for (const r of rows) {
    if (!contests[r.contest_id]) contests[r.contest_id] = [];
    contests[r.contest_id].push(r);
  }

  const medals = { 1: "🥇", 2: "🥈", 3: "🥉" };

  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: P.text, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <Award size={18} color={P.navy} /> FPTP Constituency Results
      </h3>
      {Object.entries(contests).map(([contestId, cRows]) => {
        const maxVotes = Math.max(...cRows.map(r => r.vote_count || 0), 1);
        return (
          <div key={contestId} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: P.navy, marginBottom: 6 }}>
              {cRows[0]?.contest_title || `Contest #${contestId}`}
            </div>
            <div style={{ overflowX: "auto", borderRadius: 14, border: `1px solid ${P.border}`, background: P.surface, boxShadow: "0 2px 10px rgba(15,23,42,0.04)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, width: 60 }}>Rank</th>
                    <th style={thStyle}>Candidate</th>
                    <th style={thStyle}>Party</th>
                    <th style={{ ...thStyle, textAlign: "right", minWidth: 160 }}>Votes</th>
                    <th style={thStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {cRows.map((r) => {
                    const pct = maxVotes > 0 ? (r.vote_count / maxVotes) * 100 : 0;
                    const barColor = r.rank === 1 ? "#FFD700" : r.rank === 2 ? "#C0C0C0" : r.rank === 3 ? "#CD7F32" : P.border;
                    return (
                      <tr key={r.id} style={{
                        background: r.is_winner ? "#F0FDF4" : r.requires_adjudication ? "#FFFBEB" : "transparent",
                        transition: "background 0.15s ease",
                      }}>
                        <td style={{ ...tdStyle, textAlign: "center", fontWeight: 700 }}>
                          {medals[r.rank] || r.rank}
                        </td>
                        <td style={{ ...tdStyle, fontWeight: r.is_winner ? 700 : 400 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {r.candidate_photo_path ? (
                              <img src={`${API_BASE}/${r.candidate_photo_path}`} alt=""
                                style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", border: `1.5px solid ${P.border}` }} />
                            ) : (
                              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#EAF2FF", border: `1.5px solid ${P.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: P.accent }}>
                                {(r.candidate_name || "?")[0]}
                              </div>
                            )}
                            {r.candidate_name}
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {r.party_symbol_path && (
                              <img src={`${API_BASE}/${r.party_symbol_path}`} alt=""
                                style={{ width: 20, height: 20, objectFit: "contain" }} />
                            )}
                            {r.party_name || "Independent"}
                          </div>
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                            <span style={{ fontWeight: 700 }}>{r.vote_count.toLocaleString()}</span>
                            <div style={{ width: "100%", maxWidth: 120, height: 6, borderRadius: 3, background: "#F1F5F9", overflow: "hidden" }}>
                              <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: barColor, transition: "width 0.3s ease" }} />
                            </div>
                          </div>
                        </td>
                        <td style={tdStyle}>
                          {r.is_winner && (
                            <span style={{ color: P.success, fontWeight: 700, fontSize: 12 }}>✓ Winner</span>
                          )}
                          {r.requires_adjudication && (
                            <span style={{ color: P.warn, fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                              <AlertTriangle size={12} /> Tie
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── PR Results Table ─────────────────────────────────────────── */
export function PrResultsTable({ rows }) {
  const sorted = [...rows].sort((a, b) => b.allocated_seats - a.allocated_seats || b.valid_votes - a.valid_votes);

  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: P.text, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <TrendingUp size={18} color={P.navy} /> Proportional Representation Results
      </h3>
      <div style={{ overflowX: "auto", borderRadius: 14, border: `1px solid ${P.border}`, background: P.surface, boxShadow: "0 2px 10px rgba(15,23,42,0.04)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Party</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Votes</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Vote Share</th>
              <th style={thStyle}>Threshold</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Seats</th>
              <th style={thStyle}>Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id} style={{
                background: r.requires_adjudication ? "#FFFBEB" : !r.meets_threshold ? "#F9FAFB" : "transparent",
                transition: "background 0.15s ease",
              }}>
                <td style={{ ...tdStyle, fontWeight: 600 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {r.party_symbol_path && (
                      <img src={`${API_BASE}/${r.party_symbol_path}`} alt=""
                        style={{ width: 22, height: 22, objectFit: "contain" }} />
                    )}
                    {r.party_name}
                  </div>
                </td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{r.valid_votes.toLocaleString()}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{r.vote_share_pct.toFixed(2)}%</td>
                <td style={tdStyle}>
                  {r.meets_threshold ? (
                    <span style={{ padding: "3px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: "#ECFDF5", color: P.success }}>✓ Qualified</span>
                  ) : (
                    <span style={{ fontSize: 12, color: P.muted }}>Below 3%</span>
                  )}
                </td>
                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, fontSize: 16 }}>{r.allocated_seats}</td>
                <td style={tdStyle}>
                  {r.requires_adjudication && (
                    <span style={{ color: P.warn, fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                      <AlertTriangle size={12} /> Boundary Tie
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Provincial Summary Section ───────────────────────────────── */
export function ProvincialSummarySection({ summary }) {
  if (!summary) return null;
  const cards = [
    { label: "Province", value: summary.province_name || summary.province_code || "—", color: P.purple },
    { label: "Total Seats", value: summary.total_seats ?? "—", color: P.navy },
    { label: "FPTP Seats", value: summary.fptp_seats ?? "—", color: P.accent },
    { label: "PR Seats", value: summary.pr_seats ?? "—", color: P.orange },
    { label: "Assembly Formed", value: summary.assembly_formed ? "Yes" : "No", color: summary.assembly_formed ? P.success : P.muted },
  ].filter(c => c.value !== "—" || c.label === "Province");

  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: P.text, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <Award size={18} color={P.purple} /> Provincial Assembly Summary
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        {cards.map((c, i) => (
          <div key={i} style={{ background: P.surface, borderRadius: 14, padding: "16px 18px", border: `1px solid ${P.border}`, borderLeft: `3px solid ${c.color}` }}>
            <div style={{ fontSize: 11, color: P.muted, fontWeight: 700, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>{c.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── PR Elected Members Table ─────────────────────────────────── */
export function PrElectedMembersTable({ members }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: P.text, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <TrendingUp size={18} color={P.purple} /> PR Elected Members ({members.length})
      </h3>
      <div style={{ overflowX: "auto", borderRadius: 14, border: `1px solid ${P.border}`, background: P.surface, boxShadow: "0 2px 10px rgba(15,23,42,0.04)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: 50 }}>Pos</th>
              <th style={thStyle}>Candidate</th>
              <th style={thStyle}>Party</th>
              <th style={thStyle}>Gender</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m, i) => (
              <tr key={m.id || i} style={{ background: i % 2 === 0 ? "transparent" : "#FAFBFE", transition: "background 0.15s ease" }}>
                <td style={{ ...tdStyle, fontFamily: "monospace", fontWeight: 700, color: P.accent, textAlign: "center" }}>{m.list_position ?? i + 1}</td>
                <td style={{ ...tdStyle, fontWeight: 600 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {m.candidate_photo_path ? (
                      <img src={`${API_BASE}/${m.candidate_photo_path}`} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", border: `1.5px solid ${P.border}` }} />
                    ) : (
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#EAF2FF", border: `1.5px solid ${P.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: P.accent }}>
                        {(m.candidate_name || "?")[0]}
                      </div>
                    )}
                    {m.candidate_name || `#${m.candidate_id}`}
                  </div>
                </td>
                <td style={tdStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {m.party_symbol_path && <img src={`${API_BASE}/${m.party_symbol_path}`} alt="" style={{ width: 20, height: 20, objectFit: "contain" }} />}
                    {m.party_name || "Independent"}
                  </div>
                </td>
                <td style={{ ...tdStyle, fontSize: 12, color: P.muted }}>{m.gender || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Local Result Section ─────────────────────────────────────── */
export function LocalResultSection({ localSummary }) {
  if (!localSummary) return null;
  const { head_results = [], ward_results = [], local_summary } = localSummary;

  const ContestTable = ({ contest }) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: P.navy, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
        {contest.contest_title || contest.contest_type}
        {contest.area_name && <span style={{ fontWeight: 400, color: P.muted }}> — {contest.area_name}</span>}
        <span style={{ fontSize: 11, color: P.muted, marginLeft: "auto" }}>
          {contest.seat_count > 1 ? `${contest.seat_count} seats` : "1 seat"}
        </span>
      </div>
      <div style={{ overflowX: "auto", borderRadius: 14, border: `1px solid ${P.border}`, background: P.surface }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: 60 }}>Rank</th>
              <th style={thStyle}>Candidate</th>
              <th style={thStyle}>Party</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Votes</th>
              <th style={thStyle}>Status</th>
            </tr>
          </thead>
          <tbody>
            {(contest.candidates || []).map((c, i) => (
              <tr key={c.nomination_id || i} style={{
                background: c.is_winner ? "#F0FDF4" : c.requires_adjudication ? "#FFFBEB" : "transparent",
              }}>
                <td style={{ ...tdStyle, textAlign: "center" }}>{c.rank}</td>
                <td style={{ ...tdStyle, fontWeight: c.is_winner ? 700 : 400 }}>{c.candidate_name}</td>
                <td style={tdStyle}>{c.party_name || "Independent"}</td>
                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>{c.vote_count.toLocaleString()}</td>
                <td style={tdStyle}>
                  {c.is_winner && <span style={{ color: P.success, fontWeight: 700, fontSize: 12 }}>✓ Winner</span>}
                  {c.requires_adjudication && (
                    <span style={{ color: P.warn, fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                      <AlertTriangle size={12} /> Tie
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div style={{ marginBottom: 24 }}>
      {local_summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Total Contests", value: local_summary.total_direct_contests, color: P.navy },
            { label: "Total Seats", value: local_summary.total_seats, color: P.accent },
            { label: "Seats Filled", value: local_summary.seats_filled, color: P.success },
            { label: "Seats Unfilled", value: local_summary.seats_unfilled ?? 0, color: (local_summary.seats_unfilled || 0) > 0 ? P.warn : P.muted },
            { label: "Adjudication", value: local_summary.adjudication_required, color: local_summary.adjudication_required > 0 ? P.warn : P.muted },
            { label: "Wards Counted", value: local_summary.wards_counted, color: P.purple },
          ].map((c, i) => (
            <div key={i} style={{ background: P.surface, borderRadius: 14, padding: "16px 18px", border: `1px solid ${P.border}`, borderLeft: `3px solid ${c.color}` }}>
              <div style={{ fontSize: 11, color: P.muted, fontWeight: 700, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>{c.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: c.color }}>{c.value ?? "—"}</div>
            </div>
          ))}
        </div>
      )}

      {head_results.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: P.text, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <Award size={18} color={P.orange} /> Head Positions
          </h3>
          {head_results.map((contest) => <ContestTable key={contest.contest_id} contest={contest} />)}
        </div>
      )}

      {ward_results.length > 0 && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: P.text, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <Award size={18} color={P.purple} /> Ward Results
          </h3>
          {ward_results.map((ward) => (
            <div key={ward.area_id} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: P.navy, marginBottom: 10, padding: "8px 14px", background: "#FAFBFE", borderRadius: 8, border: `1px solid ${P.border}` }}>
                {ward.ward_name || `Ward ${ward.ward_number}`}
              </div>
              {(ward.contests || []).map((contest) => <ContestTable key={contest.contest_id} contest={contest} />)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
