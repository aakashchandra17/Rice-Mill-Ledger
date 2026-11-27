
const BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/+$/, '');

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

function getBaseUrl() {
  if (!BASE_URL) {
    throw new ApiError(
      'API URL is not configured. Please check your .env.local file.',
      500
    );
  }

  return BASE_URL;
}

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

function getErrorMessage(data, fallback) {
  return data?.detail || data?.message || fallback;
}

async function request(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${getBaseUrl()}${path}`, {
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
    let data = {};
    try {
      data = await res.json();
    } catch {}

    throw new ApiError(
      getErrorMessage(data, `Request failed (${res.status}).`),
      res.status
    );
  }

  if (res.status === 204) return null;

  return res.json();
}

// Step 1: Verify both passwords and request an OTP challenge.
export async function login(phone, password, secondPassword) {
  const res = await fetch(`${getBaseUrl()}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone,
      password,
      second_password: secondPassword,
    }),
  });

  if (!res.ok) {
    let data = {};
    try {
      data = await res.json();
    } catch {}

    throw new ApiError(
      getErrorMessage(data, `Login request failed (${res.status}).`),
      res.status
    );
  }

  const data = await res.json();

  if (!data.challenge_id) {
    throw new ApiError(
      'The backend did not return an OTP challenge ID.',
      500
    );
  }

  // No JWT is issued or stored at this stage.
  return {
    challengeId: data.challenge_id,
    message: data.message || 'OTP verification required.',
  };
}

// Step 2: Verify OTP and receive the JWT.
export async function verifyOtp(challengeId, otp, phone) {
  const res = await fetch(`${getBaseUrl()}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      challenge_id: challengeId,
      otp,
    }),
  });

  if (!res.ok) {
    let data = {};
    try {
      data = await res.json();
    } catch {}

    throw new ApiError(
      getErrorMessage(data, `OTP verification failed (${res.status}).`),
      res.status
    );
  }

  const data = await res.json();
  const token = data.access_token;

  if (!token) {
    throw new ApiError(
      'The backend did not return an access token.',
      500
    );
  }

  const claims = parseJwt(token);

  const user = {
    id: claims.sub,
    name: claims.name || '',
    phone,
    role: claims.role,
    businessId: claims.business_id,
    partyId: claims.party_id,
  };

  const millerRole = import.meta.env.VITE_MILLER_ROLE || 'owner';
  const commissiondarRole =
    import.meta.env.VITE_COMMISSIONDAR_ROLE || 'party';

  if (![millerRole, commissiondarRole].includes(user.role)) {
    throw new ApiError(
      'Login succeeded, but the token contains an unrecognized role.',
      500
    );
  }

  return { token, user };
}

export const getFarmers = token =>
  request('/farmers', { token });

export const createFarmer = (data, token) =>
  request('/farmers', { method: 'POST', body: data, token });

export const deleteFarmer = (farmerId, token) =>
  request(`/farmers/${farmerId}`, {
    method: 'DELETE',
    token,
  });

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
