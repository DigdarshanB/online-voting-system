import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getMe,
  getPendingAdmins,
  getActiveAdmins,
  getInvitedAdmins,
  getTotpRecoveryRequests,
  createAdminInvite,
  revokeAdminInvite,
  approvePendingAdmin,
  rejectPendingAdmin,
  deletePendingAdmin,
  deleteActiveAdmin,
  approveTotpRecovery,
  rejectTotpRecovery,
  resetAdminTotp,
} from "../features/admin-management/api/adminManagementApi";

// Components
import InviteAdminForm from "../features/manage-admins/components/InviteAdminForm";
import AdminActivationCodeModal from "../features/manage-admins/components/AdminActivationCodeModal";
import AdminListTable from "../features/manage-admins/components/AdminListTable";
import PendingAdminsTable from "../features/manage-admins/components/PendingAdminsTable";
import InvitesListTable from "../features/manage-admins/components/InvitesListTable";
import RecoveryQueueTable from "../features/manage-admins/components/RecoveryQueueTable";

// Design Tokens (Matching AdminShell)
const PALETTE = {
  primary: "#173B72",
  accent: "#2F6FED",
  success: "#0F9F6E",
  danger: "#DC2626",
  border: "#E2E8F0",
  textMain: "#0F172A",
  textMuted: "#64748B",
  surface: "#FFFFFF",
  bg: "#F8FAFC",
};

