import React, { useState, useEffect } from 'react';
import { tokens } from './tokens';
import SectionCard from './SectionCard';
import SectionHeader from './SectionHeader';
import StatusPill from './StatusPill';
import EmptyStateBlock from './EmptyStateBlock';
import { Check, X, RefreshCw, ShieldQuestion } from 'lucide-react';

export default function TotpRecoveryQueueTable({
  items = [],
  loading = false,
  error = "",
  onRefresh,
  onApprove,
  onReject
}) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    const pendingCount = items.filter(item => item.status === 'PENDING').length;

    if (loading && !error && items.length === 0) {
      return (
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(255,255,255,0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
          color: tokens.colors.brandBlue,
          fontWeight: 700
        }}>
          Loading...
        </div>
      );
    }

    if (error && !loading && items.length === 0) {
      return (
        <div style={{
          padding: tokens.spacing.lg,
          color: tokens.colors.danger,
          backgroundColor: tokens.colors.dangerSoft,
          borderRadius: tokens.radius.md,
          textAlign: "center"
        }}>
          {error}
        </div>
      );
    }

    if (!loading && !error && items.length === 0) {
      return (
        <EmptyStateBlock
          icon={ShieldQuestion}
          title="Recovery Queue is Empty"
          description="There are no pending TOTP recovery requests at this time."
          height={150}
        />
      );
    }

    return isMobile ? (
      <MobileView items={items} onApprove={onApprove} onReject={onReject} />
    ) : (
      <TableView items={items} onApprove={onApprove} onReject={onReject} />
    );
  };

  return (
    <SectionCard>
      <SectionHeader
        title="Admin TOTP Recovery Queue"
        description="Approve or reject requests from administrators who have lost access to their authenticator app."
        actions={
          <button
            style={actionButtonStyle}
            onClick={onRefresh}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = tokens.input.background)}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <RefreshCw size={14} />
          </button>
        }
      />
      <div style={{ marginTop: tokens.spacing.lg }}>
        {renderContent()}
      </div>
    </SectionCard>
  );
}

function formatDate(dateString) {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleString();
}

function TableView({ items, onApprove, onReject }) {
  const tableWrapperStyle = { overflowX: "auto" };
  const tableStyle = { width: "100%", borderCollapse: "collapse", textAlign: "left" };
  const thStyle = {
    padding: `${tokens.spacing.sm}px ${tokens.spacing.md}px`,
    color: tokens.text.secondary,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    fontWeight: 500,
  };
  const trStyle = { borderBottom: `1px solid ${tokens.cardBorder}`, transition: "background-color 0.2s" };
  const tdStyle = { padding: `${tokens.spacing.md}px`, verticalAlign: "middle", fontSize: 14 };
  const userStyle = { fontWeight: 500, color: tokens.text.primary };
  const userEmailStyle = { fontSize: 13, color: tokens.text.secondary };
  const actionsStyle = { display: "flex", justifyContent: "flex-end", gap: tokens.spacing.sm };
  
  const actionBaseStyle = {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacing.sm,
    padding: "4px 8px",
    backgroundColor: "transparent",
    border: "none",
    borderRadius: tokens.borderRadius.small,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    transition: "background-color 0.2s",
  };

  const approveButtonStyle = {
    ...actionBaseStyle,
    color: tokens.status.success.text,
  };

  const rejectButtonStyle = {
    ...actionBaseStyle,
    color: tokens.status.danger.text,
  };

  return (
    <div style={tableWrapperStyle}>
      <table style={tableStyle}>
        <caption style={{ captionSide: "bottom", textAlign: "left", padding: "12px", fontSize: 13, color: tokens.text.muted }}>
          Queue of administrators requesting to reset their two-factor authentication.
        </caption>
        <thead>
          <tr style={{ borderBottom: `2px solid ${tokens.cardBorder}` }}>
            <th style={thStyle}>Administrator</th>
            <th style={thStyle}>Requested</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.requestId}
              style={trStyle}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = tokens.pageBackground)}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <td style={tdStyle}>
                <div style={userStyle}>{item.name}</div>
                <div style={userEmailStyle}>{item.email}</div>
              </td>
              <td style={tdStyle}>
                {formatDate(item.requestedAt)}
              </td>
              <td style={{ ...tdStyle, textAlign: "right" }}>
                <div style={actionsStyle}>
                  <button
                    style={approveButtonStyle}
                    onClick={() => onApprove(item)}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = tokens.status.success.background)}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    title="Approve Request"
                  >
                    <Check size={16} />
                    <span>Approve</span>
                  </button>
                  <button
                    style={rejectButtonStyle}
                    onClick={() => onReject(item)}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = tokens.status.danger.background)}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    title="Reject Request"
                  >
                    <X size={16} />
                    <span>Reject</span>
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

function MobileView({ items, onApprove, onReject }) {
  const cardStyle = {
    padding: tokens.spacing.lg,
    border: `1px solid ${tokens.cardBorder}`,
    borderRadius: tokens.borderRadius.medium,
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacing.md,
  };
  const headerStyle = { display: "flex", justifyContent: "space-between", alignItems: "flex-start" };
  const userStyle = { fontWeight: 600, color: tokens.text.primary };
  const userEmailStyle = { fontSize: 13, color: tokens.text.secondary };
  const dateStyle = { fontSize: 13, color: tokens.text.secondary };
  const footerStyle = {
    marginTop: tokens.spacing.sm,
    paddingTop: tokens.spacing.sm,
    borderTop: `1px solid ${tokens.cardBorder}`,
    display: "flex",
    gap: tokens.spacing.md,
    justifyContent: "flex-end",
  };
  const buttonStyle = { background: "none", border: "none", fontWeight: 600, cursor: "pointer", padding: "8px" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: tokens.spacing.md }}>
      {items.map(item => (
        <div key={item.requestId} style={cardStyle}>
          <div style={headerStyle}>
            <div>
              <div style={userStyle}>{item.name}</div>
              <div style={userEmailStyle}>{item.email}</div>
            </div>
            <StatusPill status="PENDING" />
          </div>
          <div style={dateStyle}>
            <strong>Requested:</strong> {formatDate(item.requestedAt)}
          </div>
          <div style={footerStyle}>
            <button onClick={() => onReject(item)} style={{ ...buttonStyle, color: tokens.status.danger.text }}>Reject</button>
            <button onClick={() => onApprove(item)} style={{ ...buttonStyle, color: tokens.status.success.text }}>Approve</button>
          </div>
        </div>
      ))}
    </div>
  );
}
