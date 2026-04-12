import { useCallback, useEffect, useState } from "react";
import { listProfiles } from "../api/candidatesApi";

export default function useCandidateProfiles({ partyId, governmentLevel } = {}) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listProfiles({ partyId, governmentLevel });
      setProfiles(data);
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to load candidates");
    } finally {
      setLoading(false);
    }
  }, [partyId, governmentLevel]);

  useEffect(() => { reload(); }, [reload]);

  return { profiles, loading, error, reload };
}
