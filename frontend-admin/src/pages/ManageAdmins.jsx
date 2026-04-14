import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

// API
import {
  getMe,
  getPendingAdmins,
  getActiveAdmins,
  getInvitedAdmins,
  getTotpRecoveryRequests,
  createAdminInvite,
  revokeAdminInvite,
  deleteAdminInvite,
  approvePendingAdmin,
  rejectPendingAdmin,
  disableActiveAdmin,
  approveTotpRecovery,
  rejectTotpRecovery,
} from "../features/admin-management/api/adminManagementApi";

// Shared design tokens
import { T } from "../components/ui/tokens";

// Governance Components
import { tokens } from "../features/manage-admins/components/tokens";
import ManageAdminsPageShell from "../features/manage-admins/components/ManageAdminsPageShell";
import GovernanceSummaryStrip from "../features/manage-admins/components/GovernanceSummaryStrip";
import InviteAdminComposer from "../features/manage-admins/components/InviteAdminComposer";
import ActiveAdminsTable from "../features/manage-admins/components/ActiveAdminsTable";
import PendingAdminsTable from "../features/manage-admins/components/PendingAdminsTable";
import InvitationLedgerTable from "../features/manage-admins/components/InvitationLedgerTable";
import TotpRecoveryQueueTable from "../features/manage-admins/components/TotpRecoveryQueueTable";
import ConfirmActionDialog from "../features/manage-admins/components/ConfirmActionDialog";
import SecurityWorkflowBanner from "../features/manage-admins/components/SecurityWorkflowBanner";

