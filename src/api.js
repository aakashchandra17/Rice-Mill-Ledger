import { t } from './strings';

const BASE_URL = 'https://your-backend.onrender.com/api'; // replace later with your teammate's URL
export const USE_MOCK = true; // change to false when the backend is ready

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// AuthContext registers this, so any 401 logs the user out
let onUnauthorized = () => {};
export const setUnauthorizedHandler = fn => {
  onUnauthorized = fn;
};

// Testing helper, development only (removed from production builds):
// type simulateApiError(401) or simulateApiError(403) in the browser console
let simulated = null;
if (import.meta.env.DEV) {
  window.simulateApiError = status => {
    simulated = status;
    console.log(`Next API call will fail with ${status}`);
  };
}

const delay = ms => new Promise(r => setTimeout(r, ms));

async function request(path, { method = 'GET', body, token } = {}) {
  if (USE_MOCK) {
    await delay(300);
    if (simulated) {
      const status = simulated;
      simulated = null;
      if (status === 401) onUnauthorized();
      throw new ApiError('Simulated error', status);
    }
    return body ?? {};
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    onUnauthorized();
    throw new ApiError('Session expired', 401);
  }
  if (res.status === 403) throw new ApiError('Not allowed', 403);
  if (!res.ok) throw new ApiError('Request failed', res.status);
  return res.json();
}

export async function login(phone) {
  if (USE_MOCK) {
    await delay(400);
    if (phone === '0000000000') throw new ApiError('Login failed', 401);
    return 'mock-token';
  }

  const res = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  if (!res.ok) throw new ApiError('Login failed', res.status);
  const data = await res.json();
  return data.access_token;
}

export const recordIntake = (data, token) =>
  request('/intake', { method: 'POST', body: data, token });

export const recordPayment = (data, token) =>
  request('/payments', { method: 'POST', body: data, token });

// turns an error into a message for the screen ('' means nothing to show)
export function describeError(err) {
  if (err?.status === 401) return ''; // user is already sent to the login page
  if (err?.status === 403) return t.errNotAllowed;
  return t.errGeneric;
}