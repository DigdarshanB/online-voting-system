import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { tokens } from "./tokens";
import { Maximize2, AlertCircle } from "lucide-react";

const API = "http://localhost:8000";

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
    <div style={{ flex: "1 1 300px", display: "flex", flexDirection: "column", gap: tokens.spacing.sm }}>
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        padding: `0 ${tokens.spacing.xs}`
      }}>
        <span style={{ fontSize: tokens.fontSizes.sm, fontWeight: 600, color: tokens.text.secondary }}>
          {title}
        </span>
        {objectUrl && (
            <button 
              onClick={() => window.open(objectUrl, "_blank")}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: tokens.colors.accent,
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: tokens.fontSizes.xs,
                fontWeight: 500
              }}
            >
              <Maximize2 size={12} /> View Full
            </button>
        )}
      </div>

      <div style={{
        aspectRatio: "4/3",
        background: tokens.pageBackground,
        borderRadius: tokens.borderRadius.medium,
        border: `1px solid ${tokens.colors.border}`,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative"
      }}>
        {isLoading && (
          <div style={{ color: tokens.text.muted, fontSize: tokens.fontSizes.xs }}>Loading...</div>
        )}
        {err && (
          <div style={{ 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center", 
            gap: 8,
            color: tokens.colors.danger
          }}>
            <AlertCircle size={24} />
            <span style={{ fontSize: tokens.fontSizes.xs }}>{err}</span>
          </div>
        )}
        {objectUrl && !isLoading && (
          <img 
            src={objectUrl} 
            alt={alt} 
            style={{ 
              width: "100%", 
              height: "100%", 
              objectFit: "contain",
              display: "block"
            }} 
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
      gap: tokens.spacing.xl,
      flexWrap: "wrap",
      marginBottom: tokens.spacing.xl
    }}>
      <ImageFrame 
        title="Citizenship Document" 
        userId={userId} 
        endpoint="document" 
        alt="Voter citizenship proof" 
      />
      <ImageFrame 
        title="Live Face Capture" 
        userId={userId} 
        endpoint="face" 
        alt="Voter live face photo" 
      />
    </div>
  );
}
