/**
 * VoterReceipt.jsx
 *
 * Vote receipt page — displays confirmation of cast votes.
 *
 * Currently uses route-state and localStorage for vote confirmation data.
 * When a backend receipt endpoint is available, this page will be
 * updated to fetch from the API instead.
 */

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Receipt, CheckCircle2, AlertCircle, ExternalLink, ShieldCheck, Clock } from "lucide-react";
import apiClient from "../lib/apiClient";

const PALETTE = {
  navy: "#173B72",
  accentBlue: "#2F6FED",
  mutedText: "#64748B",
  surface: "#FFFFFF",
  success: "#0F9F6E",
};

const RECEIPT_STORAGE_KEY = "voter_receipts";

/** Read saved receipts from localStorage */
function getSavedReceipts() {
  try {
    const raw = localStorage.getItem(RECEIPT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function VoterReceipt() {
  const [receipts, setReceipts] = useState([]);
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load saved receipts
    setReceipts(getSavedReceipts());

    // Also fetch elections to show voted-in elections
    apiClient
      .get("/voter/elections")
      .then((res) => {
        const all = res.data || [];
        setElections(all.filter((e) => e.has_voted));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Merge receipts with election info
  const receiptEntries = elections.map((el) => {
    const savedReceipt = receipts.find(
      (r) => String(r.election_id) === String(el.id)
    );
    return {
      electionId: el.id,
      electionTitle: el.title,
      electionType: el.election_subtype || "General",
      ballotId: savedReceipt?.ballot_id || null,
      timestamp: savedReceipt?.timestamp || null,
    };
  });

  return (
    <div style={{ padding: "32px 32px 48px", maxWidth: 800, margin: "0 auto" }}>
      {/* Header Info */}
      <div
        style={{
          background: "#F0FDF4",
          borderRadius: 12,
          border: "1px solid #BBF7D0",
          padding: "18px 24px",
          marginBottom: 24,
          display: "flex",
          alignItems: "flex-start",
          gap: 14,
        }}
      >
        <ShieldCheck size={22} color={PALETTE.success} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#15803D", marginBottom: 4 }}>
            Vote Receipt Verification
          </div>
          <p style={{ fontSize: 13, color: "#166534", margin: 0, lineHeight: 1.6, fontWeight: 500 }}>
            Your vote receipts confirm your participation in elections. Each receipt includes
            a unique ballot identifier that can be used for verification purposes.
          </p>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: 48, color: PALETTE.mutedText, fontSize: 15, fontWeight: 500 }}>
          Loading receipts…
        </div>
      )}

      {/* Receipt Cards */}
      {!loading && receiptEntries.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {receiptEntries.map((entry) => (
            <div
              key={entry.electionId}
              style={{
                background: PALETTE.surface,
                borderRadius: 14,
                border: "1px solid #E2E8F0",
                padding: "24px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Green left accent */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 4,
                  background: PALETTE.success,
                  borderRadius: "14px 0 0 14px",
                }}
              />

              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <CheckCircle2 size={18} color={PALETTE.success} />
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: PALETTE.success,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      Vote Confirmed
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: PALETTE.navy, marginBottom: 4 }}>
                    {entry.electionTitle}
                  </div>
                  <div style={{ fontSize: 13, color: PALETTE.mutedText, fontWeight: 500 }}>
                    {entry.electionType} Election
                  </div>
                </div>

                <Link
                  to={`/results/${entry.electionId}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 16px",
                    borderRadius: 8,
                    background: "#EAF2FF",
                    color: PALETTE.accentBlue,
                    fontWeight: 700,
                    fontSize: 13,
                    textDecoration: "none",
                    flexShrink: 0,
                  }}
                >
                  View Results <ExternalLink size={14} />
                </Link>
              </div>

              {/* Receipt Details */}
              <div
                style={{
                  marginTop: 16,
                  padding: "14px 18px",
                  background: "#F8FAFC",
                  borderRadius: 10,
                  border: "1px solid #E2E8F0",
                }}
              >
                {entry.ballotId ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
                      <span style={{ fontSize: 12, color: PALETTE.mutedText, fontWeight: 600 }}>
                        Ballot ID
                      </span>
                      <code
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: PALETTE.navy,
                          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                          background: "#EAF2FF",
                          padding: "2px 8px",
                          borderRadius: 4,
                        }}
                      >
                        {entry.ballotId}
                      </code>
                    </div>
                    {entry.timestamp && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
                        <span style={{ fontSize: 12, color: PALETTE.mutedText, fontWeight: 600 }}>
                          <Clock size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />
                          Submitted
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: PALETTE.navy }}>
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: PALETTE.mutedText, fontWeight: 500 }}>
                    <Receipt size={15} style={{ verticalAlign: "middle", marginRight: 6 }} />
                    Ballot confirmed — detailed receipt will be available when the receipt verification system is activated.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && receiptEntries.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "48px 24px",
            background: PALETTE.surface,
            borderRadius: 14,
            border: "1px solid #E2E8F0",
          }}
        >
          <Receipt size={40} color="#CBD5E1" style={{ marginBottom: 12 }} />
          <p style={{ color: PALETTE.mutedText, fontSize: 15, fontWeight: 500, margin: "0 0 6px" }}>
            No vote receipts yet.
          </p>
          <p style={{ color: PALETTE.mutedText, fontSize: 13, fontWeight: 400, margin: 0 }}>
            After you cast a vote in an election, your receipt will appear here.
          </p>
          <Link
            to="/elections"
            style={{
              display: "inline-block",
              marginTop: 18,
              padding: "10px 24px",
              borderRadius: 8,
              background: PALETTE.accentBlue,
              color: "#FFF",
              fontWeight: 700,
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            View Elections
          </Link>
        </div>
      )}
    </div>
  );
}

/**
 * Utility: Save a vote receipt after casting a vote.
 * Call this from VoterBallot after successful submission.
 */
export function saveVoteReceipt({ election_id, ballot_id, timestamp }) {
  const existing = getSavedReceipts();
  const filtered = existing.filter(
    (r) => String(r.election_id) !== String(election_id)
  );
  filtered.push({ election_id, ballot_id, timestamp: timestamp || new Date().toISOString() });
  localStorage.setItem(RECEIPT_STORAGE_KEY, JSON.stringify(filtered));
}
