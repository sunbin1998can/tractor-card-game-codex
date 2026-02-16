import type { Db, User } from '@tractor/db';

export interface EmailCode {
  id: string;
  email: string;
  code: string;
  user_id: string | null;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
}

export async function findUserByEmail(db: Db, email: string): Promise<User | undefined> {
  return db
    .selectFrom('users')
    .selectAll()
    .where('email', '=', email.toLowerCase())
    .executeTakeFirst();
}

export async function createEmailCode(
  db: Db,
  email: string,
  code: string,
  expiresAt: Date,
  userId?: string,
): Promise<EmailCode> {
  const row = await db
    .insertInto('email_codes')
    .values({
      email: email.toLowerCase(),
      code,
      expires_at: expiresAt,
      user_id: userId ?? null,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  return row as EmailCode;
}

export async function verifyEmailCode(
  db: Db,
  email: string,
  code: string,
): Promise<EmailCode | undefined> {
  const row = await db
    .selectFrom('email_codes')
    .selectAll()
    .where('email', '=', email.toLowerCase())
    .where('code', '=', code)
    .where('used_at', 'is', null)
    .where('expires_at', '>', new Date())
    .orderBy('created_at', 'desc')
    .executeTakeFirst();

  if (!row) return undefined;

  await db
    .updateTable('email_codes')
    .set({ used_at: new Date() })
    .where('id', '=', row.id)
    .execute();

  return row as EmailCode;
}

export async function linkEmail(db: Db, userId: string, email: string): Promise<User> {
  return db
    .updateTable('users')
    .set({
      email: email.toLowerCase(),
      email_verified_at: new Date(),
      updated_at: new Date(),
    })
    .where('id', '=', userId)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createEmailUser(db: Db, email: string, displayName: string): Promise<User> {
  return db
    .insertInto('users')
    .values({
      display_name: displayName,
      email: email.toLowerCase(),
      email_verified_at: new Date(),
      guest_token: crypto.randomUUID(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}
