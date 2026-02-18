import type { Db } from '@tractor/db';

export async function insertLobbyMessage(
  db: Db,
  msg: { userName: string; userId: string | null; text: string },
) {
  return db
    .insertInto('lobby_messages')
    .values({
      user_name: msg.userName,
      user_id: msg.userId,
      text: msg.text,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function getRecentLobbyMessages(db: Db, limit = 50) {
  const rows = await db
    .selectFrom('lobby_messages')
    .select(['user_name', 'text', 'created_at'])
    .orderBy('created_at', 'desc')
    .limit(limit)
    .execute();

  // Reverse so oldest is first
  return rows.reverse().map((r) => ({
    name: r.user_name,
    text: r.text,
    atMs: new Date(r.created_at).getTime(),
  }));
}
