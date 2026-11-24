// Runs against a real Postgres. Skipped unless DATABASE_URL and SESSION_SECRET are set.
//   DATABASE_URL=postgres://... PGSSL=off SESSION_SECRET=x node --test test/v2state.test.js
const test = require("node:test");
const assert = require("node:assert/strict");

const on = !!process.env.DATABASE_URL && !!process.env.SESSION_SECRET;
test("v2 state: auth required, round trip, validation, isolation, delete", { skip: !on }, async () => {
  const app = require("../index.js"); const db = require("../db"); const auth = require("../auth");
  await db.init();
  const srv = app.listen(0); const base = `http://127.0.0.1:${srv.address().port}`;
  const mk = async (sub) => { const u = await db.upsertUser({ sub, email: `${sub}@x.test` }); return { id: u.id, token: await auth.issueSession(u.id) }; };
  const a = await mk(`t-a-${Date.now()}`), b = await mk(`t-b-${Date.now()}`);
  const call = (path, token, method = "GET", body) => fetch(base + path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body && JSON.stringify(body) });
  try {
    assert.equal((await call("/v2/state")).status, 401);
    assert.equal((await call("/v2/state", "garbage")).status, 401);
    assert.deepEqual((await (await call("/v2/state", a.token)).json()).state, null);
    assert.equal((await call("/v2/state", a.token, "PUT", { state: { v: 1 } })).status, 400);
    assert.equal((await call("/v2/state", a.token, "PUT", { state: { v: 2, sessions: "x" } })).status, 400);
    const st = { v: 2, sessions: [{ id: "s1", iso: "2026-11-23", kind: "run", stage: 3 }], weights: [{ iso: "2026-11-23", kg: 80 }], profile: { sex: "m" } };
    assert.equal((await call("/v2/state", a.token, "PUT", { state: st })).status, 200);
    assert.deepEqual((await (await call("/v2/state", a.token)).json()).state, st);
    st.sessions.push({ id: "s2", iso: "2026-11-25", kind: "run", stage: 3 });
    await call("/v2/state", a.token, "PUT", { state: st });
    assert.equal((await (await call("/v2/state", a.token)).json()).state.sessions.length, 2);
    assert.deepEqual((await (await call("/v2/state", b.token)).json()).state, null); // other user sees nothing
    assert.equal((await call("/me", a.token, "DELETE")).status, 200);
    assert.deepEqual((await (await call("/v2/state", a.token)).json()).state, null);
  } finally { await db.deleteUser(a.id); await db.deleteUser(b.id); srv.close(); await db.end(); }
});
