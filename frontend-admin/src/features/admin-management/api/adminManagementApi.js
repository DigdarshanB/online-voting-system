import apiClient from '../../../lib/apiClient';

/**
 * A collection of API calls for managing administrators.
 * These functions provide a sanitized interface to the backend endpoints,
 * handling request creation and basic error shaping.
 */

/**
 * Fetches the current admin's user profile and role.
 * @returns {Promise<Object>} A promise that resolves to the user object.
 */
export const getMe = async () => {
  try {
    const response = await apiClient.get('/auth/me');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch current user:', error);
    throw new Error('Could not authenticate user.');
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
    console.error('Failed to fetch invited admins:', error);
    throw new Error('Failed to load invites.');
  }
};
/**
 * Fetches a list of users who have registered and are awaiting admin approval.
 * @returns {Promise<Array>} A promise that resolves to an array of pending user objects.
 */
export const getPendingAdmins = async () => {
  try {
    const response = await apiClient.get('/admin/verifications/pending');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch pending admins:', error);
    const message = error.response?.data?.detail || 'Failed to load pending admins.';
    throw new Error(message);
  }
};

/**
 * Fetches a list of active administrators.
 * @returns {Promise<Array>} A promise that resolves to an array of active admin objects.
 */
export const getActiveAdmins = async () => {
  try {
    const response = await apiClient.get('/admin/users');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch active admins:', error);
    const message = error.response?.data?.detail || 'Failed to load active admins.';
    throw new Error(message);
  }
};

/**
 * Fetches a list of TOTP recovery requests from users.
 * @returns {Promise<Array>} A promise that resolves to an array of TOTP recovery request objects.
 */
export const getTotpRecoveryRequests = async () => {
  try {
    const response = await apiClient.get('/admin/verifications/totp-recovery-requests');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch TOTP recovery requests:', error);
    const message = error.response?.data?.detail || 'Failed to load TOTP recovery queue.';
    throw new Error(message);
  }
};

/**
 * Creates a new admin invitation.
 * @param {string} email - The email address to invite.
 * @returns {Promise<Object>} A promise that resolves to the created invite object.
 */
export const createAdminInvite = async (email) => {
  try {
    const response = await apiClient.post('/admin/invites', {
      recipient_identifier: email,
    });
    return response.data;
  } catch (error) {
    console.error('Failed to create admin invite:', error);
    const message = error.response?.data?.detail || 'Failed to create invite.';
    throw new Error(message);
  }
};

/**
 * Revokes an admin invitation.
 * @param {string} inviteId - The ID of the invitation to revoke.
 * @returns {Promise<Object>} A promise that resolves to the confirmation response.
 */
export const revokeAdminInvite = async (inviteId) => {
  try {
    const response = await apiClient.post(`/admin/invites/${inviteId}/revoke`);
    return response.data;
  } catch (error) {
    console.error('Failed to revoke admin invite:', error);
    const message = error.response?.data?.detail || 'Failed to revoke invite.';
    throw new Error(message);
  }
};

/**
 * Deletes an admin invitation.
 * @param {string} inviteId - The ID of the invitation to delete.
 * @returns {Promise<Object>} A promise that resolves to the confirmation response.
 */
export const deleteAdminInvite = async (inviteId) => {
  try {
    const response = await apiClient.delete(`/admin/invites/${inviteId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to delete admin invite:', error);
    const message = error.response?.data?.detail || 'Failed to delete invite.';
    throw new Error(message);
  }
};

/**
 * Approves a pending admin's request.
 * @param {string} userId - The ID of the user to approve.
 * @returns {Promise<Object>} A promise that resolves to the confirmation response.
 */
export const approvePendingAdmin = async (userId) => {
  try {
    const response = await apiClient.post(`/admin/verifications/${userId}/approve`);
    return response.data;
  } catch (error) {
    console.error('Failed to approve pending admin:', error);
    const message = error.response?.data?.detail || 'Approve failed: unknown error';
    throw new Error(message);
  }
};

/**
 * Rejects a pending admin's request.
 * @param {string} userId - The ID of the user to reject.
 * @param {string} reason - The reason for rejection.
 * @returns {Promise<Object>} A promise that resolves to the confirmation response.
 */
export const rejectPendingAdmin = async (userId, reason) => {
  try {
    const response = await apiClient.post(`/admin/verifications/${userId}/reject`, { reason });
    return response.data;
  } catch (error) {
    console.error('Failed to reject pending admin:', error);
    const message = error.response?.data?.detail || 'Reject failed: unknown error';
    throw new Error(message);
  }
};

/**
 * Deletes a pending admin request.
 * @param {string} userId - The ID of the user request to delete.
 * @returns {Promise<Object>} A promise that resolves to the confirmation response.
 */
export const deletePendingAdmin = async (userId) => {
  try {
    const response = await apiClient.delete(`/admin/verifications/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to delete pending admin:', error);
    const message = error.response?.data?.detail || 'Delete failed: unknown error';
    throw new Error(message);
  }
};

/**
 * Deletes/disables an active admin.
 * @param {string} userId - The ID of the admin to delete.
 * @returns {Promise<Object>} A promise that resolves to the confirmation response.
 */
export const deleteActiveAdmin = async (userId) => {
  try {
    const response = await apiClient.delete(`/admin/verifications/active-admins/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to delete active admin:', error);
    const message = error.response?.data?.detail || 'Disable failed: unknown error';
    throw new Error(message);
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
    console.error('Failed to approve TOTP recovery:', error);
    const message = error.response?.data?.detail || 'Approve failed: unknown error';
    throw new Error(message);
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
    console.error('Failed to reject TOTP recovery:', error);
    const message = error.response?.data?.detail || 'Reject failed: unknown error';
    throw new Error(message);
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
    console.error('Failed to reset admin TOTP:', error);
    const message = error.response?.data?.detail || 'Reset failed: unknown error';
    throw new Error(message);
  }
};