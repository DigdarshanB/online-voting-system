/**
 * Tiny helper to pull a human-readable error from an axios error.
 *
 * FastAPI returns `{ detail: "..." }` or `{ detail: [...] }`.
 * This normalises both shapes to a single string.
 */

export function extractError(err, fallback = "Something went wrong.") {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length) {
    return detail.map((d) => d.msg ?? JSON.stringify(d)).join("; ");
  }
  return fallback;
}
