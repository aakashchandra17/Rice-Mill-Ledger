
const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

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

function ensureApiUrl() {
  if (!BASE_URL) {
    throw new ApiError(
      'Backend URL is not configured. Please configure VITE_API_URL in .env.local.',
      0
    );
  }
}

async function readResponse(res) {
  const text = await res.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getErrorMessage(data, fallback) {
  if (typeof data === 'string') return data;

  return data?.detail || data?.message || fallback;
}

async function request(path, { method = 'GET', body, token } = {}) {
  ensureApiUrl();

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(body !== undefined
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await readResponse(res);

  if (res.status === 401) {
    onUnauthorized();

    throw new ApiError(
      getErrorMessage(data, 'Session expired. Please log in again.'),
      401
    );
  }

  if (res.status === 403) {
    throw new ApiError(
      getErrorMessage(data, 'You are not allowed to access this section.'),
      403
    );
  }

  if (!res.ok) {
    throw new ApiError(
      getErrorMessage(data, `Request failed (${res.status}).`),
      res.status
    );
  }

  return data;
}

// STEP 1: Verify phone and both passwords.
// Backend returns a temporary challenge_id.
export async function login(phone, password, secondPassword) {
  ensureApiUrl();

  const res = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone,
      password,
      second_password: secondPassword,
    }),
  });

  const data = await readResponse(res);

  if (!res.ok) {
    throw new ApiError(
      getErrorMessage(data, `Login failed (${res.status}).`),
      res.status
    );
  }

  if (!data?.challenge_id) {
    throw new ApiError(
      'The backend did not return an OTP challenge ID.',
      500
    );
  }

  return {
    challengeId: data.challenge_id,
    message: data.message || 'OTP verification required.',
  };
}

// STEP 2: Verify MSG91 access token with Grain Ledger backend.
// Backend returns the Grain Ledger JWT in access_token.
export async function verifyOtp(challengeId, msg91AccessToken) {
  ensureApiUrl();

  if (!challengeId) {
    throw new ApiError('Login challenge ID is missing.', 400);
  }

  if (!msg91AccessToken) {
    throw new ApiError(
      'MSG91 verification did not return an access token.',
      400
    );
  }

  const data = await request('/verify-otp', {
    method: 'POST',
    body: {
      challenge_id: challengeId,
      access_token: msg91AccessToken,
    },
  });

  if (!data?.access_token) {
    throw new ApiError(
      'The backend did not return the Grain Ledger access token.',
      500
    );
  }

  return {
    token: data.access_token,
    message: data.message,
    tokenType: data.token_type,
  };
}

// Miller / owner APIs
export const getItems = token =>
  request('/items', { token });

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

// Commissiondar / party APIs
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

// Registration APIs
export const registerMiller = ({
  name,
  phone,
  businessName,
  password,
  secondPassword,
}) =>
  request('/register/miller', {
    method: 'POST',
    body: {
      name,
      phone,
      business_name: businessName,
      password,
      second_password: secondPassword,
    },
  });

export const registerCommissiondar = ({
  name,
  phone,
  password,
  secondPassword,
}) =>
  request('/register/commissiondar', {
    method: 'POST',
    body: {
      name,
      phone,
      password,
      second_password: secondPassword,
    },
  });

// Admin APIs
export const getAdminDashboardSummary = token =>
  request('/admin/dashboard-summary', { token });

export const getAdminLoginLogs = token =>
  request('/admin/login-logs', { token });

export const getAdminIssues = token =>
  request('/admin/issues', { token });

export const getPendingRegistrations = token =>
  request('/admin/registrations/pending', { token });

export const approveRegistration = (userId, token) =>
  request(`/admin/registrations/${encodeURIComponent(userId)}/approve`, {
    method: 'POST',
    token,
  });

export const rejectRegistration = (userId, token) =>
  request(`/admin/registrations/${encodeURIComponent(userId)}/reject`, {
    method: 'POST',
    token,
  });

// Issue reporting
export const reportIssue = (description, token) =>
  request('/report-issue', {
    method: 'POST',
    body: { description },
    token,
  });

export function describeError(err) {
  if (err?.status === 401) {
    return 'Your session expired or the login details are invalid. Please try again.';
  }

  if (err?.status === 403) {
    return 'You are not allowed to access this section.';
  }

  return err?.message || 'Something went wrong. Please try again.';
}
