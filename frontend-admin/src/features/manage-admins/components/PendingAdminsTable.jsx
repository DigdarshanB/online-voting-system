import React, { useState, useEffect } from 'react';
import { tokens } from './tokens';
import SectionCard from './SectionCard';
import SectionHeader from './SectionHeader';
import StatusPill from './StatusPill';
import EmptyStateBlock from './EmptyStateBlock';
import { Check, X, RefreshCw, UserPlus, AlertCircle } from 'lucide-react';

export default function PendingAdminsTable({
  pendingAdmins = [],
  isLoading = false,
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
    if (isLoading && pendingAdmins.length === 0) {
      return <EmptyStateBlock title="Loading Enrollment Queue..." description="Fetching pending administrator requests..." />;
    }
    if (error) {
      return <EmptyStateBlock icon={AlertCircle} title="Error Loading Queue" description={error} />;
    }
    if (pendingAdmins.length === 0) {
      return (
        <EmptyStateBlock
          icon={UserPlus}
          title="The Enrollment Queue is Clear"
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
    <SectionCard>
      <SectionHeader
        title="Administrator Enrollment Queue"
        description="Review and approve/reject enrollment requests from prospective administrators."
        actions={
          <button
            style={actionButtonStyle}
            onClick={onRefresh}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = tokens.input.background)}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            title="Refresh Queue"
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
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString();
}

function TableView({ items, onApprove, onReject }) {
  const tableWrapperStyle = { overflowX: "auto" };
  const tableStyle = { width: "100%", borderCollapse: "collapse", textAlign: "left" };
  const thStyle = {
    padding: `10px ${tokens.spacing.md}px`,
    color: tokens.text.secondary,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    fontWeight: 600,
    borderBottom: `1px solid ${tokens.cardBorder}`,
  };
  const trStyle = { borderBottom: `1px solid ${tokens.cardBorder}`, transition: "background-color 0.2s" };
  const tdStyle = { padding: `${tokens.spacing.md}px`, verticalAlign: "middle", fontSize: 14 };
  const userStyle = { fontWeight: 600, color: tokens.text.primary };
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
        <thead>
          <tr style={{ borderBottom: `2px solid ${tokens.cardBorder}` }}>
            <th style={thStyle}>Candidate</th>
            <th style={thStyle}>Registered</th>
            <th style={thStyle}>Enrollment Status</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Governance Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              style={trStyle}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = tokens.pageBackground)}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <td style={tdStyle}>
                <div style={userStyle}>{item.full_name || "—"}</div>
                <div style={userEmailStyle}>{item.email}</div>
              </td>
              <td style={tdStyle}>
                {formatDate(item.created_at)}
              </td>
              <td style={tdStyle}>
                <StatusPill status={item.status} />
              </td>
              <td style={{ ...tdStyle, textAlign: "right" }}>
                <div style={actionsStyle}>
                  {item.status === 'PENDING_APPROVAL' && (
                    <button
                      style={approveButtonStyle}
                      onClick={() => onApprove(item.id)}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = tokens.status.success.background)}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      title="Approve Enrollment"
                    >
                      <Check size={16} />
                      <span>Approve</span>
                    </button>
                  )}
                  <button
                    style={rejectButtonStyle}
                    onClick={() => onReject(item)}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = tokens.status.danger.background)}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    title="Reject Enrollment"
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
  const infoLabelStyle = { fontSize: 12, color: tokens.text.secondary, textTransform: 'uppercase', fontWeight: 500, marginBottom: tokens.spacing.xxs };
  const infoValueStyle = { fontSize: 13, color: tokens.text.primary };
  const footerStyle = {
    marginTop: tokens.spacing.sm,
    paddingTop: tokens.spacing.sm,
    borderTop: `1px solid ${tokens.cardBorder}`,
    display: "flex",
    gap: tokens.spacing.md,
    justifyContent: "flex-end",
  };
  const buttonStyle = { display: 'inline-flex', alignItems: 'center', gap: tokens.spacing.sm, background: "none", border: "none", fontWeight: 600, cursor: "pointer", padding: "8px" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: tokens.spacing.md }}>
      {items.map(item => (
        <div key={item.id} style={cardStyle}>
          <div style={headerStyle}>
            <div>
              <div style={userStyle}>{item.full_name || "—"}</div>
              <div style={userEmailStyle}>{item.email || "—"}</div>
            </div>
            <StatusPill status={item.status} />
          </div>
          <div style={{ marginTop: tokens.spacing.md }}>
            <div style={infoLabelStyle}>Registered</div>
            <div style={infoValueStyle}>{formatDate(item.created_at)}</div>
          </div>
          <div style={footerStyle}>
             <button onClick={() => onReject(item)} style={{ ...buttonStyle, color: tokens.status.danger.text }} title="Reject Enrollment">
                <X size={16} />
                <span>Reject</span>
             </button>
             {item.status === 'PENDING_APPROVAL' && (
               <button onClick={() => onApprove(item.id)} style={{ ...buttonStyle, color: tokens.status.success.text }} title="Approve Enrollment">
                 <Check size={16} />
                 <span>Approve</span>
               </button>
             )}
          </div>
        </div>
      ))}
    </div>
  );
}
