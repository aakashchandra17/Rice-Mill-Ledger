const BASE_URL = 'https://your-backend.onrender.com/api'; // replace later with your teammate's URL
export const USE_MOCK = true; // change to false when the backend is ready

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function login(phone) {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 400));
    if (phone === '0000000000') throw new ApiError('Login failed', 401); // for testing the error
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