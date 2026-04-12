import { useQuery } from "@tanstack/react-query";
import { fetchAuditLogs, fetchAuditLogDetail, fetchAuditSummary } from "../api/auditApi";

/**
 * Hook for paginated, filtered audit log list.
 * @param {object} params - { page, page_size, sort_by, sort_dir, search, date_from, date_to, action, category, outcome, actor_id, target_id, ip_address, high_risk_only }
 */
export function useAuditLogs(params) {
  return useQuery({
    queryKey: ["audit-logs", params],
    queryFn: () => fetchAuditLogs(params),
    keepPreviousData: true,
  });
}

/**
 * Hook for a single audit log detail.
 */
export function useAuditLogDetail(id) {
  return useQuery({
    queryKey: ["audit-log-detail", id],
    queryFn: () => fetchAuditLogDetail(id),
    enabled: !!id,
  });
}

/**
 * Hook for audit summary KPIs.
 */
export function useAuditSummary(params) {
  return useQuery({
    queryKey: ["audit-summary", params],
    queryFn: () => fetchAuditSummary(params),
  });
}
