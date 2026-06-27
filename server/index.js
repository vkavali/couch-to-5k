/**
 * Garmin Health API backend — skeleton.
 *
 * What this is: the server you need so the mobile app can sync Garmin data
 * (runs, heart rate, sleep). A phone app alone CANNOT do this — Garmin requires
 * a server-side OAuth flow plus a webhook endpoint that Garmin pushes data to.
 *
 * Before this works you must:
 *   1. Apply to the Garmin Developer Program and get approved for the Health API
 *      (https://developer.garmin.com/health-api/). Approval is required and not instant.
 *   2. Receive a Consumer Key + Consumer Secret. Put them in a .env file (see .env.example).
 *   3. Register this server's callback URL in the Garmin developer portal.
 *   4. Deploy this somewhere with HTTPS (Railway, Fly, Render, etc.).
 *
 * Garmin's Health API uses OAuth 1.0a (user authorization) + ping/push webhooks.
 * The endpoints below lay out that flow; the TODOs are where Garmin's signed
 * requests go. Keep secrets server-side only — never ship them in the app.
 */

const express = require("express");
const crypto = require("crypto");
const db = require("./db");
const auth = require("./auth");

const app = express();
app.use(express.json({ limit: "2mb" })); // state snapshots can be a few hundred KB

// CORS — the mobile app calls this from a different origin.
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

const {
  GARMIN_CONSUMER_KEY,
  GARMIN_CONSUMER_SECRET,
  ANTHROPIC_API_KEY,
  COACH_MODEL = "claude-3-5-haiku-latest",
  PORT = 8080,
} = process.env;

// Coach cost guards (override via env). max_tokens is hard-capped so a single
// reply can't blow up; per-IP rate limit + a global daily cap bound total spend.
const COACH_MAX_TOKENS = Math.min(800, Number(process.env.COACH_MAX_TOKENS) || 500);
const COACH_RPM = Number(process.env.COACH_RPM) || 15;          // requests/min/IP
const COACH_DAILY_MAX = Number(process.env.COACH_DAILY_MAX) || 600; // total calls/day

// tiny in-memory limiter (no external deps). Fine for a single instance;
// swap for a shared store if you ever run multiple replicas.
const hits = new Map(); // ip -> [timestamps within the window]
let day = new Date().getUTCDate();
let dayCount = 0;
function rateLimited(ip) {
  const now = Date.now();
  const today = new Date().getUTCDate();
  if (today !== day) { day = today; dayCount = 0; } // reset daily counter
  if (dayCount >= COACH_DAILY_MAX) return "daily";
  const arr = (hits.get(ip) || []).filter(t => now - t < 60_000);
  if (arr.length >= COACH_RPM) return "rate";
  arr.push(now); hits.set(ip, arr); dayCount++;
  return null;
}

// In production store these per-user in a database, not in memory.
const userTokens = new Map(); // userId -> { token, tokenSecret }

function requireConfig(res){
  if(!GARMIN_CONSUMER_KEY || !GARMIN_CONSUMER_SECRET){
    res.status(500).json({ error: "Set GARMIN_CONSUMER_KEY and GARMIN_CONSUMER_SECRET in .env" });
    return false;
  }
  return true;
}

app.get("/health", (_req, res) => res.json({ ok: true, db: db.hasDb(), auth: auth.configured() }));

/* ------------------------------------------------------------------ *
 * Accounts: Sign in with Apple (verified here) + cloud sync.
 * Sign-in is OPTIONAL — the app works fully offline. These routes only
 * exist for users who choose to sign in; nothing is stored for anyone else.
 * ------------------------------------------------------------------ */

// Exchange a verified Apple identity token for our own session token.
app.post("/auth/apple", async (req, res) => {
  if (!auth.configured()) return res.status(500).json({ error: "Set SESSION_SECRET in the server env." });
  if (!db.hasDb()) return res.status(500).json({ error: "Set DATABASE_URL (add the Railway Postgres plugin)." });
  const { identityToken, name } = req.body || {};
  if (!identityToken) return res.status(400).json({ error: "Missing identityToken." });
  try {
    const { sub, email } = await auth.verifyAppleToken(identityToken);
    const user = await db.upsertUser({ sub, email, name });
    const token = await auth.issueSession(user.id);
    const hasState = await db.hasState(user.id);
    res.json({ token, hasState, user: { id: user.id, email: user.email, name: user.name } });
  } catch (e) {
    console.error("Apple sign-in failed", String(e).slice(0, 300));
    res.status(401).json({ error: "Apple sign-in verification failed." });
  }
});

// Pull this user's full state (server is source of truth after first sign-in).
app.get("/state", auth.requireAuth, async (req, res) => {
  try {
    res.json({ state: await db.readState(req.userId) });
  } catch (e) {
    console.error("readState failed", String(e).slice(0, 300));
    res.status(500).json({ error: "Could not load your data." });
  }
});

// Replace this user's state from a client snapshot (last-write-wins).
app.put("/state", auth.requireAuth, async (req, res) => {
  const { state } = req.body || {};
  if (!state || typeof state !== "object") return res.status(400).json({ error: "Missing state." });
  try {
    await db.writeState(req.userId, state);
    res.json({ ok: true });
  } catch (e) {
    console.error("writeState failed", String(e).slice(0, 300));
    res.status(500).json({ error: "Could not save your data." });
  }
});

