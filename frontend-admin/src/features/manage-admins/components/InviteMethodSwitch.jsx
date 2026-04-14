import React from 'react';
import { T } from '../../../components/ui/tokens';
import { Link2, Hash } from 'lucide-react';

const METHODS = [
  { id: "link", label: "Secure Link", icon: Link2 },
  { id: "code", label: "Manual Code", icon: Hash },
];

const DESCRIPTIONS = {
  link: "A secure, single-use URL is sent directly to the recipient's email. This is the standard recommended method.",
  code: "Generates a short-lived alphanumeric code. You must transmit this code via a secure, out-of-band channel.",
};

export default function InviteMethodSwitch({ preferredMethod, onPreferredMethodChange }) {
  return (
    <div>
      <label style={{
        fontSize: 12, fontWeight: 700,
        color: T.muted, textTransform: "uppercase",
        letterSpacing: "0.05em", display: "block", marginBottom: 8,
      }}>
        Activation Method
      </label>

      {/* Segmented control */}
      <div
        role="radiogroup"
        aria-label="Invitation activation method"
        style={{
          display: "flex",
          background: T.surfaceAlt,
          border: `1px solid ${T.border}`,
          borderRadius: T.radius.md,
          padding: 3,
          gap: 3,
        }}
      >
        {METHODS.map((method) => {
          const isActive = preferredMethod === method.id;
          const MethodIcon = method.icon;
          return (
            <button
              key={method.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onPreferredMethodChange(method.id)}
              style={{
                flex: 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "8px 12px",
                borderRadius: T.radius.sm,
                border: isActive ? `1px solid ${T.borderStrong}` : "1px solid transparent",
                background: isActive ? T.surface : "transparent",
                color: isActive ? T.text : T.muted,
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                cursor: "pointer",
                transition: T.transition,
                boxShadow: isActive ? T.shadow.sm : "none",
                outline: "none",
              }}
            >
              <MethodIcon size={14} strokeWidth={isActive ? 2.2 : 1.8} />
              {method.label}
            </button>
          );
        })}
      </div>

      {/* Contextual description */}
      <p style={{
        margin: "8px 0 0",
        fontSize: 12.5,
        color: T.muted,
        lineHeight: 1.55,
      }}>
        {DESCRIPTIONS[preferredMethod]}
      </p>
    </div>
  );
}
