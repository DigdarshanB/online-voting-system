import apiClient from '../../../lib/apiClient';

/**
 * A collection of API calls for managing administrators.
 * These functions provide a sanitized interface to the backend endpoints,
 * handling request creation and consistent error shaping.
 */

const handleError = (error, defaultMessage) => {
  console.error(defaultMessage, error.response || error);
  const message = error.response?.data?.detail || defaultMessage;
  throw new Error(message);
};

/**
 * Fetches the current admin's user profile and role.
 * @returns {Promise<Object>} A promise that resolves to the user object.
 */
export const getMe = async () => {
  try {
    const response = await apiClient.get('/auth/me');
    return response.data;
  } catch (error) {
    handleError(error, 'Could not authenticate user.');
  }
};

/**
 * Fetches a list of all created admin invitations.
 * @returns {Promise<Array>} A promise that resolves to an array of invite objects.
 */
export const getInvitedAdmins = async () => {
  try {
    const response = await apiClient.get('/admin/invites');
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to load invites.');
  }
};

/**
 * Fetches a list of users who have registered and are awaiting admin approval.
 * @returns {Promise<Array>} A promise that resolves to an array of pending user objects.
 */
export const getPendingAdmins = async () => {
  try {
    const response = await apiClient.get('/admin/verifications/pending-admins');
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to load pending admins.');
  }
};

/**
 * Fetches a list of active administrators.
 * @returns {Promise<Array>} A promise that resolves to an array of active admin objects.
 */
export const getActiveAdmins = async () => {
  try {
    const response = await apiClient.get('/admin/verifications/active-admins');
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to load active admins.');
  }
};

/**
 * Fetches a list of TOTP recovery requests from admin users.
 * @returns {Promise<Array>} A promise that resolves to an array of recovery request objects.
 */
export const getTotpRecoveryRequests = async () => {
  try {
    const response = await apiClient.get('/admin/verifications/recovery/pending');
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

/**
 * Creates a new admin invitation.
 * @param {string} email - The email address of the candidate.
 * @returns {Promise<Object>} A promise that resolves to the structured response from the backend.
 */
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

/**
 * Revokes an admin invitation.
 * @param {object} payload - The payload for the revocation.
 * @param {string} payload.inviteId - The ID of the invitation to revoke.
 * @param {string} payload.reason - The reason for the revocation, for audit purposes.
 * @returns {Promise<Object>} A promise that resolves to the structured confirmation response.
 */
export const revokeAdminInvite = async ({ inviteId, reason }) => {
  try {
    const response = await apiClient.post(`/admin/invites/${inviteId}/revoke`, { reason });
    return response.data;
  } catch (error) {
    handleError(error, 'The revocation failed unexpectedly.');
  }
};

/**
 * Deletes an admin invitation record from the ledger.
 * This is a cleanup action for terminal-state invites (e.g., EXPIRED, REVOKED).
 * @param {string} inviteId - The ID of the invitation record to delete.
 * @returns {Promise<Object>} A promise that resolves to the structured confirmation response.
 */
export const deleteAdminInvite = async (inviteId) => {
  try {
    const response = await apiClient.delete(`/admin/invites/${inviteId}`);
    return response.data;
  } catch (error) {
    handleError(error, 'Removing the ledger record failed unexpectedly.');
  }
};

/**
 * Approves a pending admin's enrollment request.
 * @param {string} userId - The ID of the user to approve.
 * @returns {Promise<Object>} A promise that resolves to a success object with a message.
 */
export const approvePendingAdmin = async (userId) => {
  try {
    const response = await apiClient.post(`/admin/verifications/${userId}/approve`);
    return response.data;
  } catch (error) {
    handleError(error, 'Approval failed due to an unexpected error.');
  }
};

/**
 * Rejects a pending admin's enrollment request.
 * @param {string} userId - The ID of the user to reject.
 * @param {string} reason - The reason for rejection.
 * @returns {Promise<Object>} A promise that resolves to a success object with a message.
 */
export const rejectPendingAdmin = async (userId, reason) => {
  try {
    const response = await apiClient.post(`/admin/verifications/${userId}/reject`, { reason });
    return response.data;
  } catch (error) {
    handleError(error, 'Rejection failed due to an unexpected error.');
  }
};

/**
 * Removes a pending admin record from the queue.
 * This is a cleanup action, not a formal rejection.
 * @param {string} userId - The ID of the user record to remove.
 * @returns {Promise<Object>} A promise that resolves to a success object with a message.
 */
export const deletePendingAdmin = async (userId) => {
  try {
    const response = await apiClient.delete(`/admin/verifications/${userId}/remove-record`);
    return response.data;
  } catch (error) {
    handleError(error, 'Removing the record failed unexpectedly.');
  }
};

/**
 * Disables an active admin's account.
 * This is a governance action, not a destructive delete.
 * @param {string} userId - The ID of the admin to disable.
 * @param {string} reason - The reason for disabling the account.
 * @returns {Promise<Object>} A promise that resolves to the confirmation response.
 */
export const disableActiveAdmin = async (userId, reason) => {
  try {
    const response = await apiClient.post(`/admin/verifications/active-admins/${userId}/disable-access`, { reason });
    return response.data;
  } catch (error) {
    handleError(error, 'Disabling the admin failed unexpectedly.');
  }
};

/**
 * Approves a TOTP recovery request.
 * @param {string} requestId - The ID of the recovery request to approve.
 * @returns {Promise<Object>} A promise that resolves to the confirmation response.
 */
export const approveTotpRecovery = async (requestId) => {
  try {
    const response = await apiClient.post(`/admin/verifications/recovery/${requestId}/approve`);
    return response.data;
  } catch (error) {
    handleError(error, 'Approval failed due to an unexpected error.');
  }
};

/**
 * Rejects a TOTP recovery request.
 * @param {string} requestId - The ID of the recovery request to reject.
 * @param {string} reason - The reason for rejection.
 * @returns {Promise<Object>} A promise that resolves to the confirmation response.
 */
export const rejectTotpRecovery = async (requestId, reason) => {
  try {
    const response = await apiClient.post(`/admin/verifications/recovery/${requestId}/reject`, { reason });
    return response.data;
  } catch (error) {
    handleError(error, 'Rejection failed due to an unexpected error.');
  }
};

/**
 * Direct reset of an admin's TOTP (e.g. from the active admins list).
 * @param {number} userId - The ID of the admin to reset.
 * @returns {Promise<Object>} A promise that resolves to the confirmation response.
 */
export const resetAdminTotp = async (userId) => {
  try {
    const response = await apiClient.post(`/admin/verifications/recovery/${userId}/reset-totp`);
    return response.data;
  } catch (error) {
    handleError(error, 'Resetting the admin TOTP failed unexpectedly.');
  }
};
