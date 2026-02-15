import { eq, sql } from 'drizzle-orm';
import type { Db } from '@tractor/db';
import { userRatings } from '@tractor/db';

export type UserRating = typeof userRatings.$inferSelect;
export type UserRatingInsert = typeof userRatings.$inferInsert;

export async function getUserRating(db: Db, userId: string): Promise<UserRating | undefined> {
  const rows = await db.select().from(userRatings).where(eq(userRatings.userId, userId)).limit(1);
  return rows[0];
}

export async function ensureUserRating(db: Db, userId: string): Promise<UserRating> {
  const existing = await getUserRating(db, userId);
  if (existing) return existing;

  const [row] = await db
    .insert(userRatings)
    .values({ userId })
    .onConflictDoNothing()
    .returning();

  // Race condition: another insert won; re-fetch
  if (!row) return (await getUserRating(db, userId))!;
  return row;
}

export async function updateRating(
  db: Db,
  userId: string,
  opts: { newRating: number; newDeviation: number },
): Promise<UserRating> {
  await ensureUserRating(db, userId);

  const [row] = await db
    .update(userRatings)
    .set({
      rating: opts.newRating,
      deviation: opts.newDeviation,
      matchesRated: sql`${userRatings.matchesRated} + 1`,
      peakRating: sql`greatest(${userRatings.peakRating}, ${opts.newRating})`,
      updatedAt: new Date(),
    })
    .where(eq(userRatings.userId, userId))
    .returning();

  return row;
}
