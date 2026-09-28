/**
 * Canonical API base URL for server-side fetch calls (RSC / server components).
 * Set NEXT_PUBLIC_API_URL in your environment — falls back to localhost for dev.
 *
 * Client-side code (hooks, event handlers) should import axiosInstance from
 * "@/api/axiosInstance" instead, which reads the same env var automatically.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
