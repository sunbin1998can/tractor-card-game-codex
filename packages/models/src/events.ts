import { eq } from 'drizzle-orm';
import type { Db } from '@tractor/db';
import { roundEvents } from '@tractor/db';

export type RoundEvent = typeof roundEvents.$inferSelect;
export type RoundEventInsert = typeof roundEvents.$inferInsert;

export async function recordRoundEvents(
  db: Db,
  roundId: string,
  events: Omit<RoundEventInsert, 'id' | 'roundId'>[],
): Promise<void> {
  if (events.length === 0) return;
  await db.insert(roundEvents).values(
    events.map((e) => ({ ...e, roundId })),
  );
}

export async function getRoundEvents(db: Db, roundId: string): Promise<RoundEvent[]> {
  return db
    .select()
    .from(roundEvents)
    .where(eq(roundEvents.roundId, roundId))
    .orderBy(roundEvents.seq);
}
