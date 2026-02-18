import { type Kysely } from 'kysely';
import type { Database } from '@tractor/db';

export async function insertFeedback(
  db: Kysely<Database>,
  msg: { userName: string; userId: string | null; text: string },
) {
  await db.insertInto('feedback')
    .values({
      user_name: msg.userName,
      user_id: msg.userId,
      text: msg.text,
    })
    .execute();
}
