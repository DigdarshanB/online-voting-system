import React, { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, ShieldCheck, CheckCircle2, AlertCircle, AlertTriangle,
  Info, Landmark, Building2, MapPin, FileText, ChevronRight, Check, User,
} from "lucide-react";
import useAuthGuard from "../hooks/useAuthGuard";
import apiClient from "../lib/apiClient";
import { VT } from "../lib/voterTokens";
import { saveVoteReceipt } from "./VoterReceipt";
import PreCastFaceVerificationModal from "../components/PreCastFaceVerificationModal";
import "./VoterBallot.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/* ── Level badge config ───────────────────────────────────────── */
const LEVEL_META = {
  FEDERAL:    { label: "Federal Election",    Icon: Landmark,  color: VT.federal.color,    bg: VT.federal.bg,    border: VT.federal.border },
  PROVINCIAL: { label: "Provincial Election", Icon: Building2, color: VT.provincial.color, bg: VT.provincial.bg, border: VT.provincial.border },
  LOCAL:      { label: "Local Election",      Icon: MapPin,    color: VT.local.color,      bg: VT.local.bg,      border: VT.local.border },
};

/* ── Local contest card theming (preserves visual differentiation) */
const LOCAL_THEME = {
  head:                    { headerBg: "#C2410C", accent: "#EA580C", selectedBg: "#FFF7ED" },
  deputy_head:             { headerBg: "#C2410C", accent: "#EA580C", selectedBg: "#FFF7ED" },
  ward_chair:              { headerBg: "#1E40AF", accent: VT.accent, selectedBg: VT.accentLight },
  ward_woman_member:       { headerBg: "#6D28D9", accent: "#7C3AED", selectedBg: "#F5F3FF" },
  ward_dalit_woman_member: { headerBg: "#6D28D9", accent: "#7C3AED", selectedBg: "#F5F3FF" },
  ward_member_open:        { headerBg: "#047857", accent: "#059669", selectedBg: "#F0FDF4" },
};

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

  // Face verification state
  const [showFaceVerify, setShowFaceVerify] = useState(false);
  const [faceVerifyKey, setFaceVerifyKey] = useState(0);
  const [faceVerifyError, setFaceVerifyError] = useState("");

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

  /* ── Guard: auth loading ──────────────────────────────────── */
  if (authLoading)
    return (
      <div style={styles.centerBox}>
        <div className="ballot-spinner" style={styles.spinner} />
        <span style={{ color: VT.muted, fontSize: 14, fontWeight: 500 }}>Loading…</span>
      </div>
    );

  if (!user) return <Navigate to="/" replace />;

  /* ── Loading state: skeleton ──────────────────────────────── */
  if (loading)
    return (
      <div className="ballot-page-enter" style={styles.pageWrap}>
        <div style={{ marginBottom: 32 }}>
          <div className="ballot-skeleton" style={{ width: 120, height: 14, marginBottom: 16 }} />
          <div className="ballot-skeleton" style={{ width: "55%", height: 24, marginBottom: 12 }} />
          <div className="ballot-skeleton" style={{ width: "35%", height: 14 }} />
        </div>
        <div className="ballot-skeleton" style={{ height: 52, marginBottom: 24, borderRadius: VT.radius.lg }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }} className="ballot-grid">
          {[0, 1].map((i) => (
            <div key={i} style={{ background: VT.surface, border: `1px solid ${VT.border}`, borderRadius: VT.radius.lg, overflow: "hidden" }}>
              <div className="ballot-skeleton" style={{ height: 72, borderRadius: 0 }} />
              <div style={{ padding: 20 }}>
                {[0, 1, 2].map((j) => (
                  <div key={j} className="ballot-skeleton" style={{ height: 56, marginBottom: 10 }} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <p style={{ textAlign: "center", color: VT.muted, fontSize: 14, marginTop: 32, fontWeight: 500 }}>
          Loading ballot information…
        </p>
      </div>
    );

  /* ── Error state ──────────────────────────────────────────── */
  if (error)
    return (
      <div className="ballot-page-enter" style={{ ...styles.pageWrap, maxWidth: 560, padding: "60px 24px", textAlign: "center" }}>
        <div style={styles.iconCircle(VT.errorBg, VT.errorBorder)}>
          <AlertCircle size={28} color={VT.error} />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: VT.text, marginBottom: 8 }}>
          Unable to Load Ballot
        </h2>
        <p style={{ fontSize: 14, color: VT.muted, marginBottom: 28, lineHeight: 1.6 }}>
          {error}
        </p>
        <button
          className="ballot-btn-secondary"
          onClick={() => navigate("/elections")}
          style={styles.backBtn}
        >
          <ArrowLeft size={15} /> Back to Elections
        </button>
      </div>
    );

  /* ── Success screen ───────────────────────────────────────── */
  if (castResult)
    return (
      <div className="ballot-page-enter" style={{ ...styles.pageWrap, maxWidth: 640, padding: "48px 24px" }}>
        {/* Hero card */}
        <div style={{
          background: VT.surface, border: `1px solid ${VT.successBorder}`,
          borderRadius: VT.radius.xl, padding: "48px 32px", textAlign: "center",
          boxShadow: VT.shadow.md, marginBottom: 24,
        }}>
          <div className="ballot-success-check" style={styles.iconCircle(VT.successBg, VT.successBorder)}>
            <CheckCircle2 size={36} color={VT.success} strokeWidth={2.5} />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: VT.success, marginBottom: 8, letterSpacing: "-0.01em" }}>
            Ballot Cast Successfully
          </h1>
          <p style={{ color: VT.muted, fontSize: 15, lineHeight: 1.6, maxWidth: 380, margin: "0 auto" }}>
            {castResult.message}
          </p>
        </div>

        {/* Details card */}
        <div style={styles.detailCard}>
          <h3 style={styles.detailHeading}>Ballot Details</h3>
          <div style={{ display: "grid", gap: 0 }}>
            {[
              ["Election", ballot.election_title],
              ["Ballot ID", <span key="bid" style={{ fontFamily: "monospace", letterSpacing: "0.02em" }}>{castResult.ballot_id}</span>],
              [
                ballot.government_level === "LOCAL" ? "Local Body" : ballot.voter_area ? "Provincial Constituency" : "Constituency",
                ballot.government_level === "LOCAL"
                  ? ballot.local_body?.name
                  : ballot.voter_area ? ballot.voter_area.name : ballot.voter_constituency?.name,
              ],
              ...(ballot.government_level === "LOCAL" && ballot.ward
                ? [["Ward", `Ward ${ballot.ward.ward_number} — ${ballot.ward.name}`]]
                : []),
            ].map(([label, value], i, arr) => (
              <div key={label} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 0",
                borderBottom: i < arr.length - 1 ? `1px solid ${VT.borderLight}` : "none",
              }}>
                <span style={{ fontSize: 13, color: VT.muted, fontWeight: 500 }}>{label}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: VT.text, textAlign: "right" }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* What happens next */}
        <div style={{
          background: VT.surfaceAlt, border: `1px solid ${VT.borderLight}`,
          borderRadius: VT.radius.lg, padding: "16px 20px", marginBottom: 32,
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <Info size={18} color={VT.accent} style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: VT.text, margin: "0 0 4px" }}>What happens next</h4>
              <p style={{ fontSize: 13, color: VT.muted, lineHeight: 1.5, margin: 0 }}>
                Your ballot has been securely recorded. You can view your voting confirmation
                anytime from the Receipt section in the voter portal.
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            className="ballot-btn-confirm"
            onClick={() => navigate("/elections")}
            style={{ ...styles.primaryBtn, background: VT.accent }}
          >
            Back to Elections <ChevronRight size={16} />
          </button>
          <button
            className="ballot-btn-secondary"
            onClick={() => navigate("/receipt")}
            style={styles.backBtn}
          >
            <FileText size={15} /> View Receipt
          </button>
        </div>
      </div>
    );

  /* ── Already voted ────────────────────────────────────────── */
  if (ballot.already_voted)
    return (
      <div className="ballot-page-enter" style={{ ...styles.pageWrap, maxWidth: 520, padding: "60px 24px", textAlign: "center" }}>
        <div style={styles.iconCircle(VT.accentLight, `${VT.accent}30`)}>
          <CheckCircle2 size={28} color={VT.accent} />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: VT.text, marginBottom: 8 }}>
          Already Voted
        </h1>
        <p style={{ color: VT.muted, fontSize: 15, marginBottom: 32, lineHeight: 1.6 }}>
          You have already cast your ballot for{" "}
          <strong style={{ color: VT.text }}>{ballot.election_title}</strong>.
        </p>
        <button
          className="ballot-btn-secondary"
          onClick={() => navigate("/elections")}
          style={styles.backBtn}
        >
          <ArrowLeft size={15} /> Back to Elections
        </button>
      </div>
    );

  /* ══════════════════════════════════════════════════════════════
     BALLOT FORM
     ══════════════════════════════════════════════════════════════ */

  const canVote = ballot.election_status === "POLLING_OPEN";
  const isLocal = ballot.government_level === "LOCAL";

  // Undervote logic — ballot is always submittable
  const openContest = ballot.ward_member_open;
  const openSeats = openContest?.seat_count || 2;
  const openCandidates = openContest?.candidates?.length || 0;
  const maxOpen = Math.min(openSeats, openCandidates);

  const localSelectionCount = isLocal
    ? [
        localChoices.head,
        localChoices.deputy_head,
        localChoices.ward_chair,
        localChoices.ward_woman_member,
        localChoices.ward_dalit_woman_member,
      ].filter((v) => v !== null).length + localChoices.ward_member_open.length
    : 0;
  const localTotalContests = isLocal ? 6 : 0;
  const dualSelectionCount = !isLocal
    ? (fptpChoice !== null ? 1 : 0) + (prChoice !== null ? 1 : 0)
    : 0;
  const dualTotalContests = !isLocal ? 2 : 0;

  const totalSelections = isLocal ? localSelectionCount : dualSelectionCount;
  const totalContests = isLocal ? localTotalContests : dualTotalContests;
  const hasAnySelection = totalSelections > 0;
  const isPartialBallot = totalSelections > 0 && totalSelections < totalContests;
  const isBlankBallot = totalSelections === 0;

  // Ballot is always ready to submit — undervoting is allowed
  const readyToVote = true;

  const selectedCandidate = ballot.fptp?.candidates?.find(
    (c) => c.nomination_id === fptpChoice
  );
  const selectedParty = ballot.pr?.parties?.find(
    (p) => p.party_id === prChoice
  );

  function setLocalChoice(key, nominationId) {
    setLocalChoices((prev) => ({
      ...prev,
      [key]: prev[key] === nominationId ? null : nominationId,
    }));
  }

  function toggleOpenMember(nominationId) {
    setLocalChoices((prev) => {
      const arr = prev.ward_member_open;
      if (arr.includes(nominationId))
        return { ...prev, ward_member_open: arr.filter((id) => id !== nominationId) };
      if (arr.length >= maxOpen) return prev;
      return { ...prev, ward_member_open: [...arr, nominationId] };
    });
  }

  function handleCast() {
    setConfirming(true);
  }

  async function confirmCast() {
    // Close the confirmation modal and open face verification modal
    setConfirming(false);
    setCastError("");
    setFaceVerifyError("");
    setShowFaceVerify(true);
  }

  // Called when face verification challenge completes successfully on the client
  async function handleFaceVerified(verificationContextToken, capturedFrame) {
      setShowFaceVerify(false);
      setSubmitting(true);
      setCastError("");
      try {
        const url = isLocal
          ? `/voter/elections/${electionId}/verify-and-cast-local`
          : `/voter/elections/${electionId}/verify-and-cast`;

        const payload = isLocal
          ? {
              verification_context_token: verificationContextToken,
              captured_frame: capturedFrame,
              head_nomination_id: localChoices.head,
              deputy_head_nomination_id: localChoices.deputy_head,
              ward_chair_nomination_id: localChoices.ward_chair,
              ward_woman_member_nomination_id: localChoices.ward_woman_member,
              ward_dalit_woman_member_nomination_id:
                localChoices.ward_dalit_woman_member,
              ward_member_open_nomination_ids: localChoices.ward_member_open,
            }
          : {
              verification_context_token: verificationContextToken,
              captured_frame: capturedFrame,
              fptp_nomination_id: fptpChoice,
              pr_party_id: prChoice,
            };

        const res = await apiClient.post(url, payload);

        // Check for verification failure responses (status 403/429 return JSON body)
        if (res.data?.reason_code) {
          const parsed = PreCastFaceVerificationModal.parseVerifyError(res.data);
          if (parsed.type === "locked") {
            setFaceVerifyError(
              `Face verification locked. ${parsed.data.locked_until ? "Try again later." : ""}`
            );
          } else {
            setFaceVerifyError(
              parsed.data.detail ||
                "Face verification failed. Please try again."
            );
          }
          setCastError(res.data.detail || "Face verification failed.");
          return;
        }

        setCastResult(res.data);
        // Persist receipt for the VoterReceipt page
        saveVoteReceipt({
          election_id: electionId,
          ballot_id: res.data?.ballot_id,
        });
      } catch (err) {
        const resp = err?.response?.data;
        if (resp?.reason_code) {
          // Structured face verification failure — show specific message
          if (resp.reason_code === "FACE_LOCKED") {
            setCastError(
              resp.detail ||
                "Face verification is temporarily locked for this election. Please try again later."
            );
          } else if (resp.reason_code === "FACE_MISMATCH") {
            setCastError(
              resp.detail ||
                "Face verification failed. The captured face does not match your registered face. Your vote was not cast."
            );
          } else if (resp.reason_code === "NO_FACE_DETECTED") {
            setCastError(
              resp.detail ||
                "No face was detected in the captured frame. Please ensure your face is clearly visible and try again."
            );
          } else if (resp.reason_code === "MULTIPLE_FACES") {
            setCastError(
              resp.detail ||
                "Multiple faces were detected. Please ensure only your face is visible and try again."
            );
          } else {
            setCastError(
              resp.detail || "Face verification failed. Please try again."
            );
          }
        } else {
          setCastError(
            resp?.detail || "Failed to cast ballot. Please try again."
          );
        }
      } finally {
        setSubmitting(false);
      }
  }

  function handleFaceVerifyCancel() {
    setShowFaceVerify(false);
    setFaceVerifyKey((k) => k + 1);
  }

  const level = LEVEL_META[ballot.government_level] || LEVEL_META.FEDERAL;
  const LevelIcon = level.Icon;

  /* ── Candidate/party option row renderer ────────────────── */
  function renderCandidateOption(c, { checked, onChange, disabled, accentColor, selectedBg, inputType, inputName }) {
    return (
      <label
        key={c.nomination_id || c.party_id}
        className="ballot-option"
        data-disabled={disabled ? "true" : undefined}
        style={{
          display: "flex", alignItems: "center", gap: 14,
          padding: "14px 18px", borderRadius: VT.radius.md, marginBottom: 8,
          cursor: disabled ? "default" : "pointer",
          background: checked ? selectedBg : VT.surfaceAlt,
          border: checked ? `2px solid ${accentColor}` : `2px solid ${VT.borderLight}`,
        }}
      >
        <input
          type={inputType}
          name={inputName}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          style={{ accentColor, width: 18, height: 18, flexShrink: 0 }}
        />
        {c.candidate_photo_path ? (
          <img
            src={`${API_BASE}/${c.candidate_photo_path}`}
            alt=""
            style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", border: `2px solid ${checked ? accentColor + "40" : VT.border}`, flexShrink: 0 }}
          />
        ) : c.party_symbol_path ? (
          <img
            src={`${API_BASE}/${c.party_symbol_path}`}
            alt=""
            style={{ width: 36, height: 36, objectFit: "contain", flexShrink: 0 }}
          />
        ) : (
          <div style={{
            width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
            background: checked ? `${accentColor}18` : VT.surfaceSubtle,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15, fontWeight: 700, color: checked ? accentColor : VT.muted,
            border: `2px solid ${checked ? accentColor + "30" : VT.border}`,
          }}>
            {(c.candidate_name || c.party_name)?.[0] || "?"}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: VT.text, lineHeight: 1.3 }}>
            {c.candidate_name || c.party_name}
          </div>
          {c.party_name && c.candidate_name ? (
            <div style={{ fontSize: 12, color: VT.muted, display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
              {c.party_symbol_path && (
                <img src={`${API_BASE}/${c.party_symbol_path}`} alt="" style={{ width: 14, height: 14, objectFit: "contain" }} />
              )}
              {c.party_name}
              {c.party_abbreviation ? ` (${c.party_abbreviation})` : ""}
            </div>
          ) : c.party_abbreviation ? (
            <div style={{ fontSize: 12, color: VT.muted, marginTop: 2 }}>
              {c.party_abbreviation}
            </div>
          ) : !c.party_name && c.candidate_name ? (
            <div style={{ fontSize: 12, color: VT.subtle, marginTop: 2 }}>Independent</div>
          ) : null}
        </div>
        {checked && (
          <div style={{
            width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
            background: accentColor, display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Check size={13} color="#fff" strokeWidth={3} />
          </div>
        )}
      </label>
    );
  }

  return (
    <div className="ballot-page-enter" style={styles.pageWrap}>

      {/* ── Page header ──────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <button
          className="ballot-back-link ballot-btn-secondary"
          onClick={() => navigate("/elections")}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 14,
            padding: "5px 12px", border: `1px solid ${VT.borderLight}`, borderRadius: VT.radius.sm,
            background: "transparent", color: VT.muted, cursor: "pointer", fontSize: 13, fontWeight: 600,
          }}
        >
          <ArrowLeft size={14} /> Elections
        </button>

        <div className="ballot-header-row" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 style={{
              fontSize: "clamp(20px, 2.5vw, 26px)", fontWeight: 800, color: VT.navy,
              margin: "0 0 6px", letterSpacing: "-0.01em", lineHeight: 1.2,
            }}>
              {ballot.election_title}
            </h1>
            <p style={{ color: VT.muted, fontSize: 14, margin: 0, lineHeight: 1.5 }}>
              {isLocal ? (
                <>{ballot.local_body?.name} — Ward {ballot.ward?.ward_number}</>
              ) : (
                <>
                  {ballot.voter_area ? "Provincial Constituency" : "Constituency"}:{" "}
                  <strong style={{ color: VT.textSecondary }}>
                    {ballot.voter_area ? ballot.voter_area.name : ballot.voter_constituency?.name}
                  </strong>
                  {ballot.voter_constituency?.district_name
                    ? ` (${ballot.voter_constituency.district_name})`
                    : ballot.voter_area?.province_number
                    ? ` (Province ${ballot.voter_area.province_number})`
                    : ""}
                </>
              )}
            </p>
          </div>

          {/* Badges */}
          <div className="ballot-header-meta" style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "5px 12px", borderRadius: VT.radius.sm, fontSize: 12, fontWeight: 700,
              background: level.bg, color: level.color, border: `1px solid ${level.border}`,
            }}>
              <LevelIcon size={13} /> {level.label}
            </span>
            {ballot.government_level === "PROVINCIAL" && ballot.province_code && (
              <span style={{
                padding: "5px 10px", borderRadius: VT.radius.sm, fontSize: 11, fontWeight: 700,
                background: VT.provincial.bg, color: VT.provincial.color, border: `1px solid ${VT.provincial.border}`,
              }}>
                {ballot.province_code}
              </span>
            )}
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "5px 12px", borderRadius: VT.radius.sm, fontSize: 12, fontWeight: 600,
              background: VT.successBg, color: VT.success, border: `1px solid ${VT.successBorder}`,
            }}>
              <ShieldCheck size={13} /> Secure
            </span>
          </div>
        </div>
      </div>

      {/* ── Info strip ───────────────────────────────── */}
      <div className="ballot-info-strip" style={{
        background: VT.surface, border: `1px solid ${VT.border}`, borderRadius: VT.radius.lg,
        padding: "13px 20px", marginBottom: 20, display: "flex", alignItems: "center",
        gap: 16, flexWrap: "wrap", boxShadow: VT.shadow.sm,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Info size={15} color={VT.accent} />
          <span style={{ fontSize: 13, fontWeight: 600, color: VT.textSecondary }}>
            {isLocal ? "6 contests on this ballot" : "2 ballots: FPTP + Proportional Representation"}
          </span>
        </div>
        <div className="ballot-info-divider" style={{ width: 1, height: 18, background: VT.borderLight }} />
        <span style={{ fontSize: 13, color: VT.muted }}>
          {canVote
            ? "Your ballot will be submitted after identity verification"
            : "Preview mode — polling is not currently open"}
        </span>
      </div>

      {/* ── Alert zone ───────────────────────────────── */}
      {!canVote && (
        <div style={styles.alertBox(VT.warnBg, VT.warnBorder, VT.warn)}>
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong style={{ display: "block", marginBottom: 2 }}>Polling not open</strong>
            <span style={{ fontSize: 13, opacity: 0.85 }}>
              This election is not currently open for voting. You can preview the candidates and parties below.
            </span>
          </div>
        </div>
      )}

      {castError && (
        <div style={styles.alertBox(VT.errorBg, VT.errorBorder, VT.error)}>
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong style={{ display: "block", marginBottom: 2 }}>Unable to cast ballot</strong>
            <span style={{ fontSize: 13, opacity: 0.85 }}>{castError}</span>
          </div>
        </div>
      )}

      {/* ── Local ballot grid ────────────────────────── */}
      {isLocal && (
        <div className="ballot-local-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {[
            { key: "head" },
            { key: "deputy_head" },
            { key: "ward_chair" },
            { key: "ward_woman_member" },
            { key: "ward_dalit_woman_member" },
            { key: "ward_member_open" },
          ].map(({ key }) => {
            const contest = ballot[key];
            if (!contest) return null;
            const theme = LOCAL_THEME[key] || LOCAL_THEME.head;
            const seats = contest.seat_count || 1;
            const available = contest.candidates?.length || 0;
            const isMulti = seats > 1;
            const maxSelect = isMulti ? Math.min(seats, available) : 1;
            const currentCount = isMulti
              ? localChoices.ward_member_open.length
              : localChoices[key] !== null ? 1 : 0;
            return (
              <div key={key} className="ballot-card" style={{
                background: VT.surface, border: `1px solid ${VT.border}`,
                borderRadius: VT.radius.lg, overflow: "hidden", boxShadow: VT.shadow.sm,
              }}>
                {/* Header */}
                <div style={{
                  background: theme.headerBg, color: "#fff", padding: "16px 22px",
                }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, lineHeight: 1.3 }}>
                    {contest.contest_title}
                  </h2>
                  <p style={{ fontSize: 12, opacity: 0.7, margin: "4px 0 0" }}>
                    {isMulti
                      ? `Select up to ${maxSelect} candidate${maxSelect !== 1 ? "s" : ""}`
                      : "Select ONE candidate (optional)"}
                  </p>
                </div>
                {/* Options */}
                <div style={{ padding: "14px 16px 8px" }}>
                  {contest.candidates.length === 0 ? (
                    <div style={styles.emptyState}>
                      <User size={24} color={VT.subtle} />
                      <p style={{ color: VT.subtle, fontSize: 13, margin: "8px 0 0", fontWeight: 500 }}>
                        No candidates available
                      </p>
                    </div>
                  ) : (
                    contest.candidates.map((c) => {
                      const checked = isMulti
                        ? localChoices.ward_member_open.includes(c.nomination_id)
                        : localChoices[key] === c.nomination_id;
                      const maxed = isMulti && localChoices.ward_member_open.length >= maxSelect && !checked;
                      return renderCandidateOption(c, {
                        checked,
                        onChange: () =>
                          isMulti
                            ? toggleOpenMember(c.nomination_id)
                            : setLocalChoice(key, c.nomination_id),
                        disabled: !canVote || maxed,
                        accentColor: theme.accent,
                        selectedBg: theme.selectedBg,
                        inputType: isMulti ? "checkbox" : "radio",
                        inputName: `local_${key}`,
                      });
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Dual ballot grid (federal / provincial) ─── */}
      {!isLocal && (
        <div className="ballot-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* FPTP */}
          <div className="ballot-card" style={{
            background: VT.surface, border: `1px solid ${VT.border}`,
            borderRadius: VT.radius.lg, overflow: "hidden", boxShadow: VT.shadow.sm,
          }}>
            <div style={{
              background: ballot.government_level === "PROVINCIAL" ? "#6D28D9" : VT.navy,
              color: "#fff", padding: "16px 22px",
            }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>FPTP Ballot</h2>
              <p style={{ fontSize: 12, opacity: 0.8, margin: "4px 0 0" }}>
                {ballot.fptp.contest_title}
              </p>
              <p style={{ fontSize: 11, opacity: 0.6, margin: "2px 0 0" }}>
                Select ONE candidate (optional)
              </p>
            </div>
            <div style={{ padding: "14px 16px 8px" }}>
              {ballot.fptp.candidates.length === 0 ? (
                <div style={styles.emptyState}>
                  <User size={24} color={VT.subtle} />
                  <p style={{ color: VT.subtle, fontSize: 13, margin: "8px 0 0", fontWeight: 500 }}>
                    No candidates available
                  </p>
                </div>
              ) : (
                ballot.fptp.candidates.map((c) =>
                  renderCandidateOption(c, {
                    checked: fptpChoice === c.nomination_id,
                    onChange: () =>
                      setFptpChoice((prev) =>
                        prev === c.nomination_id ? null : c.nomination_id
                      ),
                    disabled: !canVote,
                    accentColor: VT.accent,
                    selectedBg: VT.accentLight,
                    inputType: "radio",
                    inputName: "fptp",
                  })
                )
              )}
            </div>
          </div>

          {/* PR */}
          <div className="ballot-card" style={{
            background: VT.surface, border: `1px solid ${VT.border}`,
            borderRadius: VT.radius.lg, overflow: "hidden", boxShadow: VT.shadow.sm,
          }}>
            <div style={{
              background: "#7C3AED", color: "#fff", padding: "16px 22px",
            }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>PR Ballot</h2>
              <p style={{ fontSize: 12, opacity: 0.8, margin: "4px 0 0" }}>
                {ballot.pr.contest_title}
              </p>
              <p style={{ fontSize: 11, opacity: 0.6, margin: "2px 0 0" }}>
                Select ONE party (optional)
              </p>
            </div>
            <div style={{ padding: "14px 16px 8px" }}>
              {ballot.pr.parties.length === 0 ? (
                <div style={styles.emptyState}>
                  <User size={24} color={VT.subtle} />
                  <p style={{ color: VT.subtle, fontSize: 13, margin: "8px 0 0", fontWeight: 500 }}>
                    No parties available
                  </p>
                </div>
              ) : (
                ballot.pr.parties.map((p) =>
                  renderCandidateOption(
                    { ...p, candidate_name: null, candidate_photo_path: null },
                    {
                      checked: prChoice === p.party_id,
                      onChange: () =>
                        setPrChoice((prev) =>
                          prev === p.party_id ? null : p.party_id
                        ),
                      disabled: !canVote,
                      accentColor: "#7C3AED",
                      selectedBg: "#F5F3FF",
                      inputType: "radio",
                      inputName: "pr",
                    }
                  )
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Cast action area ─────────────────────────── */}
      {canVote && (
        <div className="ballot-cast-area" style={{
          marginTop: 28, padding: "24px 0", borderTop: `1px solid ${VT.border}`, textAlign: "center",
        }}>
          {/* Selection summary strip */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            padding: "8px 18px", borderRadius: VT.radius.md,
            background: VT.surfaceAlt, border: `1px solid ${VT.borderLight}`,
            marginBottom: 16, fontSize: 13, color: VT.textSecondary, fontWeight: 500,
          }}>
            <CheckCircle2 size={15} color={hasAnySelection ? VT.success : VT.subtle} />
            {totalSelections} of {totalContests} contest{totalContests !== 1 ? "s" : ""} selected
            {isBlankBallot && <span style={{ color: VT.warn, fontWeight: 600 }}> · Blank ballot</span>}
          </div>

          {/* Undervote warnings */}
          {isPartialBallot && (
            <div style={styles.inlineWarning(VT.warnBg, VT.warnBorder, VT.warn)}>
              <AlertTriangle size={14} />
              <span>
                You have left {totalContests - totalSelections} of {totalContests} contest{totalContests - totalSelections !== 1 ? "s" : ""} blank.
                Blank contests will be submitted without a selection.
              </span>
            </div>
          )}
          {isBlankBallot && (
            <div style={styles.inlineWarning(VT.errorBg, VT.errorBorder, "#991B1B")}>
              <AlertCircle size={14} />
              <span>
                You have not made any selections. Submitting will record a blank ballot.
              </span>
            </div>
          )}

          {/* CTA */}
          <div style={{ marginTop: 8 }}>
            <button
              className="ballot-btn-cast"
              onClick={handleCast}
              disabled={submitting}
              style={{
                padding: "15px 44px", borderRadius: VT.radius.md, fontSize: 16, fontWeight: 700,
                background: "#16A34A", color: "#fff", border: "none",
                cursor: submitting ? "wait" : "pointer",
                display: "inline-flex", alignItems: "center", gap: 10,
              }}
            >
              {submitting ? (
                <>
                  <div className="ballot-spinner" style={{ width: 18, height: 18, border: "2.5px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%" }} />
                  Casting…
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  Cast Your Ballot
                </>
              )}
            </button>
            <p style={{ fontSize: 12, color: VT.muted, marginTop: 10 }}>
              Identity verification will be required before submission
            </p>
          </div>
        </div>
      )}

      {/* ── Confirmation modal ───────────────────────── */}
      {confirming && (
        <div
          style={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirming(false); }}
        >
          <div className="ballot-modal-enter" style={styles.confirmModal}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 44, height: 44, borderRadius: VT.radius.md, flexShrink: 0,
                background: VT.warnBg, border: `1px solid ${VT.warnBorder}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <ShieldCheck size={22} color={VT.warn} />
              </div>
              <div>
                <h2 id="confirm-title" style={{ fontSize: 19, fontWeight: 700, color: VT.text, margin: 0 }}>
                  Confirm Your Vote
                </h2>
                <p style={{ fontSize: 13, color: VT.muted, margin: "2px 0 0" }}>
                  This action <strong>cannot be undone</strong>. Please review your selections.
                </p>
              </div>
            </div>

            {/* Selection summary */}
            <div style={{
              background: VT.surfaceAlt, borderRadius: VT.radius.md,
              padding: 18, marginBottom: 20, maxHeight: 340, overflowY: "auto",
              border: `1px solid ${VT.borderLight}`,
            }}>
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
                  const choiceVal = isMulti ? localChoices.ward_member_open : localChoices[key];
                  const hasSelection = isMulti
                    ? Array.isArray(choiceVal) && choiceVal.length > 0
                    : choiceVal != null;
                  const names = hasSelection
                    ? isMulti
                      ? choiceVal.map(
                          (id) => contest.candidates.find((x) => x.nomination_id === id)?.candidate_name || "?"
                        )
                      : [contest.candidates.find((x) => x.nomination_id === choiceVal)?.candidate_name || "?"]
                    : [];
                  return (
                    <div key={key} style={{ marginBottom: idx < 5 ? 14 : 0 }}>
                      <div style={{ fontSize: 11, color: VT.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>
                        {label}
                      </div>
                      {hasSelection ? (
                        names.map((n, i) => (
                          <div key={i} style={{ fontSize: 14, fontWeight: 600, color: VT.text, display: "flex", alignItems: "center", gap: 6 }}>
                            <Check size={14} color={VT.success} />
                            {isMulti ? `${i + 1}. ` : ""}{n}
                          </div>
                        ))
                      ) : (
                        <div style={{ fontSize: 13, fontStyle: "italic", color: VT.subtle }}>
                          — No selection —
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: VT.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>
                      FPTP Candidate
                    </div>
                    {selectedCandidate ? (
                      <div style={{ fontSize: 14, fontWeight: 600, color: VT.navy, display: "flex", alignItems: "center", gap: 8 }}>
                        {selectedCandidate.candidate_photo_path ? (
                          <img src={`${API_BASE}/${selectedCandidate.candidate_photo_path}`} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
                        ) : null}
                        <Check size={14} color={VT.success} />
                        {selectedCandidate.candidate_name}
                        {selectedCandidate.party_abbreviation ? ` (${selectedCandidate.party_abbreviation})` : ""}
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, fontStyle: "italic", color: VT.subtle }}>
                        — No selection —
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: VT.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>
                      PR Party
                    </div>
                    {selectedParty ? (
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#7C3AED", display: "flex", alignItems: "center", gap: 8 }}>
                        {selectedParty.party_symbol_path ? (
                          <img src={`${API_BASE}/${selectedParty.party_symbol_path}`} alt="" style={{ width: 22, height: 22, objectFit: "contain" }} />
                        ) : null}
                        <Check size={14} color={VT.success} />
                        {selectedParty.party_name}
                        {selectedParty.party_abbreviation ? ` (${selectedParty.party_abbreviation})` : ""}
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, fontStyle: "italic", color: VT.subtle }}>
                        — No selection —
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Advisory */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 14px", borderRadius: VT.radius.sm,
              background: VT.warnBg, border: `1px solid ${VT.warnBorder}`,
              marginBottom: 20, fontSize: 12, color: VT.warn,
            }}>
              <AlertTriangle size={14} style={{ flexShrink: 0 }} />
              Once submitted, your ballot cannot be changed or withdrawn.
            </div>

            {/* Actions */}
            <div className="ballot-confirm-btns" style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                className="ballot-btn-secondary"
                onClick={() => setConfirming(false)}
                disabled={submitting}
                style={{
                  padding: "11px 22px", borderRadius: VT.radius.md, fontSize: 14, fontWeight: 600,
                  background: VT.surface, color: VT.textSecondary, border: `1px solid ${VT.border}`, cursor: "pointer",
                }}
              >
                Go Back
              </button>
              <button
                className="ballot-btn-confirm"
                onClick={confirmCast}
                disabled={submitting}
                style={{
                  padding: "11px 22px", borderRadius: VT.radius.md, fontSize: 14, fontWeight: 700,
                  background: "#16A34A", color: "#fff", border: "none",
                  cursor: submitting ? "wait" : "pointer",
                  display: "inline-flex", alignItems: "center", gap: 8,
                }}
              >
                <ShieldCheck size={16} />
                {submitting ? "Processing…" : "Confirm & Cast"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Face verification modal ──────────────────── */}
      <PreCastFaceVerificationModal
        key={faceVerifyKey}
        open={showFaceVerify}
        electionId={electionId}
        onVerified={handleFaceVerified}
        onCancel={handleFaceVerifyCancel}
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Shared style helpers
   ══════════════════════════════════════════════════════════════════ */
const styles = {
  pageWrap: {
    maxWidth: 960, margin: "0 auto", padding: "28px 24px 48px",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  centerBox: {
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 60, gap: 12,
  },
  spinner: {
    width: 24, height: 24, borderRadius: "50%",
    border: `3px solid ${VT.border}`, borderTopColor: VT.accent,
  },
  iconCircle: (bg, border) => ({
    width: 64, height: 64, borderRadius: "50%", margin: "0 auto 20px",
    background: bg, border: `2px solid ${border}`,
    display: "flex", alignItems: "center", justifyContent: "center",
  }),
  backBtn: {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "10px 22px", borderRadius: VT.radius.md, fontSize: 14, fontWeight: 600,
    background: VT.surface, color: VT.textSecondary, border: `1px solid ${VT.border}`, cursor: "pointer",
  },
  primaryBtn: {
    display: "inline-flex", alignItems: "center", gap: 8,
    padding: "12px 28px", borderRadius: VT.radius.md, fontSize: 14, fontWeight: 700,
    color: "#fff", border: "none", cursor: "pointer",
  },
  detailCard: {
    background: VT.surface, border: `1px solid ${VT.border}`,
    borderRadius: VT.radius.lg, padding: 24, marginBottom: 24,
  },
  detailHeading: {
    fontSize: 12, fontWeight: 700, color: VT.muted,
    textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16, margin: "0 0 16px",
  },
  emptyState: {
    textAlign: "center", padding: "28px 16px",
    display: "flex", flexDirection: "column", alignItems: "center",
  },
  alertBox: (bg, border, color) => ({
    display: "flex", alignItems: "flex-start", gap: 12,
    padding: "14px 18px", borderRadius: VT.radius.md,
    background: bg, border: `1px solid ${border}`, color,
    marginBottom: 20, fontSize: 14,
  }),
  inlineWarning: (bg, border, color) => ({
    display: "inline-flex", alignItems: "center", gap: 8,
    padding: "10px 20px", borderRadius: VT.radius.md,
    background: bg, border: `1px solid ${border}`, color,
    fontSize: 13, fontWeight: 500, marginBottom: 14, maxWidth: 520, textAlign: "left",
  }),
  overlay: {
    position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)",
    backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
    justifyContent: "center", zIndex: 1000, padding: 16,
  },
  confirmModal: {
    background: VT.surface, borderRadius: VT.radius.xl, padding: 28,
    maxWidth: 500, width: "100%", boxShadow: VT.shadow.xl,
  },
};
