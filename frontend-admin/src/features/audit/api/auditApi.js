import apiClient from "../../../lib/apiClient";

/**
 * Fetch paginated, filtered audit logs.
 */
export async function fetchAuditLogs(params = {}) {
  const { data } = await apiClient.get("/admin/audit/logs", { params });
  return data;
}

/**
 * Fetch a single audit log entry by ID.
 */
export async function fetchAuditLogDetail(id) {
  const { data } = await apiClient.get(`/admin/audit/logs/${id}`);
  return data;
}

/**
 * Fetch aggregated audit summary / KPI data.
 */
export async function fetchAuditSummary(params = {}) {
  const { data } = await apiClient.get("/admin/audit/summary", { params });
  return data;
}

/**
 * Fetch audit logs for export (returns all matching up to 10k).
 */
export async function fetchAuditExport(params = {}) {
  const { data } = await apiClient.get("/admin/audit/export", { params });
  return data;
}
