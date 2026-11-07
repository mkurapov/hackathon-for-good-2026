// Thin client for the Ground Truth API (backend/openapi.yaml). Only the background script uses it.
import { API_BASE } from '../config.js';

export class ApiError extends Error {
  constructor(status, detail) {
    super(detail || `Request failed (${status})`);
    this.status = status;
  }
}

export async function api(path, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(API_BASE + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    throw new ApiError(0, 'Cannot reach ACAPS. Check your connection.');
  }
  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // FastAPI sends a string, or a list of validation errors.
    const detail = Array.isArray(data?.detail) ? data.detail.map(d => d.msg).join('; ') : data?.detail;
    throw new ApiError(res.status, detail);
  }
  return data;
}
