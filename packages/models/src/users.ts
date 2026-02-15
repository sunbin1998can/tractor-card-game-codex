import { eq, and } from 'drizzle-orm';
import type { Db } from '@tractor/db';
import { users } from '@tractor/db';

export type User = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;

export async function findUserByUsername(db: Db, username: string): Promise<User | undefined> {
  const rows = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return rows[0];
}

export async function findUserByGuestToken(db: Db, guestToken: string): Promise<User | undefined> {
  const rows = await db.select().from(users).where(eq(users.guestToken, guestToken)).limit(1);
  return rows[0];
}

export async function findUserByOAuth(
  db: Db,
  provider: string,
  oauthId: string,
): Promise<User | undefined> {
  const rows = await db
    .select()
    .from(users)
    .where(and(eq(users.oauthProvider, provider), eq(users.oauthId, oauthId)))
    .limit(1);
  return rows[0];
}

export async function createGuestUser(db: Db, displayName: string): Promise<User> {
  const rows = await db
    .insert(users)
    .values({
      displayName,
      guestToken: crypto.randomUUID(),
    })
    .returning();
  return rows[0];
}

export async function linkOAuth(
  db: Db,
  guestToken: string,
  opts: { provider: string; oauthId: string; username?: string },
): Promise<User> {
  const rows = await db
    .update(users)
    .set({
      oauthProvider: opts.provider,
      oauthId: opts.oauthId,
      username: opts.username,
      updatedAt: new Date(),
    })
    .where(eq(users.guestToken, guestToken))
    .returning();
  return rows[0];
}

export async function createOAuthUser(
  db: Db,
  opts: { provider: string; oauthId: string; displayName: string; username?: string },
): Promise<User> {
  const rows = await db
    .insert(users)
    .values({
      displayName: opts.displayName,
      oauthProvider: opts.provider,
      oauthId: opts.oauthId,
      username: opts.username,
      guestToken: crypto.randomUUID(),
    })
    .returning();
  return rows[0];
}

export async function updateDisplayName(
  db: Db,
  userId: string,
  displayName: string,
): Promise<User> {
  const rows = await db
    .update(users)
    .set({ displayName, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  return rows[0];
}
