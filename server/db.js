/**
 * Postgres layer for accounts + cloud sync (Railway-hosted Postgres).
 *
 * Design notes:
 * - NORMALIZED, not one JSON blob. Singletons (profile, settings, current goal,
 *   current plan) live in `profiles`, one row per user. Everything that is keyed
 *   by day (training logs, matches, meals, shin, body checks, weights) gets its
 *   own table with a (user_id, iso) primary key — one row per day, so history is
 *   preserved for signed-in users and a second device sees the same rows.
 * - The per-day payloads themselves are stored as JSONB. That is deliberate: the
 *   shapes (e.g. logs[iso].ex[exId] = {done,feel}) are app-defined and small, and
 *   exploding every leaf into columns buys nothing for a single-user fitness app.
 *   The normalization that matters for sync — a row per day per entity — is here.
 * - Anonymous users never reach this file. Nothing is written server-side until a
 *   user signs in (see auth.js + the /state routes).
 * - last-write-wins: PUT /state replaces the user's rows from the client snapshot
 *   inside one transaction. No version/audit trail is kept.
 */
const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;
// Railway Postgres requires TLS; allow self-signed in that managed context.
const pool = new Pool(
  connectionString
    ? { connectionString, ssl: { rejectUnauthorized: false } }
    : {} // no DATABASE_URL -> pool is unused; /state routes report "not configured"
);

const hasDb = () => !!connectionString;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apple_sub   text UNIQUE NOT NULL,
  email       text,
  name        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id     uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  sex         text,
  age         integer,
  height_cm   integer,
  weight_kg   numeric,
  activity    text,
  name        text,
  theme_pref  text,
  goal        text,
  diet_type   text,
  can_buy     boolean,
  allergens   jsonb DEFAULT '[]'::jsonb,
  dislikes    jsonb DEFAULT '[]'::jsonb,
  pantry      jsonb DEFAULT '[]'::jsonb,
  train_goal  jsonb,
  plan_block  jsonb,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS day_logs (
  user_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  iso      date NOT NULL,
  data     jsonb NOT NULL,
  PRIMARY KEY (user_id, iso)
);

CREATE TABLE IF NOT EXISTS games (
  user_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  iso      date NOT NULL,
  data     jsonb NOT NULL,
  PRIMARY KEY (user_id, iso)
);

CREATE TABLE IF NOT EXISTS meals (
  user_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  iso      date NOT NULL,
  entries  jsonb NOT NULL,
  PRIMARY KEY (user_id, iso)
);

CREATE TABLE IF NOT EXISTS body_checks (
  user_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  iso      date NOT NULL,
  data     jsonb NOT NULL,
  PRIMARY KEY (user_id, iso)
);

CREATE TABLE IF NOT EXISTS shin (
  user_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  iso      date NOT NULL,
  status   text NOT NULL,
  PRIMARY KEY (user_id, iso)
);

CREATE TABLE IF NOT EXISTS weights (
  user_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  iso      date NOT NULL,
  kg       numeric NOT NULL,
  PRIMARY KEY (user_id, iso)
);

