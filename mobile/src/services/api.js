import { normalizeServerUrl } from '../config/server';

async function request(serverUrl, path, { method = 'GET', token, body } = {}) {
  const baseUrl = normalizeServerUrl(serverUrl);
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text };
  }

  if (!response.ok) {
    const error = new Error(data?.error || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }

  return data;
}

export function loginRequest(serverUrl, username, password) {
  return request(serverUrl, '/auth/login', {
    method: 'POST',
    body: { username, password },
  });
}

export function getMeRequest(serverUrl, token) {
  return request(serverUrl, '/auth/me', { token });
}

export function getHealthRequest(serverUrl) {
  return request(serverUrl, '/health');
}

export function postLocationRequest(serverUrl, token, payload) {
  return request(serverUrl, '/location', {
    method: 'POST',
    token,
    body: payload,
  });
}
