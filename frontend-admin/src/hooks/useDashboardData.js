/**
 * useDashboardData — unified data hook for the admin dashboard.
 * Fetches summary, scheduled elections, and system status in parallel.
 */
import { useCallback, useEffect, useState } from "react";
import apiClient from "../lib/apiClient";

export default function useDashboardData() {
  const [summary, setSummary] = useState(null);
  const [scheduledElections, setScheduledElections] = useState([]);
  const [systemStatus, setSystemStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [summaryRes, electionsRes, statusRes] = await Promise.all([
        apiClient.get("/admin/dashboard/summary"),
        apiClient.get("/admin/dashboard/scheduled-elections"),
        apiClient.get("/admin/dashboard/system-status"),
      ]);

      setSummary(summaryRes.data);
      setScheduledElections(electionsRes.data?.items ?? []);
      setSystemStatus(statusRes.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    summary,
    scheduledElections,
    systemStatus,
    loading,
    error,
    reload,
  };
}
