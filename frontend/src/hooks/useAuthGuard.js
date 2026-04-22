// Auth guard for protected pages. Looks up the stored token, calls
// /auth/me, and clears + bounces to / if anything fails.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, clearToken } from "../lib/authStorage";
import { fetchMe } from "../features/auth/api/authApi";

export default function useAuthGuard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      navigate("/", { replace: true });
      return;
    }

    fetchMe()
      .then((data) => {
        setUser(data);
        setLoading(false);
      })
      .catch(() => {
        clearToken();
        navigate("/", { replace: true });
      });
  }, [navigate]);

  return { loading, user };
}
