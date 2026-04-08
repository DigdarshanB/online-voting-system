import { useCallback, useEffect, useState } from "react";
import apiClient from "../../../lib/apiClient";

export default function useElectionsForResults() {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get("/admin/elections/");
      // Only show elections that could have results
      const relevant = res.data.filter((e) =>
        ["POLLING_CLOSED", "COUNTING", "FINALIZED", "ARCHIVED"].includes(e.status)
      );
      setElections(relevant);
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
