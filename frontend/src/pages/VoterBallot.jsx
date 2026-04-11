import React, { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import useAuthGuard from "../hooks/useAuthGuard";
import apiClient from "../lib/apiClient";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

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

  // Local ballot selections
  const [localChoices, setLocalChoices] = useState({
    head: null,
    deputy_head: null,
    ward_chair: null,
    ward_woman_member: null,
    ward_dalit_woman_member: null,
    ward_member_open: [],
  });

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
            <strong>
              {ballot.government_level === "LOCAL"
                ? "Local Body"
                : ballot.voter_area
                ? "Provincial constituency"
                : "Constituency"}:
            </strong>{" "}
            {ballot.government_level === "LOCAL"
              ? ballot.local_body?.name
              : ballot.voter_area
              ? ballot.voter_area.name
              : ballot.voter_constituency?.name}
          </div>
          {ballot.government_level === "LOCAL" && ballot.ward && (
            <div style={{ margin: "4px 0", fontSize: 14 }}>
              <strong>Ward:</strong> Ward {ballot.ward.ward_number} — {ballot.ward.name}
            </div>
          )}
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
  const isLocal = ballot.government_level === "LOCAL";
  const bothSelected = fptpChoice !== null && prChoice !== null;
  const localReady =
    localChoices.head !== null &&
    localChoices.deputy_head !== null &&
    localChoices.ward_chair !== null &&
    localChoices.ward_woman_member !== null &&
    localChoices.ward_dalit_woman_member !== null &&
    localChoices.ward_member_open.length === 2;
  const readyToVote = isLocal ? localReady : bothSelected;

  const selectedCandidate = ballot.fptp?.candidates?.find(
    (c) => c.nomination_id === fptpChoice
  );
  const selectedParty = ballot.pr?.parties?.find(
    (p) => p.party_id === prChoice
  );

  function setLocalChoice(key, nominationId) {
    setLocalChoices((prev) => ({ ...prev, [key]: nominationId }));
  }

  function toggleOpenMember(nominationId) {
    setLocalChoices((prev) => {
      const arr = prev.ward_member_open;
      if (arr.includes(nominationId))
        return { ...prev, ward_member_open: arr.filter((id) => id !== nominationId) };
      if (arr.length >= 2) return prev;
      return { ...prev, ward_member_open: [...arr, nominationId] };
    });
  }

  function handleCast() {
    setConfirming(true);
  }

  async function confirmCast() {
    setSubmitting(true);
    setCastError("");
    try {
      const url = isLocal
        ? `/voter/elections/${electionId}/cast-local`
        : `/voter/elections/${electionId}/cast`;
      const payload = isLocal
        ? {
            head_nomination_id: localChoices.head,
            deputy_head_nomination_id: localChoices.deputy_head,
            ward_chair_nomination_id: localChoices.ward_chair,
            ward_woman_member_nomination_id: localChoices.ward_woman_member,
            ward_dalit_woman_member_nomination_id: localChoices.ward_dalit_woman_member,
            ward_member_open_nomination_ids: localChoices.ward_member_open,
          }
        : { fptp_nomination_id: fptpChoice, pr_party_id: prChoice };
      const res = await apiClient.post(url, payload);
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
          {isLocal ? (
            <>Local Body: <strong>{ballot.local_body?.name}</strong> — Ward {ballot.ward?.ward_number}</>
          ) : (
            <>
              {ballot.voter_area ? "Provincial constituency" : "Constituency"}:{" "}
              <strong>{ballot.voter_area ? ballot.voter_area.name : ballot.voter_constituency?.name}</strong>
              {ballot.voter_constituency?.district_name
                ? ` (${ballot.voter_constituency.district_name})`
                : ballot.voter_area?.province_number
                ? ` (Province ${ballot.voter_area.province_number})`
                : ""}
            </>
          )}
        </p>
        {ballot.government_level === "PROVINCIAL" && (
          <div style={{ marginTop: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, background: "#f5f3ff", color: "#7c3aed", padding: "2px 10px", borderRadius: 6, border: "1px solid #e9d5ff" }}>
              {ballot.province_code} · Provincial Assembly Election
            </span>
          </div>
        )}
        {isLocal && (
          <div style={{ marginTop: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, background: "#fff7ed", color: "#ea580c", padding: "2px 10px", borderRadius: 6, border: "1px solid #fed7aa" }}>
              Local Body Election · {ballot.local_body?.name}
            </span>
          </div>
        )}
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

      {/* ── local ballot ─────────────────────────────── */}
      {isLocal && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {[
            { key: "head", color: "#ea580c", bg: "#fff7ed" },
            { key: "deputy_head", color: "#ea580c", bg: "#fff7ed" },
            { key: "ward_chair", color: "#2563eb", bg: "#eff6ff" },
            { key: "ward_woman_member", color: "#7c3aed", bg: "#f5f3ff" },
            { key: "ward_dalit_woman_member", color: "#7c3aed", bg: "#f5f3ff" },
            { key: "ward_member_open", color: "#059669", bg: "#ecfdf5" },
          ].map(({ key, color, bg }) => {
            const contest = ballot[key];
            if (!contest) return null;
            const isMulti = (contest.seat_count || 1) > 1;
            return (
              <div key={key} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ background: color, color: "#fff", padding: "14px 20px" }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{contest.contest_title}</h2>
                  <p style={{ fontSize: 11, opacity: 0.6, margin: "2px 0 0" }}>
                    {isMulti ? `Select ${contest.seat_count} candidates` : "Select ONE candidate"}
                  </p>
                </div>
                <div style={{ padding: 16 }}>
                  {contest.candidates.length === 0 ? (
                    <p style={{ color: "#94a3b8", textAlign: "center", padding: 20 }}>No candidates available</p>
                  ) : (
                    contest.candidates.map((c) => {
                      const checked = isMulti
                        ? localChoices.ward_member_open.includes(c.nomination_id)
                        : localChoices[key] === c.nomination_id;
                      const maxed = isMulti && localChoices.ward_member_open.length >= contest.seat_count && !checked;
                      return (
                        <label
                          key={c.nomination_id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "12px 16px",
                            borderRadius: 8,
                            marginBottom: 8,
                            cursor: canVote && !maxed ? "pointer" : "default",
                            background: checked ? bg : "#f8fafc",
                            border: checked ? `2px solid ${color}` : "2px solid transparent",
                            transition: "all 0.15s",
                          }}
                        >
                          <input
                            type={isMulti ? "checkbox" : "radio"}
                            name={`local_${key}`}
                            checked={checked}
                            onChange={() =>
                              isMulti
                                ? toggleOpenMember(c.nomination_id)
                                : setLocalChoice(key, c.nomination_id)
                            }
                            disabled={!canVote || maxed}
                            style={{ accentColor: color, width: 18, height: 18 }}
                          />
                          {c.candidate_photo_path ? (
                            <img
                              src={`${API_BASE}/${c.candidate_photo_path}`}
                              alt=""
                              style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "1px solid #e2e8f0", flexShrink: 0 }}
                            />
                          ) : (
                            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, color: "#64748b", flexShrink: 0 }}>
                              {c.candidate_name?.[0] || "?"}
                            </div>
                          )}
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 14, color: "#1e293b" }}>{c.candidate_name}</div>
                            {c.party_name ? (
                              <div style={{ fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
                                {c.party_symbol_path && (
                                  <img src={`${API_BASE}/${c.party_symbol_path}`} alt="" style={{ width: 14, height: 14, objectFit: "contain" }} />
                                )}
                                {c.party_name}
                                {c.party_abbreviation ? ` (${c.party_abbreviation})` : ""}
                              </div>
                            ) : (
                              <div style={{ fontSize: 12, color: "#94a3b8" }}>Independent</div>
                            )}
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── two-column ballot (federal / provincial) ── */}
      {!isLocal && (
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
              background: ballot.government_level === "PROVINCIAL" ? "#6d28d9" : "#1e40af",
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
                  {c.candidate_photo_path ? (
                    <img
                      src={`${API_BASE}/${c.candidate_photo_path}`}
                      alt=""
                      style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "1px solid #e2e8f0", flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, color: "#64748b", flexShrink: 0 }}>
                      {c.candidate_name?.[0] || "?"}
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
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
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        {c.party_symbol_path && (
                          <img src={`${API_BASE}/${c.party_symbol_path}`} alt="" style={{ width: 14, height: 14, objectFit: "contain" }} />
                        )}
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
                  {p.party_symbol_path ? (
                    <img
                      src={`${API_BASE}/${p.party_symbol_path}`}
                      alt=""
                      style={{ width: 32, height: 32, objectFit: "contain", flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{ width: 32, height: 32, borderRadius: 6, background: "#f3e8ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, color: "#7c3aed", flexShrink: 0 }}>
                      {p.party_name?.[0] || "?"}
                    </div>
                  )}
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
      )}

      {/* ── submit button ────────────────────────────── */}
      {canVote && (
        <div style={{ marginTop: 32, textAlign: "center" }}>
          <button
            onClick={handleCast}
            disabled={!readyToVote || submitting}
            style={{
              padding: "14px 40px",
              borderRadius: 10,
              fontSize: 16,
              fontWeight: 700,
              background: readyToVote ? "#16a34a" : "#d1d5db",
              color: readyToVote ? "#fff" : "#9ca3af",
              border: "none",
              cursor: readyToVote ? "pointer" : "not-allowed",
              transition: "all 0.2s",
            }}
          >
            {submitting ? "Casting…" : "Cast Your Ballot"}
          </button>
          {!readyToVote && (
            <p
              style={{
                color: "#94a3b8",
                fontSize: 13,
                marginTop: 8,
              }}
            >
              {isLocal
                ? "Please make a selection for every contest to proceed."
                : "Please select both an FPTP candidate and a PR party to proceed."}
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
                maxHeight: 320,
                overflowY: "auto",
              }}
            >
              {isLocal ? (
                [
                  { key: "head", label: "Head (Mayor/Chairperson)" },
                  { key: "deputy_head", label: "Deputy Head" },
                  { key: "ward_chair", label: "Ward Chairperson" },
                  { key: "ward_woman_member", label: "Ward Woman Member" },
                  { key: "ward_dalit_woman_member", label: "Ward Dalit Woman Member" },
                  { key: "ward_member_open", label: "Ward Members (Open)" },
                ].map(({ key, label }, idx) => {
                  const contest = ballot[key];
                  if (!contest) return null;
                  const isMulti = (contest.seat_count || 1) > 1;
                  const names = isMulti
                    ? localChoices.ward_member_open.map(
                        (id) => contest.candidates.find((x) => x.nomination_id === id)?.candidate_name || "?"
                      )
                    : [contest.candidates.find((x) => x.nomination_id === localChoices[key])?.candidate_name || "?"];
                  return (
                    <div key={key} style={{ marginBottom: idx < 5 ? 10 : 0 }}>
                      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>
                        {label}
                      </div>
                      {names.map((n, i) => (
                        <div key={i} style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>
                          {isMulti ? `${i + 1}. ` : ""}{n}
                        </div>
                      ))}
                    </div>
                  );
                })
              ) : (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>
                      FPTP Candidate
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#1e40af", display: "flex", alignItems: "center", gap: 8 }}>
                      {selectedCandidate?.candidate_photo_path ? (
                        <img src={`${API_BASE}/${selectedCandidate.candidate_photo_path}`} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
                      ) : null}
                      {selectedCandidate?.candidate_name}
                      {selectedCandidate?.party_abbreviation ? ` (${selectedCandidate.party_abbreviation})` : ""}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>
                      PR Party
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#7c3aed", display: "flex", alignItems: "center", gap: 8 }}>
                      {selectedParty?.party_symbol_path ? (
                        <img src={`${API_BASE}/${selectedParty.party_symbol_path}`} alt="" style={{ width: 22, height: 22, objectFit: "contain" }} />
                      ) : null}
                      {selectedParty?.party_name}
                      {selectedParty?.party_abbreviation ? ` (${selectedParty.party_abbreviation})` : ""}
                    </div>
                  </div>
                </>
              )}
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
