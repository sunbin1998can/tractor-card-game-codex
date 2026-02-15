import type { Db, RoundEvent, NewRoundEvent } from '@tractor/db';

export type { RoundEvent, NewRoundEvent } from '@tractor/db';

export async function recordRoundEvents(
  db: Db,
  roundId: string,
  events: Omit<NewRoundEvent, 'id' | 'round_id'>[],
): Promise<void> {
  if (events.length === 0) return;
  await db
    .insertInto('round_events')
    .values(events.map((e) => ({ ...e, round_id: roundId })))
    .execute();
}

export async function getRoundEvents(db: Db, roundId: string): Promise<RoundEvent[]> {
  return db
    .selectFrom('round_events')
    .selectAll()
    .where('round_id', '=', roundId)
    .orderBy('seq', 'asc')
    .execute();
}
