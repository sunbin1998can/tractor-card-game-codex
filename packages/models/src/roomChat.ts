import { type Kysely } from 'kysely';
import type { Database } from '@tractor/db';

export async function insertRoomMessage(
  db: Kysely<Database>,
  msg: { roomId: string; seat: number; userName: string; text: string },
) {
  await db.insertInto('room_messages')
    .values({
      room_id: msg.roomId,
      seat: msg.seat,
      user_name: msg.userName,
      text: msg.text,
    })
    .execute();
}

export async function getRecentRoomMessages(
  db: Kysely<Database>,
  roomId: string,
  limit = 50,
): Promise<{ seat: number; name: string; text: string; atMs: number }[]> {
  const rows = await db.selectFrom('room_messages')
    .where('room_id', '=', roomId)
    .orderBy('created_at', 'desc')
    .limit(limit)
    .select(['seat', 'user_name', 'text', 'created_at'])
    .execute();
  return rows.reverse().map((r) => ({
    seat: r.seat,
    name: r.user_name,
    text: r.text,
    atMs: new Date(r.created_at).getTime(),
  }));
}

export async function deleteRoomMessages(
  db: Kysely<Database>,
  roomId: string,
): Promise<void> {
  await db.deleteFrom('room_messages')
    .where('room_id', '=', roomId)
    .execute();
}
