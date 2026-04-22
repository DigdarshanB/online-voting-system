import { useQuery } from "@tanstack/react-query";
import { fetchAuditLogs, fetchAuditLogDetail, fetchAuditSummary } from "../api/auditApi";

export function useAuditLogs(params) {
  return useQuery({
    queryKey: ["audit-logs", params],
    queryFn: () => fetchAuditLogs(params),
    keepPreviousData: true,
  });
}

export function useAuditLogDetail(id) {
  return useQuery({
    queryKey: ["audit-log-detail", id],
    queryFn: () => fetchAuditLogDetail(id),
    enabled: !!id,
  });
}

export function useAuditSummary(params) {
  return useQuery({
    queryKey: ["audit-summary", params],
    queryFn: () => fetchAuditSummary(params),
  });
}
