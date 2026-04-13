/**
 * Build an absolute URL for a backend-stored media path.
 *
 * The DB stores relative paths such as "uploads/candidate_photos/5/photo.jpg".
 * The backend mounts /uploads → backend/uploads/, so the correct browser URL
 * is <API_BASE>/<relative_path>.
 *
 * @param {string|null|undefined} path  Relative path from DB (e.g. photo_path, symbol_path)
 * @returns {string|null}  Full URL or null when no path is provided
 */
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function mediaUrl(path) {
  if (!path) return null;
  return `${API_BASE}/${path}`;
}
