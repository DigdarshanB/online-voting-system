import React, { useState } from "react";
import { T } from "../../../components/ui/tokens";
import { Check, X, Minus } from "lucide-react";

// status: "pass" | "fail" | "skip" | null (not reviewed)
function getItemStyle(status) {
  if (status === "pass") return { bg: T.successBg, border: T.successBorder, text: T.success };
  if (status === "fail") return { bg: T.errorBg, border: T.errorBorder, text: T.error };
  if (status === "skip") return { bg: T.surfaceAlt, border: T.border, text: T.muted };
  return { bg: T.surface, border: T.border, text: T.muted };
}

function TriStateControl({ status, onChange, locked }) {
  const btnBase = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 26,
    height: 26,
    borderRadius: T.radius.sm,
    border: "1.5px solid transparent",
    cursor: locked ? "default" : "pointer",
    transition: T.transitionFast,
    fontSize: 11,
    fontWeight: 700,
  };

  if (locked) {
    const isPass = status === "pass";
    const isFail = status === "fail";
    return (
      <div style={{
        ...btnBase,
        background: isPass ? T.success : isFail ? T.error : T.surfaceAlt,
        color: (isPass || isFail) ? "#fff" : T.muted,
        border: "none",
        cursor: "default",
      }}>
        {isPass && <Check size={13} strokeWidth={3} />}
        {isFail && <X size={13} strokeWidth={3} />}
        {!isPass && !isFail && <Minus size={13} />}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 3 }}>
      <button
        title="Pass"
        onClick={() => onChange(status === "pass" ? null : "pass")}
        style={{
          ...btnBase,
          background: status === "pass" ? T.success : T.surface,
          color: status === "pass" ? "#fff" : T.success,
          borderColor: T.successBorder,
        }}
        onMouseEnter={e => { if (status !== "pass") e.currentTarget.style.background = T.successBg; }}
        onMouseLeave={e => { if (status !== "pass") e.currentTarget.style.background = T.surface; }}
      >
        <Check size={12} strokeWidth={3} />
      </button>
      <button
        title="Fail"
        onClick={() => onChange(status === "fail" ? null : "fail")}
        style={{
          ...btnBase,
          background: status === "fail" ? T.error : T.surface,
          color: status === "fail" ? "#fff" : T.error,
          borderColor: T.errorBorder,
        }}
        onMouseEnter={e => { if (status !== "fail") e.currentTarget.style.background = T.errorBg; }}
        onMouseLeave={e => { if (status !== "fail") e.currentTarget.style.background = T.surface; }}
      >
        <X size={12} strokeWidth={3} />
      </button>
      <button
        title="Skip"
        onClick={() => onChange(status === "skip" ? null : "skip")}
        style={{
          ...btnBase,
          background: status === "skip" ? T.surfaceSubtle : T.surface,
          color: T.muted,
          borderColor: T.border,
        }}
        onMouseEnter={e => { if (status !== "skip") e.currentTarget.style.background = T.surfaceAlt; }}
        onMouseLeave={e => { if (status !== "skip") e.currentTarget.style.background = T.surface; }}
      >
        <Minus size={12} />
      </button>
    </div>
  );
}

export default function VerificationChecklist({ checklistItems }) {
  const [itemStates, setItemStates] = useState(() =>
    checklistItems.map(item => ({
      ...item,
      // Convert initial ok boolean to status string; null items start unreviewed
      status: item.ok === true ? "pass" : item.ok === false ? "fail" : null,
      locked: item.ok !== null, // auto-determined items are locked
      note: "",
      showNote: false,
    }))
  );

  const setStatus = (index, status) => {
    setItemStates(prev =>
      prev.map((item, i) => i === index ? { ...item, status } : item)
    );
  };

  const toggleNote = (index) => {
    setItemStates(prev =>
      prev.map((item, i) => i === index ? { ...item, showNote: !item.showNote } : item)
    );
  };

  const setNote = (index, note) => {
    setItemStates(prev =>
      prev.map((item, i) => i === index ? { ...item, note } : item)
    );
  };

  const reviewed = itemStates.filter(i => i.status !== null).length;
  const total = itemStates.length;

  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: T.radius.lg,
      overflow: "hidden",
      marginBottom: 20,
    }}>
      {/* Header */}
      <div style={{
        padding: "11px 16px",
        background: T.surfaceAlt,
        borderBottom: `1px solid ${T.borderLight}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>
          Verification Protocol
        </span>
        <span style={{
          fontSize: 10.5, fontWeight: 700,
          color: reviewed === total ? T.success : T.muted,
          background: reviewed === total ? T.successBg : T.surfaceSubtle,
          border: `1px solid ${reviewed === total ? T.successBorder : T.borderLight}`,
          padding: "2px 8px", borderRadius: 9999,
        }}>
          {reviewed}/{total} reviewed
        </span>
      </div>

      {/* Items */}
      <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 2 }}>
        {itemStates.map((item, index) => {
          const style = getItemStyle(item.status);
          return (
            <div key={index}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: T.radius.md,
                background: style.bg,
                border: `1px solid ${style.border}`,
                transition: T.transitionFast,
              }}>
                {/* Control */}
                <TriStateControl
                  status={item.status}
                  onChange={status => setStatus(index, status)}
                  locked={item.locked}
                />

                {/* Label */}
                <span style={{
                  flex: 1,
                  fontSize: 12.5,
                  color: item.status === "fail" ? T.error : T.text,
                  fontWeight: item.status !== null ? 600 : 400,
                }}>
                  {item.label}
                </span>

                {/* Note toggle for failed items (not locked) */}
                {!item.locked && item.status === "fail" && (
                  <button
                    onClick={() => toggleNote(index)}
                    style={{
                      fontSize: 10.5, fontWeight: 600,
                      color: item.showNote ? T.error : T.muted,
                      background: "transparent", border: "none",
                      cursor: "pointer", padding: "2px 6px",
                      borderRadius: T.radius.sm,
                      transition: T.transitionFast,
                    }}
                  >
                    {item.showNote ? "Hide note" : "Add note"}
                  </button>
                )}

                {/* Locked auto-status label */}
                {item.locked && (
                  <span style={{ fontSize: 10, color: T.muted, fontWeight: 500 }}>auto</span>
                )}
              </div>

              {/* Inline note field for failed items */}
              {!item.locked && item.status === "fail" && item.showNote && (
                <div style={{ paddingLeft: 46, marginTop: 4, marginBottom: 2 }}>
                  <input
                    type="text"
                    placeholder="Note for this failure…"
                    value={item.note}
                    onChange={e => setNote(index, e.target.value)}
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      borderRadius: T.radius.md,
                      border: `1.5px solid ${T.errorBorder}`,
                      fontSize: 12,
                      outline: "none",
                      background: T.errorBg,
                      color: T.text,
                      boxSizing: "border-box",
                    }}
                    onFocus={e => { e.target.style.borderColor = T.error; }}
                    onBlur={e => { e.target.style.borderColor = T.errorBorder; }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
