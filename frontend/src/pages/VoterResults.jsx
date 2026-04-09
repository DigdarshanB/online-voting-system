import React, { useEffect, useState } from "react";
import { Navigate, useParams, Link } from "react-router-dom";
import useAuthGuard from "../hooks/useAuthGuard";
import apiClient from "../lib/apiClient";

export default function VoterResults() {
  const { electionId } = useParams();
  const { loading: authLoading, user } = useAuthGuard();

  const [summary, setSummary] = useState(null);
  const [fptpRows, setFptpRows] = useState([]);
  const [prRows, setPrRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || !electionId) return;
    Promise.all([
      apiClient.get(`/voter/results/${electionId}/summary`),
      apiClient.get(`/voter/results/${electionId}/fptp`),
      apiClient.get(`/voter/results/${electionId}/pr`),
    ])
      .then(([sRes, fRes, pRes]) => {
        setSummary(sRes.data);
        setFptpRows(fRes.data);
        setPrRows(pRes.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err?.response?.data?.detail || "Results are not yet available");
        setLoading(false);
      });
  }, [user, electionId]);

  if (authLoading) return <div style={{ textAlign: "center", padding: 40 }}>Loading…</div>;
  if (!user) return <Navigate to="/" replace />;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 16px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Back link */}
      <Link to="/elections" style={{ color: "#2563eb", fontSize: 14, textDecoration: "none", marginBottom: 16, display: "inline-block" }}>
        ← Back to Elections
      </Link>

      <h1 style={{ fontSize: 26, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>
        Election Results
      </h1>

      {loading && <p style={{ color: "#64748b", padding: 24 }}>Loading results…</p>}
      {error && <p style={{ color: "#dc2626", padding: 24 }}>{error}</p>}

      {!loading && !error && summary && (
        <>
          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 28 }}>
            <SummaryCard label="Ballots Counted" value={summary.total_ballots_counted?.toLocaleString() ?? "—"} color="#2563eb" />
            <SummaryCard label="FPTP Winners" value={`${summary.fptp.winners_declared} / ${summary.fptp.total_contests}`} color="#059669" />
            <SummaryCard label="PR Seats Allocated" value={`${summary.pr.seats_allocated} / ${summary.pr.total_seats ?? "—"}`} color="#7c3aed" />
            <SummaryCard label="PR Parties Qualified" value={summary.pr.parties_qualified} color="#ea580c" />
          </div>

          {summary.fptp.adjudication_required > 0 && (
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 16px", marginBottom: 20, color: "#92400e", fontSize: 14 }}>
              ⚠ {summary.fptp.adjudication_required} FPTP constituency tie(s) pending adjudication.
            </div>
          )}

          {/* FPTP Results */}
          {fptpRows.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", marginBottom: 12 }}>
                FPTP Constituency Results
              </h2>
              <FptpTable rows={fptpRows} />
            </div>
          )}

          {/* PR Results */}
          {prRows.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", marginBottom: 12 }}>
                Proportional Representation Results
              </h2>
              <PrTable rows={prRows} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }) {
  return (
    <div style={{
      background: "#f8fafc", borderRadius: 12, padding: "16px 18px",
      border: "1px solid #e2e8f0",
    }}>
      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function FptpTable({ rows }) {
  const contests = {};
  for (const r of rows) {
    if (!contests[r.contest_id]) contests[r.contest_id] = [];
    contests[r.contest_id].push(r);
  }

  return Object.entries(contests).map(([contestId, cRows]) => (
    <div key={contestId} style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
        Constituency #{contestId}
      </div>
      <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #e2e8f0" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f1f5f9" }}>
              <Th>Rank</Th>
              <Th>Candidate</Th>
              <Th>Party</Th>
              <Th align="right">Votes</Th>
              <Th>Result</Th>
            </tr>
          </thead>
          <tbody>
            {cRows.map((r) => (
              <tr key={r.id} style={{ background: r.is_winner ? "#f0fdf4" : r.requires_adjudication ? "#fffbeb" : "transparent" }}>
                <Td>{r.rank}</Td>
                <Td bold={r.is_winner}>{r.candidate_name}</Td>
                <Td>{r.party_name || "Independent"}</Td>
                <Td align="right" bold>{r.vote_count.toLocaleString()}</Td>
                <Td>
                  {r.is_winner && <span style={{ color: "#059669", fontWeight: 600 }}>✓ Winner</span>}
                  {r.requires_adjudication && <span style={{ color: "#d97706", fontWeight: 600 }}>⚠ Tie</span>}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  ));
}

function PrTable({ rows }) {
  const sorted = [...rows].sort((a, b) => b.allocated_seats - a.allocated_seats || b.valid_votes - a.valid_votes);
  return (
    <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #e2e8f0" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f1f5f9" }}>
            <Th>Party</Th>
            <Th align="right">Votes</Th>
            <Th align="right">Share</Th>
            <Th>Qualified</Th>
            <Th align="right">Seats</Th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.id} style={{ background: !r.meets_threshold ? "#f9fafb" : "transparent" }}>
              <Td bold>{r.party_name}</Td>
              <Td align="right">{r.valid_votes.toLocaleString()}</Td>
              <Td align="right">{r.vote_share_pct.toFixed(2)}%</Td>
              <Td>
                {r.meets_threshold
                  ? <span style={{ color: "#059669", fontWeight: 600 }}>✓ Yes</span>
                  : <span style={{ color: "#94a3b8" }}>Below 3%</span>}
              </Td>
              <Td align="right" bold style={{ fontSize: 16 }}>{r.allocated_seats}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, align = "left" }) {
  return (
    <th style={{
      padding: "10px 14px", textAlign: align, fontSize: 12, fontWeight: 600,
      color: "#64748b", borderBottom: "2px solid #e2e8f0",
    }}>
      {children}
    </th>
  );
}

function Td({ children, align = "left", bold = false, style = {} }) {
  return (
    <td style={{
      padding: "10px 14px", textAlign: align, fontSize: 13, color: "#1e293b",
      borderBottom: "1px solid #e2e8f0", fontWeight: bold ? 600 : 400, ...style,
    }}>
      {children}
    </td>
  );
}
