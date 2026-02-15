import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export interface AuthPayload {
  userId: string;
  guestToken: string;
}

if (!process.env.AUTH_SECRET) {
  console.warn('[auth] AUTH_SECRET not set — generating ephemeral secret (tokens will not survive restart)');
}
const secret =
  process.env.AUTH_SECRET || randomBytes(32).toString('hex');

export function createAuthToken(payload: AuthPayload): string {
  const json = JSON.stringify(payload);
  const data = Buffer.from(json).toString('base64url');
  const sig = createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifyAuthToken(token: string): AuthPayload | null {
  const dot = token.indexOf('.');
  if (dot < 0) return null;
  const data = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expectedSig = createHmac('sha256', secret).update(data).digest('base64url');
  const sigBuf = Buffer.from(sig, 'base64url');
  const expectedBuf = Buffer.from(expectedSig, 'base64url');
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null;
  try {
    const json = Buffer.from(data, 'base64url').toString();
    const obj = JSON.parse(json);
    if (typeof obj.userId !== 'string' || typeof obj.guestToken !== 'string') return null;
    return obj as AuthPayload;
  } catch {
    return null;
  }
}

export function parseAuthHeader(req: { headers: Record<string, string | string[] | undefined> }): AuthPayload | null {
  const header = req.headers['authorization'];
  if (typeof header !== 'string') return null;
  if (!header.startsWith('Bearer ')) return null;
  return verifyAuthToken(header.slice(7));
}