export default function ManageAdmins() {
  const navigate = useNavigate();

  // Auth / role
  const [role, setRole] = useState(null);
  const [me, setMe] = useState(null);

  // Lists & Loading
  const [pendingAdmins, setPendingAdmins] = useState([]);
  const [activeAdmins, setActiveAdmins] = useState([]);
  const [invitedAdmins, setInvitedAdmins] = useState([]);
  const [recoveryQueue, setRecoveryQueue] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Interaction State
  const [showInviteModal, setShowInviteModal] = useState(null); // stores {email, code, activationUrl, expiresAt}
  const [actionMsg, setActionMsg] = useState(null);
  const [isInviting, setIsInviting] = useState(false);

  // ── Loaders ──

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [pending, active, invited, recovery] = await Promise.all([
        getPendingAdmins(),
        getActiveAdmins(),
        getInvitedAdmins(),
        getTotpRecoveryRequests()
      ]);
      setPendingAdmins(pending);
      setActiveAdmins(active);
      setInvitedAdmins(invited);
      setRecoveryQueue(recovery);
    } catch (error) {
      console.error("Failed to load admin data:", error);
      setActionMsg({ type: "error", text: "Failed to sync with server. Please refresh." });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    async function bootstrap() {
      try {
        const data = await getMe();
        setMe(data);
        setRole(data.role);
        if (data.role === "super_admin") {
          loadAll();
        }
      } catch {
        navigate("/", { replace: true });
      }
    }
    bootstrap();
  }, [navigate, loadAll]);

  // ── Handlers ──

  const handleInvite = async (email, sendLink) => {
    setIsInviting(true);
    setActionMsg(null);
    try {
      // Note: Backend currently always sends email, but we pass sendLink for future-proofing
      const data = await createAdminInvite(email);
      setShowInviteModal({
        email,
        code: data.invite_code,
        activationUrl: data.activation_url,
        expiresAt: data.expires_at
      });
      loadAll();
    } catch (error) {
      setActionMsg({ type: "error", text: error.message });
    } finally {
      setIsInviting(false);
    }
  };

  const handleApproveAdmin = async (id, name) => {
    try {
      await approvePendingAdmin(id);
      setActionMsg({ type: "success", text: `Admin ${name} approved successfully.` });
      loadAll();
    } catch (error) {
      setActionMsg({ type: "error", text: error.message });
    }
  };

  const handleRejectAdmin = async (id, name) => {
    const reason = prompt(`Reason for rejecting ${name}:`);
    if (!reason) return;
    try {
      await rejectPendingAdmin(id, reason);
      setActionMsg({ type: "success", text: `Admin ${name} rejected.` });
      loadAll();
    } catch (error) {
      setActionMsg({ type: "error", text: error.message });
    }
  };

  const handleDeleteAdmin = async (id, identifier) => {
    if (!window.confirm(`Are you sure you want to remove access for ${identifier}?`)) return;
    try {
      await deleteActiveAdmin(id);
      setActionMsg({ type: "success", text: `Admin access revoked.` });
      loadAll();
    } catch (error) {
      setActionMsg({ type: "error", text: error.message });
    }
  };

  const handleApproveRecovery = async (requestId, email) => {
    try {
      await approveTotpRecovery(requestId);
      setActionMsg({ type: "success", text: `2FA reset for ${email}. User must re-enroll.` });
      loadAll();
    } catch (error) {
      setActionMsg({ type: "error", text: error.message });
    }
  };

  const handleResetTotp = async (userId, email) => {
    if (!window.confirm(`Are you sure you want to force-reset TOTP for ${email}?`)) return;
    try {
      await resetAdminTotp(userId);
      setActionMsg({ type: "success", text: `TOTP reset for ${email}.` });
      loadAll();
    } catch (error) {
      setActionMsg({ type: "error", text: error.message });
    }
  };

  const handleRevokeInvite = async (inviteId) => {
    if (!window.confirm("Are you sure you want to revoke this invitation?")) return;
    try {
      await revokeAdminInvite(inviteId);
      setActionMsg({ type: "success", text: "Invitation revoked." });
      loadAll();
    } catch (error) {
      setActionMsg({ type: "error", text: error.message });
    }
  };

  const handleRejectRecovery = async (requestId, email) => {
    const reason = prompt(`Reason for rejecting 2FA recovery for ${email}:`) || "Rejected by super admin";
    try {
      await rejectTotpRecovery(requestId, reason);
      setActionMsg({ type: "success", text: `Recovery request rejected.` });
      loadAll();
    } catch (error) {
      setActionMsg({ type: "error", text: error.message });
    }
  };

  // ── Render ──

  if (role === null) return null;

  if (role !== "super_admin") {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h2 style={{ color: PALETTE.danger }}>Access Denied</h2>
        <p>Only super administrators can access this portal.</p>
        <button onClick={() => navigate("/dashboard")} style={{ background: PALETTE.primary, color: "#FFF", padding: "10px 20px", border: "none", borderRadius: 8, cursor: "pointer" }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px", maxWidth: "1600px", margin: "0 auto", minHeight: "100vh", background: PALETTE.bg }}>
      
      {/* Header Area */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: PALETTE.textMain, letterSpacing: "-0.02em" }}>
          Manage Administrators
        </h1>
        <p style={{ margin: "8px 0 0", fontSize: 16, color: PALETTE.textMuted }}>
          Control access, verify identities, and manage security protocols for the election system.
        </p>
      </div>

      {/* Global Notifications */}
      {actionMsg && (
        <div style={{ 
          marginBottom: 24, 
          padding: "16px 20px", 
          borderRadius: 12, 
          border: `1px solid ${actionMsg.type === "success" ? "#BBF7D0" : "#FECACA"}`,
          background: actionMsg.type === "success" ? "#F0FDF4" : "#FEF2F2",
          color: actionMsg.type === "success" ? "#166534" : "#991B1B",
          fontSize: 14,
          fontWeight: 600,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <span>{actionMsg.text}</span>
          <button onClick={() => setActionMsg(null)} style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", fontWeight: 800 }}>✕</button>
        </div>
      )}

      {/* Grid Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 32, alignItems: "start" }}>
        
        {/* Left Column: Invite & Stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          <InviteAdminForm onInvite={handleInvite} isLoading={isInviting} />
          
          <div style={{ 
            background: PALETTE.surface, 
            borderRadius: 16, 
            padding: 24, 
            border: `1px solid ${PALETTE.border}`,
            display: "flex",
            justifyContent: "space-around",
            textAlign: "center"
          }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: PALETTE.primary }}>{activeAdmins.length}</div>
              <div style={{ fontSize: 13, color: PALETTE.textMuted, fontWeight: 600 }}>Active Admins</div>
            </div>
            <div style={{ borderLeft: `1px solid ${PALETTE.border}` }}></div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#D97706" }}>{pendingAdmins.length}</div>
              <div style={{ fontSize: 13, color: PALETTE.textMuted, fontWeight: 600 }}>Awaiting Approval</div>
            </div>
          </div>
        </div>

        {/* Right Column: Recovery Queue */}
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
           <RecoveryQueueTable 
             requests={recoveryQueue} 
             onApprove={handleApproveRecovery} 
             onReject={handleRejectRecovery} 
             isLoading={isLoading} 
           />
        </div>

      </div>

      {/* Full Width Table: Active Admins */}
      <div style={{ marginTop: 32 }}>
        <AdminListTable 
          admins={activeAdmins} 
          onDelete={handleDeleteAdmin} 
          onReset2FA={handleResetTotp}
          isLoading={isLoading} 
        />
      </div>

      {/* Full Width Table: Open Invitations */}
      <div style={{ marginTop: 32 }}>
        <InvitesListTable 
          invites={invitedAdmins} 
          onRevoke={handleRevokeInvite} 
          isLoading={isLoading} 
        />
      </div>

      {/* Bottom Section: Pending Requests */}
      <div style={{ marginTop: 32 }}>
        <PendingAdminsTable 
          pendingAdmins={pendingAdmins} 
          onApprove={handleApproveAdmin} 
          onReject={handleRejectAdmin} 
          onDelete={(id, ident) => handleDeleteAdmin(id, ident)}
          isLoading={isLoading} 
        />
      </div>

      {/* Modals */}
      {showInviteModal && (
        <AdminActivationCodeModal 
          inviteData={showInviteModal} 
          onClose={() => setShowInviteModal(null)} 
        />
      )}
    </div>
  );
}
