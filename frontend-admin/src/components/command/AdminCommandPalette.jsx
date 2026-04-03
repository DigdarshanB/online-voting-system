import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminCommandPalette({ open, onClose, items }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const filteredItems = useMemo(() => {
    const source = Array.isArray(items) ? items : [];
    const term = query.trim().toLowerCase();

    if (!term) {
      return source;
    }

    return source.filter((item) => {
      const label = String(item?.label || "").toLowerCase();
      const description = String(item?.description || "").toLowerCase();
      return label.includes(term) || description.includes(term);
    });
  }, [items, query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setHighlightedIndex(0);
      return;
    }

    setHighlightedIndex(0);
  }, [open, query]);

  useEffect(() => {
    if (highlightedIndex > filteredItems.length - 1) {
      setHighlightedIndex(0);
    }
  }, [filteredItems, highlightedIndex]);

  if (!open) {
    return null;
  }

  const handleSelect = (item) => {
    if (!item) {
      return;
    }

    const target = item.to || item.path || item.href;
    if (typeof target === "string" && target.length > 0) {
      navigate(target);
      if (typeof onClose === "function") {
        onClose();
      }
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      if (typeof onClose === "function") {
        onClose();
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (filteredItems.length === 0) {
        return;
      }
      setHighlightedIndex((prev) => (prev + 1) % filteredItems.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (filteredItems.length === 0) {
        return;
      }
      setHighlightedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      handleSelect(filteredItems[highlightedIndex]);
    }
  };

  return (
    <div
      onKeyDown={handleKeyDown}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(15, 23, 42, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={() => {
          if (typeof onClose === "function") {
            onClose();
          }
        }}
        style={{ position: "absolute", inset: 0 }}
      />

      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 680,
          maxHeight: "80vh",
          overflow: "hidden",
          borderRadius: 14,
          border: "1px solid #CBD5E1",
          background: "#FFFFFF",
          boxShadow: "0 24px 48px rgba(15, 23, 42, 0.2)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: 12, borderBottom: "1px solid #E2E8F0" }}>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search commands..."
            style={{
              width: "100%",
              height: 40,
              borderRadius: 10,
              border: "1px solid #CBD5E1",
              padding: "0 12px",
              fontSize: 14,
              color: "#0F172A",
              outline: "none",
            }}
          />
        </div>

        <div role="listbox" style={{ overflowY: "auto", padding: 8 }}>
          {filteredItems.length === 0 ? (
            <div style={{ padding: 12, fontSize: 13, color: "#64748B" }}>No matching commands</div>
          ) : (
            filteredItems.map((item, index) => {
              const isActive = index === highlightedIndex;

              return (
                <button
                  key={`${item.label}-${index}`}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => handleSelect(item)}
                  style={{
                    width: "100%",
                    border: "none",
                    textAlign: "left",
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: isActive ? "#EAF1FF" : "transparent",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{item.label}</span>
                  <span style={{ fontSize: 12, color: "#64748B" }}>{item.description}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
