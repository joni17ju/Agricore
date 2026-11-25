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

/*
 * Server status, for the "Waking up the server…" notice.
 *
 * The API runs on a free host that sleeps when idle and takes up to a minute
 * to wake. A request that is still pending after SLOW_AFTER_MS, or one being
 * retried, marks the server as waking; the notice listens through
 * subscribeServerStatus() and disappears once every request has settled.
 */
const SLOW_AFTER_MS = 2500;
let slowRequests = 0;
let retrying = 0;
const statusListeners = new Set();

function serverStatus() {
  return slowRequests > 0 || retrying > 0 ? 'waking' : 'ok';
}

function emitStatus() {
  const status = serverStatus();
  for (const listener of statusListeners) listener(status);
}

export function subscribeServerStatus(listener) {
  statusListeners.add(listener);
  listener(serverStatus());
  return () => statusListeners.delete(listener);
}

/** Fire-and-forget ping, so the server is already waking while a visitor reads the landing page. */
export function warmUpServer() {
  fetch(`${BASE_URL}/health`, { method: 'GET', mode: 'cors' }).catch(() => {});
}

/*
 * Retry with backoff, for the cases a sleeping or restarting server produces:
 * no response at all, or a gateway error while it boots. Only reads are
 * retried — repeating a write could apply it twice — and a 4xx is a real
 * answer, never retried.
 */
const RETRY_DELAYS_MS = [1500, 3000, 6000, 10000, 15000, 20000];
const RETRYABLE_STATUS = new Set([502, 503, 504]);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Raised once when a signed-in session stops being valid, so the app can say so and keep the student's place. */
export const SESSION_EXPIRED_EVENT = 'agricore:session-expired';

async function send(path, { method, body }) {
  const token = getToken();
  return fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function sendWithRetry(path, options) {
  const canRetry = options.method === 'GET';
  let isSlow = false;
  const slowTimer = setTimeout(() => {
    isSlow = true;
    slowRequests += 1;
    emitStatus();
  }, SLOW_AFTER_MS);

  let isRetrying = false;
  try {
    for (let attempt = 0; ; attempt += 1) {
      let response = null;
      let failure = null;
      try {
        response = await send(path, options);
      } catch (error) {
        failure = error;
      }
      const shouldRetry = canRetry && attempt < RETRY_DELAYS_MS.length && (failure || RETRYABLE_STATUS.has(response.status));
      if (!shouldRetry) {
        if (failure) throw new ServiceError('Cannot reach the server. Check your connection and try again.', 0);
        return response;
      }
      if (!isRetrying) {
        isRetrying = true;
        retrying += 1;
        emitStatus();
      }
      await wait(RETRY_DELAYS_MS[attempt]);
    }
  } finally {
    clearTimeout(slowTimer);
    if (isSlow) slowRequests -= 1;
    if (isRetrying) retrying -= 1;
    if (isSlow || isRetrying) emitStatus();
  }
}

/*
 * Identical GETs in flight at the same moment share one request. Several
 * widgets on one page often ask for the same record (the signed-in user, the
 * student's attempts) while it is still loading; this sends it once.
 */
const inFlight = new Map();

async function call(path, { method = 'GET', body } = {}) {
  if (method === 'GET') {
    const key = `${getToken() ?? ''} ${path}`;
    if (inFlight.has(key)) return inFlight.get(key);
    const promise = request(path, { method, body }).finally(() => inFlight.delete(key));
    inFlight.set(key, promise);
    return promise;
  }
  return request(path, { method, body });
}

async function request(path, { method = 'GET', body } = {}) {
  const hadToken = Boolean(getToken());
  const response = await sendWithRetry(path, { method, body });

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
    if (response.status === 401 && data?.code === 'invalid_session') {
      setToken(null);
      // Only a session that existed can expire; a stray 401 while signed out is not news.
      if (hadToken) window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail: { message: data?.message } }));
    }
    const message = (data && typeof data === 'object' && data.message) || 'Something went wrong.';
    throw new ServiceError(message, response.status, data?.code);
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
