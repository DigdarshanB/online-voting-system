import React from 'react';
import { tokens } from './tokens';
import SectionCard from './SectionCard';
import SectionHeader from './SectionHeader';
import EmptyStateBlock from './EmptyStateBlock';
import { Check, X, RefreshCw, ShieldQuestion, Loader } from 'lucide-react';

function GovernanceTable({ items, onApprove, onReject }) {
  const tableStyle = { width: "100%", borderCollapse: "collapse", textAlign: "left" };
  const thStyle = {
    padding: `${tokens.spacing.md}px ${tokens.spacing.lg}px`,
    color: tokens.text.secondary,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    fontWeight: 600,
    borderBottom: `1px solid ${tokens.cardBorder}`,
  };
  const trStyle = { borderBottom: `1px solid ${tokens.cardBorder}` };
  const tdStyle = { padding: `${tokens.spacing.lg}px`, verticalAlign: "middle", fontSize: 14 };
  const userStyle = { fontWeight: 600, color: tokens.text.primary };
  const userEmailStyle = { fontSize: 13, color: tokens.text.secondary };
  const actionsStyle = { display: "flex", justifyContent: "flex-end", gap: tokens.spacing.sm };
  
  const actionBaseStyle = {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacing.sm,
    padding: `${tokens.spacing.sm}px ${tokens.spacing.md}px`,
    backgroundColor: "transparent",
    border: `1px solid ${tokens.cardBorder}`,
    borderRadius: tokens.borderRadius.medium,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    transition: "background-color 0.2s, border-color 0.2s",
  };

  const approveButtonStyle = { ...actionBaseStyle, color: tokens.status.success.text };
  const rejectButtonStyle = { ...actionBaseStyle, color: tokens.status.danger.text };

  return (
    <div style={{ overflowX: "auto", border: `1px solid ${tokens.cardBorder}`, borderRadius: tokens.borderRadius.large }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Administrator</th>
            <th style={thStyle}>Requested At</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} style={trStyle}>
              <td style={tdStyle}>
                <div style={userStyle}>{item.name}</div>
                <div style={userEmailStyle}>{item.email}</div>
              </td>
              <td style={tdStyle}>
                {new Date(item.createdAt).toLocaleString()}
              </td>
              <td style={{ ...tdStyle, textAlign: "right" }}>
                <div style={actionsStyle}>
                  <button
                    style={rejectButtonStyle}
                    onClick={() => onReject(item)}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = tokens.status.danger.background}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                    title="Reject Request"
                  >
                    <X size={16} />
                    <span>Reject</span>
                  </button>
                  <button
                    style={approveButtonStyle}
                    onClick={() => onApprove(item)}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = tokens.status.success.background}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                    title="Approve Request"
                  >
                    <Check size={16} />
                    <span>Approve</span>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function TotpRecoveryQueueTable({
  items = [],
  isLoading = false,
  error = "",
  onRefresh,
  onApprove,
  onReject
}) {
  const actionButtonStyle = {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacing.sm,
    padding: "6px 10px",
    backgroundColor: "transparent",
    border: `1px solid ${tokens.cardBorder}`,
    borderRadius: tokens.borderRadius.medium,
    fontSize: 13,
    fontWeight: 500,
    color: tokens.text.secondary,
    cursor: "pointer",
    transition: "background-color 0.2s",
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <EmptyStateBlock
          icon={Loader}
          title="Loading Recovery Queue..."
          description="Fetching pending requests from the secure server."
        />
      );
    }

    if (error) {
      return (
        <EmptyStateBlock
          icon={AlertTriangle}
          title="Error Loading Queue"
          description={error}
        />
      );
    }

    if (items.length === 0) {
      return (
        <EmptyStateBlock
          icon={ShieldQuestion}
          title="Recovery Queue is Clear"
          description="There are no pending multi-factor authentication recovery requests."
        />
      );
    }

    return <GovernanceTable items={items} onApprove={onApprove} onReject={onReject} />;
  };

  return (
    <SectionCard>
      <SectionHeader
        title="MFA Recovery Queue"
        description="Review and process requests from administrators who have lost access to their authenticator."
        actions={onRefresh && (
          <button
            style={actionButtonStyle}
            onClick={onRefresh}
            disabled={isLoading}
            onMouseOver={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = tokens.input.background)}
            onMouseOut={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        )}
      />
      <div style={{ marginTop: tokens.spacing.lg }}>
        {renderContent()}
      </div>
    </SectionCard>
  );
}