// Delete the account and ALL its data (required by App Store guideline 5.1.1).
app.delete("/me", auth.requireAuth, async (req, res) => {
  try {
    await db.deleteUser(req.userId);
    res.json({ ok: true });
  } catch (e) {
    console.error("deleteUser failed", String(e).slice(0, 300));
    res.status(500).json({ error: "Could not delete your account." });
  }
});

/**
 * Step 1 — start auth. The app opens this in a browser/WebView.
 * Get an unauthorized request token from Garmin, then redirect the user to
 * Garmin's authorization page.
 */
app.get("/auth/garmin/start", async (req, res) => {
  if(!requireConfig(res)) return;
  // TODO: POST to https://connectapi.garmin.com/oauth-service/oauth/request_token
  //       with an OAuth 1.0a signed header, receive oauth_token + oauth_token_secret,
  //       then redirect to:
  //       https://connect.garmin.com/oauthConfirm?oauth_token=<token>
  res.status(501).json({
    todo: "Implement OAuth 1.0a request-token call, then redirect to Garmin's oauthConfirm page.",
  });
});

/**
 * Step 2 — callback. Garmin redirects back here with oauth_verifier.
 * Exchange it for the user's access token and persist it.
 */
app.get("/auth/garmin/callback", async (req, res) => {
  if(!requireConfig(res)) return;
  const { oauth_token, oauth_verifier } = req.query;
  // TODO: POST to .../oauth/access_token with oauth_token + oauth_verifier,
  //       receive the long-lived access token + secret, then:
  //       userTokens.set(userId, { token, tokenSecret });
  res.status(501).json({ received: { oauth_token, oauth_verifier },
    todo: "Exchange verifier for access token and store per user." });
});

/**
 * Step 3 — Garmin pushes new activity/HR/sleep data here (the "push" service).
 * Configure this URL as your webhook in the Garmin portal. Verify and store.
 */
app.post("/webhooks/garmin", (req, res) => {
  // Garmin sends summaries (activities, dailies, sleeps, etc.) as JSON.
  // TODO: validate the payload, map to your schema, save to the DB,
  //       and make it available to the app via the endpoint below.
  console.log("Garmin webhook:", JSON.stringify(req.body).slice(0, 500));
  res.sendStatus(200); // must 200 quickly or Garmin retries
});

/**
 * Step 4 — the app reads a user's synced activities from your DB.
 */
app.get("/api/activities/:userId", (req, res) => {
  // TODO: return stored activities for this user.
  res.json({ userId: req.params.userId, activities: [] });
});

/**
 * AI Coach — calls the Anthropic Messages API. The key lives in env only,
 * never in the app. The app POSTs { messages:[{role,content}], context:{...} }.
 */
const COACH_SYSTEM = `You are the in-app Coach for an adaptive Couch-to-5K + cricket + nutrition app.
You receive the user's real current state as JSON context (today's workout type, shin status,
goal, calorie/protein targets, planned meals, pantry, upcoming matches). Use it.

Rules:
- Keep replies short: 4-6 sentences, concrete, friendly. No markdown headers.
- Ground every answer in the provided context; don't invent foods they don't have.
- Around matches/heavy weeks, fuelling beats cutting — push adequate intake.
- Respect shin status: sore = no running today, sharp = rest + suggest a physio.
- Never give medical advice for conditions/pregnancy/disordered eating — point to a professional.
- No crash diets, no punishment framing, no glorifying very low intake.`;

app.post("/coach", async (req, res) => {
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "Set ANTHROPIC_API_KEY in the server env to enable Coach." });
  }
  const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "?").split(",")[0].trim();
  const limit = rateLimited(ip);
  if (limit === "rate") return res.status(429).json({ error: "Slow down a moment and try again." });
  if (limit === "daily") return res.status(429).json({ error: "Coach is resting for today. Back tomorrow." });
  try {
    const { messages = [], context = {} } = req.body || {};
    const convo = messages
      .filter(m => m && (m.role === "user" || m.role === "assistant") && m.content)
      .slice(-12)
      .map(m => ({ role: m.role, content: String(m.content).slice(0, 2000) })); // cap input size
    // prepend the live context to the first user turn
    if (convo.length && convo[0].role === "user") {
      convo[0] = { role: "user", content: `My current state:\n${JSON.stringify(context)}\n\n${convo[0].content}` };
    }

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: COACH_MODEL, max_tokens: COACH_MAX_TOKENS, system: COACH_SYSTEM, messages: convo }),
    });
    if (!r.ok) {
      const txt = await r.text();
      console.error("Anthropic API error", r.status, txt.slice(0, 400));
      // surface the real reason in the chat bubble (debug aid) instead of a silent "No reply"
      return res.json({ reply: `Coach upstream error ${r.status}: ${txt.slice(0, 220)}` });
    }
    const data = await r.json();
    const reply = (data.content || []).map(b => b.text || "").join("").trim();
    res.json({ reply: reply || "No reply." });
  } catch (e) {
    console.error("Coach failed", e);
    res.json({ reply: `Coach failed: ${String(e).slice(0, 200)}` });
  }
});

db.init()
  .then(() => db.hasDb() && console.log("Postgres ready"))
  .catch((e) => console.error("DB init failed", String(e).slice(0, 300)));

app.listen(PORT, "0.0.0.0", () => console.log(`Backend on :${PORT}`));
