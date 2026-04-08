import React, { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import useAuthGuard from "../hooks/useAuthGuard";
import apiClient from "../lib/apiClient";

export default function VoterBallot() {
  const { loading: authLoading, user } = useAuthGuard();
  const { electionId } = useParams();
  const navigate = useNavigate();

  const [ballot, setBallot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [fptpChoice, setFptpChoice] = useState(null);
  const [prChoice, setPrChoice] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [castResult, setCastResult] = useState(null);
  const [castError, setCastError] = useState("");

  useEffect(() => {
    if (!user) return;
    apiClient
      .get(`/voter/elections/${electionId}/ballot`)
      .then((res) => {
        setBallot(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(
          err?.response?.data?.detail || "Failed to load ballot information"
        );
        setLoading(false);
      });
  }, [user, electionId]);

  if (authLoading)
    return <div style={{ textAlign: "center", padding: 40 }}>Loading…</div>;
  if (!user) return <Navigate to="/" replace />;

  /* ── loading / error ──────────────────────────────────────── */

  if (loading)
    return (
      <div
        style={{
          maxWidth: 800,
          margin: "0 auto",
          padding: 40,
          textAlign: "center",
          color: "#64748b",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        Loading ballot information…
      </div>
    );

  if (error)
    return (
      <div
        style={{
          maxWidth: 800,
          margin: "0 auto",
          padding: 40,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            padding: 16,
            background: "#fef2f2",
            color: "#b91c1c",
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
        <button
          onClick={() => navigate("/elections")}
          style={linkBtnStyle}
        >
          ← Back to Elections
        </button>
      </div>
    );

  /* ── success screen ───────────────────────────────────────── */

  if (castResult)
    return (
      <div
        style={{
          maxWidth: 600,
          margin: "0 auto",
          padding: "60px 16px",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ fontSize: 72, marginBottom: 24 }}>✅</div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "#166534",
            marginBottom: 8,
          }}
        >
          Ballot Cast Successfully
        </h1>
        <p style={{ color: "#64748b", fontSize: 16, marginBottom: 32 }}>
          {castResult.message}
        </p>
        <div
          style={{
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: 12,
            padding: 24,
            marginBottom: 32,
            textAlign: "left",
          }}
        >
          <div style={{ margin: "4px 0", fontSize: 14 }}>
            <strong>Election:</strong> {ballot.election_title}
          </div>
          <div style={{ margin: "4px 0", fontSize: 14 }}>
            <strong>Ballot ID:</strong> {castResult.ballot_id}
          </div>
          <div style={{ margin: "4px 0", fontSize: 14 }}>
            <strong>Constituency:</strong>{" "}
            {ballot.voter_constituency.name}
          </div>
        </div>
        <button
          onClick={() => navigate("/elections")}
          style={{
            padding: "10px 24px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            background: "#2563eb",
            color: "#fff",
            border: "none",
            cursor: "pointer",
          }}
        >
          Back to Elections
        </button>
      </div>
    );

  /* ── already voted ────────────────────────────────────────── */

  if (ballot.already_voted)
    return (
      <div
        style={{
          maxWidth: 600,
          margin: "0 auto",
          padding: "60px 16px",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ fontSize: 72, marginBottom: 24 }}>🗳️</div>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: "#1e293b",
            marginBottom: 8,
          }}
        >
          Already Voted
        </h1>
        <p style={{ color: "#64748b", fontSize: 16, marginBottom: 32 }}>
          You have already cast your ballot for{" "}
          <strong>{ballot.election_title}</strong>.
        </p>
        <button
          onClick={() => navigate("/elections")}
          style={linkBtnStyle}
        >
          ← Back to Elections
        </button>
      </div>
    );

  /* ── ballot form ──────────────────────────────────────────── */

  const canVote = ballot.election_status === "POLLING_OPEN";
  const bothSelected = fptpChoice !== null && prChoice !== null;

  const selectedCandidate = ballot.fptp.candidates.find(
    (c) => c.nomination_id === fptpChoice
  );
  const selectedParty = ballot.pr.parties.find(
    (p) => p.party_id === prChoice
  );

  function handleCast() {
    setConfirming(true);
  }

  async function confirmCast() {
    setSubmitting(true);
    setCastError("");
    try {
      const res = await apiClient.post(
        `/voter/elections/${electionId}/cast`,
        {
          fptp_nomination_id: fptpChoice,
          pr_party_id: prChoice,
        }
      );
      setCastResult(res.data);
    } catch (err) {
      setCastError(
        err?.response?.data?.detail ||
          "Failed to cast ballot. Please try again."
      );
    } finally {
      setSubmitting(false);
      setConfirming(false);
    }
  }

  return (
    <div
      style={{
        maxWidth: 920,
        margin: "0 auto",
        padding: "32px 16px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* ── header ───────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => navigate("/elections")}
          style={{
            background: "none",
            border: "none",
            color: "#64748b",
            cursor: "pointer",
            fontSize: 14,
            padding: 0,
          }}
        >
          ← Back to Elections
        </button>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: "#1e293b",
            marginTop: 8,
            marginBottom: 4,
          }}
        >
          {ballot.election_title}
        </h1>
        <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>
          Constituency:{" "}
          <strong>{ballot.voter_constituency.name}</strong> (
          {ballot.voter_constituency.district_name})
        </p>
      </div>

      {/* ── info banners ─────────────────────────────── */}
      {!canVote && (
        <div
          style={{
            padding: 16,
            background: "#fef3c7",
            color: "#92400e",
            borderRadius: 8,
            marginBottom: 24,
            fontSize: 14,
          }}
        >
          This election is not currently open for voting. You can
          preview the candidates below.
        </div>
      )}

      {castError && (
        <div
          style={{
            padding: 16,
            background: "#fef2f2",
            color: "#b91c1c",
            borderRadius: 8,
            marginBottom: 24,
            fontSize: 14,
          }}
        >
          {castError}
        </div>
      )}

      {/* ── two-column ballot ────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
        }}
      >
        {/* FPTP */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              background: "#1e40af",
              color: "#fff",
              padding: "14px 20px",
            }}
          >
            <h2
              style={{ fontSize: 16, fontWeight: 700, margin: 0 }}
            >
              FPTP Ballot
            </h2>
            <p
              style={{
                fontSize: 12,
                opacity: 0.8,
                margin: "4px 0 0",
              }}
            >
              {ballot.fptp.contest_title}
            </p>
            <p
              style={{
                fontSize: 11,
                opacity: 0.6,
                margin: "2px 0 0",
              }}
            >
              Select ONE candidate
            </p>
          </div>
          <div style={{ padding: 16 }}>
            {ballot.fptp.candidates.length === 0 ? (
              <p
                style={{
                  color: "#94a3b8",
                  textAlign: "center",
                  padding: 20,
                }}
              >
                No candidates available
              </p>
            ) : (
              ballot.fptp.candidates.map((c) => (
                <label
                  key={c.nomination_id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 16px",
                    borderRadius: 8,
                    marginBottom: 8,
                    cursor: canVote ? "pointer" : "default",
                    background:
                      fptpChoice === c.nomination_id
                        ? "#eff6ff"
                        : "#f8fafc",
                    border:
                      fptpChoice === c.nomination_id
                        ? "2px solid #2563eb"
                        : "2px solid transparent",
                    transition: "all 0.15s",
                  }}
                >
                  <input
                    type="radio"
                    name="fptp"
                    value={c.nomination_id}
                    checked={fptpChoice === c.nomination_id}
                    onChange={() =>
                      setFptpChoice(c.nomination_id)
                    }
                    disabled={!canVote}
                    style={{
                      accentColor: "#2563eb",
                      width: 18,
                      height: 18,
                    }}
                  />
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 14,
                        color: "#1e293b",
                      }}
                    >
                      {c.candidate_name}
                    </div>
                    {c.party_name ? (
                      <div
                        style={{
                          fontSize: 12,
                          color: "#64748b",
                        }}
                      >
                        {c.party_name}
                        {c.party_abbreviation
                          ? ` (${c.party_abbreviation})`
                          : ""}
                      </div>
                    ) : (
                      <div
                        style={{
                          fontSize: 12,
                          color: "#94a3b8",
                        }}
                      >
                        Independent
                      </div>
                    )}
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        {/* PR */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              background: "#7c3aed",
              color: "#fff",
              padding: "14px 20px",
            }}
          >
            <h2
              style={{ fontSize: 16, fontWeight: 700, margin: 0 }}
            >
              PR Ballot
            </h2>
            <p
              style={{
                fontSize: 12,
                opacity: 0.8,
                margin: "4px 0 0",
              }}
            >
              {ballot.pr.contest_title}
            </p>
            <p
              style={{
                fontSize: 11,
                opacity: 0.6,
                margin: "2px 0 0",
              }}
            >
              Select ONE party
            </p>
          </div>
          <div style={{ padding: 16 }}>
            {ballot.pr.parties.length === 0 ? (
              <p
                style={{
                  color: "#94a3b8",
                  textAlign: "center",
                  padding: 20,
                }}
              >
                No parties available
              </p>
            ) : (
              ballot.pr.parties.map((p) => (
                <label
                  key={p.party_id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 16px",
                    borderRadius: 8,
                    marginBottom: 8,
                    cursor: canVote ? "pointer" : "default",
                    background:
                      prChoice === p.party_id
                        ? "#f5f3ff"
                        : "#f8fafc",
                    border:
                      prChoice === p.party_id
                        ? "2px solid #7c3aed"
                        : "2px solid transparent",
                    transition: "all 0.15s",
                  }}
                >
                  <input
                    type="radio"
                    name="pr"
                    value={p.party_id}
                    checked={prChoice === p.party_id}
                    onChange={() => setPrChoice(p.party_id)}
                    disabled={!canVote}
                    style={{
                      accentColor: "#7c3aed",
                      width: 18,
                      height: 18,
                    }}
                  />
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 14,
                        color: "#1e293b",
                      }}
                    >
                      {p.party_name}
                    </div>
                    {p.party_abbreviation && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "#64748b",
                        }}
                      >
                        {p.party_abbreviation}
                      </div>
                    )}
                  </div>
                </label>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── submit button ────────────────────────────── */}
      {canVote && (
        <div style={{ marginTop: 32, textAlign: "center" }}>
          <button
            onClick={handleCast}
            disabled={!bothSelected || submitting}
            style={{
              padding: "14px 40px",
              borderRadius: 10,
              fontSize: 16,
              fontWeight: 700,
              background: bothSelected ? "#16a34a" : "#d1d5db",
              color: bothSelected ? "#fff" : "#9ca3af",
              border: "none",
              cursor: bothSelected ? "pointer" : "not-allowed",
              transition: "all 0.2s",
            }}
          >
            {submitting ? "Casting…" : "Cast Your Ballot"}
          </button>
          {!bothSelected && (
            <p
              style={{
                color: "#94a3b8",
                fontSize: 13,
                marginTop: 8,
              }}
            >
              Please select both an FPTP candidate and a PR party
              to proceed.
            </p>
          )}
        </div>
      )}

      {/* ── confirmation modal ───────────────────────── */}
      {confirming && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 32,
              maxWidth: 480,
              width: "90%",
              boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
            }}
          >
            <h2
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#1e293b",
                marginBottom: 16,
              }}
            >
              Confirm Your Vote
            </h2>
            <p
              style={{
                color: "#64748b",
                fontSize: 14,
                marginBottom: 20,
              }}
            >
              This action <strong>cannot be undone</strong>. Please
              verify your selections:
            </p>

            <div
              style={{
                background: "#f8fafc",
                borderRadius: 8,
                padding: 16,
                marginBottom: 20,
              }}
            >
              <div style={{ marginBottom: 12 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: "#64748b",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    marginBottom: 2,
                  }}
                >
                  FPTP Candidate
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "#1e40af",
                  }}
                >
                  {selectedCandidate?.candidate_name}
                  {selectedCandidate?.party_abbreviation
                    ? ` (${selectedCandidate.party_abbreviation})`
                    : ""}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#64748b",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    marginBottom: 2,
                  }}
                >
                  PR Party
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "#7c3aed",
                  }}
                >
                  {selectedParty?.party_name}
                  {selectedParty?.party_abbreviation
                    ? ` (${selectedParty.party_abbreviation})`
                    : ""}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setConfirming(false)}
                disabled={submitting}
                style={{
                  padding: "10px 20px",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  background: "#fff",
                  color: "#64748b",
                  border: "1px solid #e2e8f0",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmCast}
                disabled={submitting}
                style={{
                  padding: "10px 20px",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  background: "#16a34a",
                  color: "#fff",
                  border: "none",
                  cursor: submitting ? "wait" : "pointer",
                }}
              >
                {submitting ? "Casting…" : "Confirm & Cast"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── shared style ──────────────────────────────────────────── */

const linkBtnStyle = {
  padding: "8px 20px",
  borderRadius: 8,
  fontSize: 14,
  background: "transparent",
  color: "#64748b",
  border: "1px solid #e2e8f0",
  cursor: "pointer",
};
