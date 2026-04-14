/**
 * VoterReceipt.jsx
 *
 * Vote Receipt Center — backend-driven with localStorage fallback.
 * Displays confirmed ballot receipts with search, filter, sort,
 * print/download, and a detail modal.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  FileCheck2,
  CheckCircle2,
  Search,
  Eye,
  Download,
  Copy,
  Printer,
  ExternalLink,
  ShieldCheck,
  Clock3,
  Hash,
  MapPin,
  X,
  Vote,
} from "lucide-react";
import apiClient from "../lib/apiClient";
import { useLanguage } from "../lib/LanguageContext";
import {
  VoterPageContainer,
  VoterKeyframes,
  PortalHero,
  HeroChip,
  HERO_TINTS,
} from "../components/VoterUI";
import { VT } from "../lib/voterTokens";

/* ── palette ──────────────────────────────────────────────────── */
const PALETTE = {
  navy: "#173B72",
  accentBlue: "#2F6FED",
  mutedText: "#64748B",
  surface: "#FFFFFF",
  success: "#0F9F6E",
  border: "#E2E8F0",
  bgLight: "#F8FAFC",
};

const RECEIPT_STORAGE_KEY = "voter_receipts";

/* ── helpers ──────────────────────────────────────────────────── */

function getSavedReceipts() {
  try {
    const raw = localStorage.getItem(RECEIPT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

const SUBTYPE_LABELS = {
  HOR_DIRECT: "House of Representatives",
  PROVINCIAL_ASSEMBLY: "Provincial Assembly",
  LOCAL_MUNICIPAL: "Municipal",
  LOCAL_RURAL: "Rural Municipal",
};

function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const opts = { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" };
  return d.toLocaleDateString("en-GB", opts);
}

function formatShortDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/* ── main component ──────────────────────────────────────────── */

export default function VoterReceipt() {
  const { t } = useLanguage();

  /* state */
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  /* data loading */
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await apiClient.get("/voter/receipts");
        if (!cancelled) {
          setReceipts(res.data || []);
          setFetchError(null);
        }
      } catch {
        // Fallback: merge localStorage + /voter/elections
        try {
          const saved = getSavedReceipts();
          const elRes = await apiClient.get("/voter/elections");
          const voted = (elRes.data || []).filter((e) => e.has_voted);
          const merged = voted.map((el) => {
            const sr = saved.find((r) => String(r.election_id) === String(el.id));
            return {
              ballot_id: sr?.ballot_id || null,
              election_id: el.id,
              election_title: el.title,
              government_level: el.government_level || null,
              election_subtype: el.election_subtype || null,
              election_status: el.status || null,
              cast_at: sr?.timestamp || null,
              area_label: null,
              area_code: null,
              area_type: null,
              receipt_status: "CONFIRMED",
              source: "local",
            };
          });
          if (!cancelled) {
            setReceipts(merged);
            setFetchError("backend_unavailable");
          }
        } catch {
          if (!cancelled) setFetchError("load_failed");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  /* derived data */
  const filteredReceipts = React.useMemo(() => {
    let list = [...receipts];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          (r.election_title || "").toLowerCase().includes(q) ||
          String(r.ballot_id || "").includes(q)
      );
    }

    if (filterLevel) {
      list = list.filter((r) => r.government_level === filterLevel);
    }

    list.sort((a, b) => {
      const da = new Date(a.cast_at || 0).getTime();
      const db_ = new Date(b.cast_at || 0).getTime();
      return sortOrder === "newest" ? db_ - da : da - db_;
    });

    return list;
  }, [receipts, searchQuery, filterLevel, sortOrder]);

  const confirmedCount = receipts.filter((r) => r.receipt_status === "CONFIRMED").length;
  const lastSubmitted = receipts.length > 0
    ? [...receipts].sort((a, b) => new Date(b.cast_at || 0) - new Date(a.cast_at || 0))[0]?.cast_at
    : null;

  /* clipboard */
  const handleCopy = useCallback((ballotId) => {
    navigator.clipboard.writeText(String(ballotId)).then(() => {
      setCopiedId(ballotId);
      setTimeout(() => setCopiedId(null), 1500);
    });
  }, []);

  /* ── render ──────────────────────────────────────────────────── */
  return (
    <VoterPageContainer>
      <VoterKeyframes />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <PortalHero
        eyebrow="Election Commission Nepal"
        title="Your Voting Record"
        subtitle="A secure, tamper-proof archive of your confirmed ballot submissions. Ballot selections are never disclosed — only participation is recorded."
        rightContent={
          <>
            <HeroChip label={`${receipts.length} Receipt${receipts.length !== 1 ? "s" : ""}`} tint={HERO_TINTS.default} />
            <HeroChip label={`${confirmedCount} Verified`} tint={HERO_TINTS.success} />
            {lastSubmitted && (
              <HeroChip label={`Last: ${formatShortDate(lastSubmitted)}`} tint={HERO_TINTS.default} />
            )}
          </>
        }
      />

      {/* ── Controls toolbar ─────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 24,
          padding: "16px 20px",
          background: VT.surface,
          border: `1px solid ${VT.border}`,
          borderRadius: VT.radius.lg,
          boxShadow: VT.shadow.sm,
          alignItems: "center",
        }}
      >
        <div style={{ flex: "1 1 220px", position: "relative" }}>
          <Search
            size={15}
            color={PALETTE.mutedText}
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
          />
          <input
            type="text"
            placeholder={t("receipt.search_placeholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              border: `1.5px solid ${PALETTE.border}`,
              borderRadius: VT.radius.md,
              padding: "9px 14px 9px 36px",
              fontSize: 13,
              background: "#FFF",
              outline: "none",
              boxSizing: "border-box",
              fontFamily: "inherit",
              color: "#0F172A",
              transition: "border-color 0.18s ease",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = PALETTE.accentBlue; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = PALETTE.border; }}
          />
        </div>
        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
          style={selectStyle}
        >
          <option value="">{t("receipt.filter_all")}</option>
          <option value="FEDERAL">{t("receipt.filter_federal")}</option>
          <option value="PROVINCIAL">{t("receipt.filter_provincial")}</option>
          <option value="LOCAL">{t("receipt.filter_local")}</option>
        </select>
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          style={selectStyle}
        >
          <option value="newest">{t("receipt.sort_newest")}</option>
          <option value="oldest">{t("receipt.sort_oldest")}</option>
        </select>
        {(searchQuery || filterLevel) && (
          <button
            onClick={() => { setSearchQuery(""); setFilterLevel(""); }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "9px 14px", borderRadius: VT.radius.md,
              background: "transparent", border: `1.5px solid ${PALETTE.border}`,
              color: PALETTE.mutedText, fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {/* ── Backend fallback notice ───────────────────────────── */}
      {fetchError === "backend_unavailable" && (
        <div
          style={{
            padding: "12px 18px",
            background: "#FFFBEB",
            border: "1px solid #FDE68A",
            borderLeft: "4px solid #F59E0B",
            borderRadius: VT.radius.md,
            fontSize: 13,
            color: "#78350F",
            fontWeight: 500,
            lineHeight: 1.5,
            marginBottom: 20,
          }}
        >
          Showing locally cached receipts — some details may be limited until the server is available.
        </div>
      )}

      {/* ── Loading state ────────────────────────────────────── */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[1, 2].map((i) => (
            <div
              key={i}
              style={{
                background: VT.surface,
                border: `1px solid ${VT.border}`,
                borderRadius: VT.radius.xl,
                padding: "24px 28px",
                boxShadow: VT.shadow.sm,
              }}
            >
              <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <div className="voter-skeleton" style={{ width: 90, height: 20 }} />
                <div className="voter-skeleton" style={{ width: 70, height: 20 }} />
              </div>
              <div className="voter-skeleton" style={{ width: "60%", height: 22, marginBottom: 8 }} />
              <div className="voter-skeleton" style={{ width: "35%", height: 15, marginBottom: 20 }} />
              <div className="voter-skeleton" style={{ width: "100%", height: 72, borderRadius: 10 }} />
            </div>
          ))}
        </div>
      )}

      {/* ── Receipt cards ────────────────────────────────────── */}
      {!loading && filteredReceipts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {filteredReceipts.map((receipt) => (
            <ReceiptCard
              key={`${receipt.election_id}-${receipt.ballot_id}`}
              receipt={receipt}
              t={t}
              copiedId={copiedId}
              onCopy={handleCopy}
              onView={() => setSelectedReceipt(receipt)}
            />
          ))}
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────── */}
      {!loading && filteredReceipts.length === 0 && (
        <EmptyState
          hasFilters={!!(searchQuery || filterLevel)}
          t={t}
          onClear={() => { setSearchQuery(""); setFilterLevel(""); }}
        />
      )}

      {/* ── Detail modal ─────────────────────────────────────── */}
      {selectedReceipt && (
        <ReceiptModal
          receipt={selectedReceipt}
          t={t}
          copiedId={copiedId}
          onCopy={handleCopy}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </VoterPageContainer>
  );
}

/* ── Receipt card ────────────────────────────────────────────── */

const LEVEL_BADGE = {
  FEDERAL:    { bg: VT ? "#DBEAFE" : "#DBEAFE", color: "#1E40AF", border: "#93C5FD", label: "Federal" },
  PROVINCIAL: { bg: "#EDE9FE", color: "#5B21B6", border: "#C4B5FD", label: "Provincial" },
  LOCAL:      { bg: "#FFEDD5", color: "#9A3412", border: "#FDBA74", label: "Local" },
};

function ReceiptCard({ receipt, t, copiedId, onCopy, onView }) {
  const levelBadge = LEVEL_BADGE[receipt.government_level] || LEVEL_BADGE.FEDERAL;
  const subtypeLabel = SUBTYPE_LABELS[receipt.election_subtype] || receipt.election_subtype || "";

  return (
    <div
      style={{
        background: PALETTE.surface,
        borderRadius: VT.radius.xl,
        border: `1.5px solid ${PALETTE.border}`,
        boxShadow: VT.shadow.md,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Accent stripe (level-colored, not generic green) */}
      <div
        style={{
          position: "absolute",
          left: 0, top: 0, bottom: 0,
          width: 4,
          background: levelBadge.color,
          borderRadius: `${VT.radius.xl} 0 0 ${VT.radius.xl}`,
        }}
      />

      {/* Card body */}
      <div style={{ padding: "20px 24px 20px 28px" }}>

        {/* Top row: status + level badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <CheckCircle2 size={15} color={PALETTE.success} strokeWidth={2.5} />
            <span style={{ fontSize: 11, fontWeight: 800, color: PALETTE.success, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {t("receipt.confirmed")}
            </span>
          </div>
          {receipt.government_level && (
            <span
              style={{
                display: "inline-flex", alignItems: "center",
                fontSize: 11, fontWeight: 700,
                padding: "3px 12px", borderRadius: 20,
                background: levelBadge.bg, color: levelBadge.color,
                border: `1px solid ${levelBadge.border}`,
                letterSpacing: "0.02em",
              }}
            >
              {t(`receipt.gov_${receipt.government_level.toLowerCase()}`)}
            </span>
          )}
        </div>

        {/* Primary title */}
        <div style={{ fontWeight: 800, fontSize: 17, color: PALETTE.navy, lineHeight: 1.3, marginBottom: 4 }}>
          {receipt.election_title}
        </div>
        {subtypeLabel && (
          <div style={{ fontSize: 13, color: PALETTE.mutedText, fontWeight: 500, marginBottom: 14 }}>
            {subtypeLabel}
          </div>
        )}

        {/* Metadata block */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: 0,
            background: "#F8FAFC",
            border: `1px solid #EEF2F8`,
            borderRadius: VT.radius.lg,
            overflow: "hidden",
            marginBottom: 16,
          }}
        >
          {receipt.ballot_id != null && (
            <MetaBlock icon={<Hash size={13} color={PALETTE.mutedText} />} label={t("receipt.ballot_id")}>
              <code style={codeStyle}>{receipt.ballot_id}</code>
            </MetaBlock>
          )}
          <MetaBlock icon={<Clock3 size={13} color={PALETTE.mutedText} />} label={t("receipt.submitted")}>
            <span style={{ fontSize: 13, fontWeight: 700, color: PALETTE.navy }}>{formatDateTime(receipt.cast_at)}</span>
          </MetaBlock>
          {receipt.area_label && (
            <MetaBlock icon={<MapPin size={13} color={PALETTE.mutedText} />} label={receipt.area_type || t("receipt.area")}>
              <span style={{ fontSize: 13, fontWeight: 700, color: PALETTE.navy }}>{receipt.area_label}</span>
            </MetaBlock>
          )}
        </div>

        {/* Action row */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <ActionBtn primary onClick={onView}>
            <Eye size={13} /> {t("receipt.view")}
          </ActionBtn>
          <ActionBtn onClick={() => handlePrint(receipt)}>
            <Download size={13} /> {t("receipt.download")}
          </ActionBtn>
          <IconBtn
            onClick={() => receipt.ballot_id != null && onCopy(receipt.ballot_id)}
            title={t("receipt.copy_id")}
          >
            <Copy size={13} />
            {copiedId === receipt.ballot_id && (
              <span style={{ fontSize: 11, color: PALETTE.success, fontWeight: 700, marginLeft: 2 }}>{t("receipt.copied")}</span>
            )}
          </IconBtn>
          <IconBtn onClick={() => window.print()} title={t("receipt.print")}>
            <Printer size={13} />
          </IconBtn>
          {["FINALIZED", "ARCHIVED"].includes(receipt.election_status) && (
            <Link
              to={`/results/${receipt.election_id}`}
              style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                fontSize: 12, color: PALETTE.mutedText, fontWeight: 600,
                textDecoration: "none", marginLeft: "auto",
              }}
            >
              <ExternalLink size={12} /> {t("receipt.view_results")}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Meta block (inside the metadata grid) ───────────────────── */

function MetaBlock({ icon, label, children }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: "12px 16px",
        borderRight: "1px solid #EEF2F8",
      }}
    >
      <span
        style={{
          display: "flex", alignItems: "center", gap: 5,
          fontSize: 11, color: PALETTE.mutedText, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.04em",
        }}
      >
        {icon} {label}
      </span>
      {children}
    </div>
  );
}

/* ── Shared action buttons ────────────────────────────────────── */

function ActionBtn({ children, onClick, primary }) {
  const [hov, setHov] = useState(false);
  const base = primary
    ? { bg: PALETTE.navy, color: "#FFF", border: "none" }
    : { bg: "#EAF2FF", color: PALETTE.navy, border: "none" };
  const hover = primary
    ? { bg: "#0F2960" }
    : { bg: "#D6E8FF" };
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "8px 16px", borderRadius: VT.radius.md,
        background: hov ? hover.bg : base.bg,
        color: base.color,
        border: base.border,
        fontWeight: 700, fontSize: 13,
        cursor: "pointer", fontFamily: "inherit",
        transition: "background 0.15s ease",
      }}
    >
      {children}
    </button>
  );
}

