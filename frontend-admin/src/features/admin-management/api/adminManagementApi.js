import apiClient from '../../../lib/apiClient';

const handleError = (error, defaultMessage) => {
  console.error(defaultMessage, error.response || error);
  const message = error.response?.data?.detail || defaultMessage;
  throw new Error(message);
};

export const getMe = async () => {
  try {
    const response = await apiClient.get('/auth/me');
    return response.data;
  } catch (error) {
    handleError(error, 'Could not authenticate user.');
  }
};

export const getInvitedAdmins = async () => {
  try {
    const response = await apiClient.get('/admin/invites');
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to load invites.');
  }
};

export const getPendingAdmins = async () => {
  try {
    const response = await apiClient.get('/admin/verifications/pending-admins');
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to load pending admins.');
  }
};

export const getActiveAdmins = async () => {
  try {
    const response = await apiClient.get('/admin/verifications/active-admins');
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to load active admins.');
  }
};

export const getTotpRecoveryRequests = async () => {
  try {
    const response = await apiClient.get('/admin/verifications/recovery/pending');
    // Reshape backend payload into the field names the UI expects.
    return response.data.map(item => ({
      id: item.request_id,
      userId: item.user_id,
      name: item.full_name,
      email: item.email,
      status: item.status,
      createdAt: item.requested_at,
      requestedIp: item.requested_ip,
    }));
  } catch (error) {
    handleError(error, 'Failed to load the MFA recovery queue.');
  }
};

export const createAdminInvite = async (email) => {
  try {
    const response = await apiClient.post('/admin/invites', {
      recipient_identifier: email,
    });
    return response.data;
  } catch (error) {
    handleError(error, 'An unexpected error occurred while creating the invitation.');
  }
};

export const revokeAdminInvite = async ({ inviteId, reason }) => {
  try {
    const response = await apiClient.post(`/admin/invites/${inviteId}/revoke`, { reason });
    return response.data;
  } catch (error) {
    handleError(error, 'The revocation failed unexpectedly.');
  }
};

// Hard-delete for terminal-state invites only (EXPIRED, REVOKED).
export const deleteAdminInvite = async (inviteId) => {
  try {
    const response = await apiClient.delete(`/admin/invites/${inviteId}`);
    return response.data;
  } catch (error) {
    handleError(error, 'Removing the ledger record failed unexpectedly.');
  }
};

export const approvePendingAdmin = async (userId) => {
  try {
    const response = await apiClient.post(`/admin/verifications/${userId}/approve`);
    return response.data;
  } catch (error) {
    handleError(error, 'Approval failed due to an unexpected error.');
  }
};

export const rejectPendingAdmin = async (userId, reason) => {
  try {
    const response = await apiClient.post(`/admin/verifications/${userId}/reject`, { reason });
    return response.data;
  } catch (error) {
    handleError(error, 'Rejection failed due to an unexpected error.');
  }
};

// Drops the queue record without issuing a formal rejection.
export const deletePendingAdmin = async (userId) => {
  try {
    const response = await apiClient.delete(`/admin/verifications/${userId}/remove-record`);
    return response.data;
  } catch (error) {
    handleError(error, 'Removing the record failed unexpectedly.');
  }
};

// Disable, not delete — preserves the audit trail.
export const disableActiveAdmin = async (userId, reason) => {
  try {
    const response = await apiClient.post(`/admin/verifications/active-admins/${userId}/disable-access`, { reason });
    return response.data;
  } catch (error) {
    handleError(error, 'Disabling the admin failed unexpectedly.');
  }
};

export const approveTotpRecovery = async (requestId) => {
  try {
    const response = await apiClient.post(`/admin/verifications/recovery/${requestId}/approve`);
    return response.data;
  } catch (error) {
    handleError(error, 'Approval failed due to an unexpected error.');
  }
};

export const rejectTotpRecovery = async (requestId, reason) => {
  try {
    const response = await apiClient.post(`/admin/verifications/recovery/${requestId}/reject`, { reason });
    return response.data;
  } catch (error) {
    handleError(error, 'Rejection failed due to an unexpected error.');
  }
};

// Bypasses the recovery queue — used from the active-admins list.
export const resetAdminTotp = async (userId) => {
  try {
    const response = await apiClient.post(`/admin/verifications/recovery/${userId}/reset-totp`);
    return response.data;
  } catch (error) {
    handleError(error, 'Resetting the admin TOTP failed unexpectedly.');
  }
};
