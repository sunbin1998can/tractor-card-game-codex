import type { Db, User } from '@tractor/db';

export type { User } from '@tractor/db';

export async function findUserByUsername(db: Db, username: string): Promise<User | undefined> {
  return db
    .selectFrom('users')
    .selectAll()
    .where('username', '=', username)
    .executeTakeFirst();
}

export async function findUserByGuestToken(db: Db, guestToken: string): Promise<User | undefined> {
  return db
    .selectFrom('users')
    .selectAll()
    .where('guest_token', '=', guestToken)
    .executeTakeFirst();
}

export async function findUserByOAuth(
  db: Db,
  provider: string,
  oauthId: string,
): Promise<User | undefined> {
  return db
    .selectFrom('users')
    .selectAll()
    .where('oauth_provider', '=', provider)
    .where('oauth_id', '=', oauthId)
    .executeTakeFirst();
}

export async function createGuestUser(db: Db, displayName: string): Promise<User> {
  return db
    .insertInto('users')
    .values({
      display_name: displayName,
      guest_token: crypto.randomUUID(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function linkOAuth(
  db: Db,
  guestToken: string,
  opts: { provider: string; oauthId: string; username?: string },
): Promise<User> {
  return db
    .updateTable('users')
    .set({
      oauth_provider: opts.provider,
      oauth_id: opts.oauthId,
      username: opts.username ?? null,
      updated_at: new Date(),
    })
    .where('guest_token', '=', guestToken)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createOAuthUser(
  db: Db,
  opts: { provider: string; oauthId: string; displayName: string; username?: string },
): Promise<User> {
  return db
    .insertInto('users')
    .values({
      display_name: opts.displayName,
      oauth_provider: opts.provider,
      oauth_id: opts.oauthId,
      username: opts.username ?? null,
      guest_token: crypto.randomUUID(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function updateDisplayName(
  db: Db,
  userId: string,
  displayName: string,
): Promise<User> {
  return db
    .updateTable('users')
    .set({ display_name: displayName, updated_at: new Date() })
    .where('id', '=', userId)
    .returningAll()
    .executeTakeFirstOrThrow();
}
