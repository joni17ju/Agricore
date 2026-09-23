/**
 * HTTP client for the AgriCore API.
 *
 * The only module in the frontend that knows the API exists. Services call
 * api.get/post/patch/del; pages and components never touch this.
 *
 * Errors are thrown as ServiceError so callers handle an HTTP failure exactly
 * as they handled a mock failure — same shape, same `status`, same message.
 */
import { ServiceError } from './serviceError.js';

const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api').replace(/\/$/, '');

/*
 * The token is kept in localStorage rather than only in memory.
 *
 * In memory alone, every page refresh would sign the user out — the prototype
 * has always kept you signed in across a refresh, and losing that would be a
 * visible behaviour change. The trade-off is that a cross-site scripting bug
 * could read the token; the main untrusted content this app renders is lesson
 * HTML, which already goes through the SafeHtml sanitiser's tag and attribute
 * allow-list before it reaches the DOM.
 */
const TOKEN_KEY = 'agricore.token';

let memoryToken = null;

export function getToken() {
  if (memoryToken) return memoryToken;
  try {
    memoryToken = window.localStorage.getItem(TOKEN_KEY);
  } catch {
    memoryToken = null;
  }
  return memoryToken;
}

export function setToken(token) {
  memoryToken = token ?? null;
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Private browsing or blocked storage: the in-memory copy still works
    // for this tab, the session just will not survive a refresh.
  }
}

async function call(path, { method = 'GET', body } = {}) {
  const token = getToken();
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ServiceError('Cannot reach the server. Check your connection and try again.', 0);
  }

  if (response.status === 204) return null;

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    /*
     * Discard the token only when the session itself is no longer valid, which
     * the server marks with code "invalid_session". A 401 can also mean a route
     * rejected supplied credentials — mistyping your current password on the
     * change-password form, for instance — and signing the user out for that
     * would be both confusing and wrong.
     */
    if (response.status === 401 && data?.code === 'invalid_session') setToken(null);
    const message = (data && typeof data === 'object' && data.message) || 'Something went wrong.';
    throw new ServiceError(message, response.status);
  }

  return data;
}

const query = (params = {}) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const string = search.toString();
  return string ? `?${string}` : '';
};

export const api = {
  get: (path, params) => call(`${path}${query(params)}`),
  post: (path, body) => call(path, { method: 'POST', body }),
  patch: (path, body) => call(path, { method: 'PATCH', body }),
  del: (path) => call(path, { method: 'DELETE' }),
};