function IconBtn({ children, onClick, title }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "8px 10px", borderRadius: VT.radius.md,
        background: hov ? "#F1F5F9" : "transparent",
        color: PALETTE.mutedText,
        border: `1.5px solid ${hov ? "#CBD5E1" : PALETTE.border}`,
        cursor: "pointer", fontSize: 13, fontFamily: "inherit",
        transition: "all 0.15s ease",
      }}
    >
      {children}
    </button>
  );
}

/* ── Empty state ─────────────────────────────────────────────── */

function EmptyState({ hasFilters, t, onClear }) {
  if (hasFilters) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "56px 32px",
          background: PALETTE.surface,
          borderRadius: VT.radius.xl,
          border: `1.5px solid ${PALETTE.border}`,
          boxShadow: VT.shadow.sm,
        }}
      >
        <div
          style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "#F1F5F9",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <Search size={26} color="#94A3B8" />
        </div>
        <p style={{ color: "#0F172A", fontSize: 16, fontWeight: 700, margin: "0 0 6px" }}>
          {t("receipt.no_match")}
        </p>
        <p style={{ color: PALETTE.mutedText, fontSize: 13, fontWeight: 400, margin: "0 0 22px" }}>
          Try different keywords or clear the active filters.
        </p>
        <button
          onClick={onClear}
          style={{
            padding: "10px 28px",
            borderRadius: VT.radius.md,
            background: PALETTE.accentBlue,
            color: "#FFF",
            border: "none",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          {t("receipt.clear_filters")}
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        textAlign: "center",
        padding: "64px 32px",
        background: PALETTE.surface,
        borderRadius: VT.radius.xl,
        border: `1.5px solid ${PALETTE.border}`,
        boxShadow: VT.shadow.sm,
      }}
    >
      <div
        style={{
          width: 68, height: 68, borderRadius: "50%",
          background: "#EAF2FF",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 18px",
        }}
      >
        <FileCheck2 size={32} color={PALETTE.accentBlue} strokeWidth={1.8} />
      </div>
      <p style={{ color: "#0F172A", fontSize: 17, fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.01em" }}>
        {t("receipt.empty_title")}
      </p>
      <p style={{ color: PALETTE.mutedText, fontSize: 14, fontWeight: 400, margin: "0 0 26px", lineHeight: 1.55, maxWidth: 360, marginLeft: "auto", marginRight: "auto" }}>
        {t("receipt.empty_sub")}
      </p>
      <Link
        to="/elections"
        style={{
          display: "inline-block",
          padding: "11px 30px",
          borderRadius: VT.radius.md,
          background: PALETTE.accentBlue,
          color: "#FFF",
          fontWeight: 700,
          fontSize: 14,
          textDecoration: "none",
        }}
      >
        {t("receipt.browse_elections")}
      </Link>
    </div>
  );
}

