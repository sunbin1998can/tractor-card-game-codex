import { createHmac, randomBytes } from 'node:crypto';

export interface AuthPayload {
  userId: string;
  guestToken: string;
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
  const expected = createHmac('sha256', secret).update(data).digest('base64url');
  if (sig !== expected) return null;
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
