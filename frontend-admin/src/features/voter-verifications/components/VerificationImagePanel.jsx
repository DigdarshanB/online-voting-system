import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { T } from "../../../components/ui/tokens";
import { Maximize2, AlertCircle } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

function authHeaders() {
  const token = localStorage.getItem("access_token");
  return { Authorization: `Bearer ${token}` };
}

function ImageFrame({ title, userId, endpoint, alt }) {
  const [objectUrl, setObjectUrl] = useState(null);
  const [err, setErr] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const prevUrl = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setErr("");

    axios
      .get(`${API}/admin/voters/${userId}/${endpoint}`, {
        headers: authHeaders(),
        responseType: "blob",
      })
      .then(({ data }) => {
        if (cancelled) return;
        const url = URL.createObjectURL(data);
        prevUrl.current = url;
        setObjectUrl(url);
        setIsLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setErr(`Could not load ${title.toLowerCase()}`);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (prevUrl.current) URL.revokeObjectURL(prevUrl.current);
    };
  }, [userId, endpoint, title]);

  return (
    <div style={{ flex: "1 1 300px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ 
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "0 4px",
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: T.textSecondary }}>
          {title}
        </span>
        {objectUrl && (
            <button 
              onClick={() => window.open(objectUrl, "_blank")}
              style={{
                background: "transparent", border: "none", cursor: "pointer",
                color: T.accent, display: "flex", alignItems: "center",
                gap: 4, fontSize: 12, fontWeight: 600, transition: T.transition,
              }}
            >
              <Maximize2 size={12} /> View Full
            </button>
        )}
      </div>

      <div style={{
        aspectRatio: "4/3",
        background: T.surfaceAlt,
        borderRadius: T.radius.lg,
        border: `1px solid ${T.border}`,
        overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative"
      }}>
        {isLoading && (
          <div style={{ color: T.muted, fontSize: 12, fontWeight: 600 }}>Loading…</div>
        )}
        {err && (
          <div style={{ 
            display: "flex", flexDirection: "column", alignItems: "center", 
            gap: 8, color: T.error,
          }}>
            <AlertCircle size={24} />
            <span style={{ fontSize: 12 }}>{err}</span>
          </div>
        )}
        {objectUrl && !isLoading && (
          <img 
            src={objectUrl} 
            alt={alt} 
            style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} 
          />
        )}
      </div>
    </div>
  );
}

export default function VerificationImagePanel({ userId, hasDocument, hasFace }) {
  return (
    <div style={{
      display: "flex",
      gap: 24,
      flexWrap: "wrap",
      marginBottom: 24,
    }}>
      <ImageFrame title="Citizenship Document" userId={userId} endpoint="document" alt="Voter citizenship proof" />
      <ImageFrame title="Live Face Capture" userId={userId} endpoint="face" alt="Voter live face photo" />
    </div>
  );
}
