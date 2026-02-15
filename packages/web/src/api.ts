const API_BASE = import.meta.env.VITE_API_URL || '';

async function apiFetch(path: string, opts: RequestInit = {}): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...opts.headers,
    },
  });
}

function authHeaders(authToken: string): Record<string, string> {
  return { Authorization: `Bearer ${authToken}` };
}

export interface ApiUser {
  id: string;
  displayName: string;
  email: string | null;
  isGuest: boolean;
}

export async function guestLogin(displayName: string): Promise<{ authToken: string; user: ApiUser }> {
  const res = await apiFetch('/api/auth/guest', {
    method: 'POST',
    body: JSON.stringify({ displayName }),
  });
  if (!res.ok) throw new Error('Guest login failed');
  return res.json();
}

export async function sendEmailCode(email: string): Promise<void> {
  const res = await apiFetch('/api/auth/email/send', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error('Failed to send code');
}

export async function verifyEmailCode(
  email: string,
  code: string,
): Promise<{ authToken: string; user: ApiUser }> {
  const res = await apiFetch('/api/auth/email/verify', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
  if (!res.ok) throw new Error('Verification failed');
  return res.json();
}

export async function apiLinkEmail(
  authToken: string,
  email: string,
  code: string,
): Promise<{ user: ApiUser }> {
  const res = await apiFetch('/api/auth/link-email', {
    method: 'POST',
    headers: authHeaders(authToken),
    body: JSON.stringify({ email, code }),
  });
  if (!res.ok) throw new Error('Link email failed');
  return res.json();
}

export async function getMe(authToken: string): Promise<{ user: ApiUser }> {
  const res = await apiFetch('/api/auth/me', {
    method: 'GET',
    headers: authHeaders(authToken),
  });
  if (!res.ok) throw new Error('Not authenticated');
  return res.json();
}
