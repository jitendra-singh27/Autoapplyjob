const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

export function getToken() { return localStorage.getItem('applypilot_token'); }
export function setSession(token, user) {
  localStorage.setItem('applypilot_token', token);
  localStorage.setItem('applypilot_user', JSON.stringify(user));
}
export function clearSession() {
  localStorage.removeItem('applypilot_token');
  localStorage.removeItem('applypilot_user');
}
export async function api(path, options = {}) {
  const headers = { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) clearSession();
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}
