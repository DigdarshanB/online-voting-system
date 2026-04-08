import { useCallback, useEffect, useState } from "react";
import { listParties } from "../api/candidatesApi";

export default function useParties() {
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listParties();
      setParties(data);
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to load parties");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { parties, loading, error, reload };
}
