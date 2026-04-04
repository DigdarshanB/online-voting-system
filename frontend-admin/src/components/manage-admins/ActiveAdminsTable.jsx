import React, { useState, useEffect } from 'react';
import { tokens } from './tokens';
import SectionCard from './SectionCard';
import SectionHeader from './SectionHeader';
import StatusPill from './StatusPill';
import EmptyStateBlock from './EmptyStateBlock';
import { Trash2, RefreshCw, XCircle, UserCheck } from 'lucide-react';

export default function ActiveAdminsTable({
  items = [],
  loading = false,
  error = "",
  searchValue,
  onSearchChange,
  onRefresh,
  onDeleteAdmin
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
    padding: `${tokens.spacing.md}px 0`,
  };

  const searchInputStyle = {
    flex: 1,
    padding: "8px 12px",
    borderRadius: tokens.borderRadius.medium,
    border: `1px solid ${tokens.cardBorder}`,
    fontSize: 14,
    color: tokens.text.primary,
    backgroundColor: tokens.input.background,
  };

  const renderContent = () => {
    if (loading) {
      return <EmptyStateBlock title="Loading Active Admins..." description="Please wait..." height={200} />;
    }
    if (error) {
      return <EmptyStateBlock icon={XCircle} title="Error" description={error} height={200} />;
    }
    if (items.length === 0) {
      return (
        <EmptyStateBlock
          icon={UserCheck}
          title="No Active Administrators Found"
          description="There are no admins matching your search, or no admins have been approved."
          height={200}
        />
      );
    }
    return isMobile ? (
      <MobileView items={items} onDeleteAdmin={onDeleteAdmin} />
    ) : (
      <TableView items={items} onDeleteAdmin={onDeleteAdmin} />
    );
  };

  return (
    <SectionCard>
      <SectionHeader
        title="Active Administrators"
        description="Manage all verified administrators with active system access."
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
          placeholder="Search by name or email..."
          style={searchInputStyle}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search active administrators"
        />
      </div>

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

function TableView({ items, onDeleteAdmin }) {
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
          List of all active administrators with system access.
        </caption>
        <thead>
          <tr style={{ borderBottom: `2px solid ${tokens.cardBorder}` }}>
            <th style={thStyle}>Administrator</th>
            <th style={thStyle}>Role</th>
            <th style={thStyle}>2FA</th>
            <th style={thStyle}>Approved</th>
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
                <div style={userStyle}>{item.name}</div>
                <div style={userEmailStyle}>{item.email}</div>
              </td>
              <td style={tdStyle}>
                {item.role ? <StatusPill status={item.role} /> : "—"}
              </td>
              <td style={tdStyle}>
                {item.mfaEnabled
                  ? <StatusPill status="ACTIVE" />
                  : <StatusPill status="PENDING" />
                }
              </td>
              <td style={tdStyle}>
                {formatDate(item.approvedAt)}
              </td>
              <td style={{ ...tdStyle, textAlign: "right" }}>
                <div style={actionsStyle}>
                  <button
                    style={dangerActionButtonStyle}
                    onClick={() => onDeleteAdmin(item)}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = tokens.status.danger.background)}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    title="Delete Admin"
                  >
                    <Trash2 size={16} />
                    <span>Delete</span>
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

function MobileView({ items, onDeleteAdmin }) {
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
  const infoStyle = { fontSize: 13, color: tokens.text.secondary };
  const footerStyle = {
    marginTop: tokens.spacing.sm,
    paddingTop: tokens.spacing.sm,
    borderTop: `1px solid ${tokens.cardBorder}`,
    display: "flex",
    justifyContent: "flex-end",
  };
  const buttonStyle = { background: "none", border: "none", fontWeight: 600, cursor: "pointer", padding: "8px", color: tokens.status.danger.text };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: tokens.spacing.md }}>
      {items.map(item => (
        <div key={item.id} style={cardStyle}>
          <div style={headerStyle}>
            <div>
              <div style={userStyle}>{item.name || "—"}</div>
              <div style={userEmailStyle}>{item.email || "—"}</div>
            </div>
            {item.role && <StatusPill status={item.role} />}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={infoStyle}>
              <strong>2FA:</strong> {item.mfaEnabled ? <StatusPill status="ACTIVE" /> : <StatusPill status="PENDING" />}
            </span>
            <span style={infoStyle}>
              <strong>Approved:</strong> {formatDate(item.approvedAt)}
            </span>
          </div>
          <div style={footerStyle}>
            <button onClick={() => onDeleteAdmin(item)} style={buttonStyle}>Delete Admin</button>
          </div>
        </div>
      ))}
    </div>
  );
}
