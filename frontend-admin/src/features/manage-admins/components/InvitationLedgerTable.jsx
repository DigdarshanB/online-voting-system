import React, { useState, useEffect } from 'react';
import { tokens } from './tokens';
import StatusPill from './StatusPill';
import EmptyStateBlock from './EmptyStateBlock';
import SectionCard from './SectionCard';
import SectionHeader from './SectionHeader';
import { XCircle, Trash2, RefreshCw, SlidersHorizontal, Inbox, AlertTriangle } from 'lucide-react';

// Helper to calculate time remaining
function getTimeRemaining(expiryDate) {
  if (!expiryDate) return { text: 'No expiry', color: tokens.text.secondary };
  const now = new Date();
  const expires = new Date(expiryDate);
  const diff = expires - now;

  if (diff <= 0) return { text: 'Expired', color: tokens.status.danger.text };

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 1) return { text: `in ${days} days`, color: tokens.text.secondary };
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours > 1) return { text: `in ${hours} hours`, color: tokens.status.warning.text };

  const minutes = Math.floor(diff / (1000 * 60));
  return { text: `in ${minutes} min`, color: tokens.status.danger.text };
}

export default function InvitationLedgerTable({
  items = [],
  isLoading = false,
  error = "",
  searchValue,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onClearFilters,
  onRefresh,
  onRevoke,
  onDelete,
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

  const filterContainerStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: tokens.spacing.md,
    padding: `${tokens.spacing.md}px 0`,
    borderBottom: `1px solid ${tokens.cardBorder}`,
    marginBottom: tokens.spacing.lg,
  };

  const searchInputStyle = {
    flex: "1 1 180px",
    padding: "8px 12px",
    borderRadius: tokens.borderRadius.medium,
    border: `1px solid ${tokens.cardBorder}`,
    fontSize: 14,
    color: tokens.text.primary,
    backgroundColor: tokens.input.background,
  };

  const selectStyle = {
    padding: "8px 12px",
    borderRadius: tokens.borderRadius.medium,
    border: `1px solid ${tokens.cardBorder}`,
    fontSize: 14,
    color: tokens.text.primary,
    backgroundColor: tokens.input.background,
    cursor: "pointer",
  };

  const renderContent = () => {
    if (isLoading) {
      return <EmptyStateBlock title="Loading Invitation Register..." description="Please wait while we fetch the records." />;
    }
    if (error) {
      return <EmptyStateBlock icon={AlertTriangle} title="Error Loading Ledger" description={error} />;
    }
    if (items.length === 0) {
      return (
        <EmptyStateBlock
          icon={Inbox}
          title="No Invitations Found"
          description="The register is empty or no items match your filters. Try clearing filters to see all invitations."
        />
      );
    }
    return isMobile ? (
      <MobileView items={items} onRevoke={onRevoke} onDelete={onDelete} />
    ) : (
      <TableView items={items} onRevoke={onRevoke} onDelete={onDelete} />
    );
  };

  return (
    <SectionCard>
      <SectionHeader
        title="Invitation Register"
        description="Official record of all issued, used, and expired administrator invitations."
        actions={
          <button
            style={actionButtonStyle}
            onClick={onRefresh}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = tokens.input.background)}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            title="Refresh Register"
          >
            <RefreshCw size={14} />
          </button>
        }
      />
      <div style={filterContainerStyle}>
        <input
          type="search"
          placeholder="Search by email..."
          style={searchInputStyle}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search invitations by email"
        />
        <select
          style={selectStyle}
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          aria-label="Filter invitations by status"
        >
          <option value="ALL">All Statuses</option>
          <option value="ISSUED">Issued</option>
          <option value="USED">Used</option>
          <option value="REVOKED">Revoked</option>
          <option value="EXPIRED">Expired</option>
        </select>
        <button
          style={{...actionButtonStyle, border: 'none'}}
          onClick={onClearFilters}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = tokens.input.background)}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          title="Clear all filters"
        >
          <SlidersHorizontal size={14} />
          Clear
        </button>
      </div>

      {renderContent()}
    </SectionCard>
  );
}

function formatDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString();
}