CREATE TABLE IF NOT EXISTS adjustments (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seq        integer NOT NULL,
  date       text,
  scope      text,
  reason     text,
  PRIMARY KEY (user_id, seq)
);
`;

let ready = null;
async function init() {
  if (!hasDb()) return;
  if (!ready) ready = pool.query(SCHEMA);
  await ready;
}

// Find-or-create the user for a verified Apple subject. Email/name only arrive
// on Apple's first authorization, so only fill them when we actually got them.
async function upsertUser({ sub, email, name }) {
  const { rows } = await pool.query(
    `INSERT INTO users (apple_sub, email, name)
       VALUES ($1, $2, $3)
     ON CONFLICT (apple_sub) DO UPDATE SET
       email = COALESCE(EXCLUDED.email, users.email),
       name  = COALESCE(EXCLUDED.name,  users.name)
     RETURNING id, email, name`,
    [sub, email || null, name || null]
  );
  return rows[0];
}

// Rebuild the exact app-state shape App.js persists (minus transient UI state).
async function readState(userId) {
  const [p, logs, games, meals, body, shin, weights, adj] = await Promise.all([
    pool.query(`SELECT * FROM profiles WHERE user_id=$1`, [userId]),
    pool.query(`SELECT iso, data FROM day_logs WHERE user_id=$1`, [userId]),
    pool.query(`SELECT iso, data FROM games WHERE user_id=$1 ORDER BY iso`, [userId]),
    pool.query(`SELECT iso, entries FROM meals WHERE user_id=$1`, [userId]),
    pool.query(`SELECT iso, data FROM body_checks WHERE user_id=$1`, [userId]),
    pool.query(`SELECT iso, status FROM shin WHERE user_id=$1`, [userId]),
    pool.query(`SELECT iso, kg FROM weights WHERE user_id=$1 ORDER BY iso`, [userId]),
    pool.query(`SELECT date, scope, reason FROM adjustments WHERE user_id=$1 ORDER BY seq`, [userId]),
  ]);
  const d = (iso) => (iso instanceof Date ? iso.toISOString().slice(0, 10) : String(iso).slice(0, 10));
  const pr = p.rows[0] || {};
  const obj = (rows, key) => Object.fromEntries(rows.map((r) => [d(r.iso), r[key]]));
  return {
    profile: {
      sex: pr.sex ?? "m", age: pr.age ?? 30, heightCm: pr.height_cm ?? 175,
      weightKg: pr.weight_kg != null ? Number(pr.weight_kg) : 75, activity: pr.activity ?? "moderate",
    },
    name: pr.name ?? "", themePref: pr.theme_pref ?? "system",
    goal: pr.goal ?? "maintain", dietType: pr.diet_type ?? "omnivore",
    canBuy: pr.can_buy ?? true,
    allergens: pr.allergens ?? [], dislikes: pr.dislikes ?? [], pantry: pr.pantry ?? [],
    trainGoal: pr.train_goal ?? null, planBlock: pr.plan_block ?? null,
    logs: obj(logs.rows, "data"),
    games: games.rows.map((r) => r.data),
    mealLogs: obj(meals.rows, "entries"),
    body: obj(body.rows, "data"),
    shin: obj(shin.rows, "status"),
    bodyWeights: weights.rows.map((r) => ({ iso: d(r.iso), kg: Number(r.kg) })),
    adjustments: adj.rows.map((r) => ({ date: r.date, scope: r.scope, reason: r.reason })),
    pendingProposal: null, // transient — never persisted server-side
  };
}

// Replace the user's data from a full client snapshot (last-write-wins), in one txn.
async function writeState(userId, s = {}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const pf = s.profile || {};
    await client.query(
      `INSERT INTO profiles (user_id, sex, age, height_cm, weight_kg, activity, name, theme_pref,
                             goal, diet_type, can_buy, allergens, dislikes, pantry, train_goal, plan_block, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16, now())
       ON CONFLICT (user_id) DO UPDATE SET
         sex=$2, age=$3, height_cm=$4, weight_kg=$5, activity=$6, name=$7, theme_pref=$8,
         goal=$9, diet_type=$10, can_buy=$11, allergens=$12, dislikes=$13, pantry=$14,
         train_goal=$15, plan_block=$16, updated_at=now()`,
      [
        userId, pf.sex ?? null, pf.age ?? null, pf.heightCm ?? null, pf.weightKg ?? null, pf.activity ?? null,
        s.name ?? null, s.themePref ?? null, s.goal ?? null, s.dietType ?? null,
        s.canBuy ?? null, JSON.stringify(s.allergens || []), JSON.stringify(s.dislikes || []),
        JSON.stringify(s.pantry || []),
        s.trainGoal != null ? JSON.stringify(s.trainGoal) : null,
        s.planBlock != null ? JSON.stringify(s.planBlock) : null,
      ]
    );

    // per-day collections: wipe then re-insert from the snapshot
    for (const t of ["day_logs", "games", "meals", "body_checks", "shin", "weights", "adjustments"]) {
      await client.query(`DELETE FROM ${t} WHERE user_id=$1`, [userId]);
    }
    const ins = [];
    for (const [iso, data] of Object.entries(s.logs || {}))
      ins.push(client.query(`INSERT INTO day_logs(user_id,iso,data) VALUES ($1,$2,$3)`, [userId, iso, JSON.stringify(data)]));
    for (const g of s.games || [])
      if (g && g.iso) ins.push(client.query(`INSERT INTO games(user_id,iso,data) VALUES ($1,$2,$3)`, [userId, g.iso, JSON.stringify(g)]));
    for (const [iso, entries] of Object.entries(s.mealLogs || {}))
      ins.push(client.query(`INSERT INTO meals(user_id,iso,entries) VALUES ($1,$2,$3)`, [userId, iso, JSON.stringify(entries)]));
    for (const [iso, data] of Object.entries(s.body || {}))
      ins.push(client.query(`INSERT INTO body_checks(user_id,iso,data) VALUES ($1,$2,$3)`, [userId, iso, JSON.stringify(data)]));
    for (const [iso, status] of Object.entries(s.shin || {}))
      if (status) ins.push(client.query(`INSERT INTO shin(user_id,iso,status) VALUES ($1,$2,$3)`, [userId, iso, String(status)]));
    for (const w of s.bodyWeights || [])
      if (w && w.iso) ins.push(client.query(`INSERT INTO weights(user_id,iso,kg) VALUES ($1,$2,$3)`, [userId, w.iso, w.kg]));
    (s.adjustments || []).forEach((a, i) =>
      ins.push(client.query(`INSERT INTO adjustments(user_id,seq,date,scope,reason) VALUES ($1,$2,$3,$4,$5)`,
        [userId, i, a.date ?? null, a.scope ?? null, a.reason ?? null])));
    await Promise.all(ins);

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

async function deleteUser(userId) {
  // ON DELETE CASCADE clears every child table.
  await pool.query(`DELETE FROM users WHERE id=$1`, [userId]);
}

// Has this account ever stored anything? Drives first-sign-in migration.
async function hasState(userId) {
  const { rows } = await pool.query(
    `SELECT 1 FROM profiles WHERE user_id=$1
     UNION ALL SELECT 1 FROM day_logs WHERE user_id=$1 LIMIT 1`,
    [userId]
  );
  return rows.length > 0;
}

module.exports = { hasDb, init, upsertUser, readState, writeState, deleteUser, hasState };