/* ── Receipt detail modal ────────────────────────────────────── */

function ReceiptModal({ receipt, t, copiedId, onCopy, onClose }) {
  const modalRef = useRef(null);

  useEffect(() => {
    const prev = document.activeElement;
    const timer = setTimeout(() => modalRef.current?.focus(), 50);
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      if (prev && prev.focus) prev.focus();
    };
  }, [onClose]);

  const levelColor = LEVEL_COLORS[receipt.government_level] || LEVEL_COLORS.FEDERAL;
  const subtypeLabel = SUBTYPE_LABELS[receipt.election_subtype] || receipt.election_subtype || "";

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-modal-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(15,23,42,0.45)",
        backdropFilter: "blur(4px)",
        padding: 20,
      }}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        id="receipt-print-area"
        style={{
          background: "#FFF",
          borderRadius: 14,
          width: "100%",
          maxWidth: 560,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
        }}
      >
        {/* modal header */}
        <div style={{ padding: "24px 24px 0", display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              flexShrink: 0,
              background: "#EAF2FF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FileCheck2 size={20} color={PALETTE.navy} strokeWidth={2.2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 id="receipt-modal-title" style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0F172A" }}>
              {t("receipt.modal_title")}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
            aria-label="Close"
          >
            <X size={20} color={PALETTE.mutedText} />
          </button>
        </div>

        {/* modal body */}
        <div style={{ padding: "20px 24px" }}>

          {/* Section: Election Information */}
          <SectionLabel text={t("receipt.election_info")} />
          <div style={{ fontWeight: 700, fontSize: 17, color: PALETTE.navy, marginBottom: 4 }}>
            {receipt.election_title}
          </div>
          {subtypeLabel && (
            <div style={{ fontSize: 13, color: PALETTE.mutedText, fontWeight: 500, marginBottom: 6 }}>{subtypeLabel}</div>
          )}
          {receipt.government_level && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: 6,
                background: levelColor.bg,
                color: levelColor.text,
                display: "inline-block",
                marginBottom: 16,
              }}
            >
              {t(`receipt.gov_${receipt.government_level.toLowerCase()}`)}
            </span>
          )}

          {/* Section: Receipt Details */}
          <SectionLabel text={t("receipt.receipt_details")} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
            <DetailRow label={t("receipt.modal_ref")}>
              <code style={codeStyle}>RCP-{receipt.ballot_id}</code>
            </DetailRow>
            <DetailRow label={t("receipt.ballot_id")}>
              <code style={codeStyle}>{receipt.ballot_id}</code>
            </DetailRow>
            <DetailRow label={t("receipt.submitted")}>
              <span style={{ fontSize: 13, fontWeight: 600, color: PALETTE.navy }}>{formatDateTime(receipt.cast_at)}</span>
            </DetailRow>
            <DetailRow label={t("receipt.status")}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 700, color: PALETTE.success }}>
                <CheckCircle2 size={14} /> {t("receipt.confirmed")}
              </span>
            </DetailRow>
          </div>

          {/* Section: Participation Area */}
          {receipt.area_label && (
            <>
              <SectionLabel text={t("receipt.area")} />
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
                <MapPin size={14} color={PALETTE.mutedText} />
                <span style={{ fontSize: 13, color: PALETTE.mutedText, fontWeight: 600 }}>{receipt.area_type}:</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: PALETTE.navy }}>{receipt.area_label}</span>
              </div>
            </>
          )}

          {/* Section: Privacy Notice */}
          <div
            style={{
              background: "#F0FDF4",
              borderRadius: 10,
              border: "1px solid #BBF7D0",
              padding: "14px 16px",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <ShieldCheck size={18} color={PALETTE.success} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#15803D", marginBottom: 2 }}>{t("receipt.privacy_notice")}</div>
              <p style={{ fontSize: 12, color: "#166534", margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
                {t("receipt.modal_privacy")}
              </p>
            </div>
          </div>
        </div>

        {/* modal footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            padding: "16px 24px",
            borderTop: "1px solid #F1F5F9",
            flexWrap: "wrap",
          }}
        >
          <button onClick={() => handlePrint(receipt)} style={secondaryBtnStyle}>
            <Download size={14} /> {t("receipt.download")}
          </button>
          <button
            onClick={() => receipt.ballot_id != null && onCopy(receipt.ballot_id)}
            style={secondaryBtnStyle}
          >
            <Copy size={14} />{" "}
            {copiedId === receipt.ballot_id ? t("receipt.copied") : t("receipt.copy_id")}
          </button>
          <button onClick={onClose} style={ghostBtnStyle}>
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Section label ───────────────────────────────────────────── */

function SectionLabel({ text }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: PALETTE.mutedText, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8, marginTop: 4 }}>
      {text}
    </div>
  );
}

/* ── Detail row ──────────────────────────────────────────────── */

function DetailRow({ label, children }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
      <span style={{ fontSize: 12, color: PALETTE.mutedText, fontWeight: 600 }}>{label}</span>
      {children}
    </div>
  );
}

/* ── Print helper ────────────────────────────────────────────── */

function handlePrint(receipt) {
  const printWindow = window.open("", "_blank", "width=600,height=800");
  if (!printWindow) return;

  const subtypeLabel = SUBTYPE_LABELS[receipt.election_subtype] || receipt.election_subtype || "";
  const castDate = formatDateTime(receipt.cast_at);

  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Vote Receipt - ${receipt.election_title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 40px; color: #0F172A; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    .subtitle { color: #64748B; font-size: 13px; margin-bottom: 24px; }
    .section { margin-bottom: 18px; }
    .label { font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
    .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #F1F5F9; }
    .row-label { font-size: 13px; color: #64748B; }
    .row-value { font-size: 13px; font-weight: 600; color: #173B72; }
    code { font-family: 'JetBrains Mono', 'Fira Code', monospace; background: #EAF2FF; padding: 2px 8px; border-radius: 4px; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; color: #FFF; }
    .privacy { background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 12px 14px; font-size: 12px; color: #166534; margin-top: 24px; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <h1>Vote Receipt</h1>
  <p class="subtitle">Secure proof of participation</p>

  <div class="section">
    <div class="label">Election Information</div>
    <div style="font-size:16px;font-weight:700;margin-bottom:4px;">${receipt.election_title}</div>
    ${subtypeLabel ? `<div style="color:#64748B;font-size:13px;">${subtypeLabel}</div>` : ""}
    ${receipt.government_level ? `<span class="badge" style="background:#173B72;margin-top:6px;">${receipt.government_level}</span>` : ""}
  </div>

  <div class="section">
    <div class="label">Receipt Details</div>
    <div class="row"><span class="row-label">Receipt Reference</span><span class="row-value"><code>RCP-${receipt.ballot_id}</code></span></div>
    <div class="row"><span class="row-label">Ballot ID</span><span class="row-value"><code>${receipt.ballot_id}</code></span></div>
    <div class="row"><span class="row-label">Submitted</span><span class="row-value">${castDate}</span></div>
    <div class="row"><span class="row-label">Status</span><span class="row-value" style="color:#0F9F6E;">Confirmed</span></div>
  </div>

  ${receipt.area_label ? `
  <div class="section">
    <div class="label">Participation Area</div>
    <div class="row"><span class="row-label">${receipt.area_type || "Area"}</span><span class="row-value">${receipt.area_label}</span></div>
  </div>
  ` : ""}

  <div class="privacy">Your ballot selections are protected and sealed. This receipt only confirms participation.</div>

  <script>window.onload=function(){window.print();}</script>
</body>
</html>`);
  printWindow.document.close();
}

/* ── Shared styles ───────────────────────────────────────────── */

const selectStyle = {
  border: `1.5px solid ${PALETTE.border}`,
  borderRadius: VT.radius.md,
  padding: "9px 14px",
  fontSize: 13,
  background: "#FFF",
  outline: "none",
  cursor: "pointer",
  minWidth: 140,
  fontFamily: "inherit",
  color: "#0F172A",
};

const codeStyle = {
  fontSize: 13,
  fontWeight: 700,
  color: PALETTE.navy,
  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  background: "#EAF2FF",
  padding: "2px 8px",
  borderRadius: 4,
};

const secondaryBtnStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 14px",
  borderRadius: VT.radius.md,
  background: "#EAF2FF",
  color: PALETTE.navy,
  fontWeight: 700,
  fontSize: 13,
  border: "none",
  cursor: "pointer",
  fontFamily: "inherit",
};

const ghostBtnStyle = {
  padding: "8px 16px",
  borderRadius: VT.radius.md,
  background: "transparent",
  color: PALETTE.mutedText,
  border: `1.5px solid ${PALETTE.border}`,
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};

/* ── localStorage helper (called from VoterBallot.jsx) ───────── */

export function saveVoteReceipt({ election_id, ballot_id, timestamp }) {
  const existing = getSavedReceipts();
  const filtered = existing.filter(
    (r) => String(r.election_id) !== String(election_id)
  );
  filtered.push({ election_id, ballot_id, timestamp: timestamp || new Date().toISOString() });
  localStorage.setItem(RECEIPT_STORAGE_KEY, JSON.stringify(filtered));
}
