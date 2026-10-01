/**
 * Canonical API base URL for server-side fetch calls (RSC / server components).
 *
 * On Vercel, the `BACKEND_SERVICE_URL` binding is injected at runtime and
 * resolves to the backend service's internal URL. We append `/api` because
 * the Express app mounts all routes under that prefix.
 *
 * Falls back to `NEXT_PUBLIC_API_URL` (useful for local dev without bindings)
 * and finally to localhost.
 *
 * Client-side code (hooks, event handlers) should import axiosInstance from
 * "@/api/axiosInstance" instead — it uses a relative `/api` path that routes
 * through the public rewrite.
 */
export const API_BASE_URL =
  (process.env.BACKEND_SERVICE_URL
    ? `${process.env.BACKEND_SERVICE_URL}/api`
    : undefined) ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:5000/api';
