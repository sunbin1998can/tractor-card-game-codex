import { sql } from 'kysely';
import type { Db, UserRating } from '@tractor/db';

export type { UserRating } from '@tractor/db';

export async function getUserRating(db: Db, userId: string): Promise<UserRating | undefined> {
  return db
    .selectFrom('user_ratings')
    .selectAll()
    .where('user_id', '=', userId)
    .executeTakeFirst();
}

export async function ensureUserRating(db: Db, userId: string): Promise<UserRating> {
  const existing = await getUserRating(db, userId);
  if (existing) return existing;

  return db
    .insertInto('user_ratings')
    .values({ user_id: userId })
    .onConflict((oc) => oc.column('user_id').doNothing())
    .returningAll()
    .executeTakeFirst()
    // Race condition: another insert won; re-fetch
    .then((row) => row ?? getUserRating(db, userId))
    .then((row) => row!);
}

export async function updateRating(
  db: Db,
  userId: string,
  opts: { newRating: number; newDeviation: number },
): Promise<UserRating> {
  await ensureUserRating(db, userId);

  return db
    .updateTable('user_ratings')
    .set({
      rating: opts.newRating,
      deviation: opts.newDeviation,
      matches_rated: sql`matches_rated + 1`,
      peak_rating: sql`greatest(peak_rating, ${opts.newRating})`,
      updated_at: new Date(),
    })
    .where('user_id', '=', userId)
    .returningAll()
    .executeTakeFirstOrThrow();
}
