import React, { useState, useEffect } from 'react';
import { T } from '../../../components/ui/tokens';
import SectionCard from './SectionCard';
import SectionHeader from './SectionHeader';
import StatusPill from './StatusPill';
import EmptyStateBlock from './EmptyStateBlock';
import { Check, X, RefreshCw, UserPlus, AlertCircle, ClipboardList } from 'lucide-react';

function formatDate(dateString) {
  if (!dateString) return "—";
  const d = new Date(dateString);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function PendingAdminsTable({
  pendingAdmins = [],
  isLoading = false,
  error = "",
  onRefresh,
  onApprove,
  onReject,
}) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const renderContent = () => {
    if (isLoading && pendingAdmins.length === 0) {
      return <EmptyStateBlock title="Loading Enrollment Queue…" description="Fetching pending administrator requests." />;
    }
    if (error) {
      return <EmptyStateBlock icon={AlertCircle} title="Error Loading Queue" description={error} />;
    }
    if (pendingAdmins.length === 0) {
      return (
        <EmptyStateBlock
          icon={UserPlus}
          title="Enrollment Queue is Clear"
          description="There are no administrators currently awaiting approval or MFA setup."
        />
      );
    }
    return isMobile ? (
      <MobileView items={pendingAdmins} onApprove={onApprove} onReject={onReject} />
    ) : (
      <TableView items={pendingAdmins} onApprove={onApprove} onReject={onReject} />
    );
  };

  return (
    <SectionCard accentColor={pendingAdmins.length > 0 ? T.warn : undefined}>
      <SectionHeader
        icon={ClipboardList}
        title="Administrator Enrollment Queue"
        description="Review and process enrollment requests from prospective administrators."
        count={pendingAdmins.length}
        actions={
          <button
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "6px 12px", backgroundColor: "transparent",
              border: `1px solid ${T.border}`, borderRadius: T.radius.md,
              fontSize: 12.5, fontWeight: 600, color: T.textSecondary,
              cursor: "pointer", transition: T.transition,
            }}
            onClick={onRefresh}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = T.surfaceAlt)}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            title="Refresh Queue"
            aria-label="Refresh enrollment queue"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        }
      />
      {renderContent()}
    </SectionCard>
  );
}

function TableView({ items, onApprove, onReject }) {
  const thStyle = {
    padding: `10px ${T.space.lg}px`,
    color: T.muted, fontSize: 11, textTransform: "uppercase",
    letterSpacing: "0.06em", fontWeight: 700,
    borderBottom: `1px solid ${T.border}`,
    background: T.surfaceAlt,
    whiteSpace: "nowrap",
  };
  const tdStyle = {
    padding: `${T.space.md}px ${T.space.lg}px`,
    verticalAlign: "middle", fontSize: 13.5,
    borderBottom: `1px solid ${T.borderLight}`,
  };

  return (
    <div style={{ overflowX: "auto", border: `1px solid ${T.border}`, borderRadius: T.radius.lg }}>
      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }} role="grid" aria-label="Pending administrator enrollments">
        <thead>
          <tr>
            <th style={thStyle}>Candidate</th>
            <th style={thStyle}>Registered</th>
            <th style={thStyle}>Status</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr
              key={item.id}
              style={{
                transition: T.transitionFast,
                backgroundColor: idx % 2 === 1 ? T.surfaceAlt : "transparent",
                borderLeft: `3px solid ${item.status === 'PENDING_APPROVAL' ? T.warn : T.info}`,
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = T.surfaceSubtle)}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = idx % 2 === 1 ? T.surfaceAlt : "transparent")}
            >
              <td style={tdStyle}>
                <div style={{ fontWeight: 600, color: T.text }}>{item.full_name || "—"}</div>
                <div style={{ fontSize: 12.5, color: T.muted, marginTop: 1 }}>{item.email}</div>
              </td>
              <td style={tdStyle}>
                <span style={{ fontSize: 13, color: T.textSecondary }}>{formatDate(item.created_at)}</span>
              </td>
              <td style={tdStyle}>
                <StatusPill status={item.status} size="small" />
              </td>
              <td style={{ ...tdStyle, textAlign: "right" }}>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: T.space.sm }}>
                  <button
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "5px 10px", backgroundColor: "transparent",
                      border: `1px solid ${T.border}`, borderRadius: T.radius.sm,
                      fontSize: 12.5, fontWeight: 600, color: T.error,
                      cursor: "pointer", transition: T.transition,
                    }}
                    onClick={() => onReject(item)}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = T.errorBg)}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    title="Reject Enrollment"
                    aria-label={`Reject ${item.full_name}`}
                  >
                    <X size={14} /> Reject
                  </button>
                  {item.status === 'PENDING_APPROVAL' && (
                    <button
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "5px 10px", backgroundColor: T.successBg,
                        border: `1px solid ${T.successBorder}`, borderRadius: T.radius.sm,
                        fontSize: 12.5, fontWeight: 600, color: T.success,
                        cursor: "pointer", transition: T.transition,
                      }}
                      onClick={() => onApprove(item.id)}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = `${T.success}18`)}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = T.successBg)}
                      title="Approve Enrollment"
                      aria-label={`Approve ${item.full_name}`}
                    >
                      <Check size={14} /> Approve
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MobileView({ items, onApprove, onReject }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: T.space.md }}>
      {items.map(item => (
        <div key={item.id} style={{
          padding: T.space.lg, border: `1px solid ${T.border}`,
          borderRadius: T.radius.lg, background: T.surface,
          borderLeft: `3px solid ${item.status === 'PENDING_APPROVAL' ? T.warn : T.info}`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontWeight: 600, color: T.text, fontSize: 14 }}>{item.full_name || "—"}</div>
              <div style={{ fontSize: 12.5, color: T.muted, marginTop: 2 }}>{item.email || "—"}</div>
            </div>
            <StatusPill status={item.status} size="small" />
          </div>
          <div style={{ marginTop: T.space.md }}>
            <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.04em" }}>Registered</div>
            <div style={{ fontSize: 13, color: T.textSecondary, marginTop: 2 }}>{formatDate(item.created_at)}</div>
          </div>
          <div style={{
            marginTop: T.space.md, paddingTop: T.space.md,
            borderTop: `1px solid ${T.borderLight}`,
            display: "flex", gap: T.space.sm, justifyContent: "flex-end",
          }}>
            <button
              onClick={() => onReject(item)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "6px 12px", fontSize: 13, fontWeight: 600,
                color: T.error, background: "transparent",
                border: `1px solid ${T.border}`, borderRadius: T.radius.sm,
                cursor: "pointer",
              }}
              title="Reject Enrollment"
            >
              <X size={14} /> Reject
            </button>
            {item.status === 'PENDING_APPROVAL' && (
              <button
                onClick={() => onApprove(item.id)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "6px 12px", fontSize: 13, fontWeight: 600,
                  color: T.success, background: T.successBg,
                  border: `1px solid ${T.successBorder}`, borderRadius: T.radius.sm,
                  cursor: "pointer",
                }}
                title="Approve Enrollment"
              >
                <Check size={14} /> Approve
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
