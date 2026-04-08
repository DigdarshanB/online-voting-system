import { useCallback, useEffect, useState } from "react";
import apiClient from "../../lib/apiClient";

export default function useElections() {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get("/admin/elections/");
      setElections(res.data);
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to load elections");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { elections, loading, error, reload };
}
