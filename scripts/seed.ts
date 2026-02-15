/**
 * scripts/seed.ts
 *
 * Seeds the local dev database with sample users and a completed match.
 * Run via: DATABASE_URL=... npx tsx scripts/seed.ts
 *
 * Outputs auth tokens so you can test authenticated endpoints immediately.
 */

import { createDb } from '../packages/db/src/client.js';
import { createHmac } from 'node:crypto';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const AUTH_SECRET = process.env.AUTH_SECRET || '';

function makeToken(userId: string, guestToken: string): string | null {
  if (!AUTH_SECRET) return null;
  const json = JSON.stringify({ userId, guestToken });
  const data = Buffer.from(json).toString('base64url');
  const sig = createHmac('sha256', AUTH_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

async function main() {
  const db = createDb(DATABASE_URL!);

  // Upsert sample users (idempotent by email)
  const users = [
    { display_name: 'Alice',  email: 'alice@example.com',  guest_token: '00000000-0000-0000-0000-000000000001' },
    { display_name: 'Bob',    email: 'bob@example.com',    guest_token: '00000000-0000-0000-0000-000000000002' },
    { display_name: 'Carol',  email: 'carol@example.com',  guest_token: '00000000-0000-0000-0000-000000000003' },
    { display_name: 'Dave',   email: 'dave@example.com',   guest_token: '00000000-0000-0000-0000-000000000004' },
  ];

  const seeded: { name: string; id: string; guestToken: string; email: string; token: string | null }[] = [];

  for (const u of users) {
    const existing = await db
      .selectFrom('users')
      .selectAll()
      .where('email', '=', u.email)
      .executeTakeFirst();

    if (existing) {
      seeded.push({
        name: u.display_name,
        id: existing.id,
        guestToken: existing.guest_token!,
        email: u.email,
        token: makeToken(existing.id, existing.guest_token!),
      });
      continue;
    }

    const row = await db
      .insertInto('users')
      .values({
        display_name: u.display_name,
        email: u.email,
        email_verified_at: new Date(),
        guest_token: u.guest_token,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    seeded.push({
      name: u.display_name,
      id: row.id,
      guestToken: row.guest_token!,
      email: u.email,
      token: makeToken(row.id, row.guest_token!),
    });
  }

  // Seed a sample completed match between Alice/Carol (team 0) vs Bob/Dave (team 1)
  const matchExists = await db
    .selectFrom('matches')
    .select('id')
    .where('room_id', '=', 'seed-room')
    .executeTakeFirst();

  if (!matchExists) {
    const match = await db
      .insertInto('matches')
      .values({
        room_id: 'seed-room',
        player_count: 4,
        team_levels_start: JSON.stringify(['2', '2']),
        team_levels_end: JSON.stringify(['3', '2']),
        winning_team: 0,
        ended_at: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    const playerRows = seeded.map((s, i) => ({
      match_id: match.id,
      user_id: s.id,
      seat: i,
      team: i % 2,
      display_name: s.name,
    }));
    await db.insertInto('match_players').values(playerRows).execute();

    await db.insertInto('rounds').values({
      match_id: match.id,
      round_number: 1,
      banker_seat: 0,
      level_rank: '2',
      trump_suit: 'H',
      kitty_cards: JSON.stringify([]),
      defender_points: 0,
      attacker_points: 40,
      kitty_points: 0,
      kitty_multiplier: 1,
      winner_team: 0,
      winner_side: 'DEFENDER',
      level_from: '2',
      level_to: '3',
      level_delta: 1,
      roles_swapped: false,
      new_banker_seat: 0,
      started_at: new Date(Date.now() - 60_000),
      ended_at: new Date(),
    }).execute();

    console.log('  Seeded sample match (seed-room): Team 0 won, level 2→3');
  } else {
    console.log('  Sample match already exists, skipping');
  }

  // Print results
  console.log('');
  console.log('══════════════════════════════════════════════════════════');
  console.log('  Sample Users');
  console.log('══════════════════════════════════════════════════════════');
  for (const s of seeded) {
    console.log(`  ${s.name}  <${s.email}>`);
    console.log(`    userId:     ${s.id}`);
    console.log(`    guestToken: ${s.guestToken}`);
    if (s.token) {
      console.log(`    authToken:  ${s.token}`);
    }
    console.log('');
  }
  console.log('──────────────────────────────────────────────────────────');
  console.log('  Email login: enter any email above in the lobby,');
  console.log('  click "Send Code", then check the server console');
  console.log('  for the 6-digit code (no RESEND_API_KEY needed).');
  console.log('──────────────────────────────────────────────────────────');

  if (AUTH_SECRET && seeded[0]?.token) {
    console.log('');
    console.log('  Quick test (Alice):');
    console.log(`    curl -H "Authorization: Bearer ${seeded[0].token}" http://localhost:3000/api/auth/me`);
    console.log(`    curl -H "Authorization: Bearer ${seeded[0].token}" http://localhost:3000/api/stats`);
  }

  await db.destroy();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