function TableView({ items, onRevoke, onDelete }) {
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
  const recipientStyle = { fontWeight: 600, color: tokens.text.primary };
  const dateStyle = { fontSize: 13, color: tokens.text.secondary };
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

  const revokeButtonStyle = {
    ...actionBaseStyle,
    color: tokens.status.warning.text,
  };

  const deleteButtonStyle = {
    ...actionBaseStyle,
    color: tokens.status.danger.text,
  };

  return (
    <div style={tableWrapperStyle}>
      <table style={tableStyle}>
        <caption style={{ captionSide: "bottom", textAlign: "left", padding: "12px", fontSize: 13, color: tokens.text.muted }}>
          Official record of all issued administrator invitations.
        </caption>
        <thead>
          <tr style={{ borderBottom: `2px solid ${tokens.cardBorder}` }}>
            <th style={thStyle}>Recipient</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Issued</th>
            <th style={thStyle}>Expires / Used</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const expiryInfo = getTimeRemaining(item.expires_at);
            return (
              <tr
                key={item.id}
                style={trStyle}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = tokens.pageBackground)}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <td style={tdStyle}>
                  <span style={recipientStyle}>{item.recipient_identifier}</span>
                </td>
                <td style={tdStyle}>
                  <StatusPill status={item.status} />
                </td>
                <td style={tdStyle}>
                  <div style={dateStyle}>{formatDate(item.created_at)}</div>
                </td>
                <td style={tdStyle}>
                  {item.status === 'USED' 
                    ? <div style={dateStyle}>{formatDate(item.used_at)}</div>
                    : <div style={{...dateStyle, color: expiryInfo.color }}>{expiryInfo.text}</div>
                  }
                </td>
                <td style={{ ...tdStyle, textAlign: "right" }}>
                  <div style={actionsStyle}>
                    {item.status === "ISSUED" && (
                      <button
                        style={revokeButtonStyle}
                        onClick={() => onRevoke(item)}
                        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = tokens.status.warning.background)}
                        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        title="Revoke Invitation"
                      >
                        <XCircle size={16} />
                        <span>Revoke</span>
                      </button>
                    )}
                    {(item.status === "EXPIRED" || item.status === "REVOKED") && (
                      <button
                        style={deleteButtonStyle}
                        onClick={() => onDelete(item)}
                        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = tokens.status.danger.background)}
                        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        title="Remove Record from Ledger"
                      >
                        <Trash2 size={16} />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MobileView({ items, onRevoke, onDelete }) {
  const cardStyle = {
    padding: tokens.spacing.lg,
    border: `1px solid ${tokens.cardBorder}`,
    borderRadius: tokens.borderRadius.medium,
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacing.md,
  };
  const headerStyle = { display: "flex", justifyContent: "space-between", alignItems: "flex-start" };
  const recipientStyle = { fontWeight: 600, color: tokens.text.primary, wordBreak: 'break-all' };
  const infoGridStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacing.md, alignItems: 'center', marginTop: tokens.spacing.md };
  const infoLabelStyle = { fontSize: 12, color: tokens.text.secondary, textTransform: 'uppercase', fontWeight: 500 };
  const infoValueStyle = { fontSize: 13, color: tokens.text.primary };
  const footerStyle = {
    marginTop: tokens.spacing.md,
    paddingTop: tokens.spacing.md,
    borderTop: `1px solid ${tokens.cardBorder}`,
    display: "flex",
    gap: tokens.spacing.md,
    justifyContent: "flex-end",
  };
  const buttonStyle = { display: 'inline-flex', alignItems: 'center', gap: tokens.spacing.sm, background: "none", border: "none", fontWeight: 600, cursor: "pointer", padding: "8px" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: tokens.spacing.md }}>
      {items.map(item => {
        const expiryInfo = getTimeRemaining(item.expires_at);
        return (
          <div key={item.id} style={cardStyle}>
            <div style={headerStyle}>
              <span style={recipientStyle}>{item.recipient_identifier}</span>
              <StatusPill status={item.status} />
            </div>
            
            <div style={infoGridStyle}>
              <div>
                <div style={infoLabelStyle}>Issued</div>
                <div style={infoValueStyle}>{formatDate(item.created_at)}</div>
              </div>
              <div>
                <div style={infoLabelStyle}>{item.status === 'USED' ? 'Used' : 'Expires'}</div>
                <div style={{...infoValueStyle, color: item.status === 'USED' ? tokens.text.primary : expiryInfo.color }}>
                  {item.status === 'USED' ? formatDate(item.used_at) : expiryInfo.text}
                </div>
              </div>
            </div>

            <div style={footerStyle}>
              {item.status === 'ISSUED' && (
                <button onClick={() => onRevoke(item)} style={{ ...buttonStyle, color: tokens.status.warning.text }} title="Revoke Invitation">
                  <XCircle size={16} />
                  <span>Revoke</span>
                </button>
              )}
              {(item.status === "EXPIRED" || item.status === "REVOKED") && (
                <button onClick={() => onDelete(item)} style={{ ...buttonStyle, color: tokens.status.danger.text }} title="Remove Record">
                  <Trash2 size={16} />
                  <span>Remove</span>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
