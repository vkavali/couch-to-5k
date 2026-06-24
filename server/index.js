/**
 * Garmin Health API backend — skeleton, Railway-ready.
 *
 * What this is: the server you need so the mobile app can sync Garmin data
 * (runs, heart rate, sleep). A phone app alone CANNOT do this — Garmin requires
 * a server-side OAuth flow plus a webhook endpoint that Garmin pushes data to.
 *
 * Before the Garmin sync actually works you must:
 *   1. Apply to the Garmin Developer Program and get approved for the Health API
 *      (https://developer.garmin.com/health-api/). Approval is required and not instant.
 *   2. Receive a Consumer Key + Consumer Secret. Put them in env vars (see .env.example).
 *   3. Register this server's callback URL in the Garmin developer portal.
 *   4. Deploy this somewhere with HTTPS (Railway does this for you).
 *
 * This server is deployable RIGHT NOW: it boots, serves a status landing page and
 * a /health check, and the Garmin endpoints return honest 501s until keys exist.
 * Garmin's Health API uses OAuth 1.0a (user authorization) + ping/push webhooks.
 * The TODOs below are exactly where Garmin's signed requests go.
 */

const express = require("express");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const {
  GARMIN_CONSUMER_KEY,
  GARMIN_CONSUMER_SECRET,
  PORT = 8080,
} = process.env;

// In production store these per-user in a database, not in memory.
const userTokens = new Map(); // userId -> { token, tokenSecret }

const garminConfigured = Boolean(GARMIN_CONSUMER_KEY && GARMIN_CONSUMER_SECRET);

function requireConfig(res){
  if(!garminConfigured){
    res.status(501).json({
      error: "Garmin not configured",
      detail: "Set GARMIN_CONSUMER_KEY and GARMIN_CONSUMER_SECRET (Garmin Health API approval required).",
    });
    return false;
  }
  return true;
}

// Railway health check hits this.
app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

// Machine-readable status: is the Garmin integration wired up yet?
app.get("/status", (_req, res) => res.json({
  service: "couch-to-5k-garmin-backend",
  ok: true,
  garminConfigured,
  endpoints: ["/health", "/status", "/auth/garmin/start", "/auth/garmin/callback", "/webhooks/garmin", "/api/activities/:userId"],
}));

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

// Bind to 0.0.0.0 so Railway/containers can route to it.
app.listen(PORT, "0.0.0.0", () =>
  console.log(`Couch-to-5K Garmin backend listening on :${PORT} (garminConfigured=${garminConfigured})`));
