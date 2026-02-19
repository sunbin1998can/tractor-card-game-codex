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

export interface ApiRoom {
  id: string;
  players: number;
  seated: number;
  phase: string;
  createdAt: number;
  seats: { name: string; isConnected: boolean; isBot: boolean }[];
}

export async function createRoom(players: number): Promise<{ roomId: string }> {
  const res = await apiFetch('/api/rooms/create', {
    method: 'POST',
    body: JSON.stringify({ players }),
  });
  if (!res.ok) throw new Error('Failed to create room');
  return res.json();
}

export async function getRooms(): Promise<ApiRoom[]> {
  const res = await apiFetch('/api/rooms', { method: 'GET' });
  if (!res.ok) return [];
  const data = await res.json();
  return data.rooms ?? [];
}

export interface ApiStats {
  totalMatches: number;
  wins: number;
  winRate: number;
  roundsPlayed: number;
  avgPointsAsAttacker: number;
  avgPointsAsDefender: number;
  totalLevelUps: number;
  biggestLevelJump: number;
}

export interface ApiRating {
  rating: number;
  deviation: number;
  matchesRated: number;
  peakRating: number;
}

export interface ApiMatch {
  match: {
    id: string;
    room_id: string;
    player_count: number;
    winning_team: number | null;
    team_levels_start: string;
    team_levels_end: string | null;
    started_at: string;
    ended_at: string | null;
  };
  seat: number;
  team: number;
}

export async function getStats(authToken: string): Promise<{ stats: ApiStats }> {
  const res = await apiFetch('/api/stats', {
    method: 'GET',
    headers: authHeaders(authToken),
  });
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export async function getRating(authToken: string): Promise<{ rating: ApiRating }> {
  const res = await apiFetch('/api/rating', {
    method: 'GET',
    headers: authHeaders(authToken),
  });
  if (!res.ok) throw new Error('Failed to fetch rating');
  return res.json();
}

export async function submitFeedback(userName: string, userId: string | null, text: string): Promise<void> {
  await apiFetch('/api/feedback', {
    method: 'POST',
    body: JSON.stringify({ userName, userId, text }),
  });
}

export async function getMatches(
  authToken: string,
  opts?: { limit?: number; offset?: number },
): Promise<{ matches: ApiMatch[] }> {
  const params = new URLSearchParams();
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.offset) params.set('offset', String(opts.offset));
  const qs = params.toString();
  const res = await apiFetch(`/api/matches${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    headers: authHeaders(authToken),
  });
  if (!res.ok) throw new Error('Failed to fetch matches');
  return res.json();
}
