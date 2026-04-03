import { useCallback, useEffect, useState } from "react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function useDashboardAnalytics(range = "6m") {
  const [statusDistribution, setStatusDistribution] = useState({ items: [], total: 0 });
  const [registrationActivity, setRegistrationActivity] = useState({ range, items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("access_token");
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [statusResponse, registrationResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/admin/dashboard/analytics/status-distribution`, { headers }),
        axios.get(`${API_BASE_URL}/admin/dashboard/analytics/registration-activity?range=${encodeURIComponent(range)}`, { headers }),
      ]);

      setStatusDistribution(statusResponse?.data ?? { items: [], total: 0 });
      setRegistrationActivity(
        registrationResponse?.data ?? { range, items: [], total: 0 }
      );
    } catch (err) {
      setError(err);
      setStatusDistribution({ items: [], total: 0 });
      setRegistrationActivity({ range, items: [], total: 0 });
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    statusDistribution,
    registrationActivity,
    loading,
    error,
    reload,
  };
}