export default function ManageAdmins() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // ── 1. Auth & Data Fetching ──────────────────────────────────
  
  const { data: me, isLoading: authLoading } = useQuery({
    queryKey: ["admin-me"],
    queryFn: getMe,
    retry: false
  });

  const isSuperAdmin = me?.role === "super_admin";

  const pendingQuery = useQuery({
    queryKey: ["pending-admins"],
    queryFn: getPendingAdmins,
    enabled: !!isSuperAdmin,
  });

  const activeQuery = useQuery({
    queryKey: ["active-admins"],
    queryFn: getActiveAdmins,
    enabled: !!isSuperAdmin,
  });

  const invitesQuery = useQuery({
    queryKey: ["invited-admins"],
    queryFn: getInvitedAdmins,
    enabled: !!isSuperAdmin,
  });

  const recoveryQuery = useQuery({
    queryKey: ["recovery-queue"],
    queryFn: getTotpRecoveryRequests,
    enabled: !!isSuperAdmin,
  });

  // ── 2. Specialized State ──────────────────────────────────────
  
  const [recipientEmail, setRecipientEmail] = useState("");
  const [inviteResult, setInviteResult] = useState(null);
  const [actionDialog, setActionDialog] = useState({ open: false });
  const [localError, setLocalError] = useState(null);

  // Invite Ledger Filter State
  const [inviteSearch, setInviteSearch] = useState("");
  const [inviteStatusFilter, setInviteStatusFilter] = useState("ALL");

  // ── 3. Mutations ──────────────────────────────────────────────
  
  const inviteMutation = useMutation({
    mutationFn: (email) => createAdminInvite(email),
    onSuccess: (data) => {
      setInviteResult({
        visible: true,
        recipientIdentifier: data.invite.recipient_identifier,
        expiresAt: data.invite.expires_at,
        inviteCode: data.activation_details?.invite_code,
        activationUrl: data.activation_details?.activation_url,
        message: data.message,
      });
      setRecipientEmail("");
      queryClient.invalidateQueries({ queryKey: ["invited-admins"] });
    },
    onError: (err) => {
      setLocalError(err.message || "An unknown error occurred.");
    }
  });

  const approveMutation = useMutation({
    mutationFn: (id) => approvePendingAdmin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-admins"] });
      queryClient.invalidateQueries({ queryKey: ["active-admins"] });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => rejectPendingAdmin(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pending-admins"] })
  });

  const disableMutation = useMutation({
    mutationFn: ({ userId, reason }) => disableActiveAdmin(userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-admins"] });
      queryClient.invalidateQueries({ queryKey: ["pending-admins"] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: ({ inviteId, reason }) => revokeAdminInvite({ inviteId, reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invited-admins"] })
  });

  const deleteInviteMutation = useMutation({
    mutationFn: (inviteId) => deleteAdminInvite(inviteId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invited-admins"] })
  });

  const approveRecoveryMutation = useMutation({
    mutationFn: (requestId) => approveTotpRecovery(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recovery-queue"] });
    }
  });

  const rejectRecoveryMutation = useMutation({
    mutationFn: ({ requestId, reason }) => rejectTotpRecovery(requestId, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recovery-queue"] })
  });

  // ── 4. Handlers ────────────────────────────────────────────────
  
  const handleInviteSubmit = (e) => {
    e.preventDefault();
    setLocalError(null);
    if (recipientEmail) {
      inviteMutation.mutate(recipientEmail);
    }
  };

  const handleDisableRequest = (admin) => {
    setActionDialog({
      open: true,
      title: "Disable Administrative Access",
      description: `This will immediately invalidate all active sessions for ${admin.full_name} (${admin.email}) and move them to a 'Disabled' state. This action is reversible but requires re-approval.`,
      isDestructive: true,
      confirmLabel: "Disable Access",
      requiresReason: true,
      reasonLabel: "Reason for Disabling Access",
      onConfirm: (reason) => {
        disableMutation.mutate({ userId: admin.id, reason });
        setActionDialog({ open: false });
      }
    });
  };

  const handleRevokeRequest = (invite) => {
    setActionDialog({
      open: true,
      title: "Revoke Invitation",
      description: `Are you sure you want to revoke the invitation for ${invite.recipient_identifier}? This action is irreversible and will prevent the invite link from being used.`,
      isDestructive: true,
      confirmLabel: "Revoke Now",
      requiresReason: true,
      reasonLabel: "Reason for Revocation (for audit log)",
      onConfirm: (reason) => {
        revokeMutation.mutate({ inviteId: invite.id, reason });
        setActionDialog({ open: false });
      }
    });
  };

  const handleDeleteInviteRequest = (invite) => {
    setActionDialog({
      open: true,
      title: "Remove Ledger Record",
      description: `This is a cleanup action for the expired/revoked invite to ${invite.recipient_identifier}. Are you sure you want to permanently remove this record from the ledger?`,
      isDestructive: true,
      confirmLabel: "Confirm Removal",
      onConfirm: () => {
        deleteInviteMutation.mutate(invite.id);
        setActionDialog({ open: false });
      }
    });
  };

  const handleRejectAdminRequest = (admin) => {
    setActionDialog({
      open: true,
      title: "Reject Enrollment",
      description: `You are about to reject the enrollment request for ${admin.full_name}. The user will be notified, and their pending record will be removed.`,
      isDestructive: true,
      confirmLabel: "Reject Enrollment",
      requiresReason: true,
      reasonLabel: "Reason for Rejection",
      onConfirm: (reason) => {
        rejectMutation.mutate({ id: admin.id, reason });
        setActionDialog({ open: false });
      }
    });
  };

  const handleApproveRequest = (admin) => {
    setActionDialog({
      open: true,
      title: "Approve Admin Enrollment",
      description: `Are you sure you want to grant full administrative privileges to ${admin.full_name}? They will be immediately converted to an active administrator.`,
      isDestructive: false,
      confirmLabel: "Approve Administrator",
      onConfirm: () => {
        approveMutation.mutate(admin.id);
        setActionDialog({ open: false });
      }
    });
  };

  const handleRecoveryApprove = (item) => {
    setActionDialog({
      open: true,
      title: "Approve MFA Recovery",
      description: `You are approving the MFA reset request for ${item.name}. They will be prompted to set up a new MFA device on their next login.`,
      isDestructive: false,
      confirmLabel: "Approve Recovery",
      onConfirm: () => {
        approveRecoveryMutation.mutate(item.id);
        setActionDialog({ open: false });
      }
    });
  };

  const handleRecoveryReject = (item) => {
    setActionDialog({
      open: true,
      title: "Reject MFA Recovery",
      description: `You are rejecting the MFA reset request for ${item.name}. The request will be closed.`,
      isDestructive: true,
      confirmLabel: "Reject Recovery",
      requiresReason: true,
      reasonLabel: "Reason for Rejection",
      onConfirm: (reason) => {
        rejectRecoveryMutation.mutate({ requestId: item.id, reason });
        setActionDialog({ open: false });
      }
    });
  };

  const handleJumpToQueue = () => {
    const queueElement = document.getElementById('recovery-queue');
    if (queueElement) {
      queueElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // ── 5. Render Logic ───────────────────────────────────────────

  if (authLoading) return <div style={{ padding: 40, textAlign: "center", color: T.muted, fontWeight: 600 }}>Initializing Security Context…</div>;
  
  if (!isSuperAdmin) {
    return (
      <div style={{ padding: "80px 40px", textAlign: "center" }}>
        <h2 style={{ color: T.error, fontWeight: 800 }}>Access Prohibited</h2>
        <p style={{ color: T.textSecondary }}>This console requires super_admin clearance level.</p>
        <button 
          onClick={() => navigate("/dashboard")} 
          style={{ 
            marginTop: 24, padding: "12px 24px", background: T.navy, 
            color: "#FFF", border: "none", borderRadius: T.radius.md, cursor: "pointer", fontWeight: 700, fontSize: 14,
            boxShadow: T.shadow.sm, transition: T.transition,
          }}
        >
          Return to Secure Dashboard
        </button>
      </div>
    );
  }

  const issuedInvites = invitesQuery.data?.filter(i => i.status === 'SENT' || i.status === 'ISSUED').length || 0;

  return (
    <ManageAdminsPageShell>
      <SecurityWorkflowBanner 
        count={recoveryQuery.data?.length || 0} 
        onJumpToQueue={handleJumpToQueue}
      />
      <GovernanceSummaryStrip 
        activeAdminCount={activeQuery.data?.length || 0}
        issuedInviteCount={issuedInvites}
        pendingRecoveryCount={recoveryQuery.data?.length || 0}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: tokens.spacing.xxxl, alignItems: "start" }}>
        <InviteAdminComposer 
          recipientEmail={recipientEmail}
          onRecipientEmailChange={setRecipientEmail}
          onSubmit={handleInviteSubmit}
          submitting={inviteMutation.isPending}
          error={localError}
          resultProps={inviteResult}
          onDismissResult={() => setInviteResult(null)}
        />
        <TotpRecoveryQueueTable 
          items={recoveryQuery.data || []}
          onApprove={handleRecoveryApprove}
          onReject={handleRecoveryReject}
          isLoading={recoveryQuery.isLoading}
          onRefresh={() => recoveryQuery.refetch()}
          id="recovery-queue"
          error={recoveryQuery.error?.message}
        />
      </div>

      <ActiveAdminsTable 
        items={activeQuery.data || []}
        onDisableAdmin={handleDisableRequest}
        onRefresh={() => activeQuery.refetch()}
        isLoading={activeQuery.isLoading}
        error={activeQuery.error?.message}
      />

      <PendingAdminsTable 
        pendingAdmins={pendingQuery.data || []}
        onApprove={handleApproveRequest}
        onReject={handleRejectAdminRequest}
        onRefresh={() => pendingQuery.refetch()}
        isLoading={pendingQuery.isLoading}
        error={pendingQuery.error?.message}
      />

      <InvitationLedgerTable 
        items={invitesQuery.data?.filter(i => {
          const matchesSearch = i.recipient_identifier.toLowerCase().includes(inviteSearch.toLowerCase());
          const matchesStatus = inviteStatusFilter === "ALL" || i.status === inviteStatusFilter;
          return matchesSearch && matchesStatus;
        }) || []}
        searchValue={inviteSearch}
        onSearchChange={setInviteSearch}
        statusFilter={inviteStatusFilter}
        onStatusFilterChange={setInviteStatusFilter}
        onClearFilters={() => { setInviteSearch(""); setInviteStatusFilter("ALL"); }}
        onRevoke={handleRevokeRequest}
        onDelete={handleDeleteInviteRequest}
        onRefresh={() => invitesQuery.refetch()}
        isLoading={invitesQuery.isLoading}
        error={invitesQuery.error?.message}
      />

      <ConfirmActionDialog 
        {...actionDialog}
        onCancel={() => setActionDialog({ open: false })}
      />
    </ManageAdminsPageShell>
  );
}
