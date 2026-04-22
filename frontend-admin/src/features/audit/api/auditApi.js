import apiClient from "../../../lib/apiClient";

export async function fetchAuditLogs(params = {}) {
  const { data } = await apiClient.get("/admin/audit/logs", { params });
  return data;
}

export async function fetchAuditLogDetail(id) {
  const { data } = await apiClient.get(`/admin/audit/logs/${id}`);
  return data;
}

export async function fetchAuditSummary(params = {}) {
  const { data } = await apiClient.get("/admin/audit/summary", { params });
  return data;
}

// Pulls all matching rows up to the backend cap (~10k) for CSV/JSON export.
export async function fetchAuditExport(params = {}) {
  const { data } = await apiClient.get("/admin/audit/export", { params });
  return data;
}
