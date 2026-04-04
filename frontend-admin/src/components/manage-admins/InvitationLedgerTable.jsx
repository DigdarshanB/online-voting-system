import React, { useState, useEffect } from 'react';
import { tokens } from './tokens';
import StatusPill from './StatusPill';
import EmptyStateBlock from './EmptyStateBlock';
import SectionCard from './SectionCard';
import SectionHeader from './SectionHeader';
import { XCircle, Trash2, RefreshCw, SlidersHorizontal, Inbox } from 'lucide-react';

export default function InvitationLedgerTable({
  items = [],
  loading = false,
  error = "",
  searchValue,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onClearFilters,
  onRefresh,
  onRevoke,
  onDelete,
  showAll = false,
  onShowAllChange
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

  const footerStyle = {
    paddingTop: tokens.spacing.lg,
    marginTop: tokens.spacing.lg,
    borderTop: `1px solid ${tokens.cardBorder}`,
    textAlign: "center",
  };

  const showAllButtonStyle = {
    ...actionButtonStyle,
    width: "100%",
    justifyContent: "center",
  };

  const renderContent = () => {
    if (loading) {
      return <EmptyStateBlock title="Loading Invitations..." description="Please wait while we fetch the ledger." height={200} />;
    }
    if (error) {
      return <EmptyStateBlock icon={XCircle} title="Error" description={error} height={200} />;
    }
    if (items.length === 0) {
      return (
        <EmptyStateBlock
          icon={Inbox}
          title="No Invitations Found"
          description="The ledger is empty or no items match your filters. Try clearing filters to see all invitations."
          height={200}
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
        title="Invitation Ledger"
        description="Record of all issued, used, and expired invitations."
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
          style={actionButtonStyle}
          onClick={onClearFilters}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = tokens.input.background)}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <SlidersHorizontal size={14} />
          Clear
        </button>
      </div>

      {renderContent()}

      {!showAll && items.length > 5 && (
        <div style={footerStyle}>
          <button
            style={showAllButtonStyle}
            onClick={() => onShowAllChange(true)}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = tokens.input.background)}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            Show All {items.length}
          </button>
        </div>
      )}
    </SectionCard>
  );
}

function formatDate(dateString) {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleString();
}

function TableView({ items, onRevoke, onDelete }) {
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
  const recipientStyle = { fontWeight: 500, color: tokens.text.primary };
  const dateStyle = { fontSize: 13, color: tokens.text.secondary };
  const actionsStyle = { display: "flex", justifyContent: "flex-end", gap: tokens.spacing.sm };
  const dangerActionButtonStyle = {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacing.sm,
    padding: "4px 8px",
    backgroundColor: "transparent",
    border: "none",
    borderRadius: tokens.borderRadius.small,
    fontSize: 13,
    fontWeight: 500,
    color: tokens.status.danger.text,
    cursor: "pointer",
    transition: "background-color 0.2s",
  };

  return (
    <div style={tableWrapperStyle}>
      <table style={tableStyle}>
        <caption style={{ captionSide: "bottom", textAlign: "left", padding: "12px", fontSize: 13, color: tokens.text.muted }}>
          Ledger of all issued administrator invitations.
        </caption>
        <thead>
          <tr style={{ borderBottom: `2px solid ${tokens.cardBorder}` }}>
            <th style={thStyle}>Recipient</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Dates</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
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
                <span style={recipientStyle}>{item.recipient}</span>
              </td>
              <td style={tdStyle}>
                <StatusPill status={item.status} />
              </td>
              <td style={tdStyle}>
                <div style={dateStyle}>Issued: {formatDate(item.createdAt)}</div>
                {item.expiresAt && item.status !== 'USED' && <div style={dateStyle}>Exp: {formatDate(item.expiresAt)}</div>}
                {item.usedAt && <div style={dateStyle}>Used: {formatDate(item.usedAt)}</div>}
              </td>
              <td style={{ ...tdStyle, textAlign: "right" }}>
                <div style={actionsStyle}>
                  {item.status === "ISSUED" && (
                    <button
                      style={dangerActionButtonStyle}
                      onClick={() => onRevoke(item)}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = tokens.status.danger.background)}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      title="Revoke Invite"
                    >
                      <XCircle size={16} />
                      <span>Revoke</span>
                    </button>
                  )}
                  {(item.status === "EXPIRED" || item.status === "REVOKED") && (
                    <button
                      style={dangerActionButtonStyle}
                      onClick={() => onDelete(item)}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = tokens.status.danger.background)}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      title="Delete Invite"
                    >
                      <Trash2 size={16} />
                      <span>Delete</span>
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
  const recipientStyle = { fontWeight: 600, color: tokens.text.primary };
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
        <div key={item.id} style={cardStyle}>
          <div style={headerStyle}>
            <span style={recipientStyle}>{item.recipient}</span>
            <StatusPill status={item.status} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: tokens.spacing.xs }}>
            <div style={dateStyle}><strong>Created:</strong> {formatDate(item.createdAt)}</div>
            {(item.status === 'ISSUED' || item.status === 'EXPIRED') && item.expiresAt && (
              <div style={dateStyle}><strong>Expires:</strong> {formatDate(item.expiresAt)}</div>
            )}
            {item.usedAt && (
              <div style={dateStyle}><strong>Used:</strong> {formatDate(item.usedAt)}</div>
            )}
          </div>
          <div style={footerStyle}>
            {item.status === 'ISSUED' && (
              <button onClick={() => onRevoke(item)} style={{ ...buttonStyle, color: tokens.status.warning.text }}>Revoke</button>
            )}
            <button onClick={() => onDelete(item)} style={{ ...buttonStyle, color: tokens.status.danger.text }}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
