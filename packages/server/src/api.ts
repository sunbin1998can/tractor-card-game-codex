import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomInt } from 'node:crypto';
import { getDb } from './db.js';
import { createAuthToken, verifyAuthToken, parseAuthHeader } from './auth.js';
import { sendVerificationEmail } from './email.js';
import { createGuestUser, findUserByGuestToken } from '@tractor/models';
import {
  findUserByEmail,
  createEmailCode,
  verifyEmailCode,
  linkEmail,
  createEmailUser,
} from '@tractor/models';
import { getUserStats, getUserMatches } from '@tractor/models';

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

function generateCode(): string {
  return String(randomInt(100000, 999999));
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function userResponse(user: { id: string; display_name: string; email?: string | null; guest_token?: string | null }) {
  return {
    id: user.id,
    displayName: user.display_name,
    email: user.email ?? null,
    isGuest: !user.email,
  };
}

export async function handleApi(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const path = url.pathname;

  if (!path.startsWith('/api/')) return false;

  // CORS headers on all /api/* responses
  const cors = corsHeaders();
  for (const [k, v] of Object.entries(cors)) {
    res.setHeader(k, v);
  }

  // Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return true;
  }

  const db = getDb();
  if (!db) {
    json(res, 503, { error: 'Database not configured' });
    return true;
  }

  try {
    // POST /api/auth/guest
    if (req.method === 'POST' && path === '/api/auth/guest') {
      const body = JSON.parse(await readBody(req));
      const displayName = (body.displayName || 'Guest').slice(0, 50);
      const user = await createGuestUser(db, displayName);
      const authToken = createAuthToken({ userId: user.id, guestToken: user.guest_token! });
      json(res, 200, { authToken, user: userResponse(user) });
      return true;
    }

    // POST /api/auth/email/send
    if (req.method === 'POST' && path === '/api/auth/email/send') {
      const body = JSON.parse(await readBody(req));
      const email = (body.email || '').trim().toLowerCase();
      if (!email || !email.includes('@')) {
        json(res, 400, { error: 'Invalid email' });
        return true;
      }
      const code = generateCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      const existingUser = await findUserByEmail(db, email);
      await createEmailCode(db, email, code, expiresAt, existingUser?.id);
      await sendVerificationEmail(email, code);
      json(res, 200, { ok: true });
      return true;
    }

    // POST /api/auth/email/verify
    if (req.method === 'POST' && path === '/api/auth/email/verify') {
      const body = JSON.parse(await readBody(req));
      const email = (body.email || '').trim().toLowerCase();
      const code = (body.code || '').trim();
      if (!email || !code) {
        json(res, 400, { error: 'Email and code required' });
        return true;
      }
      const verified = await verifyEmailCode(db, email, code);
      if (!verified) {
        json(res, 401, { error: 'Invalid or expired code' });
        return true;
      }
      let user = await findUserByEmail(db, email);
      if (!user) {
        const displayName = email.split('@')[0].slice(0, 50);
        user = await createEmailUser(db, email, displayName);
      }
      const authToken = createAuthToken({ userId: user.id, guestToken: user.guest_token! });
      json(res, 200, { authToken, user: userResponse(user) });
      return true;
    }

    // POST /api/auth/link-email
    if (req.method === 'POST' && path === '/api/auth/link-email') {
      const auth = parseAuthHeader(req);
      if (!auth) {
        json(res, 401, { error: 'Unauthorized' });
        return true;
      }
      const body = JSON.parse(await readBody(req));
      const email = (body.email || '').trim().toLowerCase();
      const code = (body.code || '').trim();
      if (!email || !code) {
        json(res, 400, { error: 'Email and code required' });
        return true;
      }
      const verified = await verifyEmailCode(db, email, code);
      if (!verified) {
        json(res, 401, { error: 'Invalid or expired code' });
        return true;
      }
      const user = await linkEmail(db, auth.userId, email);
      json(res, 200, { user: userResponse(user) });
      return true;
    }

    // GET /api/auth/me
    if (req.method === 'GET' && path === '/api/auth/me') {
      const auth = parseAuthHeader(req);
      if (!auth) {
        json(res, 401, { error: 'Unauthorized' });
        return true;
      }
      const user = await findUserByGuestToken(db, auth.guestToken);
      if (!user) {
        json(res, 401, { error: 'User not found' });
        return true;
      }
      json(res, 200, { user: userResponse(user) });
      return true;
    }

    // GET /api/stats
    if (req.method === 'GET' && path === '/api/stats') {
      const auth = parseAuthHeader(req);
      if (!auth) {
        json(res, 401, { error: 'Unauthorized' });
        return true;
      }
      const stats = await getUserStats(db, auth.userId);
      json(res, 200, { stats });
      return true;
    }

    // GET /api/matches
    if (req.method === 'GET' && path === '/api/matches') {
      const auth = parseAuthHeader(req);
      if (!auth) {
        json(res, 401, { error: 'Unauthorized' });
        return true;
      }
      const limit = Math.min(Number(url.searchParams.get('limit')) || 20, 100);
      const offset = Math.max(Number(url.searchParams.get('offset')) || 0, 0);
      const matches = await getUserMatches(db, auth.userId, { limit, offset });
      json(res, 200, { matches });
      return true;
    }

    json(res, 404, { error: 'Not found' });
  } catch (err) {
    console.error('[api] Error:', err);
    json(res, 500, { error: 'Internal server error' });
  }
  return true;
}
