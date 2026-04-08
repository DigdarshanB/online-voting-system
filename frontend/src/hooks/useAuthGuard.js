/**
 * Shared auth-guard hook used by protected pages.
 *
 * On mount it checks for a stored token, calls GET /auth/me,
 * and returns { loading, user }.
 *
 * If there is no token or the request fails the visitor is
 * redirected to "/" and the token is cleared.
 */

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
