// Base origin of the API/Socket.io server, e.g. "https://royalgaming-api.up.railway.app".
// Empty in local dev, where Vite's dev-server proxy forwards /api, /socket.io,
// and /uploads to localhost:4000 (see vite.config.ts) — relative URLs work as-is.
// In production (client and server on different origins), set VITE_API_URL at
// build time so the client talks to the deployed server directly.
export const API_BASE_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

/** Resolves a server-relative path (e.g. a product's imageUrl) to an absolute URL. */
export function resolveAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${API_BASE_URL}${path}`;
}
