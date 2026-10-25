
const BASE_URL = 'https://grain-ledger.onrender.com/api';

export const USE_MOCK = false;

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

let onUnauthorized = () => {};

export const setUnauthorizedHandler = fn => {
  onUnauthorized = fn;
};

function parseJwt(token) {
  try {
    const payload = token.split('.')[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    return JSON.parse(atob(payload));
  } catch {
    return {};
  }
}

async function request(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    onUnauthorized();
    throw new ApiError('Session expired. Please log in again.', 401);
  }

  if (res.status === 403) {
    throw new ApiError('You are not allowed to access this section.', 403);
  }

  if (!res.ok) {
    throw new ApiError(`Request failed (${res.status}).`, res.status);
  }

  if (res.status === 204) return null;

  return res.json();
}

// Backend login accepts a phone number and returns access_token.
export async function login(phone) {
  const res = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });

  if (res.status === 401) {
    throw new ApiError('Phone number not recognized.', 401);
  }

  if (res.status === 403) {
    throw new ApiError('Access denied.', 403);
  }

  if (!res.ok) {
    throw new ApiError(`Login request failed (${res.status}).`, res.status);
  }

  const data = await res.json();
  const token = data.access_token;

  if (!token) {
    throw new ApiError('The backend did not return an access token.', 500);
  }

  const claims = parseJwt(token);

  const user = {
    id: claims.sub,
    name: claims.name || '',
    phone,
    role: data.role || data.user?.role || claims.role,
    businessId: data.business_id || claims.business_id,
    partyId: data.party_id || claims.party_id,
  };

  if (!['owner', 'party'].includes(user.role)) {
    throw new ApiError(
      'Login succeeded, but the token did not contain a recognized role.',
      500
    );
  }

  return { token, user };
}

export const getFarmers = token =>
  request('/farmers', { token });

export const createFarmer = (data, token) =>
  request('/farmers', { method: 'POST', body: data, token });

export const getDashboard = token =>
  request('/dashboard', { token });

export const recordIntake = (data, token) =>
  request('/intake', { method: 'POST', body: data, token });

export const recordPayment = (data, token) =>
  request('/payments', { method: 'POST', body: data, token });

export const getExports = token =>
  request('/exports', { token });

export const recordExport = (data, token) =>
  request('/exports', { method: 'POST', body: data, token });

export const getProfit = token =>
  request('/profit', { token });

export const getMillLoans = token =>
  request('/mill-loans', { token });

export const createMillLoan = (data, token) =>
  request('/mill-loans', { method: 'POST', body: data, token });

export const repayMillLoan = (data, token) =>
  request('/mill-loans/repay', { method: 'POST', body: data, token });

export const getBrokerCommissions = token =>
  request('/broker-commissions', { token });

export const payBrokerCommission = (data, token) =>
  request('/broker-commissions/pay', { method: 'POST', body: data, token });

export const getCommissiondarDashboard = token =>
  request('/commissiondar-dashboard', { token });

export const getCommissiondarLoans = token =>
  request('/commissiondar-loans', { token });

export const createCommissiondarLoan = (data, token) =>
  request('/commissiondar-loans', { method: 'POST', body: data, token });

export const repayCommissiondarLoan = (data, token) =>
  request('/commissiondar-loans/repay', { method: 'POST', body: data, token });

export const getCommissiondarStock = token =>
  request('/commissiondar-stock', { token });

export const receiveCommissiondarStock = (data, token) =>
  request('/commissiondar-stock/receive', {
    method: 'POST',
    body: data,
    token,
  });

export const deliverCommissiondarStock = (data, token) =>
  request('/commissiondar-stock/deliver', {
    method: 'POST',
    body: data,
    token,
  });

export function describeError(err) {
  if (err?.status === 401) return 'Your session expired. Please log in again.';
  if (err?.status === 403) return 'You are not allowed to access this section.';
  return err?.message || 'Something went wrong. Please try again.';
}
