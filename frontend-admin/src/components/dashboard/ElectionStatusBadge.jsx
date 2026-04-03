const TOKENS = {
  success: "#16A34A",
  successSoft: "#ECFDF3",
  brandBlueText: "#2563EB",
  brandBlueSoft: "#EFF6FF",
  textSoft: "#475569",
  neutralSoft: "#F1F5F9",
  warning: "#D97706",
  warningSoft: "#FFF7ED",
};

const STATUS_STYLES = {
  OPEN: { background: TOKENS.successSoft, color: TOKENS.success },
  ACTIVE: { background: TOKENS.successSoft, color: TOKENS.success },
  SCHEDULED: { background: TOKENS.brandBlueSoft, color: TOKENS.brandBlueText },
  DRAFT: { background: TOKENS.neutralSoft, color: TOKENS.textSoft },
  CLOSED: { background: TOKENS.warningSoft, color: TOKENS.warning },
  FALLBACK: { background: TOKENS.neutralSoft, color: TOKENS.textSoft },
};

function normalizeStatus(status) {
  return String(status || "").trim().toUpperCase();
}

export default function ElectionStatusBadge({ status, label }) {
  const normalizedStatus = normalizeStatus(status);
  const stylePalette = STATUS_STYLES[normalizedStatus] || STATUS_STYLES.FALLBACK;
  const content = label || status;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        height: "34px",
        padding: "0 12px",
        borderRadius: "999px",
        background: stylePalette.background,
        color: stylePalette.color,
        fontSize: "12px",
        fontWeight: 800,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
      aria-label={content || "Election status"}
      title={content || "Election status"}
    >
      {content || "-"}
    </span>
  );
}
