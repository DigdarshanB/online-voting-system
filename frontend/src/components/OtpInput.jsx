/**
 * OtpInput — Shared 6-digit one-time-code input component (voter side).
 *
 * Renders 6 individual digit boxes with auto-advance, backspace
 * navigation, paste handling, and arrow-key support.
 *
 * Identical behaviour to the admin-side OtpInput; CSS variables
 * (--primary-blue, --border-strong) are the same in VoterAuthPage.css.
 *
 * Props:
 *   value      — current 6-char string (e.g. "123456" or "12")
 *   onChange   — callback receiving the full joined digit string
 *   disabled   — disable all boxes (e.g. during submission)
 *   autoFocus  — auto-focus the first box on mount (default true)
 *   hasError   — render error-state styling on all boxes
 *   ariaLabel  — accessible label for the group (default "One-time code")
 */

import React, { useRef, useEffect, useCallback } from "react";

const NUM_DIGITS = 6;

/* ── Styles (aligned with voter-auth theme) ──────────────────── */

const groupStyle = {
  display: "flex",
  justifyContent: "center",
  gap: 10,
};

const boxBase = {
  width: 52,
  height: 58,
  textAlign: "center",
  fontSize: 22,
  fontWeight: 800,
  fontFamily: "inherit",
  borderRadius: 10,
  border: "3px solid rgba(15, 23, 42, 0.72)",
  outline: "none",
  background: "#ffffff",
  color: "#0f172a",
  caretColor: "var(--primary-blue, #1e56c7)",
  transition: "border-color 0.15s, box-shadow 0.15s",
};

const boxFocused = {
  borderColor: "var(--primary-blue, #1e56c7)",
  boxShadow: "0 0 0 4px rgba(30, 86, 199, 0.18)",
};

const boxError = {
  borderColor: "#DC2626",
  boxShadow: "0 0 0 3px rgba(220,38,38,0.12)",
};

const boxDisabled = {
  opacity: 0.55,
  cursor: "not-allowed",
};

export default function OtpInput({
  value = "",
  onChange,
  disabled = false,
  autoFocus = true,
  hasError = false,
  ariaLabel = "One-time code",
}) {
  const refs = useRef([]);
  const digits = value.padEnd(NUM_DIGITS, "").slice(0, NUM_DIGITS).split("");

  /* ── Auto-focus on mount ───────────────────────────────────── */
  useEffect(() => {
    if (autoFocus && refs.current[0]) {
      const id = setTimeout(() => refs.current[0]?.focus(), 40);
      return () => clearTimeout(id);
    }
  }, [autoFocus]);

  /* ── Emit change ───────────────────────────────────────────── */
  const emit = useCallback(
    (newDigits) => {
      onChange(newDigits.join("").slice(0, NUM_DIGITS));
    },
    [onChange],
  );

  /* ── Handlers ──────────────────────────────────────────────── */

  function handleChange(idx, e) {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) return;
    const next = [...digits];
    next[idx] = raw[0];
    emit(next);
    if (idx < NUM_DIGITS - 1) {
      refs.current[idx + 1]?.focus();
    }
  }

  function handleKeyDown(idx, e) {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = [...digits];
      if (digits[idx] && digits[idx] !== " ") {
        next[idx] = "";
        emit(next);
      } else if (idx > 0) {
        next[idx - 1] = "";
        emit(next);
        refs.current[idx - 1]?.focus();
      }
      return;
    }
    if (e.key === "ArrowLeft" && idx > 0) {
      e.preventDefault();
      refs.current[idx - 1]?.focus();
      return;
    }
    if (e.key === "ArrowRight" && idx < NUM_DIGITS - 1) {
      e.preventDefault();
      refs.current[idx + 1]?.focus();
      return;
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, NUM_DIGITS);
    if (!pasted) return;
    const next = pasted.padEnd(NUM_DIGITS, " ").split("").map((c) => (c === " " ? "" : c));
    emit(next);
    const focusIdx = Math.min(pasted.length, NUM_DIGITS - 1);
    refs.current[focusIdx]?.focus();
  }

  function handleFocus(e) {
    e.target.select();
  }

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      style={groupStyle}
      onPaste={handlePaste}
    >
      {Array.from({ length: NUM_DIGITS }, (_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={2}
          value={digits[i]?.trim() || ""}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={handleFocus}
          disabled={disabled}
          aria-label={`Digit ${i + 1}`}
          style={{
            ...boxBase,
            ...(hasError ? boxError : {}),
            ...(disabled ? boxDisabled : {}),
          }}
          onFocusCapture={(e) => {
            if (!hasError) {
              e.target.style.borderColor = boxFocused.borderColor;
              e.target.style.boxShadow = boxFocused.boxShadow;
            }
          }}
          onBlurCapture={(e) => {
            e.target.style.borderColor = hasError
              ? boxError.borderColor
              : "rgba(15, 23, 42, 0.72)";
            e.target.style.boxShadow = hasError ? boxError.boxShadow : "none";
          }}
        />
      ))}
    </div>
  );
}
