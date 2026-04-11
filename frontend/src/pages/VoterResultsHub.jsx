/**
 * VoterResultsHub.jsx
 *
 * Results listing page — shows all elections that have published results.
 * Individual election results are shown at /results/:electionId.
 */

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BarChart3, ChevronRight, AlertCircle, Search } from "lucide-react";
import apiClient from "../lib/apiClient";

const PALETTE = {
  navy: "#173B72",
  accentBlue: "#2F6FED",
  mutedText: "#64748B",
  surface: "#FFFFFF",
  success: "#0F9F6E",
  warning: "#F59E0B",
};

const STATUS_LABELS = {
  FINALIZED: { label: "Finalized", bg: "#F0FDF4", color: "#15803D", border: "#BBF7D0" },
  ARCHIVED: { label: "Archived", bg: "#F8FAFC", color: "#64748B", border: "#E2E8F0" },
  COUNTING: { label: "Counting", bg: "#FFFBEB", color: "#B45309", border: "#FDE68A" },
};

export default function VoterResultsHub() {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    apiClient
      .get("/voter/elections")
      .then((res) => {
        const all = res.data || [];
        const withResults = all.filter(
          (e) => e.status === "FINALIZED" || e.status === "ARCHIVED" || e.status === "COUNTING"
        );
        setElections(withResults);
      })
      .catch(() => setError("Unable to load election results."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = elections.filter(
    (e) =>
      e.title?.toLowerCase().includes(search.toLowerCase()) ||
      e.election_type?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: "32px 32px 48px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 14, color: PALETTE.mutedText, fontWeight: 500, margin: 0 }}>
          View published results for completed elections.
        </p>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 20 }}>
        <Search
          size={18}
          color={PALETTE.mutedText}
          style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}
        />
        <input
          type="text"
          placeholder="Search elections…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            height: 44,
            borderRadius: 10,
            border: "1px solid #E2E8F0",
            padding: "0 14px 0 42px",
            fontSize: 14,
            color: PALETTE.navy,
            fontFamily: "inherit",
            background: PALETTE.surface,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: 48, color: PALETTE.mutedText, fontSize: 15, fontWeight: 500 }}>
          Loading results…
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 20px",
            background: "#FEF2F2",
            borderRadius: 10,
            border: "1px solid #FECACA",
            color: "#DC2626",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Results list */}
      {!loading && !error && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((el) => {
            const status = STATUS_LABELS[el.status] || STATUS_LABELS.FINALIZED;
            return (
              <Link
                key={el.id}
                to={`/results/${el.id}`}
                style={{
                  background: PALETTE.surface,
                  borderRadius: 12,
                  border: "1px solid #E2E8F0",
                  padding: "20px 24px",
                  display: "flex",
                  alignItems: "center",
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                  gap: 16,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = PALETTE.accentBlue;
                  e.currentTarget.style.boxShadow = "0 2px 12px rgba(47,111,237,0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#E2E8F0";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    background: "#EAF2FF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <BarChart3 size={20} color={PALETTE.accentBlue} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: PALETTE.navy }}>
                    {el.title}
                  </div>
                  <div style={{ fontSize: 13, color: PALETTE.mutedText, marginTop: 2, fontWeight: 500 }}>
                    {el.election_type || "General"} Election
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: status.color,
                    background: status.bg,
                    border: `1px solid ${status.border}`,
                    borderRadius: 6,
                    padding: "4px 10px",
                    flexShrink: 0,
                  }}
                >
                  {status.label}
                </span>
                <ChevronRight size={18} color={PALETTE.mutedText} style={{ flexShrink: 0 }} />
              </Link>
            );
          })}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filtered.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "48px 24px",
            background: PALETTE.surface,
            borderRadius: 14,
            border: "1px solid #E2E8F0",
          }}
        >
          <BarChart3 size={40} color="#CBD5E1" style={{ marginBottom: 12 }} />
          <p style={{ color: PALETTE.mutedText, fontSize: 15, fontWeight: 500, margin: 0 }}>
            {search ? "No elections match your search." : "No election results are available yet."}
          </p>
        </div>
      )}
    </div>
  );
}
