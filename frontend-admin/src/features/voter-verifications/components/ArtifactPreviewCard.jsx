import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { T } from "../../../components/ui/tokens";
import { Maximize2, AlertCircle, RefreshCw } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

function SkeletonBar({ height, width = "100%" }) {
  return (
    <div style={{
      height,
      width,
      borderRadius: T.radius.md,
      background: `linear-gradient(90deg, ${T.surfaceAlt} 25%, ${T.borderLight} 50%, ${T.surfaceAlt} 75%)`,
      backgroundSize: "400px 100%",
      animation: "artifact-shimmer 1.4s ease infinite",
    }} />
  );
}

export default function ArtifactPreviewCard({ title, subtitle, userId, endpoint, alt }) {
  const [objectUrl, setObjectUrl] = useState(null);
  const [err, setErr] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const prevUrl = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setErr("");

    const token = localStorage.getItem("access_token");
    axios
      .get(`${API}/admin/voters/${userId}/${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      })
      .then(({ data }) => {
        if (cancelled) return;
        if (prevUrl.current) URL.revokeObjectURL(prevUrl.current);
        const url = URL.createObjectURL(data);
        prevUrl.current = url;
        setObjectUrl(url);
        setIsLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setErr(`Unable to load ${title.toLowerCase()}`);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (prevUrl.current) URL.revokeObjectURL(prevUrl.current);
    };
    // retryCount is intentionally included to trigger reload on retry
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, endpoint, retryCount]);

  return (
    <>
      <style>{`
        @keyframes artifact-shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
      `}</style>

      <div style={{
        flex: "1 1 260px",
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: T.radius.lg,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: T.shadow.sm,
      }}>
        {/* Card header */}
        <div style={{
          padding: "10px 14px",
          borderBottom: `1px solid ${T.borderLight}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: T.surfaceAlt,
          minHeight: 44,
        }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.text, lineHeight: 1.3 }}>{title}</div>
            {subtitle && (
              <div style={{ fontSize: 10.5, color: T.muted, marginTop: 1, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {subtitle}
              </div>
            )}
          </div>
          {objectUrl && (
            <button
              onClick={() => window.open(objectUrl, "_blank")}
              title="View full size"
              style={{
                background: "transparent", border: "none", cursor: "pointer",
                color: T.accent, padding: "4px 6px", borderRadius: T.radius.sm,
                display: "flex", alignItems: "center", transition: T.transitionFast,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = T.accentLight; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
            >
              <Maximize2 size={14} />
            </button>
          )}
        </div>

        {/* Image frame — fixed height for alignment */}
        <div style={{
          height: 230,
          background: T.surfaceAlt,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          position: "relative",
        }}>
          {isLoading && (
            <div style={{ width: "100%", padding: "20px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
              <SkeletonBar height={130} />
              <SkeletonBar height={12} width="60%" />
              <SkeletonBar height={10} width="40%" />
            </div>
          )}

          {!isLoading && err && (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: 10, color: T.error, padding: 24, textAlign: "center",
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: "50%",
                background: T.errorBg,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <AlertCircle size={22} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.error }}>{err}</span>
              <button
                onClick={() => setRetryCount(c => c + 1)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 14px", borderRadius: T.radius.md,
                  border: `1px solid ${T.border}`, background: T.surface,
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                  color: T.textSecondary, transition: T.transitionFast,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = T.surfaceAlt; }}
                onMouseLeave={e => { e.currentTarget.style.background = T.surface; }}
              >
                <RefreshCw size={12} /> Retry
              </button>
            </div>
          )}

          {!isLoading && objectUrl && (
            <img
              src={objectUrl}
              alt={alt}
              style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
            />
          )}
        </div>
      </div>
    </>
  );
}
